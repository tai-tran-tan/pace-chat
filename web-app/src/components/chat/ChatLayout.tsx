import React from 'react';
import Sidebar from './Sidebar';

interface ChatLayoutProps {
  chatItems: any[];
  children: React.ReactNode;
}

const ChatLayout: React.FC<ChatLayoutProps> = ({ chatItems, children }) => {
  return (
    <div className='flex h-screen bg-blue-50'>
      <Sidebar chatItems={chatItems} />
      <main className='flex-1 flex flex-col'>{children}</main>
    </div>
  );
};

export default ChatLayout; 