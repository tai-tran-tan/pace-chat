import React from 'react';
import ChatListItem from './ChatListItem';

interface ChatItem {
  conversationId: string;
  avatar: string;
  name: string;
  lastMessage: string;
  unreadCount?: number;
  time: string;
  selected?: boolean;
}

interface ChatListProps {
  items: ChatItem[];
  onItemClick?: (conversationId: string) => void;
}

const ChatList: React.FC<ChatListProps> = ({ items, onItemClick }) => {
  return (
    <div className='overflow-y-auto h-full'>
      {items.map((item, idx) => (
        <ChatListItem key={item.conversationId} {...item} onClick={() => onItemClick?.(item.conversationId)} />
      ))}
    </div>
  );
};

export default ChatList; 