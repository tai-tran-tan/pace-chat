import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity } from "react-native";
import { FAB, Text } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import type { RootStackNavigationProp } from "../types/navigation";
import ChatItem from "../components/chat/ChatItem";
import { useWebSocketManager } from "../hooks/useWebSocketManager";
import { useAuthStore } from "../store/useAuthStore";
import api from "../services/api";
import { useTheme } from '../hooks/useTheme';

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

const HomeScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { user } = useAuthStore();
  const theme = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      subtitle={item.last_message_preview || "No messages yet"}
      timestamp={formatTimestamp(item.last_message_timestamp)}
      unreadCount={item.unread_count}
      avatar={getConversationAvatar(item)}
      isOnline={true}
      onPress={() => handleConversationPress(item)}
    />
  );

  const handleRefresh = () => {
    fetchConversations(true);
  };

  if (error && !isLoading) {
    return (
      <View style={[theme.containerStyles.flex, theme.stateStyles.errorContainer]}>
        <Text style={theme.textStyles.error}>{error}</Text>
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
    <View style={[theme.containerStyles.flex, { backgroundColor: theme.colors.background.primary }]}>
      {isLoading ? (
        <View style={theme.stateStyles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={[theme.textStyles.body, { marginTop: theme.spacing.md }]}>Loading conversations...</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderChatItem}
          keyExtractor={(item: Conversation) => item.conversation_id}
          contentContainerStyle={styles.chatList}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary.main]}
            />
          }
          ListEmptyComponent={
            <View style={theme.stateStyles.emptyContainer}>
              <Text style={theme.textStyles.h3}>No conversations yet</Text>
              <Text style={theme.textStyles.bodySmall}>Start a new chat to begin messaging</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  chatList: {
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0
  },
  retryFab: {
    marginTop: 16
  },
  searchInputContainer: {
    padding: 8
  },
  input: {
    fontSize: 16
  }
});

export default HomeScreen;
