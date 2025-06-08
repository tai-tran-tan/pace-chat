import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RouteProp } from '@react-navigation/native';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Chat: {
    userId: string;
    username: string;
  };
  NewChat: undefined;
  ChatInfo: {
    chatId: string;
    name: string;
    avatar: string;
  };
};

export type MainTabParamList = {
  Home: undefined;
  Notifications: undefined;
};

// Navigation Props Types
export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>;
export type MainTabNavigationProp = BottomTabNavigationProp<MainTabParamList>;

// Route Props Types
export type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;
export type ChatInfoScreenRouteProp = RouteProp<RootStackParamList, 'ChatInfo'>; 