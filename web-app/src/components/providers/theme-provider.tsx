'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/store/useThemeStore';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { mode, setMode } = useThemeStore();

  useEffect(() => {
    // Apply theme on mount
    setMode(mode);
  }, [mode, setMode]);

  return <>{children}</>;
} 