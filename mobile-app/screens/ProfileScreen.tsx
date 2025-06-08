import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Avatar, List, Divider, useTheme } from 'react-native-paper';
import { useAuthStore } from '../store/useAuthStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { resetToAuth } from '../App';

// Cập nhật User type
interface User {
  user_id: string;
  username: string;
  avatar_url?: string | null;
}

const ProfileScreen = () => {
  const { user, logout } = useAuthStore();
  const theme = useTheme();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
      resetToAuth();
    } catch (error) {
      console.error('Lỗi khi đăng xuất:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <View style={[styles.container, styles.centerContent]}>
          <Text>Vui lòng đăng nhập để xem thông tin cá nhân</Text>
          <Button 
            mode="contained" 
            onPress={resetToAuth}
            style={{ marginTop: 16 }}
          >
            Đăng nhập
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Avatar.Image 
            size={100} 
            source={{ 
              uri: user.avatar_url || 
              `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}` 
            }} 
            style={styles.avatar}
          />
          <Text style={styles.name}>{user.username}</Text>
        </View>

        <List.Section>
          <List.Item
            title="Cập nhật thông tin"
            left={props => <List.Icon {...props} icon="account-edit" />}
            onPress={() => {/* TODO: Navigate to edit profile */}}
          />
          <Divider />
          <List.Item
            title="Cài đặt"
            left={props => <List.Icon {...props} icon="cog" />}
            onPress={() => {/* TODO: Navigate to settings */}}
          />
          <Divider />
          <List.Item
            title="Trợ giúp & Hỗ trợ"
            left={props => <List.Icon {...props} icon="help-circle" />}
            onPress={() => {/* TODO: Navigate to help */}}
          />
        </List.Section>

        <View style={styles.logoutContainer}>
          <Button
            mode="outlined"
            onPress={handleLogout}
            loading={loading}
            style={styles.logoutButton}
            textColor={theme.colors.error}
          >
            Đăng xuất
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  avatar: {
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  logoutContainer: {
    padding: 16,
  },
  logoutButton: {
    borderColor: '#ff4444',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});

export default ProfileScreen; 