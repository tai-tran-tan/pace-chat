'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, MessageCircle, Users, MoreVertical } from 'lucide-react';
import { useConversationStore } from '@/store/useConversationStore';
import { useAuthStore } from '@/store/useAuthStore';
import { getInitials, truncateText } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Conversation } from '@/types';
import { useRouter } from 'next/navigation';

export default function ConversationList() {
  const {
    conversations,
    isLoading,
    error,
    fetchConversations,
    clearError,
  } = useConversationStore();

  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Filter conversations based on search query
  const filteredConversations = conversations.filter((conversation) => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    return (
      getConversationDisplayName(conversation).toLowerCase().includes(searchLower) ||
      (conversation.participants && conversation.participants.some((participant) =>
        participant.username.toLowerCase().includes(searchLower)
      ))
    );
  });

  const handleConversationClick = (conversation: Conversation) => {
    router.push(`/conversations/${conversation.conversation_id}`);
  };

  // Get display name for conversation (same logic as mobile HomeScreen)
  const getConversationDisplayName = (conversation: Conversation): string => {
    if (conversation.type === 'private' && conversation.participants) {
      const otherParticipant = conversation.participants.find(
        (p) => p.user_id !== user?.user_id
      );
      return otherParticipant?.username || 'Unknown User';
    } else {
      return conversation.name || 'Group Chat';
    }
  };

  // Get avatar for conversation (same logic as mobile HomeScreen)
  const getConversationAvatar = (conversation: Conversation): string | null => {
    if (conversation.type === 'private' && conversation.participants) {
      const otherParticipant = conversation.participants.find(
        (p) => p.user_id !== user?.user_id
      );
      return otherParticipant?.avatar_url || null;
    } else {
      // For group chats, return null to use default group icon
      return null;
    }
  };

  // Get conversation status (same logic as mobile HomeScreen)
  const getConversationStatus = (conversation: Conversation): 'online' | 'offline' | 'away' => {
    if (conversation.type === 'private' && conversation.participants) {
      const otherParticipant = conversation.participants.find(
        (p) => p.user_id !== user?.user_id
      );
      return otherParticipant?.status || 'offline';
    }
    return 'offline'; // Groups don't have online status
  };

  // Format timestamp for display (same logic as mobile HomeScreen)
  const formatTimestamp = (timestamp: string | null): string => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleRetry = () => {
    clearError();
    fetchConversations();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading conversations...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <MessageCircle className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Error loading conversations
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
        <button
          onClick={handleRetry}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Search and Create */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="ml-4 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-md transition-colors"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Conversations List */}
      <div className="space-y-2">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
              <MessageCircle className="h-12 w-12" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {searchQuery
                ? 'Try adjusting your search terms'
                : 'Start a new conversation to connect with friends'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                Start New Conversation
              </button>
            )}
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <div
              key={conversation.conversation_id}
              onClick={() => handleConversationClick(conversation)}
              className="flex items-center p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
            >
              {/* Avatar */}
              <div className="relative">
                {getConversationAvatar(conversation) ? (
                  <img
                    src={getConversationAvatar(conversation)!}
                    alt="Avatar"
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    {conversation.type === 'group' ? (
                      <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {getInitials(getConversationDisplayName(conversation))}
                      </span>
                    )}
                  </div>
                )}
                
                {/* Online Status Indicator */}
                {conversation.type === 'private' && (
                  <div
                    className={cn(
                      'absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white dark:border-gray-800',
                      getConversationStatus(conversation) === 'online' && 'bg-green-500',
                      getConversationStatus(conversation) === 'away' && 'bg-yellow-500',
                      getConversationStatus(conversation) === 'offline' && 'bg-gray-400'
                    )}
                  />
                )}
              </div>

              {/* Conversation Info */}
              <div className="ml-4 flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {getConversationDisplayName(conversation)}
                  </h3>
                  <div className="flex items-center space-x-2">
                    {conversation.last_message_timestamp && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTimestamp(conversation.last_message_timestamp)}
                      </span>
                    )}
                    <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {conversation.last_message_preview
                      ? truncateText(conversation.last_message_preview, 50)
                      : 'No messages yet'}
                  </p>
                  {conversation.unread_count > 0 && (
                    <span className="ml-2 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Conversation Modal - Placeholder */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Create New Conversation
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              This feature is coming soon...
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 