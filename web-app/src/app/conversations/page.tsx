'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import socketService from '@/services/socket';
import { useConversationStore } from '@/store/useConversationStore';

export default function ConversationsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const { conversations, isLoading: isConvoLoading, error, fetchConversations } = useConversationStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Disconnect WebSocket when leaving conversations section
  useEffect(() => {
    return () => {
      socketService.disconnect();
      console.log('WebSocket disconnected (left conversations)');
    };
  }, []);

  // Mapping conversations sang ChatListItem
  const chatItems = conversations.map((conv) => {
    let avatar = '';
    let name = '';
    if (conv.type === 'direct') {
      const other = conv.participants.find((p) => p.user_id !== user?.user_id);
      avatar = other?.avatar_url || '/avatar-placeholder.png';
      name = other?.username || 'Unknown User';
    } else {
      avatar = '/avatar-placeholder.png';
      name = conv.name || 'Group Chat';
    }
    return {
      conversationId: conv.conversation_id,
      avatar,
      name,
      lastMessage: conv.last_message?.content || 'No messages yet',
      unreadCount: conv.unread_count,
      time: conv.last_message ? new Date(conv.last_message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      selected: false,
    };
  });

  if (isLoading || isConvoLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="bg-red-100 text-red-700 rounded-md px-6 py-4 mb-4">
          {error}
        </div>
        <button
          onClick={() => fetchConversations()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Conversations</h1>
      </div>
      <div className="flex-1 overflow-y-auto">
        {chatItems.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-500 mb-4">No conversations yet</p>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
                Start a conversation
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 p-4">
            {chatItems.map((item, index) => (
              <div
                key={index}
                className="flex items-center p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/conversations/${item.conversationId}`)}
              >
                <img
                  src={item.avatar}
                  alt={item.name}
                  className="w-12 h-12 rounded-full object-cover mr-4"
                />
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-500 truncate">{item.lastMessage}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">{item.time}</p>
                  {item.unreadCount > 0 && (
                    <span className="inline-block bg-blue-600 text-white text-xs rounded-full px-2 py-1 mt-1">
                      {item.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 