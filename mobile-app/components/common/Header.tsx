import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, Image } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import ChatHeader from './ChatHeader';
import { useChatHeader } from '../../contexts/ChatHeaderContext';
import type { RootStackNavigationProp } from '../../types/navigation';

const HEADER_HEIGHT = 56;

interface HeaderProps {
  showSearch?: boolean;
  searchPlaceholder?: string;
  onSearchChange?: (text: string) => void;
  searchValue?: string;
  showQRScanner?: boolean;
  showAddButton?: boolean;
  onQRScannerPress?: () => void;
  onAddPress?: () => void;
  title?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightActions?: React.ReactNode;
  gradientColors?: [string, string];
  showAvatar?: boolean;
  showInfoButton?: boolean;
  onInfoPress?: () => void;
  avatarSource?: string;
  avatarName?: string;
}

const Header: React.FC<HeaderProps> = ({
  showSearch = true,
  searchPlaceholder = "Search",
  onSearchChange,
  searchValue = "",
  showQRScanner = true,
  showAddButton = true,
  onQRScannerPress,
  onAddPress,
  title,
  showBackButton = false,
  onBackPress,
  rightActions,
  gradientColors = ['#4facfe', '#00f2fe'] as [string, string],
  showAvatar = false,
  showInfoButton = false,
  onInfoPress,
  avatarSource,
  avatarName
}) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute();
  const { chatHeaderProps } = useChatHeader();

  // Check if current screen is ChatScreen
  const isChatScreen = route.name === 'Chat';

  // If it's ChatScreen and we have chat props, show ChatHeader
  if (isChatScreen && chatHeaderProps.chatAvatar && chatHeaderProps.chatName && chatHeaderProps.chatStatus) {
    return (
      <ChatHeader
        avatar={chatHeaderProps.chatAvatar}
        name={chatHeaderProps.chatName}
        status={chatHeaderProps.chatStatus}
        onBack={chatHeaderProps.onChatBack}
        onCall={chatHeaderProps.onChatCall}
        onVideo={chatHeaderProps.onChatVideo}
        onInfo={chatHeaderProps.onChatInfo}
      />
    );
  }

  // Default header for other screens
  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[
        styles.gradient,
        { paddingTop: insets.top, minHeight: insets.top + HEADER_HEIGHT }
      ]}
    >
      <View style={styles.content}>
        {showBackButton && (
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={onBackPress || (() => navigation.goBack())}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        )}
        
        {title && (
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{title}</Text>
          </View>
        )}

        {showSearch && (
          <View style={styles.leftSection}>
            {showAvatar && (
              <View style={styles.avatarContainer}>
                {avatarSource ? (
                  <Image source={{ uri: avatarSource }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {avatarName ? avatarName.charAt(0).toUpperCase() : 'U'}
                    </Text>
                  </View>
                )}
              </View>
            )}
            <Ionicons name="search" size={22} color="#fff" />
            <TextInput
              style={styles.input}
              placeholder={searchPlaceholder}
              placeholderTextColor="rgba(255, 255, 255, 0.7)"
              value={searchValue}
              onChangeText={onSearchChange}
            />
          </View>
        )}

        <View style={styles.rightSection}>
          {rightActions}
          
          {showInfoButton && (
            <TouchableOpacity onPress={onInfoPress}>
              <Ionicons name="information-circle-outline" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          
          {showQRScanner && (
            <TouchableOpacity onPress={onQRScannerPress}>
              <MaterialIcons name="qr-code-scanner" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          
          {showAddButton && (
            <TouchableOpacity 
              style={{ marginLeft: 18 }} 
              onPress={onAddPress}
            >
              <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    backgroundColor: 'transparent',
  },
  backButton: {
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  avatarContainer: {
    marginRight: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    marginLeft: 8,
    color: '#fff',
    fontSize: 16,
    flex: 1,
    paddingVertical: 0,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
});

export default Header;