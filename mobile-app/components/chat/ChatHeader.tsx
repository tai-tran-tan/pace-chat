// components/chat/ChatHeader.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Appbar, Avatar, Text } from 'react-native-paper';

interface Props {
  avatar: string;
  name: string;
  status: string;
  onBack: () => void;
  onCall: () => void;
  onVideo: () => void;
  onInfo: () => void;
}

const ChatHeader: React.FC<Props> = ({
  avatar,
  name,
  status,
  onBack,
  onCall,
  onVideo,
  onInfo,
}) => {
  return (
    <Appbar.Header style={styles.header} statusBarHeight={0}>
      <Appbar.BackAction onPress={onBack} />
      <Avatar.Image
        size={40}
        source={{ uri: avatar }}
        style={styles.avatar}
      />
      <View style={styles.titleContainer}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.status} numberOfLines={1}>
          {status}
        </Text>
      </View>
      <View style={styles.actions}>
        <Appbar.Action icon="phone" onPress={onCall} />
        <Appbar.Action icon="video" onPress={onVideo} />
        <Appbar.Action icon="information" onPress={onInfo} />
      </View>
    </Appbar.Header>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#fff',
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatar: {
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  status: {
    fontSize: 12,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
  },
});

export default ChatHeader;
