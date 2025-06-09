import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ChatHeaderProps {
  chatAvatar: string;
  chatName: string;
  chatStatus: string;
  onChatBack: () => void;
  onChatCall: () => void;
  onChatVideo: () => void;
  onChatInfo: () => void;
}

interface ChatHeaderContextType {
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

const ChatHeaderContext = createContext<ChatHeaderContextType | undefined>(undefined);

export const useChatHeader = () => {
  const context = useContext(ChatHeaderContext);
  if (!context) {
    throw new Error('useChatHeader must be used within a ChatHeaderProvider');
  }
  return context;
};

interface ChatHeaderProviderProps {
  children: ReactNode;
}

export const ChatHeaderProvider: React.FC<ChatHeaderProviderProps> = ({ children }) => {
  const [chatHeaderProps, setChatHeaderPropsState] = useState<ChatHeaderProps>(defaultChatHeaderProps);

  const setChatHeaderProps = (props: Partial<ChatHeaderProps>) => {
    setChatHeaderPropsState(prev => ({ ...prev, ...props }));
  };

  const clearChatHeaderProps = () => {
    setChatHeaderPropsState(defaultChatHeaderProps);
  };

  return (
    <ChatHeaderContext.Provider value={{
      chatHeaderProps,
      setChatHeaderProps,
      clearChatHeaderProps
    }}>
      {children}
    </ChatHeaderContext.Provider>
  );
}; 