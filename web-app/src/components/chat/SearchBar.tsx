import React, { useState, useRef, useEffect } from 'react';
import { useSearch } from '@/hooks/useSearch';
import SearchResults from './SearchResults';

interface SearchBarProps {
  onUserClick?: (userId: string) => void;
  onConversationClick?: (conversationId: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onUserClick, onConversationClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    query,
    results,
    isLoading,
    isSearching,
    error,
    updateQuery,
    clearSearch,
  } = useSearch();

  useEffect(() => {
    setInputValue(query);
  }, [query]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    updateQuery(value);
    
    if (value.trim()) {
      setIsExpanded(true);
    } else {
      setIsExpanded(false);
    }
  };

  const handleInputFocus = () => {
    if (inputValue.trim()) {
      setIsExpanded(true);
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      setIsExpanded(false);
    }, 200);
  };

  const handleClearSearch = () => {
    clearSearch();
    setInputValue('');
    setIsExpanded(false);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleUserClick = (userId: string) => {
    onUserClick?.(userId);
    setIsExpanded(false);
    clearSearch();
    setInputValue('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleConversationClick = (conversationId: string) => {
    onConversationClick?.(conversationId);
    setIsExpanded(false);
    clearSearch();
    setInputValue('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="relative">
      <div className="px-4 py-2">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search users or conversations..."
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            className="w-full px-4 py-2 pl-10 rounded-full bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          {(isLoading || isSearching) && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>
      </div>

      {/* Debug info */}
      <div className="px-4 py-1 text-xs text-gray-500">
        Debug: isExpanded={isExpanded.toString()}, inputValue="{inputValue}", 
        users={results.users.length}, conversations={results.conversations.length}
      </div>

      {/* Search Results Dropdown */}
      {isExpanded && (
        <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-hidden">
          <SearchResults
            users={results.users}
            conversations={results.conversations}
            isLoading={isLoading}
            isSearching={isSearching}
            onUserClick={handleUserClick}
            onConversationClick={handleConversationClick}
            onClearSearch={handleClearSearch}
          />
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="px-4 pb-2">
          <p className="text-xs text-red-500">{error}</p>
        </div>
      )}
    </div>
  );
};

export default SearchBar; 