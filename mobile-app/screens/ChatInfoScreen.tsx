import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RootStackNavigationProp, ChatInfoScreenRouteProp } from '../types/navigation';
import { Text, Avatar, IconButton, Surface, Divider } from 'react-native-paper';

type Participant = {
  id: string;
  name: string;
  avatar: string;
  role: 'admin' | 'member';
};

type MediaItem = {
  id: string;
  type: 'image' | 'file';
  url: string;
  name: string;
  timestamp: string;
};

const ChatInfoScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<ChatInfoScreenRouteProp>();
  const { chatId, name, avatar } = route.params;

  // Mock data - replace with real data later
  const chatInfo = {
    name: name || 'Nhóm học tập Toán',
    avatar: avatar || 'https://i.pravatar.cc/150?img=3',
    participants: [
      {
        id: '1',
        name: 'Nguyễn Văn A',
        avatar: 'https://i.pravatar.cc/150?img=1',
        role: 'admin' as const,
      },
      {
        id: '2',
        name: 'Giáo viên B',
        avatar: 'https://i.pravatar.cc/150?img=2',
        role: 'member' as const,
      },
    ] as Participant[],
    media: [
      {
        id: '1',
        type: 'image' as const,
        url: 'https://picsum.photos/200',
        name: 'Bài tập 1.jpg',
        timestamp: '2 days ago',
      },
      {
        id: '2',
        type: 'file' as const,
        url: '#',
        name: 'Tài liệu học tập.pdf',
        timestamp: '1 week ago',
      },
    ] as MediaItem[],
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleLeaveGroup = () => {
    // TODO: Implement leave group logic
    navigation.navigate('Main');
  };

  const renderParticipant = (participant: Participant) => (
    <TouchableOpacity key={participant.id} style={styles.participantItem}>
      <Avatar.Image source={{ uri: participant.avatar }} size={48} />
      <View style={styles.participantInfo}>
        <Text style={styles.participantName}>{participant.name}</Text>
        <Text style={styles.participantRole}>
          {participant.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}
        </Text>
      </View>
      <IconButton icon="dots-vertical" size={24} />
    </TouchableOpacity>
  );

  const renderMediaItem = (item: MediaItem) => (
    <TouchableOpacity key={item.id} style={styles.mediaItem}>
      <Surface style={styles.mediaIcon}>
        <IconButton
          icon={item.type === 'image' ? 'image' : 'file'}
          size={24}
          iconColor="#2196F3"
        />
      </Surface>
      <View style={styles.mediaInfo}>
        <Text style={styles.mediaName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.mediaTimestamp}>{item.timestamp}</Text>
      </View>
      <IconButton icon="download" size={24} />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.header}>
        <Avatar.Image
          source={{ uri: chatInfo.avatar }}
          size={80}
          style={styles.avatar}
        />
        <Text style={styles.chatName}>{chatInfo.name}</Text>
      </Surface>

      <Surface style={styles.section}>
        <Text style={styles.sectionTitle}>Thành viên ({chatInfo.participants.length})</Text>
        <Divider style={styles.divider} />
        {chatInfo.participants.map(renderParticipant)}
        <TouchableOpacity style={styles.addButton}>
          <IconButton icon="account-plus" size={24} iconColor="#2196F3" />
          <Text style={styles.addButtonText}>Thêm thành viên</Text>
        </TouchableOpacity>
      </Surface>

      <Surface style={styles.section}>
        <Text style={styles.sectionTitle}>Tệp đính kèm</Text>
        <Divider style={styles.divider} />
        {chatInfo.media.map(renderMediaItem)}
      </Surface>

      <Surface style={styles.section}>
        <TouchableOpacity style={styles.dangerButton} onPress={handleLeaveGroup}>
          <IconButton icon="exit-to-app" size={24} iconColor="#FF5252" />
          <Text style={styles.dangerButtonText}>Rời khỏi nhóm</Text>
        </TouchableOpacity>
      </Surface>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 16,
    elevation: 2,
  },
  avatar: {
    marginBottom: 16,
  },
  chatName: {
    fontSize: 20,
    fontWeight: '600',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    padding: 16,
  },
  divider: {
    marginBottom: 8,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  participantInfo: {
    flex: 1,
    marginLeft: 12,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '500',
  },
  participantRole: {
    fontSize: 14,
    color: '#666',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  addButtonText: {
    fontSize: 16,
    color: '#2196F3',
    marginLeft: 8,
  },
  mediaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  mediaIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaInfo: {
    flex: 1,
    marginLeft: 12,
  },
  mediaName: {
    fontSize: 14,
    fontWeight: '500',
  },
  mediaTimestamp: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  dangerButtonText: {
    fontSize: 16,
    color: '#FF5252',
    marginLeft: 8,
  },
});

export default ChatInfoScreen; 