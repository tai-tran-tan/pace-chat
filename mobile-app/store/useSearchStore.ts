import { create } from 'zustand';

type User = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  status?: "online" | "offline" | "away";
  last_seen?: string;
};

interface SearchState {
  searchQuery: string;
  isSearching: boolean;
  searchResults: User[];
  showSearchResults: boolean;
  setSearchQuery: (query: string) => void;
  setIsSearching: (isSearching: boolean) => void;
  setSearchResults: (results: User[]) => void;
  setShowSearchResults: (show: boolean) => void;
  resetSearch: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  searchQuery: "",
  isSearching: false,
  searchResults: [],
  showSearchResults: false,
  setSearchQuery: (query) => set({ searchQuery: query }),
  setIsSearching: (isSearching) => set({ isSearching }),
  setSearchResults: (results) => set({ searchResults: results }),
  setShowSearchResults: (show) => set({ showSearchResults: show }),
  resetSearch: () => set({
    searchQuery: "",
    isSearching: false,
    searchResults: [],
    showSearchResults: false,
  }),
})); 