import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Avatar, List, Divider, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { RootStackNavigationProp } from '../types/navigation';
import { useAuthStore } from '../store/useAuthStore';

const ProfileScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { user, logout, updateProfile } = useAuthStore();
  const theme = useTheme();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
    } catch (error) {
      console.error('Lỗi khi đăng xuất:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text>Vui lòng đăng nhập để xem thông tin cá nhân</Text>
        <Button 
          mode="contained" 
          onPress={() => navigation.navigate('Auth')} 
          style={{ marginTop: 16 }}
        >
          Đăng nhập
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Avatar.Image 
          size={100} 
          source={{ uri: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}` }} 
          style={styles.avatar}
        />
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
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
  email: {
    fontSize: 16,
    color: '#666',
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