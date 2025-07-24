'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useMessageStore } from '@/store/useMessageStore';
import { useConversationStore } from '@/store/useConversationStore';
import apiService from '@/services/api';
import socketService from '@/services/socket';
import { Conversation, Message } from '@/types';
import ChatHeader from '@/components/chat/ChatHeader';
import ChatMessages from '@/components/chat/ChatMessages';
import ChatInput from '@/components/chat/ChatInput';

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params?.id as string;
  const { user } = useAuthStore();
  const { 
    getMessages, 
    setMessages, 
    addMessage, 
    updateLastMessage 
  } = useMessageStore();
  const { resetConversationUnreadCount } = useConversationStore();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'conversation' | 'files'>('conversation');
  const [isClient, setIsClient] = useState(false);
  const [isWsConnected, setIsWsConnected] = useState(false);
  
  // Get messages from message store
  const messages = getMessages(conversationId);
  
  // Ensure we're on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch conversation detail and messages
  const fetchConversation = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Get conversation detail
        const convRes = await apiService.getConversationById(conversationId);
      if (convRes.data && convRes.data) {
        setConversation(convRes.data);
      } else {
        throw new Error('Conversation not found');
      }
      // Get messages
        const msgRes = await apiService.getMessages(conversationId);
        console.log('msgRes', msgRes);
      if (msgRes.data && Array.isArray(msgRes.data.messages)) {
        setMessages(conversationId, msgRes.data.messages);
        // Update last message if there are messages
        if (msgRes.data.messages.length > 0) {
          const lastMessage = msgRes.data.messages[msgRes.data.messages.length - 1];
          updateLastMessage(conversationId, lastMessage);
        }
      } else {
        setMessages(conversationId, []);
      }
    } catch (err: any) {
      setError('Failed to load conversation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, setMessages, updateLastMessage]);

  useEffect(() => {
    if (conversationId) {
      fetchConversation();
    }
  }, [conversationId, fetchConversation]);

  // WebSocket: connect once and keep connection when switching between conversations
  useEffect(() => {
    if (!isClient) return;
    
    let isMounted = true;
    (async () => {
      if (isMounted) {
        await socketService.connect();
        console.log('WebSocket connected (conversation detail)');
        setIsWsConnected(true);
      }
    })();
    
    // Lắng nghe tin nhắn mới
    const unsubscribe = socketService.onMessage((wsMessage) => {
      if (wsMessage.type === 'MESSAGE_RECEIVED' && wsMessage.message.conversation_id === conversationId) {
        console.log('Received message:', wsMessage.message);
        
        // Remove temp message if exists
        const currentMessages = getMessages(conversationId);
        const filtered = currentMessages.filter(
          (m) =>
            !m.message_id.startsWith('temp_') ||
            m.content !== wsMessage.message.content ||
            m.sender_id !== wsMessage.message.sender_id
        );
        
        // Add new message to store
        addMessage(conversationId, wsMessage.message);
        updateLastMessage(conversationId, wsMessage.message);
        
        // Mark message as read immediately when received
        socketService.sendReadReceipt(conversationId, wsMessage.message.message_id);
      }
    });

    // Listen for connection status changes
    const onConnect = () => {
      if (isMounted) {
        setIsWsConnected(true);
      }
    };

    const onDisconnect = () => {
      if (isMounted) {
        setIsWsConnected(false);
      }
    };

    socketService.onConnect(onConnect);
    socketService.onError(() => {
      if (isMounted) {
        setIsWsConnected(false);
      }
    });
    return () => {
      isMounted = false;
      unsubscribe();
      // Không disconnect ở đây, để giữ kết nối khi chuyển conversation
    };
  }, [conversationId, addMessage, updateLastMessage, getMessages, isClient]);

  // Send read receipt when entering chat page
  useEffect(() => {
    if (!isClient) return;
    
    if (conversationId && messages.length > 0 && isWsConnected) {
      // Get the latest message ID and send read receipt
      const latestMessage = messages[messages.length - 1];
      if (latestMessage && latestMessage.sender_id !== user?.user_id) {
        socketService.sendReadReceipt(conversationId, latestMessage.message_id);
        console.log('Sent read receipt for latest message:', latestMessage.message_id);
      }
    }
  }, [conversationId, messages, user?.user_id, isWsConnected, isClient]);

  // Reset unread count when entering chat page
  useEffect(() => {
    if (!isClient) return;
    
    if (conversationId) {
      // Reset unread count for this conversation when user visits the chat
      resetConversationUnreadCount(conversationId);
      console.log('Reset unread count for conversation:', conversationId);
    }
  }, [conversationId, resetConversationUnreadCount, isClient]);

  // Gửi tin nhắn qua WebSocket
  const handleSend = async () => {
    if (!input.trim() || !user || !conversationId || !isClient) return;
    // setIsSending(true);
    // Đảm bảo WebSocket đã kết nối
    if (!isWsConnected) {
      await socketService.connect();
      if (!socketService.isConnected) {
        // setIsSending(false);
        alert('WebSocket not connected. Please try again.');
        return;
      }
      setIsWsConnected(true);
    }
    const tempMessage: Message = {
      message_id: `temp_${conversationId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // ignored by server
      conversation_id: conversationId,
      sender_id: user.user_id,
      sender_name: user.username,
      sender_avatar: user.avatar_url || undefined, // what for?
      content: input,
      timestamp: new Date().toISOString(),  // ignored by server
      read_by: [], // ignored by server
    };
    
    // Add temp message to store
    addMessage(conversationId, tempMessage);
    updateLastMessage(conversationId, tempMessage);
    setInput('');
    
    try {
      await socketService.sendMessage(conversationId, input);
      // Khi server gửi MESSAGE_RECEIVED sẽ tự động update UI
    } catch (err) {
      // Remove temp message on error
      const currentMessages = getMessages(conversationId);
      const filtered = currentMessages.filter((m) => m.message_id !== tempMessage.message_id);
      setMessages(conversationId, filtered);
      console.error('Failed to send message:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <div className="text-gray-600 dark:text-gray-400">Loading chat...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md px-6 py-4 mb-4">
          {error}
        </div>
        <button
          onClick={fetchConversation}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!conversation) {
    return null;
  }

  // Get display name for conversation
  const getConversationDisplayName = (conv: Conversation): string => {
    if (conv.type === 'private') {
      const other = conv.participants.find((p) => p.user_id !== user?.user_id);
      return other?.display_name || 'Unknown User';
    }
    return conv.title || 'Group Chat';
  };

  // Get avatar for conversation
  const getConversationAvatar = (conv: Conversation): string | undefined => {
    if (conv.type === 'private') {
      const other = conv.participants.find((p) => p.user_id !== user?.user_id);
      return other?.avatar_url || undefined;
    }
    return undefined;
  };

  // Map messages to MessageBubble props
  const mappedMessages = messages.map((msg) => ({
    text: msg.content,
    isOwn: msg.sender_id === user?.user_id,
    time: isClient ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
    avatar: msg.sender_avatar || undefined,
    // fileUrl, fileSize, audioUrl: có thể mở rộng nếu có
  }));

  return (
    <>
      {/* Header */}
      <div className='border-b border-gray-200 dark:border-gray-700'>
        <div className='flex items-center'>
          <div className='flex-1'>
            <ChatHeader
              avatar={getConversationAvatar(conversation) || '/avatar-placeholder.png'}
              name={getConversationDisplayName(conversation)}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>
        </div>
      </div>
      {/* Main content */}
      {activeTab === 'conversation' ? (
        <>
          <div className='flex-1 flex flex-col overflow-y-auto'>
            <ChatMessages messages={mappedMessages} />
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className='border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
          >
            <ChatInput
              value={input}
              onChange={e => setInput(e.target.value)}
              onSend={handleSend}
              // disabled={isSending} // no need cuz of validation before send
            />
          </form>
        </>
      ) : (
        <div className='flex-1 flex items-center justify-center text-gray-400'>File sharing coming soon...</div>
      )}
    </>
  );
} 