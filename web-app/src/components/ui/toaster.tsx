'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface ToasterProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

function ToasterComponent({ toasts, removeToast }: ToasterProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex items-center justify-between p-4 rounded-lg shadow-lg max-w-sm transition-all duration-300',
            'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
            {
              'border-green-200 dark:border-green-700': toast.type === 'success',
              'border-red-200 dark:border-red-700': toast.type === 'error',
              'border-blue-200 dark:border-blue-700': toast.type === 'info',
              'border-yellow-200 dark:border-yellow-700': toast.type === 'warning',
            }
          )}
        >
          <span className="text-sm text-gray-900 dark:text-gray-100">
            {toast.message}
          </span>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

// Global toast state
let toasts: Toast[] = [];
let listeners: (() => void)[] = [];

function addToast(toast: Omit<Toast, 'id'>) {
  const id = Math.random().toString(36).substr(2, 9);
  const newToast = { ...toast, id };
  toasts = [...toasts, newToast];
  listeners.forEach(listener => listener());

  // Auto remove after duration
  setTimeout(() => {
    removeToast(id);
  }, toast.duration || 5000);
}

function removeToast(id: string) {
  toasts = toasts.filter(toast => toast.id !== id);
  listeners.forEach(listener => listener());
}

// Hook to use toasts
export function useToaster() {
  const [, setState] = useState({});

  useEffect(() => {
    const listener = () => setState({});
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }, []);

  return {
    toasts,
    addToast,
    removeToast,
  };
}

// Toaster component
export function Toaster() {
  const { toasts, removeToast } = useToaster();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  if (typeof window === 'undefined' || !document.body) {
    return null;
  }

  return createPortal(
    <ToasterComponent toasts={toasts} removeToast={removeToast} />,
    document.body
  );
}

// Export toast functions
export const toast = {
  success: (message: string, duration?: number) => addToast({ message, type: 'success', duration }),
  error: (message: string, duration?: number) => addToast({ message, type: 'error', duration }),
  info: (message: string, duration?: number) => addToast({ message, type: 'info', duration }),
  warning: (message: string, duration?: number) => addToast({ message, type: 'warning', duration }),
}; 