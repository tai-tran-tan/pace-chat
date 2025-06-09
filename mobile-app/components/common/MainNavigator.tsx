import React from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from './Header';
import { ChatHeaderProvider } from '../../contexts/ChatHeaderContext';
import { useNavigation } from '@react-navigation/native';

// Import screens
import HomeScreen from '../../screens/HomeScreen';
import ProfileScreen from '../../screens/ProfileScreen';
import ContactScreen from '../../screens/ContactScreen';
import MediaScreen from '../../screens/MediaScreen';
import ChatScreen from '../../screens/ChatScreen';
import NewChatScreen from '../../screens/NewChatScreen';
import ChatInfoScreen from '../../screens/ChatInfoScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Wrapper components for each tab
const HomeTabWrapper = () => {
  const navigation = useNavigation();
  
  return (
    <>
      <Header 
        showSearch={true}
        searchPlaceholder="Search conversations or users..."
        onQRScannerPress={() => console.log("QR Scanner pressed")}
        onAddPress={() => navigation.navigate("NewChat" as never)}
      />
      <HomeScreen />
    </>
  );
};

const ContactTabWrapper = () => {
  const navigation = useNavigation();
  
  return (
    <>
      <Header 
        title="Contacts"
        showSearch={true}
        searchPlaceholder="Search contacts..."
        onAddPress={() => console.log("Add contact pressed")}
      />
      <ContactScreen />
    </>
  );
};

const MediaTabWrapper = () => (
  <>
    <Header 
      title="Media"
      showSearch={true}
      searchPlaceholder="Search media..."
    />
    <MediaScreen />
  </>
);

const ProfileTabWrapper = () => (
  <>
    <Header 
      title="Profile"
      showSearch={false}
      showQRScanner={false}
      showAddButton={false}
    />
    <ProfileScreen />
  </>
);

// Wrapper for screens with header only
const ScreenWithHeader = ({ 
  headerProps, 
  children 
}: { 
  headerProps: any; 
  children: React.ReactNode; 
}) => {
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#fff" }}
      edges={["left", "right"]}
    >
      <Header {...headerProps} />
      <View style={{ flex: 1 }}>
        {children}
      </View>
    </SafeAreaView>
  );
};

const ChatScreenWrapper = () => {
  const navigation = useNavigation();
  
  return (
    <>
      <Header 
        showAvatar={true}
        avatarName="John Doe"
        showSearch={true}
        searchPlaceholder="Search in chat..."
        showInfoButton={true}
        onInfoPress={() => navigation.navigate("ChatInfo" as never)}
        showQRScanner={false}
        showAddButton={false}
      />
      <ChatScreen />
    </>
  );
};

const ChatInfoWrapper = () => {
  return (
    <ScreenWithHeader
      headerProps={{
        title: "Chat Info",
        showBackButton: true,
        showSearch: false,
        showQRScanner: false,
        showAddButton: false,
      }}
    >
      <ChatInfoScreen />
    </ScreenWithHeader>
  );
};

const NewChatWrapper = () => {
  return (
    <ScreenWithHeader
      headerProps={{
        title: "New Chat",
        showBackButton: true,
        showSearch: false,
        searchPlaceholder: "Search users...",
        showQRScanner: true,
        showAddButton: true,
        onQRScannerPress: () => console.log("QR Scanner pressed in NewChat"),
        onAddPress: () => console.log("Add pressed in NewChat"),
      }}
    >
      <NewChatScreen />
    </ScreenWithHeader>
  );
};

// Bottom Tab Navigator
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: '#666',
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeTabWrapper}
        options={{
          tabBarLabel: 'Chats',
          tabBarIcon: ({ color, size }) => (
            <IconButton icon="chat" size={size} iconColor={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ContactTab"
        component={ContactTabWrapper}
        options={{
          tabBarLabel: 'Contacts',
          tabBarIcon: ({ color, size }) => (
            <IconButton icon="account-group" size={size} iconColor={color} />
          ),
        }}
      />
      <Tab.Screen
        name="MediaTab"
        component={MediaTabWrapper}
        options={{
          tabBarLabel: 'Media',
          tabBarIcon: ({ color, size }) => (
            <IconButton icon="image-multiple" size={size} iconColor={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileTabWrapper}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <IconButton icon="account" size={size} iconColor={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// Main Navigator with Header and Bottom Tabs
const MainNavigator = () => {
  return (
    <ChatHeaderProvider>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "#fff" }}
        edges={["left", "right"]}
      >
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen 
            name="Chat" 
            component={ChatScreenWrapper}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen name="NewChat" component={NewChatWrapper} />
          <Stack.Screen name="Contact" component={ContactScreen} />
          <Stack.Screen name="Media" component={MediaScreen} />
          <Stack.Screen name="ChatInfo" component={ChatInfoWrapper} />
        </Stack.Navigator>
      </SafeAreaView>
    </ChatHeaderProvider>
  );
};

export default MainNavigator; 