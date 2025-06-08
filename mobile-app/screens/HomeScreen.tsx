import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Searchbar, Text, FAB } from 'react-native-paper';
import { TabView, TabBar } from 'react-native-tab-view';
import { useNavigation } from '@react-navigation/native';
import type { RootStackNavigationProp } from '../types/navigation';
import ChatItem from '../components/chat/ChatItem';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  const [activeTab, setActiveTab] = useState<ChatTab>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [index, setIndex] = useState(0);

  const routes: Route[] = [
    { key: 'friends', title: 'Bạn bè' },
    { key: 'teachers', title: 'Giáo viên' },
    { key: 'groups', title: 'Nhóm' },
  ];

  // Mock data - replace with real data later
  const mockChats: ChatItem[] = [
    {
      id: '1',
      name: 'Nguyễn Văn A',
      lastMessage: 'Xin chào!',
      timestamp: '10:30 AM',
      unreadCount: 2,
      avatar: 'https://i.pravatar.cc/150?img=1',
    },
    {
      id: '2',
      name: 'Giáo viên B',
      lastMessage: 'Bài tập về nhà...',
      timestamp: 'Yesterday',
      unreadCount: 0,
      avatar: 'https://i.pravatar.cc/150?img=2',
    },
  ];

  const handleChatPress = (chat: ChatItem) => {
    navigation.navigate('Chat', {
      chatId: chat.id,
      name: chat.name,
      avatar: chat.avatar,
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

  const renderTabBar = (props: any) => (
    <TabBar
      {...props}
      indicatorStyle={{ backgroundColor: '#2196F3' }}
      style={{ backgroundColor: '#fff' }}
      labelStyle={{ color: '#000' }}
    />
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <View style={styles.container}>
        <Searchbar
          placeholder="Tìm kiếm..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />

        <TabView
          navigationState={{ index, routes }}
          renderScene={renderScene}
          renderTabBar={renderTabBar}
          onIndexChange={(index: number) => {
            setIndex(index);
            setActiveTab(routes[index].key);
          }}
          style={styles.tabView}
        />

        <FAB
          icon="plus"
          style={styles.fab}
          onPress={handleNewChat}
          label="Cuộc trò chuyện mới"
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