import { create } from 'zustand';

export type Message = {
  id: string;
  user: string;
  text: string;
  timestamp: number;
};

type ChatStore = {
  messages: Message[];
  addMessage: (msg: Message) => void;
  clearMessages: () => void;
};

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  addMessage: (msg) =>
    set((state) => ({
      messages: [...state.messages, msg],
    })),
  clearMessages: () => set({ messages: [] }),
})); 