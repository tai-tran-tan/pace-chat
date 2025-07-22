import { useState, useCallback, useRef, useEffect } from "react";
import { useDebounce } from "./useDebounce";
import apiService from "@/services/api";
import {
  SearchState,
  UserSearchResult,
  ConversationSearchResult,
  Conversation,
  ConversationParticipant
} from "@/types";

export const useSearch = () => {
  const [state, setState] = useState<SearchState>({
    query: "",
    results: {
      users: [],
      conversations: []
    },
    isLoading: false,
    isSearching: false,
    error: null
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const debouncedQuery = useDebounce(state.query, 300);

  const searchUsers = useCallback(async (query: string) => {
    console.log('searchUsers called with query:', query);
    if (!query.trim()) {
      setState((prev) => ({
        ...prev,
        results: { ...prev.results, users: [] },
        error: null
      }));
      return;
    }

    try {
      // Cancel previous request if exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      setState((prev) => ({ ...prev, isSearching: true, error: null }));

      const response = await apiService.searchUsers(query);
      console.log('searchUsers response:', response);
      
      // API returns direct array, not wrapped in ApiResponse
      const users: UserSearchResult[] = response.data || [];
      console.log('searchUsers users:', users);

      setState((prev) => ({
        ...prev,
        results: { ...prev.results, users },
        isSearching: false,
        error: null
      }));
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        return; // Request was cancelled
      }

      const errorMessage = error instanceof Error 
        ? error.message 
        : "Failed to search users";

      setState((prev) => ({
        ...prev,
        isSearching: false,
        error: errorMessage
      }));
    }
  }, []);

  const searchConversations = useCallback(async (query: string) => {
    console.log('searchConversations called with query:', query);
    if (!query.trim()) {
      setState((prev) => ({
        ...prev,
        results: { ...prev.results, conversations: [] },
        error: null
      }));
      return;
    }

    try {
      // Cancel previous request if exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      setState((prev) => ({ ...prev, isSearching: true, error: null }));

      // Use existing /conversations endpoint and filter on client side
      const response = await apiService.getConversations();
      const allConversations: Conversation[] = response.data.data || [];
      
      // Filter conversations based on query
      const filteredConversations: ConversationSearchResult[] = allConversations.filter((conversation: Conversation) => {
        const searchTerm = query.toLowerCase();
        
        // Search in conversation name (for group chats)
        if (conversation.title && conversation.title.toLowerCase().includes(searchTerm)) {
          return true;
        }
        
        // Search in participant usernames
        if (conversation.participants) {
          return conversation.participants.some((participant: ConversationParticipant) => 
            participant.username.toLowerCase().includes(searchTerm)
          );
        }
        
        return false;
      }).map((conversation: Conversation): ConversationSearchResult => ({
        conversation_id: conversation.conversation_id,
        type: conversation.type as 'private' | 'group',
        name: conversation.title,
        participants: conversation.participants.map((participant: ConversationParticipant): UserSearchResult => ({
          user_id: participant.user_id,
          username: participant.username,
          avatar_url: participant.avatar_url
        })),
        last_message_preview: conversation.last_message?.content || null,
        last_message_timestamp: conversation.last_message?.timestamp || null,
        unread_count: conversation.unread_count || 0
      }));

      setState((prev) => ({
        ...prev,
        results: { ...prev.results, conversations: filteredConversations },
        isSearching: false,
        error: null
      }));
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        return; // Request was cancelled
      }

      const errorMessage = error instanceof Error 
        ? error.message 
        : "Failed to search conversations";

      setState((prev) => ({
        ...prev,
        isSearching: false,
        error: errorMessage
      }));
    }
  }, []);

  const performSearch = useCallback(
    async (query: string) => {
      console.log("performSearch called with query:", query);
      setState((prev) => ({ ...prev, isLoading: true }));

      // Search both users and conversations
      await Promise.all([searchUsers(query), searchConversations(query)]);

      setState((prev) => ({ ...prev, isLoading: false }));
    },
    [searchUsers, searchConversations]
  );

  const updateQuery = useCallback((query: string) => {
    console.log("updateQuery called with query:", query);
    setState((prev) => ({ ...prev, query }));
  }, []);

  const clearSearch = useCallback(() => {
    setState({
      query: "",
      results: {
        users: [],
        conversations: []
      },
      isLoading: false,
      isSearching: false,
      error: null
    });

    // Cancel any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Effect to trigger search when debounced query changes
  useEffect(() => {
    console.log('useEffect triggered - debouncedQuery:', debouncedQuery);
    if (debouncedQuery) {
      performSearch(debouncedQuery);
    } else {
      // Clear results when query is empty
      setState((prev) => ({
        ...prev,
        results: {
          users: [],
          conversations: []
        },
        isLoading: false,
        isSearching: false,
        error: null
      }));
    }
  }, [debouncedQuery, performSearch]);

  console.log('useSearch state:', state);

  return {
    ...state,
    searchUsers,
    searchConversations,
    performSearch,
    updateQuery,
    clearSearch
  };
};
