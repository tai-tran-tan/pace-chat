import React, { useEffect, useState } from 'react';

interface ChatListItemProps {
  conversationId: string;
  avatar: string;
  name: string;
  lastMessage: string;
  unreadCount?: number;
  time: string; // ISO string
  selected?: boolean;
  onClick?: () => void;
}

const ChatListItem: React.FC<ChatListItemProps> = ({
  avatar,
  name,
  lastMessage,
  unreadCount,
  time,
  selected = false,
  onClick,
}) => {
    console.log('time', time);
  const [displayTime, setDisplayTime] = useState('');

  useEffect(() => {
    if (time) {
      setDisplayTime(new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } else {
      setDisplayTime('');
    }
  }, [time]);

  return (
    <div
      className={`flex items-center px-4 py-3 cursor-pointer transition bg-white hover:bg-gray-100 ${selected ? 'shadow-lg rounded-xl' : ''}`}
      onClick={onClick}
    >
      <img
        src={'https://i.pravatar.cc/50' || avatar}
        alt={name}
        className='w-10 h-10 rounded-full object-cover border border-gray-300'
      />
      <div className='flex-1 ml-3 min-w-0'>
        <div className='flex justify-between items-center'>
          <span className='font-semibold text-sm truncate'>{name}</span>
          {/* <span className='text-xs text-gray-400'>{displayTime}</span> */}
        </div>
        <div className='flex justify-between items-center mt-1'>
          <span className='text-xs text-gray-500 truncate'>{lastMessage}</span>
          {unreadCount ? (
            <span className='ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5'>{unreadCount}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ChatListItem; 