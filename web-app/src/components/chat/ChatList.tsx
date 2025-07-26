import React from 'react';
import ChatListItem from './ChatListItem';
import { DisplayConversation } from '@/types';
import { useAuthStore } from '@/store/useAuthStore';

interface ChatListProps {
  items: DisplayConversation[];
  onItemClick?: (conversationId: string) => void;
}

const ChatList: React.FC<ChatListProps> = ({ items, onItemClick }) => {
  const { user } = useAuthStore();

  const getConversationAvatar = (conversation: DisplayConversation) => {
    if (conversation.type === 'group') {
      return null; // Use default group icon
    }
    
    if (conversation.participants && conversation.participants.length > 0) {
      return conversation.participants[0].avatar_url;
    }
    
    return null;
  };

  return (
    <div className='overflow-y-auto h-full'>
      {items.map((conversation) => (
        <ChatListItem
          key={conversation.conversationId}
          conversationId={conversation.conversationId}
          avatar={getConversationAvatar(conversation) || ''}
          name={conversation.displayName}
          lastMessage={conversation.lastMessage || 'No messages yet'}
          unreadCount={conversation.unreadCount}
          time={conversation.time}
          onClick={() => onItemClick?.(conversation.conversationId)}
        />
      ))}
    </div>
  );
};

export default ChatList; 