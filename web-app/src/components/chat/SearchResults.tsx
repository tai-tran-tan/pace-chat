import React from 'react';
import { UserSearchResult, ConversationSearchResult } from '@/types';

interface SearchResultsProps {
  users: UserSearchResult[];
  conversations: ConversationSearchResult[];
  isLoading: boolean;
  isSearching: boolean;
  onUserClick?: (userId: string) => void;
  onConversationClick?: (conversationId: string) => void;
  onClearSearch?: () => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  users,
  conversations,
  isLoading,
  isSearching,
  onUserClick,
  onConversationClick,
  onClearSearch,
}) => {
  console.log('SearchResults render:', { users, conversations, isLoading, isSearching });
  
  const hasResults = users.length > 0 || conversations.length > 0;
  const totalResults = users.length + conversations.length;

  if (isLoading || isSearching) {
    return (
      <div className="px-4 py-8 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
        <p className="text-sm text-gray-500">Searching...</p>
      </div>
    );
  }

  if (!hasResults) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm text-gray-500">No results found</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-2 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">
            Search Results ({totalResults})
          </h3>
          {onClearSearch && (
            <button
              onClick={onClearSearch}
              className="text-xs text-blue-500 hover:text-blue-600"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Users Section */}
      {users.length > 0 && (
        <div className="py-2">
          <div className="px-4 py-1">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Users ({users.length})
            </h4>
          </div>
          {users.map((user) => (
            <div
              key={user.user_id}
              onClick={() => onUserClick?.(user.user_id)}
              className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.username}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.username}
                  </p>
                  <p className="text-xs text-gray-500">User</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Conversations Section */}
      {conversations.length > 0 && (
        <div className="py-2">
          <div className="px-4 py-1">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Conversations ({conversations.length})
            </h4>
          </div>
          {conversations.map((conversation) => (
            <div
              key={conversation.conversation_id}
              onClick={() => onConversationClick?.(conversation.conversation_id)}
              className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {conversation.type === 'group' ? (
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {conversation.participants && conversation.participants[0]?.username.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {conversation.name || 
                     (conversation.type === 'private' && conversation.participants
                       ? conversation.participants[0]?.username || 'Unknown User'
                       : 'Group Chat')}
                  </p>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      {conversation.type === 'group' ? 'Group' : 'Private'}
                    </span>
                    {conversation.unread_count > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {conversation.unread_count}
                      </span>
                    )}
                  </div>
                  {conversation.last_message_preview && (
                    <p className="text-xs text-gray-500 truncate mt-1">
                      {conversation.last_message_preview}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchResults; 