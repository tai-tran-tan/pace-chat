// screens/ChatScreen.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, FlatList, KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RootStackNavigationProp, ChatScreenRouteProp } from '../types/navigation';
import ChatHeader from '../components/chat/ChatHeader';
import MessageInput from '../components/chat/MessageInput';
import MessageBubble from '../components/chat/MessageBubble';
import { SafeAreaView } from 'react-native-safe-area-context';
import socketService from '../services/socket';
import { useAuthStore } from '../store/useAuthStore';
import { useWebSocketManager } from '../hooks/useWebSocketManager';
import api from '../services/api';
import { Button } from 'react-native-paper';

type User = {
  user_id: string;
  username: string;
  avatar_url?: string | null;
  // ... other user fields
};

type Message = {
  message_id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'video' | 'file';
  timestamp: string;
  read_by: string[];
  sender_name?: string;
  sender_avatar?: string;
};

type Conversation = {
  conversation_id: string;
  type: 'private' | 'group';
  name: string | null;
  participants: {
    user_id: string;
    username: string;
    avatar_url: string | null;
  }[];
  last_message_preview: string | null;
  last_message_timestamp: string | null;
  unread_count: number;
};

type ChatScreenParams = {
  userId: string;
  username: string;
};

const ChatScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<ChatScreenRouteProp>();
  const { userId, username } = route.params as ChatScreenParams;
  const { user } = useAuthStore();

  // Use WebSocket manager for this chat screen
  const { isConnected: wsConnected, resetIdleTimer } = useWebSocketManager({
    autoConnect: true, // Auto connect when entering chat screen
    idleTimeout: 10 * 60 * 1000, // 10 minutes for chat screen (longer than default)
    enableIdleDisconnect: true
  });

  // States
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // Initialize conversation
  const initializeConversation = useCallback(async () => {
    if (!userId) {
      console.error('No target user ID provided');
      setError('User not found');
      return;
    }

    if (!user?.user_id) {
      console.error('Current user not logged in');
      setError('Please login to continue');
      return;
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.error('Invalid user ID format:', userId);
      setError('Invalid user ID format');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('Initializing conversation:', {
        currentUserId: user.user_id,
        targetUserId: userId,
        token: api.defaults.headers.common['Authorization'] ? 'Present' : 'Missing'
      });

      const requestData = {
        target_username: userId
      };

      console.log('Request payload:', requestData);

      const response = await api.post('/conversations/private', requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('Conversation response:', response.data);

      if (!response.data || !response.data.conversation_id) {
        throw new Error('Invalid response format from server');
      }

      const conversationData = response.data;
      setConversation({
        conversation_id: conversationData.conversation_id,
        type: conversationData.type,
        name: conversationData.name,
        participants: conversationData.participants,
        last_message_preview: conversationData.last_message_preview,
        last_message_timestamp: conversationData.last_message_timestamp,
        unread_count: conversationData.unread_count
      });
      setChatId(conversationData.conversation_id);
    } catch (error: any) {
      console.error('Error initializing conversation:', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
          data: error.config?.data
        }
      });

      let errorMessage = 'Unable to initialize conversation. ';
      
      if (error.response) {
        const serverError = error.response.data;
        console.log('Server error details:', serverError);
        
        if (typeof serverError === 'object' && serverError.message) {
          errorMessage += serverError.message;
        } else if (error.response.status === 401) {
          errorMessage += 'Login session expired. Please login again.';
        } else if (error.response.status === 404) {
          errorMessage += 'User not found.';
        } else if (error.response.status === 500) {
          errorMessage += 'Server error. Please try again later.';
        } else {
          errorMessage += `Server error: ${error.response.status}`;
        }
      } else if (error.request) {
        errorMessage += 'No response from server. Please check your connection.';
      } else {
        errorMessage += error.message || 'Unknown error';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [userId, user?.user_id]);

  // Initialize conversation when component mounts
  useEffect(() => {
    initializeConversation();
  }, [initializeConversation]);

  // Load messages
  const loadMessages = async (beforeMessageId?: string) => {
    if (!chatId) return;

    try {
      setIsLoading(true);
      const response = await api.get(`/conversations/${chatId}/messages`, {
        params: {
          limit: 20,
          before_message_id: beforeMessageId
        }
      });
      
      // Enrich messages with sender info from conversation participants
      const enrichedMessages = response.data.messages.map((msg: Message) => {
        const sender = conversation?.participants.find(p => p.user_id === msg.sender_id);
        return {
          ...msg,
          sender_name: sender?.username || (msg.sender_id === user?.user_id ? user.username : username),
          sender_avatar: sender?.avatar_url || (msg.sender_id === user?.user_id ? user.avatar_url : `https://i.pravatar.cc/150?img=${userId}`),
        };
      });
      
      setMessages(prev => beforeMessageId ? [...prev, ...enrichedMessages] : enrichedMessages);
      setHasMore(response.data.has_more);
      setLastMessageId(response.data.next_before_message_id);
      setError(null);
    } catch (error: any) {
      console.error('Failed to load messages:', error);
      setError('Failed to load messages. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load messages when conversation is ready
  useEffect(() => {
    if (chatId) {
      loadMessages();
    }
  }, [chatId]);

  // WebSocket message handling
  useEffect(() => {
    const unsubscribe = socketService.onMessage((message) => {
      // Reset idle timer on any message activity
      resetIdleTimer();
      
      switch (message.type) {
        case 'MESSAGE_RECEIVED':
          if (message.message.conversation_id === chatId) {
            setMessages(prev => [...prev, message.message]);
            // Mark message as read
            socketService.sendReadReceipt(chatId, message.message.message_id);
          }
          break;

        case 'TYPING_INDICATOR':
          if (message.conversation_id === chatId && message.user_id !== user?.user_id) {
            setIsTyping(message.is_typing);
          }
          break;

        case 'MESSAGE_DELIVERED':
          // Update message status if needed
          break;

        case 'MESSAGE_READ_STATUS':
          // Update read status for messages
          setMessages(prev => prev.map(msg => 
            msg.message_id === message.message_id
              ? { ...msg, read_by: [...msg.read_by, message.reader_id] }
              : msg
          ));
          break;
      }
    });

    // Handle WebSocket errors and reconnection
    const unsubscribeError = socketService.onError((error) => {
      console.error('WebSocket error:', error);
      setError('Connection error. Reconnecting...');
    });

    const unsubscribeConnect = socketService.onConnect(() => {
      setError(null);
      // Reload messages if needed
      if (messages.length === 0) {
        loadMessages();
      }
    });

    return () => {
      unsubscribe();
      unsubscribeError();
      unsubscribeConnect();
    };
  }, [chatId, user?.user_id, resetIdleTimer]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isSending || !chatId) return;

    // Reset idle timer on user activity
    resetIdleTimer();

    const tempMessageId = `temp_${Date.now()}`;
    try {
      setIsSending(true);
      
      // Optimistically add message to UI
      const tempMessage: Message = {
        message_id: tempMessageId,
        conversation_id: chatId,
        sender_id: user?.user_id || '',
        content: text,
        message_type: 'text',
        timestamp: new Date().toISOString(),
        read_by: [],
        sender_name: user?.username,
        sender_avatar: user?.avatar_url || `https://i.pravatar.cc/150?img=${user?.user_id}`,
      };
      
      setMessages(prev => [...prev, tempMessage]);
      flatListRef.current?.scrollToEnd({ animated: true });

      // Send message through WebSocket
      const serverMessageId = await socketService.sendMessage(chatId, text);
      
      // Update message with server ID
      setMessages(prev => prev.map(msg => 
        msg.message_id === tempMessageId
          ? { ...msg, message_id: serverMessageId }
          : msg
      ));
    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message. Please try again.');
      // Remove failed message
      setMessages(prev => prev.filter(msg => msg.message_id !== tempMessageId));
    } finally {
      setIsSending(false);
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (!chatId) return;
    
    // Reset idle timer on typing activity
    resetIdleTimer();
    
    socketService.sendTypingIndicator(chatId, isTyping);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore && lastMessageId) {
      loadMessages(lastMessageId);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <View style={{ padding: 24, backgroundColor: '#ffeaea', borderRadius: 12, alignItems: 'center', maxWidth: 320 }}>
          <Text style={{ color: '#d32f2f', fontWeight: 'bold', fontSize: 16, marginBottom: 12, textAlign: 'center' }}>
            {error}
          </Text>
          <Button mode="contained" onPress={initializeConversation} style={{ marginTop: 8 }}>
            Try Again
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  if (!conversation || !chatId) {
    // Initializing or no conversation yet, show loading only
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={{ marginTop: 16, color: '#666' }}>Initializing conversation...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F8F8' }} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.container}>
        <ChatHeader
          avatar={`https://i.pravatar.cc/150?img=${userId}`}
          name={username}
          status={isTyping ? 'typing...' : wsConnected ? 'online' : 'connecting...'}
          onBack={handleBack}
          onCall={() => {}}
          onVideo={() => {}}
          onInfo={() => {
            if (conversation) {
              navigation.navigate('ChatInfo', {
                chatId: conversation.conversation_id,
                name: username,
                avatar: `https://i.pravatar.cc/150?img=${userId}`,
              });
            }
          }}
        />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={80}
        >
          {isLoading && messages.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={item => item.message_id}
              renderItem={({ item }) => (
                <MessageBubble
                  text={item.content}
                  isMine={item.sender_id === user?.user_id}
                  timestamp={new Date(item.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                  isRead={item.read_by.length > 0}
                />
              )}
              contentContainerStyle={styles.messages}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                isLoading && messages.length > 0 ? (
                  <ActivityIndicator style={styles.loadingMore} />
                ) : null
              }
              inverted={false}
            />
          )}

          <MessageInput
            onSend={handleSend}
            onAttach={() => {}}
            onTyping={handleTyping}
            disabled={isSending || !chatId || !wsConnected}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingMore: {
    paddingVertical: 16,
  },
  errorContainer: {
    padding: 8,
    backgroundColor: '#ffebee',
    margin: 8,
    borderRadius: 4,
  },
  errorText: {
    color: '#c62828',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#2196F3',
    borderRadius: 4,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ChatScreen;
