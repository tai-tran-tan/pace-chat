import { create } from 'zustand';
import apiService from '@/services/api';
import { Conversation, ConversationParticipant, Message } from '@/types';

interface ConversationState {
  conversations: Conversation[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
}

interface ConversationActions {
  fetchConversations: (isRefresh?: boolean) => Promise<void>;
  setConversations: (convs: Conversation[]) => void;
  updateConversationLastMessage: (conversationId: string, lastMessage: Message) => void;
  updateConversationUnreadCount: (conversationId: string, unreadCount: number) => void;
  resetConversationUnreadCount: (conversationId: string) => void;
  clearError: () => void;
}

async function fetchUserDetails(userIds: string[]): Promise<Record<string, ConversationParticipant>> {
  const uniqueIds = Array.from(new Set(userIds));
  const userDetails = await Promise.allSettled(uniqueIds.map(id => apiService.getUserById(id)));
  console.log('🔍 User details:', userDetails);
  const userMap: Record<string, any> = {};
  userDetails.forEach((result) => {
    if (result.status === 'fulfilled' && result.value.data && result.value.data.user_id) {
      userMap[result.value.data.user_id] = result.value.data;
    }
  });
  return userMap;
}

export const useConversationStore = create<ConversationState & ConversationActions>((set) => ({
  conversations: [],
  isLoading: false,
  isRefreshing: false,
  error: null,

  fetchConversations: async (isRefresh = false) => {
    set({ isLoading: !isRefresh, isRefreshing: isRefresh, error: null });
    try {
      const response = await apiService.getConversations();
      let conversationsData: Conversation[] = [];
      if (response.data && Array.isArray(response.data)) {
        conversationsData = response.data;
      } else {
        set({ isLoading: false, isRefreshing: false, error: 'Invalid response format from server.' });
        return;
      }

      const allUserIds = conversationsData.flatMap(conv =>
        Array.isArray(conv.participants) && typeof conv.participants[0] === 'string'
          ? conv.participants as string[]
          : []
      );
      console.log('🔍 All user IDs:', allUserIds);
      const userMap = allUserIds.length > 0 ? await fetchUserDetails(allUserIds) : {};

      console.log('🔍 User map:', userMap);
      console.log('🔍 Conversations data:', conversationsData);
      const validatedConversations = conversationsData.map(conv => {
        if (Array.isArray(conv.participants) && typeof conv.participants[0] === 'string') {
          return {
            ...conv,
            participants: (conv.participants as string[]).map(id => userMap[id]).filter(Boolean),
          };
        }
        return conv;
      });

      console.log('🔍 Validated conversations:', validatedConversations);

      set({
        conversations: validatedConversations,
        isLoading: false,
        isRefreshing: false,
        error: null,
      });
    } catch (err: any) {
      set({
        isLoading: false,
        isRefreshing: false,
        error: 'Failed to load conversations. Please try again.',
      });
    }
  },

  setConversations: (convs) => set({ conversations: convs }),
  
  updateConversationLastMessage: (conversationId: string, lastMessage: Message) => {
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

  updateConversationUnreadCount: (conversationId: string, unreadCount: number) => {
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