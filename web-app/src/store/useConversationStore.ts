import { create } from 'zustand';
import apiService from '@/services/api';
import { Conversation } from '@/types';

interface ConversationState {
  conversations: Conversation[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
}

interface ConversationActions {
  fetchConversations: (isRefresh?: boolean) => Promise<void>;
  setConversations: (convs: Conversation[]) => void;
  updateConversationLastMessage: (conversationId: string, lastMessage: any) => void;
  updateConversationUnreadCount: (conversationId: string, unreadCount: number) => void;
  resetConversationUnreadCount: (conversationId: string) => void;
  clearError: () => void;
}

export const useConversationStore = create<ConversationState & ConversationActions>((set) => ({
  conversations: [],
  isLoading: false,
  isRefreshing: false,
  error: null,

  fetchConversations: async (isRefresh = false) => {
    set((state) => ({
      ...state,
      isLoading: !isRefresh,
      isRefreshing: isRefresh,
      error: null,
    }));
    try {
      const response = await apiService.getConversations();
      if (response.data && Array.isArray(response.data)) {
        set({
          conversations: response.data,
          isLoading: false,
          isRefreshing: false,
          error: null,
        });
      } else {
        set({
          isLoading: false,
          isRefreshing: false,
          error: 'Failed to load conversations.',
        });
      }
    } catch (err: any) {
      set({
        isLoading: false,
        isRefreshing: false,
        error: 'Failed to load conversations. Please try again.',
      });
    }
  },

  setConversations: (convs) => set({ conversations: convs }),
  
  updateConversationLastMessage: (conversationId, lastMessage) => {
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.conversation_id === conversationId
          ? {
              ...conv,
              last_message: lastMessage,
            }
          : conv
      ),
    }));
  },

  updateConversationUnreadCount: (conversationId, unreadCount) => {
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.conversation_id === conversationId
          ? {
              ...conv,
              unread_count: unreadCount,
            }
          : conv
      ),
    }));
  },

  resetConversationUnreadCount: (conversationId) => {
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.conversation_id === conversationId
          ? {
              ...conv,
              unread_count: 0,
            }
          : conv
      ),
    }));
  },

  clearError: () => set({ error: null }),
})); 