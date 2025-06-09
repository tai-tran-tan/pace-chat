import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from './store/useAuthStore';
import { useWebSocketManager } from './hooks/useWebSocketManager';
import socketService from './services/socket';
import api from './services/api';

// Screens
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import ChatScreen from './screens/ChatScreen';
import NewChatScreen from './screens/NewChatScreen';
import ProfileScreen from './screens/ProfileScreen';
import ChatInfoScreen from './screens/ChatInfoScreen';
import MainTabs from './screens/MainTabs';

// Types
import type { RootStackParamList } from './types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

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
        <PaperProvider>
          <NavigationContainer>
            <StatusBar style="auto" />
            <Stack.Navigator
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            >
              {!isAuthenticated ? (
                <Stack.Screen name="Auth" component={AuthScreen} />
              ) : (
                <>
                  <Stack.Screen name="Main" component={MainTabs} />
                  <Stack.Screen name="Chat" component={ChatScreen} />
                  <Stack.Screen name="NewChat" component={NewChatScreen} />
                  <Stack.Screen name="ChatInfo" component={ChatInfoScreen} />
                </>
              )}
            </Stack.Navigator>
          </NavigationContainer>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
