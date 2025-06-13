import React from 'react';

interface UserProfileProps {
  avatar?: string | null;
  username: string;
  email?: string;
}

const UserProfile: React.FC<UserProfileProps> = ({ avatar, username, email }) => {
  return (
    <div className='flex items-center space-x-3 p-4'>
      <img
        src={ 'https://i.pravatar.cc/50' || avatar || '/avatar-placeholder.png'}
        alt='User Avatar'
        className='w-12 h-12 rounded-full object-cover border border-gray-300'
      />
      <div>
        <div className='font-bold text-base'>{username}</div>
        <div className='text-sm text-gray-500'>{email ? email : `@${username}`}</div>
      </div>
    </div>
  );
};

export default UserProfile; 