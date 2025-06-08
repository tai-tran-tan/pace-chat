import { create } from 'zustand';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  
  login: async (email: string, password: string) => {
    // TODO: Implement actual login logic with API
    const dummyUser: User = {
      id: '1',
      name: 'Nguyễn Văn A',
      email: email,
      avatar: 'https://i.pravatar.cc/300',
    };
    
    set({ isAuthenticated: true, user: dummyUser });
  },
  
  logout: async () => {
    // TODO: Implement actual logout logic with API
    set({ isAuthenticated: false, user: null });
  },
  
  updateProfile: async (data: Partial<User>) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...data } : null,
    }));
  },
})); 