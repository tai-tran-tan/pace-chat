import { create } from 'zustand';
import { Message } from '@/types';

interface MessageState {
  messagesByConversation: Record<string, Message[]>;
  lastMessagesByConversation: Record<string, Message | null>;
}

interface MessageActions {
  setMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateLastMessage: (conversationId: string, message: Message) => void;
  getLastMessage: (conversationId: string) => Message | null;
  getMessages: (conversationId: string) => Message[];
  clearMessages: (conversationId: string) => void;
  clearAllMessages: () => void;
}

export const useMessageStore = create<MessageState & MessageActions>((set, get) => ({
  messagesByConversation: {},
  lastMessagesByConversation: {},

  setMessages: (conversationId, messages) => {
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: messages,
      },
      lastMessagesByConversation: {
        ...state.lastMessagesByConversation,
        [conversationId]: messages.length > 0 ? messages[messages.length - 1] : null,
      },
    }));
  },

  addMessage: (conversationId, message) => {
    set((state) => {
      const currentMessages = state.messagesByConversation[conversationId] || [];
      const updatedMessages = [...currentMessages, message];
      
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: updatedMessages,
        },
        lastMessagesByConversation: {
          ...state.lastMessagesByConversation,
          [conversationId]: message,
        },
      };
    });
  },

  updateLastMessage: (conversationId, message) => {
    set((state) => ({
      lastMessagesByConversation: {
        ...state.lastMessagesByConversation,
        [conversationId]: message,
      },
    }));
  },

  getLastMessage: (conversationId) => {
    return get().lastMessagesByConversation[conversationId] || null;
  },

  getMessages: (conversationId) => {
    return get().messagesByConversation[conversationId] || [];
  },

  clearMessages: (conversationId) => {
    set((state) => {
      const newMessagesByConversation = { ...state.messagesByConversation };
      const newLastMessagesByConversation = { ...state.lastMessagesByConversation };
      
      delete newMessagesByConversation[conversationId];
      delete newLastMessagesByConversation[conversationId];
      
      return {
        messagesByConversation: newMessagesByConversation,
        lastMessagesByConversation: newLastMessagesByConversation,
      };
    });
  },

  clearAllMessages: () => {
    set({
      messagesByConversation: {},
      lastMessagesByConversation: {},
    });
  },
})); 