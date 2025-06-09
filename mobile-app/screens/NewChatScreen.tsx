import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import {
  Searchbar,
  Text,
  Avatar,
  Divider,
  FAB,
  useTheme,
  IconButton,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';
import DefaultAvatar from '../components/DefaultAvatar';

interface User {
  user_id: string;
  username: string;
  avatar_url: string | null;
  status?: 'online' | 'offline' | 'away';
  last_seen?: string;
}

interface Conversation {
  conversation_id: string;
  type: 'private' | 'group';
  name: string | null;
  participants: {
    user_id: string;
    username: string;
    avatar_url: string | null;
  }[];
  last_message_preview: string | null;
  last_message_timestamp: string | null;
  unread_count: number;
}

interface Section {
  title: string;
  data: User[];
}

type RootStackParamList = {
  Chat: { userId: string; username: string };
  // ... other screen params ...
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Chat'>;

const NewChatScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load recent conversations and extract unique users
  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get recent conversations
      const response = await api.get('/conversations');
      const conversations = response.data as Conversation[];

      // Extract unique users from conversations
      const userMap = new Map<string, User>();
      
      conversations.forEach(conv => {
        if (conv.type === 'private') {
          // For private chats, add the other participant
          const otherParticipant = conv.participants.find(p => p.user_id !== user?.user_id);
          if (otherParticipant) {
            userMap.set(otherParticipant.user_id, {
              user_id: otherParticipant.user_id,
              username: otherParticipant.username,
              avatar_url: otherParticipant.avatar_url,
              status: 'offline', // Default status, will be updated via WebSocket
            });
          }
        }
      });

      // Convert map to array and sort by last message timestamp
      const recentUsers = Array.from(userMap.values()).sort((a, b) => {
        const convA = conversations.find(c => 
          c.type === 'private' && c.participants.some(p => p.user_id === a.user_id)
        );
        const convB = conversations.find(c => 
          c.type === 'private' && c.participants.some(p => p.user_id === b.user_id)
        );
        
        const timeA = convA?.last_message_timestamp || '';
        const timeB = convB?.last_message_timestamp || '';
        return timeB.localeCompare(timeA);
      });

      setSections([
        {
          title: 'Recent',
          data: recentUsers
        }
      ]);
    } catch (error: any) {
      console.error('Error loading users:', error);
      let errorMessage = 'Unable to load user list. ';
      
      if (error.response) {
        errorMessage += error.response.data.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage += 'No response from server';
      } else {
        errorMessage += error.message || 'Unknown error';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [user?.user_id]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Handle search
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length > 0) {
      setIsSearching(true);
      setError(null);
      try {
        const response = await api.get('/users/search', {
          params: { query: query.trim() }
        });
        
        console.log('Search API response:', response.data); // Debug log
        
        // Map to User type and filter out current user if needed
        const searchResults = (response.data || [])
          .map((userData: any) => ({
            user_id: userData.user_id,
            username: userData.username,
            avatar_url: userData.avatar_url,
            status: 'offline', // Default status
          }))
          .filter((userData: User) => {
            // Only filter out current user if user is logged in
            if (!user?.user_id) return true;
            return userData.user_id !== user.user_id;
          });
        
        console.log('Current user:', user?.user_id); // Debug log
        console.log('Processed search results:', searchResults); // Debug log
        setSearchResults(searchResults);
      } catch (error: any) {
        console.error('Error searching users:', error);
        let errorMessage = 'Unable to search users. ';
        
        if (error.response) {
          console.log('Error response:', error.response.data); // Debug log
          errorMessage += error.response.data.message || `Server error: ${error.response.status}`;
        } else if (error.request) {
          errorMessage += 'No response from server';
        } else {
          errorMessage += error.message || 'Unknown error';
        }
        
        setError(errorMessage);
        setSearchResults([]); // Clear search results on error
      } finally {
        setIsSearching(false);
      }
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [user?.user_id]);

  // Handle user selection
  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  // Handle starting chat
  const handleStartChat = useCallback(async () => {
    if (selectedUsers.size === 0) return;

    try {
      if (selectedUsers.size === 1) {
        // Start private chat
        const targetUserId = Array.from(selectedUsers)[0];
        const targetUser = [...sections.flatMap(section => section.data), ...searchResults]
          .find(user => user.user_id === targetUserId);
        
        if (targetUser) {
          navigation.navigate('Chat', {
            userId: targetUser.user_id,
            username: targetUser.username
          });
        }
      } else {
        // Start group chat
        // TODO: Navigate to group chat creation screen
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  }, [selectedUsers, navigation, sections, searchResults]);

  // Render user item
  const renderUserItem = ({ item }: { item: User }) => {
    const isSelected = selectedUsers.has(item.user_id);
    console.log('Rendering user item:', item); // Debug log
    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => {
          console.log('User selected:', item); // Debug log
          toggleUserSelection(item.user_id);
        }}
      >
        {item.avatar_url ? (
          <Avatar.Image
            size={50}
            source={{ uri: item.avatar_url }}
            style={styles.avatar}
          />
        ) : (
          <DefaultAvatar username={item.username} size={50} />
        )}
        <View style={styles.userInfo}>
          <Text style={styles.username}>{item.username}</Text>
          {item.status && (
            <Text style={[
              styles.status,
              { color: item.status === 'online' ? '#4CAF50' : '#666' }
            ]}>
              {item.status === 'online' ? 'Online' : 'Offline'}
            </Text>
          )}
        </View>
        {isSelected && (
          <IconButton
            icon="check-circle"
            size={24}
            iconColor={theme.colors.primary}
          />
        )}
      </TouchableOpacity>
    );
  };

  // Render section header
  const renderSectionHeader = ({ title }: { title: string }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>
        {isSearching
          ? 'No users found'
          : 'No conversations yet'}
      </Text>
    </View>
  );

  // Render list content
  const renderListContent = () => {
    if (searchQuery) {
      // When searching, show search results
      console.log('Rendering search results:', searchResults); // Debug log
      return (
        <FlatList
          data={searchResults}
          renderItem={renderUserItem}
          keyExtractor={item => item.user_id}
          ItemSeparatorComponent={() => <Divider />}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {isSearching 
                  ? 'Searching...' 
                  : 'No users found'}
              </Text>
            </View>
          )}
          refreshing={isSearching}
          onRefresh={() => handleSearch(searchQuery)}
          contentContainerStyle={searchResults.length === 0 ? styles.emptyListContainer : undefined}
        />
      );
    } else {
      // When not searching, show sections
      return (
        <FlatList
          data={sections.flatMap(section => section.data)}
          renderItem={renderUserItem}
          keyExtractor={item => item.user_id}
          ItemSeparatorComponent={() => <Divider />}
          ListEmptyComponent={renderEmptyState}
          ListHeaderComponent={
            <View>
              {sections.map(section => (
                section.data.length > 0 && (
                  <View key={section.title}>
                    {renderSectionHeader({ title: section.title })}
                  </View>
                )
              ))}
            </View>
          }
          refreshing={isLoading}
          onRefresh={loadUsers}
        />
      );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Searchbar
            placeholder="Search users..."
            onChangeText={handleSearch}
            value={searchQuery}
            style={styles.searchBar}
          />
        </View>

        <View style={styles.avatarList}>
          <FlatList
            horizontal
            data={sections.length > 0 ? sections[0].data : []}
            renderItem={({item}) => (
              <View style={{alignItems: 'center', marginRight: 12}}>
                {item.avatar_url ? (
                  <Avatar.Image size={48} source={{ uri: item.avatar_url }} style={styles.avatarCircle} />
                ) : (
                  <DefaultAvatar username={item.username} size={48} />
                )}
                <Text style={styles.avatarName}>{item.username}</Text>
              </View>
            )}
            keyExtractor={item => item.user_id}
            showsHorizontalScrollIndicator={false}
            style={{marginVertical: 8}}
          />
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={loadUsers}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : isLoading && !searchQuery ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          renderListContent()
        )}

        {selectedUsers.size > 0 && (
          <FAB
            icon={selectedUsers.size === 1 ? 'message' : 'account-group'}
            label={selectedUsers.size === 1 ? 'Start Chat' : 'Create Group'}
            onPress={handleStartChat}
            style={styles.fab}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchBar: {
    elevation: 0,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
  },
  avatar: {
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '500',
  },
  status: {
    fontSize: 14,
    marginTop: 2,
  },
  sectionHeader: {
    padding: 12,
    backgroundColor: '#f5f5f5',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#c62828',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    padding: 8,
    backgroundColor: '#2196F3',
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyListContainer: {
    padding: 20,
  },
  avatarList: {
    flexDirection: 'row',
    marginVertical: 8,
    paddingHorizontal: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginHorizontal: 8,
  },
  avatarName: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    color: '#444',
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    borderRadius: 12,
    backgroundColor: '#fff',
    marginVertical: 4,
    marginHorizontal: 8,
  },
  unreadBadge: {
    backgroundColor: '#e53935',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default NewChatScreen; 