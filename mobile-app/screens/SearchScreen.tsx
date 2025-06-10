import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Avatar,
  Divider,
  IconButton,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useSearchHistoryStore } from '../store/useSearchHistoryStore';
import { useSearchStore } from '../store/useSearchStore';
import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';
import DefaultAvatar from '../components/common/DefaultAvatar';
import type { RootStackNavigationProp } from '../types/navigation';
import ChatItem from '../components/chat/ChatItem';

type User = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  status?: "online" | "offline" | "away";
  last_seen?: string;
};

const SearchScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const theme = useTheme();
  const { user } = useAuthStore();
  const { searchQuery, setSearchQuery } = useSearchStore();
  
  const {
    searchHistory,
    recentContacts,
    addSearchQuery,
    removeSearchQuery,
    clearSearchHistory,
    addRecentContact,
    removeRecentContact,
    loadFromStorage,
  } = useSearchHistoryStore();

  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Search users using API
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim() || !user?.user_id) {
      setSearchResults([]);
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
    } catch (error: any) {
      console.error("Failed to search users:", error);
      setError("Failed to search users. Please try again.");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [user?.user_id]);

  // Watch searchQuery changes and trigger search
  useEffect(() => {
    if (searchQuery.trim()) {
      searchUsers(searchQuery);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, searchUsers]);

  // Handle search submission
  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      addSearchQuery(searchQuery);
    }
  };

  // Handle user selection
  const handleUserSelect = (selectedUser: User) => {
    // Add to recent contacts
    addRecentContact({
      user_id: selectedUser.user_id,
      username: selectedUser.username,
      avatar_url: selectedUser.avatar_url,
    });

    // Navigate to chat
    navigation.navigate("Chat", {
      userId: selectedUser.user_id,
      username: selectedUser.username,
    });
  };

  // Handle history item selection
  const handleHistorySelect = (query: string) => {
    setSearchQuery(query);
    addSearchQuery(query);
  };

  // Handle recent contact selection
  const handleRecentContactSelect = (contact: any) => {
    handleUserSelect({
      user_id: contact.user_id,
      username: contact.username,
      avatar_url: contact.avatar_url,
    });
  };

  // Format timestamp
  const formatTimestamp = (timestamp: number): string => {
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

  // Render search history item
  const renderHistoryItem = ({ item }: { item: { query: string; timestamp: number } }) => (
    <TouchableOpacity
      style={styles.historyItem}
      onPress={() => handleHistorySelect(item.query)}
    >
      <View style={styles.historyContent}>
        <Ionicons name="time-outline" size={20} color={theme.colors.text.secondary} />
        <Text style={[theme.textStyles.body, styles.historyText]}>{item.query}</Text>
      </View>
      <View style={styles.historyActions}>
        <Text style={theme.textStyles.caption}>
          {formatTimestamp(item.timestamp)}
        </Text>
        <IconButton
          icon="close"
          size={16}
          iconColor={theme.colors.text.tertiary}
          onPress={() => removeSearchQuery(item.query)}
        />
      </View>
    </TouchableOpacity>
  );

  // Render recent contact item
  const renderRecentContact = ({ item }: { item: any }) => (
    <ChatItem
      name={item.username}
      avatar={item.avatar_url ? item.avatar_url : <DefaultAvatar username={item.username} size={44} />}
      subtitle={item.lastContacted ? `Last contacted ${formatTimestamp(item.lastContacted)}` : undefined}
      rightAction={
        <IconButton
          icon="close"
          size={16}
          iconColor={theme.colors.text.tertiary}
          onPress={() => removeRecentContact(item.user_id)}
        />
      }
      onPress={() => handleRecentContactSelect(item)}
      style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff' }}
    />
  );

  // Render search result item
  const renderSearchResult = ({ item }: { item: User }) => (
    <ChatItem
      name={item.username}
      avatar={item.avatar_url ? item.avatar_url : <DefaultAvatar username={item.username} size={44} />}
      subtitle={item.status === 'online' ? 'Online' : 'Offline'}
      isOnline={item.status === 'online'}
      rightAction={
        <IconButton
          icon="message-outline"
          size={20}
          iconColor={theme.colors.primary.main}
          onPress={() => handleUserSelect(item)}
        />
      }
      onPress={() => handleUserSelect(item)}
      style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff' }}
    />
  );

  // Render section header
  const renderSectionHeader = ({ title, onClear }: { title: string; onClear?: () => void }) => (
    <View style={styles.sectionHeader}>
      <Text style={theme.textStyles.h4}>{title}</Text>
      {onClear && (
        <TouchableOpacity onPress={onClear}>
          <Text style={[theme.textStyles.caption, { color: theme.colors.primary.main }]}>
            Clear
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={theme.stateStyles.emptyContainer}>
      <Ionicons name="search-outline" size={64} color={theme.colors.text.tertiary} />
      <Text style={theme.textStyles.h3}>No results found</Text>
      <Text style={theme.textStyles.bodySmall}>
        Try searching for a different username or email
      </Text>
    </View>
  );

  // Render main content
  const renderContent = () => {
    if (searchQuery.trim()) {
      // Show search results
      return (
        <FlatList
          data={searchResults}
          renderItem={renderSearchResult}
          keyExtractor={(item) => item.user_id}
          ItemSeparatorComponent={() => <Divider />}
          ListEmptyComponent={
            isSearching ? (
              <View style={theme.stateStyles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary.main} />
                <Text style={theme.textStyles.body}>Searching...</Text>
              </View>
            ) : (
              renderEmptyState()
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={isSearching}
              onRefresh={() => searchUsers(searchQuery)}
              colors={[theme.colors.primary.main]}
            />
          }
        />
      );
    } else {
      // Show history and recent contacts
      return (
        <FlatList
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={
            <View>
              {/* Search History Section */}
              {searchHistory.length > 0 && (
                <View style={styles.section}>
                  {renderSectionHeader({
                    title: "Recent Searches",
                    onClear: clearSearchHistory,
                  })}
                  {searchHistory.map((item, index) => (
                    <View key={`${item.query}-${item.timestamp}`}>
                      {renderHistoryItem({ item })}
                      {index < searchHistory.length - 1 && <Divider />}
                    </View>
                  ))}
                </View>
              )}

              {/* Recent Contacts Section */}
              {recentContacts.length > 0 && (
                <View style={styles.section}>
                  {renderSectionHeader({
                    title: "Recent Contacts",
                  })}
                  {recentContacts.map((item, index) => (
                    <View key={`${item.user_id}-${item.lastContacted}`}>
                      {renderRecentContact({ item })}
                      {index < recentContacts.length - 1 && <Divider />}
                    </View>
                  ))}
                </View>
              )}

              {/* Empty state when no history or contacts */}
              {searchHistory.length === 0 && recentContacts.length === 0 && (
                <View style={theme.stateStyles.emptyContainer}>
                  <Ionicons name="search-outline" size={64} color={theme.colors.text.tertiary} />
                  <Text style={theme.textStyles.h3}>Start Searching</Text>
                  <Text style={theme.textStyles.bodySmall}>
                    Search for users to start a conversation
                  </Text>
                </View>
              )}
            </View>
          }
        />
      );
    }
  };

  return (
    <View style={[theme.containerStyles.flex, { backgroundColor: theme.colors.background.primary }]}>
      {/* Error State */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={theme.textStyles.error}>{error}</Text>
          <TouchableOpacity
            style={[theme.buttonStyles.primary, styles.retryButton]}
            onPress={() => searchUsers(searchQuery)}
          >
            <Text style={theme.textStyles.button}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Content */}
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  errorContainer: {
    padding: 16,
    alignItems: 'center',
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  historyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyText: {
    marginLeft: 12,
    flex: 1,
  },
  historyActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  recentContactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  searchResultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  avatar: {
    marginRight: 0,
  },
});

export default SearchScreen; 