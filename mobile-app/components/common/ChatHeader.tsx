import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Avatar, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

interface ChatHeaderProps {
  avatar: string;
  name: string;
  status: string;
  onBack: () => void;
  onCall?: () => void;
  onVideo?: () => void;
  onInfo: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  avatar,
  name,
  status,
  onBack,
  onCall,
  onVideo,
  onInfo
}) => {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={['#4facfe', '#00f2fe']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[
        styles.container,
        { paddingTop: insets.top, minHeight: insets.top + 44 }
      ]}
    >
      <View style={styles.content}>
        <View style={styles.leftSection}>
          <IconButton
            icon="arrow-left"
            size={20}
            iconColor="#fff"
            onPress={onBack}
            style={styles.backButton}
          />
          <TouchableOpacity style={styles.userInfo} onPress={onInfo}>
            <Avatar.Image
              size={24}
              source={{ uri: avatar }}
              style={styles.avatar}
            />
            <View style={styles.textContainer}>
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.status}>{status}</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.rightSection}>
          {onCall && (
            <IconButton
              icon="phone"
              size={20}
              iconColor="#fff"
              onPress={onCall}
            />
          )}
          {onVideo && (
            <IconButton
              icon="video"
              size={20}
              iconColor="#fff"
              onPress={onVideo}
            />
          )}
          <IconButton
            icon="dots-vertical"
            size={20}
            iconColor="#fff"
            onPress={onInfo}
          />
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    // Removed border radius - no border bottom
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingLeft: 16,
    paddingRight: 16,
    paddingBottom: 4,
    minHeight: 44,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 6,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    marginRight: 4,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  status: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },
});

export default ChatHeader; 