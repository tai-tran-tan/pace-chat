import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import apiService from '@/services/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User | null) => void;
}

type AuthStore = AuthState & AuthActions;

function mapApiUserToUser(apiUser: any): User {
  return {
    user_id: apiUser.user_id,
    username: apiUser.username,
    email: apiUser.email || '',
    avatar_url: apiUser.avatar_url || null,
    status: 'online',
    last_seen: apiUser.last_seen || null,
    created_at: apiUser.created_at || '',
    updated_at: apiUser.updated_at || '',
  };
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiService.login({ username, password });
          
          // Check if response has the expected structure
          if (response.data && response.data.user_id && response.data.token) {
            // Create user object from response
            const userData = {
              user_id: response.data.user_id,
              username: response.data.username,
              email: response.data.email || '',
              avatar_url: response.data.avatar_url || null,
              status: 'online' as const,
              last_seen: response.data.last_seen || null,
              created_at: response.data.created_at || '',
              updated_at: response.data.updated_at || '',
            };
            
            set({
              user: userData,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
            return;
          } else {
            const errorMessage = response.data.message || 'Login failed';
            set({
              isLoading: false,
              error: errorMessage,
            });
            throw new Error(errorMessage);
          }
        } catch (error: any) {
          let errorMessage = 'Login failed';
          if (error.response?.status === 401) {
            errorMessage = 'Invalid username or password';
          } else if (error.response?.status === 400) {
            errorMessage = error.response.data?.message || 'Invalid request';
          } else if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
          } else if (error.code === 'NETWORK_ERROR') {
            errorMessage = 'Network error. Please check your connection.';
          }
          
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw new Error(errorMessage);
        }
      },

      register: async (username: string, email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiService.register({ username, email, password });
          
          // Check if response has the expected structure for register
          if (response.data && response.data.user_id && response.data.username) {
            // Registration successful, but don't set user as authenticated
            // User needs to login to get tokens
            set({
              isLoading: false,
              error: null,
            });
            return;
          } else {
            const errorMessage = response.data.message || 'Registration failed';
            set({
              isLoading: false,
              error: errorMessage,
            });
            throw new Error(errorMessage);
          }
        } catch (error: any) {
          let errorMessage = 'Registration failed';
          if (error.response?.status === 409) {
            errorMessage = 'Username or email already exists';
          } else if (error.response?.status === 400) {
            errorMessage = error.response.data?.message || 'Invalid request';
          } else if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
          } else if (error.code === 'NETWORK_ERROR') {
            errorMessage = 'Network error. Please check your connection.';
          }
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw new Error(errorMessage);
        }
      },

      logout: async () => {
        set({ isLoading: true });
        
        try {
          await apiService.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // Clear localStorage
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          
          // Disconnect WebSocket
          if (typeof window !== 'undefined') {
            import('@/services/socket').then(({ default: socketService }) => {
              socketService.disconnect();
            });
          }
          
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      getCurrentUser: async () => {
        set({ isLoading: true });
        try {
          const response = await apiService.getCurrentUser();
          
          // Check if response has the expected structure
          if (response.data && response.data.user_id) {
            const userData = {
              user_id: response.data.user_id,
              username: response.data.username,
              email: response.data.email || '',
              avatar_url: response.data.avatar_url || null,
              status: 'online' as const,
              last_seen: response.data.last_seen || null,
              created_at: response.data.created_at || '',
              updated_at: response.data.updated_at || '',
            };
            
            set({
              user: userData,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } else {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            });
          }
        } catch (error: any) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },

      setUser: (user: User | null) => {
        set({
          user,
          isAuthenticated: !!user,
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
); 