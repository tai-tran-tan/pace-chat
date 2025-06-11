// screens/ChatScreen.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, FlatList, KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RootStackNavigationProp, ChatScreenRouteProp } from '../types/navigation';
import MessageInput from '../components/chat/MessageInput';
import MessageBubble from '../components/chat/MessageBubble';
import ImageViewer from '../components/chat/ImageViewer';
import ImageActionSheet from '../components/chat/ImageActionSheet';
import socketService from '../services/socket';
import { useAuthStore } from '../store/useAuthStore';
import { useWebSocketManager } from '../hooks/useWebSocketManager';
import { useChatHeaderStore } from '../store/useChatHeaderStore';
import api from '../services/api';
import FileUploadService from '../services/fileUpload';
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
  conversationId?: string;
  userId?: string;
  username: string;
};

const ChatScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<ChatScreenRouteProp>();
  const { conversationId, userId, username } = route.params as ChatScreenParams;
  const { user } = useAuthStore();
  const { setChatHeaderProps, clearChatHeaderProps } = useChatHeaderStore();

  // Use WebSocket manager for this chat screen
  const { isConnected: wsConnected, resetIdleTimer } = useWebSocketManager({
    autoConnect: true, // Auto connect when entering chat screen
    idleTimeout: 10 * 60 * 1000, // 10 minutes for chat screen (longer than default)
    enableIdleDisconnect: true
  });

  // States
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');
  const [imageActionSheetVisible, setImageActionSheetVisible] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // Set up ChatHeader when component mounts
  useEffect(() => {
    setChatHeaderProps({
      chatAvatar: conversation?.type === 'private' 
        ? conversation.participants.find(p => p.user_id !== user?.user_id)?.avatar_url || `https://i.pravatar.cc/150?img=${currentConversationId}`
        : "https://i.pravatar.cc/150?img=group",
      chatName: username,
      chatStatus: isTyping ? 'typing...' : wsConnected ? 'online' : 'connecting...',
      onChatBack: handleBack,
      onChatCall: () => {},
      onChatVideo: () => {},
      onChatInfo: () => {
        if (conversation) {
          navigation.navigate('ChatInfo', {
            chatId: conversation.conversation_id,
            name: username,
            avatar: conversation?.type === 'private' 
              ? conversation.participants.find(p => p.user_id !== user?.user_id)?.avatar_url || `https://i.pravatar.cc/150?img=${currentConversationId}`
              : "https://i.pravatar.cc/150?img=group",
          });
        }
      }
    });

    // Clean up when component unmounts
    return () => {
      clearChatHeaderProps();
    };
  }, [currentConversationId, username, isTyping, wsConnected, conversation, user?.user_id]);

  // Update chat status when typing or connection status changes
  useEffect(() => {
    setChatHeaderProps({
      chatStatus: isTyping ? 'typing...' : wsConnected ? 'online' : 'connecting...'
    });
  }, [isTyping, wsConnected]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      // Small delay to ensure the message is rendered
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Initialize conversation
  const initializeConversation = useCallback(async () => {
    if (!user?.user_id) {
      console.error('Current user not logged in');
      setError('Please login to continue');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let finalConversationId = conversationId;

      // If we have userId but no conversationId, create a new conversation
      if (userId && !conversationId) {
        console.log('Creating new conversation with user:', {
          targetUserId: userId,
          currentUserId: user.user_id
        });

        const createResponse = await api.post('/conversations/private', {
          target_user_id: userId
        });

        console.log('New conversation created:', createResponse.data);
        finalConversationId = createResponse.data.conversation_id;
        if (finalConversationId) {
          setCurrentConversationId(finalConversationId);
        }
      } else if (conversationId) {
        setCurrentConversationId(conversationId);
      } else {
        throw new Error('Neither conversationId nor userId provided');
      }

      console.log('Loading conversation:', {
        conversationId: finalConversationId,
        currentUserId: user.user_id,
        token: api.defaults.headers.common['Authorization'] ? 'Present' : 'Missing'
      });

      // Get conversation details
      const conversationResponse = await api.get(`/conversations/${finalConversationId}`);
      const conversationData = conversationResponse.data;
      
      console.log('Conversation response:', conversationData);

      if (!conversationData || !conversationData.conversation_id) {
        throw new Error('Invalid response format from server');
      }

      setConversation({
        conversation_id: conversationData.conversation_id,
        type: conversationData.type,
        name: conversationData.name,
        participants: conversationData.participants,
        last_message_preview: conversationData.last_message_preview,
        last_message_timestamp: conversationData.last_message_timestamp,
        unread_count: conversationData.unread_count
      });

    } catch (error: any) {
      console.error('Failed to initialize conversation:', error);
      setError('Failed to load conversation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, userId, user?.user_id]);

  // Initialize conversation on mount
  useEffect(() => {
    initializeConversation();
  }, [initializeConversation]);

  // Load messages
  const loadMessages = async (beforeMessageId?: string) => {
    if (!currentConversationId) return;

    try {
      setIsLoading(true);
      const response = await api.get(`/conversations/${currentConversationId}/messages`, {
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
          sender_avatar: sender?.avatar_url || (msg.sender_id === user?.user_id ? user.avatar_url : `https://i.pravatar.cc/150?img=${msg.sender_id}`),
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
    if (conversation) {
      loadMessages();
    }
  }, [conversation]);

  // WebSocket message handling
  useEffect(() => {
    const unsubscribe = socketService.onMessage((message) => {
      // Reset idle timer on any message activity
      resetIdleTimer();
      
      switch (message.type) {
        case 'MESSAGE_RECEIVED':
          if (message.message.conversation_id === currentConversationId) {
            setMessages(prev => [...prev, message.message]);
            // Mark message as read
            socketService.sendReadReceipt(currentConversationId, message.message.message_id);
            // Auto scroll to bottom for new received messages
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
          break;

        case 'TYPING_INDICATOR':
          if (message.conversation_id === currentConversationId && message.user_id !== user?.user_id) {
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
  }, [currentConversationId, user?.user_id, resetIdleTimer]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isSending || !currentConversationId) return;

    // Reset idle timer on user activity
    resetIdleTimer();

    const tempMessageId = `temp_${Date.now()}`;
    try {
      setIsSending(true);
      
      // Optimistically add message to UI
      const tempMessage: Message = {
        message_id: tempMessageId,
        conversation_id: currentConversationId,
        sender_id: user?.user_id || '',
        content: text,
        message_type: 'text',
        timestamp: new Date().toISOString(),
        read_by: [],
        sender_name: user?.username,
        sender_avatar: user?.avatar_url || `https://i.pravatar.cc/150?img=${user?.user_id}`,
      };
      
      setMessages(prev => [...prev, tempMessage]);
      
      // Scroll to bottom immediately after adding message
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 50);

      // Send message through WebSocket
      const serverMessageId = await socketService.sendMessage(currentConversationId, text);
      
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

  const handleSendImage = async () => {
    if (isUploading || !currentConversationId) return;
    console.log('Image icon clicked, opening action sheet');
    setImageActionSheetVisible(true);
  };

  const handleImageFromCamera = async () => {
    if (isUploading || !currentConversationId) return;

    try {
      setIsUploading(true);
      
      // Take photo using camera
      const imageUri = await FileUploadService.takePhoto();
      if (!imageUri) {
        return; // User cancelled
      }

      await uploadAndSendImage(imageUri);
    } catch (error: any) {
      console.error('Failed to take photo:', error);
      Alert.alert('Error', error.message || 'Failed to take photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageFromGallery = async () => {
    if (isUploading || !currentConversationId) return;
    console.log('Gallery option selected');
    setImageActionSheetVisible(false);
    setTimeout(async () => {
      try {
        setIsUploading(true);
        const imageUri = await FileUploadService.pickImage();
        if (!imageUri) return;
        await uploadAndSendImage(imageUri);
      } catch (error: any) {
        console.error('Failed to pick image:', error);
        Alert.alert('Error', error.message || 'Failed to pick image. Please try again.');
      } finally {
        setIsUploading(false);
      }
    }, 300);
  };

  const uploadAndSendImage = async (imageUri: string) => {
    // Reset idle timer on user activity
    resetIdleTimer();

    const tempMessageId = `temp_img_${Date.now()}`;
    
    // Show loading message
    const tempMessage: Message = {
      message_id: tempMessageId,
      conversation_id: currentConversationId!,
      sender_id: user?.user_id || '',
      content: 'Uploading image...',
      message_type: 'image',
      timestamp: new Date().toISOString(),
      read_by: [],
      sender_name: user?.username,
      sender_avatar: user?.avatar_url || `https://i.pravatar.cc/150?img=${user?.user_id}`,
    };
    
    setMessages(prev => [...prev, tempMessage]);
    
    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);

    // Upload image to server
    const uploadResponse = await FileUploadService.uploadFile(imageUri);
    
    // Update temp message with actual image URL
    setMessages(prev => prev.map(msg => 
      msg.message_id === tempMessageId
        ? { ...msg, content: uploadResponse.file_url }
        : msg
    ));

    // Send image message through WebSocket
    const serverMessageId = await socketService.sendMessage(
      currentConversationId!, 
      uploadResponse.file_url,
      'image'
    );
    
    // Update message with server ID
    setMessages(prev => prev.map(msg => 
      msg.message_id === tempMessageId
        ? { ...msg, message_id: serverMessageId }
        : msg
    ));
  };

  const handleImagePress = (imageUrl: string) => {
    setSelectedImageUrl(imageUrl);
    setImageViewerVisible(true);
  };

  const handleCloseImageViewer = () => {
    setImageViewerVisible(false);
    setSelectedImageUrl('');
  };

  const handleTyping = (isTyping: boolean) => {
    if (!currentConversationId) return;
    
    // Reset idle timer on typing activity
    resetIdleTimer();
    
    socketService.sendTypingIndicator(currentConversationId, isTyping);
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <View style={{ padding: 24, backgroundColor: '#ffeaea', borderRadius: 12, alignItems: 'center', maxWidth: 320 }}>
          <Text style={{ color: '#d32f2f', fontWeight: 'bold', fontSize: 16, marginBottom: 12, textAlign: 'center' }}>
            {error}
          </Text>
          <Button mode="contained" onPress={initializeConversation} style={{ marginTop: 8 }}>
            Try Again
          </Button>
        </View>
      </View>
    );
  }

  if (!conversation) {
    // Initializing or no conversation yet, show loading only
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={{ marginTop: 16, color: '#666' }}>Initializing conversation...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
                isRead={item?.read_by?.length > 0}
                messageType={item.message_type}
                onImagePress={() => item.message_type === 'image' ? handleImagePress(item.content) : undefined}
                isUploading={item.message_id.startsWith('temp_img_')}
              />
            )}
            contentContainerStyle={[
              styles.messages,
              messages.length === 0 && { flex: 1, justifyContent: 'center' }
            ]}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isLoading && messages.length > 0 ? (
                <ActivityIndicator style={styles.loadingMore} />
              ) : null
            }
            inverted={false}
            showsVerticalScrollIndicator={false}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
              autoscrollToTopThreshold: 10,
            }}
          />
        )}

        <MessageInput
          onSend={handleSend}
          onAttach={() => {}}
          onTyping={handleTyping}
          onImage={handleSendImage}
          disabled={isSending || isUploading || !currentConversationId || !wsConnected}
          style={{marginBottom: 16, marginHorizontal: 8}}
        />
      </KeyboardAvoidingView>

      <ImageViewer
        visible={imageViewerVisible}
        imageUrl={selectedImageUrl}
        onClose={handleCloseImageViewer}
      />

      <ImageActionSheet
        visible={imageActionSheetVisible}
        onClose={() => setImageActionSheetVisible(false)}
        onCamera={handleImageFromCamera}
        onGallery={handleImageFromGallery}
      />
    </View>
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
