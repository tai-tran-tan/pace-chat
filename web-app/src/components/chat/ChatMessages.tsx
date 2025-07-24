import React from 'react';
import { useEffect } from 'react';
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

  // Scroll to bottom when messages change
  useEffect(() => {
    document.getElementById('dummy-bottom-tag-for-scroll')?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  return (
    <div className='flex-1 overflow-y-auto px-6 py-4 bg-gray-50'>
      {messages.map((msg, idx) => (
        <MessageBubble key={idx} {...msg} />
      ))}
      <div id="dummy-bottom-tag-for-scroll" />
    </div>
  );
};

export default ChatMessages; 