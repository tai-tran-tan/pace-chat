import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider } from 'react-native-paper';
import { IconButton } from 'react-native-paper';
import { useAuthStore } from './store/useAuthStore';
import { SafeAreaView } from 'react-native-safe-area-context';

// Screens
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import ChatScreen from './screens/ChatScreen';
import NewChatScreen from './screens/NewChatScreen';
import NotificationScreen from './screens/NotificationScreen';
import ChatInfoScreen from './screens/ChatInfoScreen';
import ProfileScreen from './screens/ProfileScreen';

// Types
type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Chat: { chatId: string; name: string };
  NewChat: undefined;
  ChatInfo: { chatId: string };
};

type MainTabParamList = {
  Home: undefined;
  Notifications: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: '#666',
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Trò chuyện',
          tabBarIcon: ({ color, size }) => (
            <IconButton icon="chat" size={size} iconColor={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationScreen}
        options={{
          tabBarLabel: 'Thông báo',
          tabBarIcon: ({ color, size }) => (
            <IconButton icon="bell" size={size} iconColor={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Tôi',
          tabBarIcon: ({ color, size }) => (
            <IconButton icon="account" size={size} iconColor={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const AppContent = () => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={({ route }) => ({
                headerShown: true,
                title: route.params?.name || 'Chat',
              })}
            />
            <Stack.Screen
              name="NewChat"
              component={NewChatScreen}
              options={{
                headerShown: true,
                title: 'Cuộc trò chuyện mới',
              }}
            />
            <Stack.Screen
              name="ChatInfo"
              component={ChatInfoScreen}
              options={{
                headerShown: true,
                title: 'Thông tin chat',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const App = () => {
  return (
    <PaperProvider>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}> 
        <AppContent />
      </SafeAreaView>
    </PaperProvider>
  );
};

export default App;
