import { create } from 'zustand';

interface ChatHeaderProps {
  chatAvatar: string;
  chatName: string;
  chatStatus: string;
  onChatBack: () => void;
  onChatCall: () => void;
  onChatVideo: () => void;
  onChatInfo: () => void;
}

interface ChatHeaderState {
  chatHeaderProps: ChatHeaderProps;
  setChatHeaderProps: (props: Partial<ChatHeaderProps>) => void;
  clearChatHeaderProps: () => void;
}

const defaultChatHeaderProps: ChatHeaderProps = {
  chatAvatar: '',
  chatName: '',
  chatStatus: '',
  onChatBack: () => {},
  onChatCall: () => {},
  onChatVideo: () => {},
  onChatInfo: () => {}
};

export const useChatHeaderStore = create<ChatHeaderState>((set) => ({
  chatHeaderProps: defaultChatHeaderProps,
  setChatHeaderProps: (props) => 
    set((state) => ({
      chatHeaderProps: { ...state.chatHeaderProps, ...props }
    })),
  clearChatHeaderProps: () => 
    set({ chatHeaderProps: defaultChatHeaderProps }),
})); 