import React from 'react';

const SearchBar = () => {
  return (
    <div className='px-4 py-2'>
      <input
        type='text'
        placeholder='Search'
        className='w-full px-4 py-2 rounded-full bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm'
      />
    </div>
  );
};

export default SearchBar; 