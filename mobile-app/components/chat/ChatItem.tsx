// components/chat/ChatItem.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text } from 'react-native-paper';

type ChatItemProps = {
  name: string;
  avatar?: string | React.ReactNode;
  subtitle?: string;
  timestamp?: string;
  unreadCount?: number;
  isOnline?: boolean;
  onPress?: () => void;
  rightAction?: React.ReactNode;
  style?: any;
};

const ChatItem = ({
  name,
  avatar,
  subtitle,
  timestamp,
  unreadCount,
  isOnline = false,
  onPress,
  rightAction,
  style,
}: ChatItemProps) => {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.container, style]}>
      <View style={styles.avatarWrapper}>
        {typeof avatar === 'string' ? (
          <Image source={{ uri: 'https://i.pravatar.cc/50' || avatar }} style={styles.avatar} />
        ) : (
          avatar
        )}
        {isOnline && <View style={styles.onlineDot} />}
      </View>
      <View style={styles.content}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            {subtitle && <Text style={styles.lastMessage} numberOfLines={1}>{subtitle}</Text>}
          </View>
          {!!timestamp && <Text style={styles.timestamp}>{timestamp}</Text>}
          {rightAction}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  onlineDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2ecc40',
    borderWidth: 2,
    borderColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#222',
    flexShrink: 1,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
    alignSelf: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    flexShrink: 1,
  },
});

export default ChatItem;
