import React from 'react';
import UserProfile from './UserProfile';
import SearchBar from './SearchBar';
import ChatList from './ChatList';
import { DisplayConversation } from '@/types';

interface SidebarProps {
  chatItems: DisplayConversation[];
  user: {
    avatar?: string | null;
    username: string;
    email?: string;
  };
  onLogout: () => void;
  onItemClick?: (conversationId: string) => void;
  onUserClick?: (userId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  chatItems, 
  user, 
  onLogout, 
  onItemClick,
  onUserClick 
}) => {
  const handleUserClick = (userId: string) => {
    // Handle user click - could start a new conversation or navigate to user profile
    if (userId) onUserClick?.(userId);
  };

  const handleConversationClick = (conversationId: string) => {
    // Handle conversation click - navigate to existing conversation
    if (conversationId) onItemClick?.(conversationId);
  };

  return (
    <aside className='w-80 bg-white border-r border-gray-100 flex flex-col h-full'>
      <UserProfile avatar={user.avatar} username={user.username} email={user.email} />
      <SearchBar 
        onUserClick={handleUserClick}
        onConversationClick={handleConversationClick}
      />
      <div className='flex-1 overflow-y-auto'>
        <ChatList items={chatItems} onItemClick={onItemClick} />
      </div>
      <button
        onClick={onLogout}
        className='m-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors'
      >
        Logout
      </button>
    </aside>
  );
};

export default Sidebar; 