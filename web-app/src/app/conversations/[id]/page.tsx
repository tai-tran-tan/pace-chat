'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import apiService from '@/services/api';
import socketService from '@/services/socket';
import { Conversation, Message, User } from '@/types';
import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params?.id as string;
  const { user } = useAuthStore();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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
      if (convRes.data && convRes.data.conversation_id) {
        setConversation(convRes.data);
      } else {
        throw new Error('Conversation not found');
      }
      // Get messages
      const msgRes = await apiService.getMessages(conversationId);
      if (msgRes.data && Array.isArray(msgRes.data)) {
        setMessages(msgRes.data);
      } else if (msgRes.data && Array.isArray(msgRes.data.data)) {
        setMessages(msgRes.data.data);
      } else {
        setMessages([]);
      }
    } catch (err: any) {
      setError('Failed to load conversation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

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
        setMessages((prev) => {
          // Nếu có temp message với cùng content và sender, loại bỏ temp trước khi thêm message thực
          const filtered = prev.filter(
            (m) =>
              !m.message_id.startsWith('temp_') ||
              m.content !== wsMessage.message.content ||
              m.sender_id !== wsMessage.message.sender_id
          );
          return [...filtered, wsMessage.message];
        });
      }
    });
    return () => {
      isMounted = false;
      unsubscribe();
      // Không disconnect ở đây, để giữ kết nối khi chuyển conversation
    };
  }, [conversationId]);

  // Gửi tin nhắn qua WebSocket
  const handleSend = async () => {
    if (!input.trim() || !user || !conversationId) return;
    setIsSending(true);
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
    setMessages((prev) => [...prev, tempMessage]);
    setInput('');
    try {
      await socketService.connect(); // Đảm bảo đã connect
      await socketService.sendMessage(conversationId, input, 'text');
      console.log('Message sent via WebSocket:', input);
      // Khi server gửi MESSAGE_RECEIVED sẽ tự động update UI
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.message_id !== tempMessage.message_id));
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Test WebSocket connection
  const testWebSocket = () => {
    console.log('Testing WebSocket connection...');
    const token = localStorage.getItem('access_token');
    console.log('Token:', token ? token.substring(0, 20) + '...' : 'No token');
    
    // Force reconnect
    socketService.disconnect();
    setTimeout(() => {
      socketService.connect();
    }, 1000);
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

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <button onClick={() => router.back()} className="mr-4 text-blue-600 hover:text-blue-800">{'< Back'}</button>
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-full bg-blue-200 flex items-center justify-center mr-3">
            {conversation.type === 'group' ? (
              <span className="font-bold text-blue-700">G</span>
            ) : (
              <span className="font-bold text-blue-700">
                {getConversationDisplayName(conversation).charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {getConversationDisplayName(conversation)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {conversation.type === 'private' ? 'Private chat' : 'Group chat'}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400">No messages yet</div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.message_id}
              className={cn(
                'flex flex-col',
                msg.sender_id === user?.user_id ? 'items-end' : 'items-start'
              )}
            >
              <div
                className={cn(
                  'rounded-lg px-4 py-2 max-w-xs break-words',
                  msg.sender_id === user?.user_id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                )}
              >
                {msg.content}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 mr-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isSending}
        />
        <button
          type="submit"
          disabled={isSending || !input.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
} 