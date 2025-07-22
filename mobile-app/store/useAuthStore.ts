import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { authApi } from '../services/api';
import socketService from '../services/socket';

interface User {
  user_id: string;
  username: string;
  avatar_url?: string | null;
  email?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setRefreshToken: (refreshToken: string | null) => void;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, email: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  initializeAuth: () => Promise<string | null>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      
      setToken: (token) => {
        set({ token });
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
          delete api.defaults.headers.common['Authorization'];
        }
      },

      setRefreshToken: (refreshToken) => set({ refreshToken }),

      clearError: () => set({ error: null }),

      login: async (username: string, password: string) => {
        try {
          set({ isLoading: true, error: null });
          const response = await authApi.login(username, password);
          set({
            user: { user_id: response.user_id, username: response.username },
            token: response.access_token,
            refreshToken: response.refresh_token,
            isAuthenticated: true,
            isLoading: false
          });
          api.defaults.headers.common['Authorization'] = `Bearer ${response.access_token}`;
          
          // Connect WebSocket after successful login
          try {
            await socketService.connect();
          } catch (wsError) {
            console.error('Failed to connect WebSocket after login:', wsError);
            // Don't fail login if WebSocket connection fails
          }
        } catch (error: any) {
          set({ 
            error: error.message || 'Login failed', 
            isLoading: false 
          });
          throw error;
        }
      },

      register: async (username: string, password: string, email: string) => {
        try {
          set({ isLoading: true, error: null });
          await authApi.register(username, password, email);
          set({ isLoading: false });
        } catch (error: any) {
          set({ 
            error: error.message || 'Registration failed', 
            isLoading: false 
          });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null
        });
        delete api.defaults.headers.common['Authorization'];
        
        // Disconnect WebSocket on logout
        socketService.disconnect();
      },

      initializeAuth: async () => {
        try {
          // Check for stored tokens
          const [token, refreshToken, userData] = await Promise.all([
            AsyncStorage.getItem('access_token'),
            AsyncStorage.getItem('refresh_token'),
            AsyncStorage.getItem('user')
          ]);

          if (token && userData) {
            const user = JSON.parse(userData);
            set({
              user,
              token,
              refreshToken,
              isAuthenticated: true
            });
            
            // Set API header
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            console.log('Auth initialized from storage:', {
              hasUser: !!user,
              hasToken: !!token,
              hasRefreshToken: !!refreshToken
            });
            
            return token;
          }
          
          return null;
        } catch (error) {
          console.error('Error initializing auth:', error);
          return null;
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: {
        getItem: async (name) => {
          const value = await AsyncStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: async (name, value) => {
          await AsyncStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: async (name) => {
          await AsyncStorage.removeItem(name);
        },
      },
    }
  )
); 