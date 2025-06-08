import { create } from 'zustand';
import { authApi } from '../services/api';

interface User {
  user_id: string;
  username: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, email: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (username: string, password: string) => {
    console.log('AuthStore: Starting login process');
    set({ isLoading: true, error: null });
    try {
      const data = await authApi.login(username, password);
      console.log('AuthStore: Login successful, updating state');
      set({
        user: { user_id: data.user_id, username: data.username },
        isAuthenticated: true,
        isLoading: false,
      });
      console.log('AuthStore: State updated, user authenticated');
    } catch (error: any) {
      console.error('AuthStore: Login failed:', {
        message: error.response?.data?.message || error.message,
        status: error.response?.status
      });
      set({
        error: error.response?.data?.message || 'Đăng nhập thất bại',
        isLoading: false,
      });
      throw error;
    }
  },

  register: async (username: string, password: string, email: string) => {
    console.log('AuthStore: Starting register process');
    set({ isLoading: true, error: null });
    try {
      await authApi.register(username, password, email);
      console.log('AuthStore: Register successful, attempting auto login');
      // After successful registration, automatically login
      await authApi.login(username, password);
      const user = await authApi.getCurrentUser();
      console.log('AuthStore: Auto login successful, updating state');
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
      console.log('AuthStore: State updated, user registered and authenticated');
    } catch (error: any) {
      console.error('AuthStore: Register failed:', {
        message: error.response?.data?.message || error.message,
        status: error.response?.status
      });
      set({
        error: error.response?.data?.message || 'Registration failed',
        isLoading: false,
      });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authApi.logout();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Đăng xuất thất bại',
        isLoading: false,
      });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const user = await authApi.getCurrentUser();
      set({
        user,
        isAuthenticated: !!user,
        isLoading: false,
      });
    } catch (error) {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  clearError: () => set({ error: null }),
})); 