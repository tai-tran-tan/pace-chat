import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Searchbar, Text, FAB } from 'react-native-paper';
import { TabView, TabBar } from 'react-native-tab-view';
import { useNavigation } from '@react-navigation/native';
import type { RootStackNavigationProp } from '../types/navigation';
import ChatItem from '../components/chat/ChatItem';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWebSocketManager } from '../hooks/useWebSocketManager';

type ChatTab = 'friends' | 'teachers' | 'groups';

type ChatItem = {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  avatar: string;
};

type Route = {
  key: ChatTab;
  title: string;
};

const HomeScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');

  // Use WebSocket manager with idle disconnect for home screen
  const { isConnected: wsConnected } = useWebSocketManager({
    autoConnect: true, // Auto connect when entering home screen
    idleTimeout: 3 * 60 * 1000, // 3 minutes for home screen (shorter than chat)
    enableIdleDisconnect: true
  });

  const routes: Route[] = [
    { key: 'friends', title: 'Friends' },
    { key: 'teachers', title: 'Teachers' },
    { key: 'groups', title: 'Groups' },
  ];

  // Mock data - replace with real data later
  const mockChats: ChatItem[] = [
    {
      id: '1',
      name: 'Nguyen Van A',
      lastMessage: 'Hello!',
      timestamp: '10:30 AM',
      unreadCount: 2,
      avatar: 'https://i.pravatar.cc/150?img=1',
    },
    {
      id: '2',
      name: 'Teacher B',
      lastMessage: 'Homework assignment...',
      timestamp: 'Yesterday',
      unreadCount: 0,
      avatar: 'https://i.pravatar.cc/150?img=2',
    },
  ];

  const handleChatPress = (chat: ChatItem) => {
    navigation.navigate('Chat', {
      userId: chat.id,
      username: chat.name,
    });
  };

  const handleNewChat = () => {
    navigation.navigate('NewChat');
  };

  const renderChatItem = ({ item }: { item: ChatItem }) => (
    <ChatItem
      name={item.name}
      lastMessage={item.lastMessage}
      timestamp={item.timestamp}
      unreadCount={item.unreadCount}
      avatar={item.avatar}
      onPress={() => handleChatPress(item)}
    />
  );

  const renderScene = ({ route }: { route: Route }) => (
    <FlatList
      data={mockChats}
      renderItem={renderChatItem}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.chatList}
    />
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.container}>
        <Searchbar
          placeholder="Search..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[styles.searchBar, { marginTop: 8 }]}
        />
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={handleNewChat}
          label="New Chat"
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchBar: {
    margin: 16,
    elevation: 2,
  },
  tabView: {
    flex: 1,
  },
  chatList: {
    padding: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default HomeScreen; 