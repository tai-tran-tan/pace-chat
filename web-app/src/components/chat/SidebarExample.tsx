import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import conversationService from '@/services/conversationService';
import { Conversation, User } from '@/types';

const SidebarExample: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Mock user data for demo
  const mockUser: User = {
    user_id: 'current-user-id',
    username: 'john_doe',
    email: 'john@example.com',
    avatar_url: null,
    status: 'online',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  useEffect(() => {
    const loadConversations = async () => {
      try {
        setLoading(true);
        const convs = await conversationService.getAllConversations();
        setConversations(convs);
      } catch (error) {
        console.error('Failed to load conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    setCurrentUser(mockUser);
    loadConversations();
  }, []);

  const handleLogout = () => {
    // Handle logout logic
    console.log('Logout clicked');
  };

  const handleConversationClick = (conversationId: string) => {
    console.log('Conversation clicked:', conversationId);
    // Navigate to conversation or open chat
  };

  const handleUserClick = async (userId: string) => {
    try {
      console.log('User clicked:', userId);
      // Create new private conversation with the user
      const newConversation = await conversationService.createPrivateConversation(userId);
      console.log('New conversation created:', newConversation);
      
      // Add to conversations list
      setConversations(prev => [newConversation, ...prev]);
      
      // Optionally navigate to the new conversation
      handleConversationClick(newConversation.conversation_id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  if (loading) {
    return (
      <div className="w-80 bg-white border-r border-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="w-80 bg-white border-r border-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Loading user...</p>
      </div>
    );
  }

  return (
    <Sidebar
      chatItems={conversations}
      user={{
        avatar: currentUser.avatar_url,
        username: currentUser.username,
        email: currentUser.email,
      }}
      onLogout={handleLogout}
      onItemClick={handleConversationClick}
      onUserClick={handleUserClick}
    />
  );
};

export default SidebarExample; 