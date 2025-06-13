import { useEffect } from 'react';
import { useConversationStore } from '@/store/useConversationStore';
import { useMessageStore } from '@/store/useMessageStore';

export const useConversationSync = () => {
  const { updateConversationLastMessage } = useConversationStore();
  const { lastMessagesByConversation } = useMessageStore();

  // Sync last messages from message store to conversation store
  useEffect(() => {
    Object.entries(lastMessagesByConversation).forEach(([conversationId, lastMessage]) => {
      if (lastMessage) {
        updateConversationLastMessage(conversationId, lastMessage);
      }
    });
  }, [lastMessagesByConversation, updateConversationLastMessage]);
}; 