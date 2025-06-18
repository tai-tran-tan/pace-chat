import React from 'react';
import ChatListItem from './ChatListItem';
import { Conversation } from '@/types';

interface ChatListProps {
  items: Conversation[];
  onItemClick?: (conversationId: string) => void;
}

const ChatList: React.FC<ChatListProps> = ({ items, onItemClick }) => {
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

  const getConversationName = (conversation: Conversation) => {
    if (conversation.name) return conversation.name;
    
    if (conversation.type === 'private' && conversation.participants && conversation.participants.length > 0) {
      return conversation.participants[0].username;
    }
    
    return 'Group Chat';
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
          key={conversation.conversation_id}
          conversationId={conversation.conversation_id}
          avatar={getConversationAvatar(conversation) || ''}
          name={getConversationName(conversation)}
          lastMessage={conversation.last_message_preview || 'No messages yet'}
          unreadCount={conversation.unread_count}
          time={formatTime(conversation.last_message_timestamp)}
          onClick={() => onItemClick?.(conversation.conversation_id)}
        />
      ))}
    </div>
  );
};

export default ChatList; 