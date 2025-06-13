import React from 'react';

interface MessageBubbleProps {
  text?: string;
  isOwn?: boolean;
  time: string;
  fileUrl?: string;
  fileSize?: string;
  audioUrl?: string;
  avatar?: string;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  text,
  isOwn = false,
  time,
  fileUrl,
  fileSize,
  audioUrl,
  avatar,
}) => {
  return (
    <div className={`flex items-end mb-4 ${isOwn ? 'justify-end' : ''}`}>  
      {!isOwn && avatar && (
        <img src={avatar} alt='avatar' className='w-8 h-8 rounded-full mr-2' />
      )}
      <div className={`max-w-xs rounded-2xl px-4 py-2 shadow ${isOwn ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-900'}`}>
        {text && <div className='mb-1'>{text}</div>}
        {fileUrl && (
          <div className='flex items-center justify-center bg-gray-200 rounded-lg p-4 mb-1'>
            <a href={fileUrl} download className='flex flex-col items-center'>
              <svg width='32' height='32' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'><path d='M12 5v14M19 12l-7 7-7-7'></path></svg>
              <span className='text-xs mt-1'>{fileSize}</span>
            </a>
          </div>
        )}
        {audioUrl && (
          <audio controls className='w-full mt-1'>
            <source src={audioUrl} type='audio/mpeg' />
            Your browser does not support the audio element.
          </audio>
        )}
        <div className='text-xs text-right text-gray-400 mt-1'>{time}</div>
      </div>
      {isOwn && avatar && (
        <img src={avatar} alt='avatar' className='w-8 h-8 rounded-full ml-2' />
      )}
    </div>
  );
};

export default MessageBubble; 