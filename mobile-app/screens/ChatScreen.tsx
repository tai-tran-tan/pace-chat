// screens/ChatScreen.tsx
import React, { useState, useRef } from 'react';
import { View, FlatList, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RootStackNavigationProp, ChatScreenRouteProp } from '../types/navigation';
import ChatHeader from '../components/chat/ChatHeader';
import MessageInput from '../components/chat/MessageInput';
import MessageBubble from '../components/chat/MessageBubble';
import { SafeAreaView } from 'react-native-safe-area-context';

type Message = {
  id: string;
  text: string;
  senderId: string;
  time: string;
};

const ChatScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<ChatScreenRouteProp>();
  const { chatId, name, avatar } = route.params;

  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Hi', senderId: 'me', time: '9:12 PM' },
    { id: '2', text: 'How are you', senderId: 'other', time: '9:15 PM' },
  ]);

  const flatListRef = useRef<FlatList>(null);

  const handleSend = (text: string) => {
    const newMsg: Message = {
      id: Date.now().toString(),
      text,
      senderId: 'me',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, newMsg]);
    flatListRef.current?.scrollToEnd({ animated: true });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleInfo = () => {
    navigation.navigate('ChatInfo', {
      chatId,
      name,
      avatar,
    });
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <View style={styles.container}>
        <ChatHeader
          avatar={avatar || 'https://i.pravatar.cc/150?img=3'}
          name={name}
          status="online"
          onBack={handleBack}
          onCall={() => {}}
          onVideo={() => {}}
          onInfo={handleInfo}
        />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={80}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <MessageBubble
                text={item.text}
                isMine={item.senderId === 'me'}
                // time={item.time}
              />
            )}
            contentContainerStyle={styles.messages}
          />

          <MessageInput
            onSend={handleSend}
            onAttach={() => {}}
          />
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  flex: {
    flex: 1,
  },
  messages: {
    padding: 12,
    paddingBottom: 4,
  },
});

export default ChatScreen;
