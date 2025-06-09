import React, { useState, useEffect, useCallback, createContext, useContext } from "react";
import { View, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from "react-native";
import { FAB, Text } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import type { RootStackNavigationProp } from "../types/navigation";
import ChatItem from "../components/chat/ChatItem";
import { useWebSocketManager } from "../hooks/useWebSocketManager";
import { useAuthStore } from "../store/useAuthStore";
import api from "../services/api";

// Context for sharing search state between Header and HomeScreen
interface SearchContextType {
  searchQuery: string;
  onSearchChange: (text: string) => void;
  isSearching: boolean;
}

const SearchContext = createContext<SearchContextType | null>(null);

export const useSearchContext = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearchContext must be used within SearchProvider');
  }
  return context;
};

type Conversation = {
  conversation_id: string;
  type: "private" | "group";
  name: string | null;
  participants: {
    user_id: string;
    username: string;
    avatar_url: string | null;
  }[];
  last_message_preview: string | null;
  last_message_timestamp: string | null;
  unread_count: number;
};

type User = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  status?: "online" | "offline" | "away";
  last_seen?: string;
};

const HomeScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Use WebSocket manager with idle disconnect for home screen
  const { isConnected: wsConnected } = useWebSocketManager({
    autoConnect: true, // Auto connect when entering home screen
    idleTimeout: 3 * 60 * 1000, // 3 minutes for home screen (shorter than chat)
    enableIdleDisconnect: true
  });

  // Fetch conversations from API
  const fetchConversations = useCallback(async (isRefresh = false) => {
    if (!user?.user_id) {
      setError("User not logged in");
      return;
    }

    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const response = await api.get("/conversations");
      const fetchedConversations = response.data as Conversation[];
      
      setConversations(fetchedConversations);
    } catch (error: any) {
      console.error("Failed to fetch conversations:", error);
      setError("Failed to load conversations. Please try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.user_id]);

  // Search users
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim() || !user?.user_id) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      setIsSearching(true);
      setError(null);

      const response = await api.get("/users/search", {
        params: { query: query.trim() }
      });

      // Filter out current user and map to User type
      const results = (response.data || [])
        .filter((userData: any) => userData.user_id !== user.user_id)
        .map((userData: any) => ({
          user_id: userData.user_id,
          username: userData.username,
          avatar_url: userData.avatar_url,
          status: "offline" // Default status
        }));

      setSearchResults(results);
      setShowSearchResults(true);
    } catch (error: any) {
      console.error("Failed to search users:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [user?.user_id]);

  // Handle search input change
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    if (text.trim()) {
      searchUsers(text);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [searchUsers]);

  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Handle conversation press
  const handleConversationPress = (conversation: Conversation) => {
    // For private conversations, find the other participant's name
    // For group conversations, use the group name
    let displayName = "";
    
    if (conversation.type === "private") {
      const otherParticipant = conversation.participants.find(
        p => p.user_id !== user?.user_id
      );
      displayName = otherParticipant?.username || "Unknown User";
    } else {
      displayName = conversation.name || "Group Chat";
    }

    navigation.navigate("Chat", {
      conversationId: conversation.conversation_id,
      username: displayName
    });
  };

  // Handle user search result press
  const handleUserPress = (user: User) => {
    navigation.navigate("Chat", {
      userId: user.user_id,
      username: user.username
    });
  };

  const handleNewChat = () => {
    navigation.navigate("NewChat");
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: string | null): string => {
    if (!timestamp) return "";
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString();
    }
  };

  // Get display name for conversation
  const getConversationDisplayName = (conversation: Conversation): string => {
    if (conversation.type === "private") {
      const otherParticipant = conversation.participants.find(
        p => p.user_id !== user?.user_id
      );
      return otherParticipant?.username || "Unknown User";
    } else {
      return conversation.name || "Group Chat";
    }
  };

  // Get avatar for conversation
  const getConversationAvatar = (conversation: Conversation): string => {
    if (conversation.type === "private") {
      const otherParticipant = conversation.participants.find(
        p => p.user_id !== user?.user_id
      );
      return otherParticipant?.avatar_url || `https://i.pravatar.cc/150?img=${otherParticipant?.user_id || '1'}`;
    } else {
      // For group chats, use a default group avatar
      return "https://i.pravatar.cc/150?img=group";
    }
  };

  const renderChatItem = ({ item }: { item: Conversation }) => (
    <ChatItem
      name={getConversationDisplayName(item)}
      lastMessage={item.last_message_preview || "No messages yet"}
      timestamp={formatTimestamp(item.last_message_timestamp)}
      unreadCount={item.unread_count}
      avatar={getConversationAvatar(item)}
      onPress={() => handleConversationPress(item)}
    />
  );

  const renderUserItem = ({ item }: { item: User }) => (
    <ChatItem
      name={item.username}
      lastMessage="Tap to start chat"
      timestamp=""
      unreadCount={0}
      avatar={item.avatar_url || `https://i.pravatar.cc/150?img=${item.user_id}`}
      onPress={() => handleUserPress(item)}
    />
  );

  const handleRefresh = () => {
    fetchConversations(true);
  };

  const getCurrentData = () => {
    if (showSearchResults) {
      return searchResults;
    }
    return conversations;
  };

  const getCurrentRenderItem = () => {
    if (showSearchResults) {
      return renderUserItem;
    }
    return renderChatItem;
  };

  const getCurrentKeyExtractor = () => {
    if (showSearchResults) {
      return (item: User) => item.user_id;
    }
    return (item: Conversation) => item.conversation_id;
  };

  const getEmptyMessage = () => {
    if (showSearchResults) {
      return searchQuery.trim() ? "No users found" : "Search for users to start a chat";
    }
    return "No conversations yet";
  };

  const getEmptySubMessage = () => {
    if (showSearchResults) {
      return "Try a different search term";
    }
    return "Start a new chat to begin messaging";
  };

  // Provide search context
  const searchContextValue: SearchContextType = {
    searchQuery,
    onSearchChange: handleSearchChange,
    isSearching
  };

  if (error && !isLoading) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <FAB
          icon="refresh"
          style={styles.retryFab}
          onPress={() => fetchConversations()}
          label="Retry"
        />
      </View>
    );
  }

  return (
    <SearchContext.Provider value={searchContextValue}>
      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>Loading conversations...</Text>
          </View>
        ) : (
          <FlatList
            data={getCurrentData()}
            renderItem={getCurrentRenderItem()}
            keyExtractor={getCurrentKeyExtractor()}
            contentContainerStyle={styles.chatList}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={["#2196F3"]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{getEmptyMessage()}</Text>
                <Text style={styles.emptySubtext}>{getEmptySubMessage()}</Text>
              </View>
            }
          />
        )}
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={handleNewChat}
          label="New Chat"
        />
      </View>
    </SearchContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff"
  },
  chatList: {
    padding: 8
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666"
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24
  },
  errorText: {
    fontSize: 16,
    color: "#d32f2f",
    textAlign: "center",
    marginBottom: 16
  },
  retryFab: {
    marginTop: 16
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 48
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center"
  }
});

export default HomeScreen;
