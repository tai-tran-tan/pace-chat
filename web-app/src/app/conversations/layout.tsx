"use client"

import React, { useEffect } from 'react';
import Sidebar from '@/components/chat/Sidebar';
import { useConversationStore } from '@/store/useConversationStore';
import { useMessageStore } from '@/store/useMessageStore';
import { useConversationSync } from '@/hooks/useConversationSync';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';

export default function ConversationsLayout({ children }: { children: React.ReactNode }) {
  const { conversations, fetchConversations } = useConversationStore();
  const { getLastMessage } = useMessageStore();
  const { user, logout } = useAuthStore();
  const router = useRouter();

  // Use sync hook to keep conversation store updated with message store
  useConversationSync();

  // Always fetch conversations when layout mounts
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  const handleItemClick = (conversationId: string) => {
    router.push(`/conversations/${conversationId}`);
  };

  // Mapping conversations sang chatItems cho Sidebar
  const chatItems = conversations.map((conv) => {
    let avatar = '';
    let name = '';
    if (conv.type === 'direct') {
      const other = conv.participants.find((p) => p.user_id !== user?.user_id);
      avatar = other?.avatar_url || '/avatar-placeholder.png';
      name = other?.username || 'Unknown User';
    } else {
      avatar = '/avatar-placeholder.png';
      name = conv.name || 'Group Chat';
    }

    // Get last message from message store if available, otherwise use conversation's last_message
    const lastMessageFromStore = getLastMessage(conv.conversation_id);
    const lastMessageContent = lastMessageFromStore?.content || conv.last_message?.content || 'No messages yet';
    const lastMessageTime = lastMessageFromStore?.timestamp || conv.last_message?.timestamp || '';

    return {
      conversationId: conv.conversation_id,
      avatar,
      name,
      lastMessage: lastMessageContent,
      unreadCount: conv.unread_count,
      time: lastMessageTime,
      selected: false,
    };
  });
    
  console.log('conversations', conversations);

  return (
    <div className='flex h-screen bg-blue-50'>
      <Sidebar chatItems={chatItems} user={{
        avatar: user?.avatar_url,
        username: user?.username || '',
        email: user?.email || undefined,
      }} onLogout={handleLogout} onItemClick={handleItemClick} />
      <main className='flex-1 flex flex-col'>{children}</main>
    </div>
  );
} 