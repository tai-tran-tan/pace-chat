import React, { useMemo, useState } from 'react';

interface ChatListItemProps {
  conversationId: string;
  avatar: string;
  name: string;
  lastMessage: string;
  unreadCount?: number;
  time: string;
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
  const renderAvatar = () => {
    if (avatar && avatar.trim()) {
      return (
        <img
          src={avatar}
          alt={name}
          className="w-10 h-10 rounded-full object-cover border border-gray-300"
          onError={(e) => {
            // Fallback to default avatar on error
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.nextElementSibling?.classList.remove('hidden');
          }}
        />
      );
    }
    
    return (
      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center border border-gray-300">
        <span className="text-sm font-medium text-gray-600">
          {name.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  };

  const calculateDuration = (time) => {
    var value = null
    const duration = Math.floor((new Date() - new Date(time)) / 1000);
    if (duration >= 86400) value = { days: Math.floor(duration / 86400) }
    else if (duration >= 3600) value = { hours: Math.floor(duration / 3600) }
    else if (duration >= 60) value = { minutes: Math.floor(duration / 60) }
    else value = { seconds: duration }
    return new Intl.DurationFormat("en", { style: "short" }).format(value);
  }

  const msgOld = useMemo(() => calculateDuration(time), [time])

  return (
    <div
      className={`flex items-center px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 ${
        selected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
      }`}
      onClick={onClick}
    >
      <div className="relative">
        {renderAvatar()}
        {unreadCount && unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </div>
      
      <div className="flex-1 ml-3 min-w-0">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm text-gray-900 truncate">
              {name}
            </h3>
            <p className="text-xs text-gray-500 truncate mt-1">
              {lastMessage}
            </p>
          </div>
          <div className="flex flex-col items-end ml-2">
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {msgOld}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatListItem; 