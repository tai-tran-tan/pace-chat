'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useMessageStore } from '@/store/useMessageStore';
import apiService from '@/services/api';
import socketService from '@/services/socket';
import { Conversation, Message, User } from '@/types';
import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
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

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'conversation' | 'files'>('conversation');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Get messages from message store
  const messages = getMessages(conversationId);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    let isMounted = true;
    (async () => {
      if (isMounted) {
        await socketService.connect();
        console.log('WebSocket connected (conversation detail)');
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
      }
    });
    return () => {
      isMounted = false;
      unsubscribe();
      // Không disconnect ở đây, để giữ kết nối khi chuyển conversation
    };
  }, [conversationId, addMessage, updateLastMessage, getMessages]);

  // Gửi tin nhắn qua WebSocket
  const handleSend = async () => {
    if (!input.trim() || !user || !conversationId) return;
    setIsSending(true);
    // Đảm bảo WebSocket đã kết nối
    if (!socketService.isConnected) {
      await socketService.connect();
      if (!socketService.isConnected) {
        setIsSending(false);
        alert('WebSocket not connected. Please try again.');
        return;
      }
    }
    const tempMessage: Message = {
      message_id: `temp_${Date.now()}`,
      conversation_id: conversationId,
      sender_id: user.user_id,
      sender_name: user.username,
      sender_avatar: user.avatar_url || undefined,
      content: input,
      message_type: 'text',
      timestamp: new Date().toISOString(),
      read_by: [],
    };
    
    // Add temp message to store
    addMessage(conversationId, tempMessage);
    updateLastMessage(conversationId, tempMessage);
    setInput('');
    
    try {
      await socketService.sendMessage(conversationId, input, 'text');
      // Khi server gửi MESSAGE_RECEIVED sẽ tự động update UI
    } catch (err) {
      // Remove temp message on error
      const currentMessages = getMessages(conversationId);
      const filtered = currentMessages.filter((m) => m.message_id !== tempMessage.message_id);
      setMessages(conversationId, filtered);
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
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
      return other?.username || 'Unknown User';
    }
    return conv.name || 'Group Chat';
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
    time: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
            <div ref={messagesEndRef} />
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
              disabled={isSending}
            />
          </form>
        </>
      ) : (
        <div className='flex-1 flex items-center justify-center text-gray-400'>File sharing coming soon...</div>
      )}
    </>
  );
} 