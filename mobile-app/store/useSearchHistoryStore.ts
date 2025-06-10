import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SearchHistoryItem = {
  query: string;
  timestamp: number;
};

type RecentContact = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  lastContacted: number;
};

interface SearchHistoryState {
  searchHistory: SearchHistoryItem[];
  recentContacts: RecentContact[];
  maxHistoryItems: number;
  maxRecentContacts: number;
  
  // Actions
  addSearchQuery: (query: string) => void;
  removeSearchQuery: (query: string) => void;
  clearSearchHistory: () => void;
  addRecentContact: (contact: Omit<RecentContact, 'lastContacted'>) => void;
  removeRecentContact: (userId: string) => void;
  clearRecentContacts: () => void;
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
}

const STORAGE_KEYS = {
  SEARCH_HISTORY: 'search_history',
  RECENT_CONTACTS: 'recent_contacts',
};

export const useSearchHistoryStore = create<SearchHistoryState>((set, get) => ({
  searchHistory: [],
  recentContacts: [],
  maxHistoryItems: 5,
  maxRecentContacts: 10,

  addSearchQuery: (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    set((state) => {
      // Remove existing query if it exists
      const filteredHistory = state.searchHistory.filter(
        item => item.query.toLowerCase() !== trimmedQuery.toLowerCase()
      );

      // Add new query at the beginning
      const newHistory = [
        { query: trimmedQuery, timestamp: Date.now() },
        ...filteredHistory
      ].slice(0, state.maxHistoryItems);

      return { searchHistory: newHistory };
    });

    // Save to storage
    get().saveToStorage();
  },

  removeSearchQuery: (query: string) => {
    set((state) => ({
      searchHistory: state.searchHistory.filter(
        item => item.query.toLowerCase() !== query.toLowerCase()
      )
    }));
    get().saveToStorage();
  },

  clearSearchHistory: () => {
    set({ searchHistory: [] });
    get().saveToStorage();
  },

  addRecentContact: (contact: Omit<RecentContact, 'lastContacted'>) => {
    set((state) => {
      // Remove existing contact if it exists
      const filteredContacts = state.recentContacts.filter(
        item => item.user_id !== contact.user_id
      );

      // Add new contact at the beginning
      const newContacts = [
        { ...contact, lastContacted: Date.now() },
        ...filteredContacts
      ].slice(0, state.maxRecentContacts);

      return { recentContacts: newContacts };
    });

    get().saveToStorage();
  },

  removeRecentContact: (userId: string) => {
    set((state) => ({
      recentContacts: state.recentContacts.filter(
        contact => contact.user_id !== userId
      )
    }));
    get().saveToStorage();
  },

  clearRecentContacts: () => {
    set({ recentContacts: [] });
    get().saveToStorage();
  },

  loadFromStorage: async () => {
    try {
      const [historyData, contactsData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY),
        AsyncStorage.getItem(STORAGE_KEYS.RECENT_CONTACTS),
      ]);

      const searchHistory = historyData ? JSON.parse(historyData) : [];
      const recentContacts = contactsData ? JSON.parse(contactsData) : [];

      set({ searchHistory, recentContacts });
    } catch (error) {
      console.error('Failed to load search history from storage:', error);
    }
  },

  saveToStorage: async () => {
    try {
      const { searchHistory, recentContacts } = get();
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(searchHistory)),
        AsyncStorage.setItem(STORAGE_KEYS.RECENT_CONTACTS, JSON.stringify(recentContacts)),
      ]);
    } catch (error) {
      console.error('Failed to save search history to storage:', error);
    }
  },
})); 