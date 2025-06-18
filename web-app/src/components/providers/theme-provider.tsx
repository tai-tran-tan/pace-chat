'use client';

import { useEffect, useState } from 'react';
import { useThemeStore } from '@/store/useThemeStore';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { mode, setMode } = useThemeStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Apply theme on mount
    setMode(mode);
  }, [mode, setMode]);

  // Don't render children until mounted to avoid hydration mismatch
  if (!isMounted) {
    return null;
  }

  return <>{children}</>;
} 