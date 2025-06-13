import React from 'react';
import UserProfile from './UserProfile';
import SearchBar from './SearchBar';
import ChatList from './ChatList';

interface SidebarProps {
  chatItems: any[];
  user: {
    avatar?: string | null;
    username: string;
    email?: string;
  };
  onLogout: () => void;
  onItemClick?: (conversationId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ chatItems, user, onLogout, onItemClick }) => {
  return (
    <aside className='w-80 bg-white border-r border-gray-100 flex flex-col h-full'>
      <UserProfile avatar={user.avatar} username={user.username} email={user.email} />
      <SearchBar />
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