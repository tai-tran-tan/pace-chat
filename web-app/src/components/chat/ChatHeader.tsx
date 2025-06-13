import React from 'react';

interface ChatHeaderProps {
  avatar: string;
  name: string;
  activeTab: 'conversation' | 'files';
  onTabChange: (tab: 'conversation' | 'files') => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ avatar, name, activeTab, onTabChange }) => {
  return (
    <div className='flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white'>
      <div className='flex items-center space-x-3'>
        <img src={'https://i.pravatar.cc/50' || avatar} alt={name} className='w-10 h-10 rounded-full object-cover border border-gray-300' />
        <span className='font-bold text-lg'>{name}</span>
      </div>
      <div className='flex items-center space-x-6'>
        <div className='flex space-x-4'>
          <button
            className={`pb-1 border-b-2 text-sm font-medium transition ${activeTab === 'conversation' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}
            onClick={() => onTabChange('conversation')}
          >
            Conversation
          </button>
          <button
            className={`pb-1 border-b-2 text-sm font-medium transition ${activeTab === 'files' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}
            onClick={() => onTabChange('files')}
          >
            Files
          </button>
        </div>
        <div className='flex space-x-3 text-gray-400'>
          <button title='Call'>
            <svg width='20' height='20' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'><path d='M15 5l7 7-7 7M22 12H3'></path></svg>
          </button>
          <button title='Video'>
            <svg width='20' height='20' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'><path d='M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M4 6h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z'></path></svg>
          </button>
          <button title='More'>
            <svg width='20' height='20' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'><circle cx='12' cy='12' r='1'></circle><circle cx='19' cy='12' r='1'></circle><circle cx='5' cy='12' r='1'></circle></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader; 