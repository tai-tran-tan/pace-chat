import React from 'react';
import MessageBubble from './MessageBubble';

interface Message {
  text?: string;
  isOwn?: boolean;
  time: string;
  fileUrl?: string;
  fileSize?: string;
  audioUrl?: string;
  avatar?: string;
}

interface ChatMessagesProps {
  messages: Message[];
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ messages }) => {
  return (
    <div className='flex-1 overflow-y-auto px-6 py-4 bg-gray-50'>
      {messages.map((msg, idx) => (
        <MessageBubble key={idx} {...msg} />
      ))}
    </div>
  );
};

export default ChatMessages; 