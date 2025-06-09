import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Avatar, IconButton, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ChatHeaderProps {
  avatar: string;
  name: string;
  status: string;
  onBack: () => void;
  onCall: () => void;
  onVideo: () => void;
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
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.leftSection}>
          <IconButton
            icon="arrow-left"
            size={24}
            iconColor="#fff"
            onPress={onBack}
          />
          <TouchableOpacity style={styles.userInfo} onPress={onInfo}>
            <Avatar.Image
              size={40}
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
          <IconButton
            icon="phone"
            size={24}
            iconColor="#fff"
            onPress={onCall}
          />
          <IconButton
            icon="video"
            size={24}
            iconColor="#fff"
            onPress={onVideo}
          />
          <IconButton
            icon="dots-vertical"
            size={24}
            iconColor="#fff"
            onPress={onInfo}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#4facfe',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    paddingHorizontal: 8,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  status: {
    fontSize: 14,
    color: '#e0e0e0',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default ChatHeader; 