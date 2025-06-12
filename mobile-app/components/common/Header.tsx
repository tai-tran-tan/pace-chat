import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, Image } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import ChatHeader from './ChatHeader';
import { useChatHeaderStore } from '../../store/useChatHeaderStore';
import type { RootStackNavigationProp } from '../../types/navigation';

const HEADER_HEIGHT = 44;

interface HeaderProps {
  showSearch?: boolean;
  searchPlaceholder?: string;
  onSearchChange?: (text: string) => void;
  searchValue?: string;
  onSearchPress?: () => void;
  onSearchInputPress?: () => void;
  showSearchIcon?: boolean;
  showQRScanner?: boolean;
  showAddButton?: boolean;
  onQRScannerPress?: () => void;
  onAddPress?: () => void;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightActions?: React.ReactNode;
  gradientColors?: [string, string];
  showAvatar?: boolean;
  showInfoButton?: boolean;
  onInfoPress?: () => void;
  avatarSource?: string;
  avatarName?: string;
  searchInputAsTextOnly?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  showSearch = true,
  searchPlaceholder = "Search",
  onSearchChange,
  searchValue = "",
  onSearchPress,
  onSearchInputPress,
  showSearchIcon = true,
  showQRScanner = true,
  showAddButton = true,
  onQRScannerPress,
  onAddPress,
  showBackButton = false,
  onBackPress,
  rightActions,
  gradientColors = ['#4facfe', '#00f2fe'] as [string, string],
  showAvatar = false,
  showInfoButton = false,
  onInfoPress,
  avatarSource,
  avatarName,
  searchInputAsTextOnly = false
}) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute();
  const chatHeaderProps = useChatHeaderStore(state => state.chatHeaderProps);

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
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
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
            {showSearchIcon && (
              <TouchableOpacity onPress={onSearchPress}>
                <Ionicons name="search" size={20} color="#fff" />
              </TouchableOpacity>
            )}
            {searchInputAsTextOnly ? (
              <TouchableOpacity
                style={styles.searchInputContainer}
                onPress={onSearchInputPress}
                activeOpacity={0.7}
              >
                <Text style={[styles.input, { color: '#fff', paddingTop: 10 }]}>
                  {searchValue ? searchValue : searchPlaceholder}
                </Text>
              </TouchableOpacity>
            ) : (
              <TextInput
                style={styles.input}
                placeholder={searchPlaceholder}
                placeholderTextColor="rgba(255, 255, 255, 0.7)"
                value={searchValue}
                onChangeText={onSearchChange}
                editable={!onSearchInputPress}
              />
            )}
          </View>
        )}

        <View style={styles.rightSection}>
          {rightActions}
          
          {showInfoButton && (
            <TouchableOpacity onPress={onInfoPress}>
              <Ionicons name="information-circle-outline" size={20} color="#fff" />
            </TouchableOpacity>
          )}
          
          {showQRScanner && (
            <TouchableOpacity onPress={onQRScannerPress}>
              <MaterialIcons name="qr-code-scanner" size={20} color="#fff" />
            </TouchableOpacity>
          )}
          
          {showAddButton && (
            <TouchableOpacity 
              style={{ marginLeft: 18 }} 
              onPress={onAddPress}
            >
              <Ionicons name="add" size={20} color="#fff" />
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
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingLeft: 16,
    paddingRight: 16,
    paddingBottom: 4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: 'transparent',
    minHeight: 44,
  },
  backButton: {
    marginRight: 6,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  avatarContainer: {
    marginRight: 4,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  avatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '600',
  },
  searchInputContainer: {
    flex: 1,
    marginLeft: 4,
    // justifyContent: 'center',
    // alignItems: 'center',
  },
  input: {
    color: '#fff',
    fontSize: 15,
    flex: 1,
    paddingVertical: 0,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },
});

export default Header;