import apiService from './api';
import { Conversation } from '@/types';

class ConversationService {
  async createPrivateConversation(targetUserId: string): Promise<Conversation> {
    try {
      const response = await apiService.createPrivateConversation(targetUserId);
      
      // Check if response has the expected structure
      if (response.data && response.data.conversation_id) {
        // If response.data is the conversation object directly
        return response.data;
      } else if (response.data && response.data.data && response.data.data.conversation_id) {
        // If response.data.data is the conversation object
        return response.data.data;
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (error: any) {
      console.error('createPrivateConversation error:', error);
      throw new Error(error.response?.data?.message || 'Failed to create conversation');
    }
  }

  async createGroupConversation(participantIds: string[], name: string): Promise<Conversation> {
    try {
      const response = await apiService.createGroupConversation(name, participantIds);
      
      // Check if response has the expected structure
      if (response.data && response.data.conversation_id) {
        return response.data;
      } else if (response.data && response.data.data && response.data.data.conversation_id) {
        return response.data.data;
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (error: any) {
      console.error('createGroupConversation error:', error);
      throw new Error(error.response?.data?.message || 'Failed to create group conversation');
    }
  }

  async getConversationById(conversationId: string): Promise<Conversation> {
    try {
      const response = await apiService.getConversationById(conversationId);
      
      // Check if response has the expected structure
      if (response.data && response.data.conversation_id) {
        return response.data;
      } else if (response.data && response.data.data && response.data.data.conversation_id) {
        return response.data.data;
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (error: any) {
      console.error('getConversationById error:', error);
      throw new Error(error.response?.data?.message || 'Failed to get conversation');
    }
  }

  async getAllConversations(): Promise<Conversation[]> {
    try {
      const response = await apiService.getConversations();
      
      // Check if response has the expected structure
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        return response.data.data;
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (error: any) {
      console.error('getAllConversations error:', error);
      throw new Error(error.response?.data?.message || 'Failed to get conversations');
    }
  }
}

const conversationService = new ConversationService();
export default conversationService; 