import React from 'react';
import ChatListItem from './ChatListItem';
import { Conversation } from '@/types';
import { useAuthStore } from '@/store/useAuthStore';

interface ChatListProps {
  items: Conversation[];
  onItemClick?: (conversationId: string) => void;
}

const ChatList: React.FC<ChatListProps> = ({ items, onItemClick }) => {
  const { user } = useAuthStore();
  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const getConversationAvatar = (conversation: Conversation) => {
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