// components/chat/ChatHeader.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  avatar: string;
  name: string;
  status: string;
  onBack: () => void;
  onCall: () => void;
  onVideo: () => void;
};

const ChatHeader = ({ avatar, name, status, onBack, onCall, onVideo }: Props) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onBack}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      <Image source={{ uri: avatar }} style={styles.avatar} />

      <View style={styles.userInfo}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.status}>{status}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity onPress={onCall} style={styles.icon}>
          <Ionicons name="call-outline" size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onVideo} style={styles.icon}>
          <Ionicons name="videocam-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 60,
    backgroundColor: '#6C47FF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginLeft: 10,
  },
  userInfo: {
    flex: 1,
    marginLeft: 10,
  },
  name: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  status: {
    color: '#ddd',
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    marginLeft: 10,
  },
  icon: {
    marginHorizontal: 8,
  },
});

export default ChatHeader;
