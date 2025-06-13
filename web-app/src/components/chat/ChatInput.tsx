import React from 'react';

interface ChatInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSend: () => void;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ value, onChange, onSend, disabled }) => {
  return (
    <div className='flex items-center px-6 py-4 border-t border-gray-100 bg-white'>
      <button className='mr-3 text-gray-400 hover:text-blue-500' title='Attach' type='button'>
        <svg width='24' height='24' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'><path d='M21 15V7a2 2 0 00-2-2H7a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2z'></path></svg>
      </button>
      <input
        type='text'
        placeholder='Type a message...'
        className='flex-1 px-4 py-2 rounded-full bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm'
        value={value}
        onChange={onChange}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onSend();
          }
        }}
        disabled={disabled}
      />
      <button
        className='ml-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-2 transition'
        title='Send'
        type='button'
        onClick={onSend}
        disabled={disabled}
      >
        <svg width='20' height='20' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'><path d='M22 2L11 13'></path><path d='M22 2l-7 20-4-9-9-4 20-7z'></path></svg>
      </button>
    </div>
  );
};

export default ChatInput; 