import React, { useEffect, useState } from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from './store/useAuthStore';
import { useWebSocketManager } from './hooks/useWebSocketManager';
import socketService from './services/socket';
import api from './services/api';

// Import i18n configuration
import './i18n';
import { LanguageProvider } from './contexts/LanguageContext';

// Screens
import AuthScreen from './screens/AuthScreen';
import MainNavigator from './components/common/MainNavigator';

// Types
import type { RootStackParamList } from './types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Component to handle WebSocket errors with navigation
const WebSocketErrorHandler = () => {
  const navigation = useNavigation<any>();
  const { logout } = useAuthStore();

  useEffect(() => {
    // Register a global error handler for WebSocket authentication/session errors
    const unsubscribe = socketService.onError((error) => {
      // If the error message indicates authentication failure or session expiration, logout and navigate to AuthScreen
      if (
        error?.message?.includes('Authentication failed') ||
        error?.message?.includes('User session expired')
      ) {
        logout();
        
        // Check if we're already on Auth screen to avoid unnecessary navigation
        const currentRoute = navigation.getCurrentRoute();
        if (currentRoute?.name !== 'Auth') {
          // Reset navigation stack to AuthScreen only if not already there
          navigation.reset({
            index: 0,
            routes: [{ name: 'Auth' }]
          });
        }
      }
    });
    return () => {
      // Cleanup the error handler on unmount
      unsubscribe && unsubscribe();
    };
  }, [navigation, logout]);

  return null;
};

const App = () => {
  const { isAuthenticated, user, initializeAuth } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  // Global WebSocket manager for app-level connection
  const { isConnected: wsConnected } = useWebSocketManager({
    autoConnect: false, // Don't auto connect globally, let screens handle it
    idleTimeout: 15 * 60 * 1000, // 15 minutes for app level
    enableIdleDisconnect: true
  });

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('Initializing app...');
        
        // Check for stored auth token
        const token = await initializeAuth();
        
        if (token) {
          console.log('Found stored token, setting up API client');
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Validate token with server
          try {
            const response = await api.get('/auth/me');
            console.log('Token validation successful:', response.data);
          } catch (error: any) {
            console.error('Token validation failed:', error.response?.status);
            if (error.response?.status === 401) {
              console.log('Token expired, clearing auth state');
              // Token is invalid, clear auth state
              useAuthStore.getState().logout();
            }
          }
        } else {
          console.log('No stored token found');
        }
      } catch (error) {
        console.error('Error during app initialization:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, [initializeAuth]);

  // Handle authentication state changes
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('User authenticated, setting up WebSocket connection');
      
      // Set up API client with auth token
      const token = useAuthStore.getState().token;
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      // Connect WebSocket if not already connected
      if (!socketService.isConnected()) {
        socketService.connect().catch(error => {
          console.error('Failed to connect WebSocket after login:', error);
        });
      }
    } else {
      console.log('User not authenticated, disconnecting WebSocket');
      
      // Clear API auth header
      delete api.defaults.headers.common['Authorization'];
      
      // Disconnect WebSocket
      if (socketService.isConnected()) {
        socketService.disconnect();
      }
    }
  }, [isAuthenticated, user]);

  if (isInitializing) {
    return null; // Or a loading screen
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LanguageProvider>
          <PaperProvider>
            <NavigationContainer>
              <StatusBar style="auto" />
              <WebSocketErrorHandler />
              <Stack.Navigator
                screenOptions={{
                  headerShown: false,
                  animation: 'slide_from_right',
                }}
              >
                {!isAuthenticated ? (
                  <Stack.Screen name="Auth" component={AuthScreen} />
                ) : (
                  <Stack.Screen name="Home" component={MainNavigator} />
                )}
              </Stack.Navigator>
            </NavigationContainer>
          </PaperProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
