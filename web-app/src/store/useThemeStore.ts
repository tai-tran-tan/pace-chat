import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getSystemTheme } from '@/lib/utils';

interface ThemeState {
  mode: 'light' | 'dark' | 'system';
  isDark: boolean;
}

interface ThemeActions {
  setMode: (mode: 'light' | 'dark' | 'system') => void;
  toggle: () => void;
}

type ThemeStore = ThemeState & ThemeActions;

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      // Initial state
      mode: 'system',
      isDark: false,

      // Actions
      setMode: (mode: 'light' | 'dark' | 'system') => {
        const isDark = mode === 'dark' || (mode === 'system' && getSystemTheme() === 'dark');
        
        set({ mode, isDark });
        
        // Apply theme to document
        if (typeof window !== 'undefined') {
          const root = document.documentElement;
          if (isDark) {
            root.classList.add('dark');
          } else {
            root.classList.remove('dark');
          }
        }
      },

      toggle: () => {
        const { mode } = get();
        const newMode = mode === 'light' ? 'dark' : 'light';
        get().setMode(newMode);
      },
    }),
    {
      name: 'theme-storage',
      partialize: (state) => ({ mode: state.mode }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Apply theme on rehydration
          const isDark = state.mode === 'dark' || (state.mode === 'system' && getSystemTheme() === 'dark');
          state.isDark = isDark;
          
          if (typeof window !== 'undefined') {
            const root = document.documentElement;
            if (isDark) {
              root.classList.add('dark');
            } else {
              root.classList.remove('dark');
            }
          }
        }
      },
    }
  )
); 