import React from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from './Header';
import { useNavigation } from '@react-navigation/native';
import { useSearchStore } from '../../store/useSearchStore';
import type { RootStackNavigationProp } from '../../types/navigation';

// Import screens
import HomeScreen from '../../screens/HomeScreen';
import SearchScreen from '../../screens/SearchScreen';
import ProfileScreen from '../../screens/ProfileScreen';
import ContactScreen from '../../screens/ContactScreen';
import MediaScreen from '../../screens/MediaScreen';
import ChatScreen from '../../screens/ChatScreen';
import ChatInfoScreen from '../../screens/ChatInfoScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Wrapper components for each tab
const HomeTabWrapper = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { searchQuery, setSearchQuery } = useSearchStore();
  
  return (
    <>
      <Header 
        showSearch={true}
        searchPlaceholder="Search"
        onSearchChange={setSearchQuery}
        searchValue={searchQuery}
        onSearchPress={() => navigation.navigate("Search")}
        onSearchInputPress={() => navigation.navigate("Search")}
        showQRScanner={true}
        showAddButton={true}
        onQRScannerPress={() => console.log("QR Scanner pressed")}
        onAddPress={() => navigation.navigate("NewChat")}
        searchInputAsTextOnly={true}
      />
      <HomeScreen />
    </>
  );
};

const ContactTabWrapper = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  
  return (
    <>
      <Header 
        title="Contacts"
        showSearch={true}
        searchPlaceholder="Search contacts..."
        onSearchPress={() => navigation.navigate("Search")}
        onSearchInputPress={() => navigation.navigate("Search")}
        showAddButton={true}
        onAddPress={() => console.log("Add contact pressed")}
      />
      <ContactScreen />
    </>
  );
};

const MediaTabWrapper = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  
  return (
    <>
      <Header 
        title="Media"
        showSearch={true}
        searchPlaceholder="Search media..."
        onSearchPress={() => navigation.navigate("Search")}
        onSearchInputPress={() => navigation.navigate("Search")}
      />
      <MediaScreen />
    </>
  );
};

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

// ChatScreenWrapper - ChatScreen manages its own header through ChatHeaderStore
const ChatScreenWrapper = () => {
  return <ChatScreen />;
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

const SearchWrapper = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { searchQuery, setSearchQuery } = useSearchStore();
  
  return (
    <ScreenWithHeader
      headerProps={{
        title: "Search",
        showBackButton: true,
        showSearch: true,
        searchPlaceholder: "Search users...",
        onSearchChange: setSearchQuery,
        searchValue: searchQuery,
        showSearchIcon: false, // Hide search icon in SearchScreen
        showQRScanner: false,
        showAddButton: false,
      }}
    >
      <SearchScreen />
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
        <Stack.Screen name="Search" component={SearchWrapper} />
        <Stack.Screen 
          name="Chat" 
          component={ChatScreenWrapper}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen name="Contact" component={ContactScreen} />
        <Stack.Screen name="Media" component={MediaScreen} />
        <Stack.Screen name="ChatInfo" component={ChatInfoWrapper} />
      </Stack.Navigator>
    </SafeAreaView>
  );
};

export default MainNavigator; 