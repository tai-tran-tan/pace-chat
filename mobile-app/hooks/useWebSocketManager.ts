import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import socketService from '../services/socket';
import { useAuthStore } from '../store/useAuthStore';

interface UseWebSocketManagerOptions {
  autoConnect?: boolean;
  idleTimeout?: number; // in milliseconds
  enableIdleDisconnect?: boolean;
}

export const useWebSocketManager = (options: UseWebSocketManagerOptions = {}) => {
  const {
    autoConnect = true,
    idleTimeout = 5 * 60 * 1000, // 5 minutes default
    enableIdleDisconnect = true
  } = options;

  const { isAuthenticated } = useAuthStore();
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInActiveScreen = useRef(false);

  // Connect WebSocket when entering screen
  const connect = async () => {
    if (isAuthenticated && !socketService.isConnected()) {
      try {
        await socketService.connect();
        console.log('WebSocket connected via useWebSocketManager');
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
      }
    }
  };

  // Disconnect WebSocket
  const disconnect = () => {
    if (socketService.isConnected()) {
      socketService.disconnect();
      console.log('WebSocket disconnected via useWebSocketManager');
    }
  };

  // Reset idle timer
  const resetIdleTimer = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    if (enableIdleDisconnect && isAuthenticated) {
      idleTimerRef.current = setTimeout(() => {
        if (!isInActiveScreen.current) {
          console.log('WebSocket disconnected due to idle timeout');
          disconnect();
        }
      }, idleTimeout);
    }
  };

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        isInActiveScreen.current = true;
        // Reconnect if needed when app comes to foreground
        if (isAuthenticated && !socketService.isConnected()) {
          connect();
        }
        resetIdleTimer();
      } else if (nextAppState === 'background') {
        isInActiveScreen.current = false;
        // Don't disconnect immediately, let idle timer handle it
        resetIdleTimer();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [isAuthenticated, enableIdleDisconnect, idleTimeout]);

  // Auto connect when entering screen
  useEffect(() => {
    if (autoConnect && isAuthenticated) {
      connect();
      resetIdleTimer();
    }

    return () => {
      // Cleanup idle timer on unmount
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [autoConnect, isAuthenticated]);

  // Reset idle timer on user activity
  useEffect(() => {
    const handleUserActivity = () => {
      if (isInActiveScreen.current) {
        resetIdleTimer();
      }
    };

    // Note: In React Native, we can't use document event listeners
    // Instead, we rely on app state changes and manual resetIdleTimer calls
    // from components when user interacts (touch, scroll, etc.)
    
    // For now, we'll just reset timer when app becomes active
    // Components should call resetIdleTimer() manually on user interactions
    
  }, [enableIdleDisconnect, idleTimeout]);

  return {
    connect,
    disconnect,
    isConnected: socketService.isConnected(),
    resetIdleTimer
  };
}; 