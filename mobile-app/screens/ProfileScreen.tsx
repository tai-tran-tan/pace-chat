import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import {
  Text,
  Button,
  Avatar,
  List,
  Divider,
  useTheme
} from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { useAuthStore } from "../store/useAuthStore";
import { useWebSocketManager } from "../hooks/useWebSocketManager";
import ConnectionStatus from "../components/common/ConnectionStatus";
import type { RootStackNavigationProp } from "../types/navigation";

// Update User type
interface User {
  user_id: string;
  username: string;
  avatar_url?: string | null;
  email?: string;
}

const ProfileScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { user, logout } = useAuthStore();
  const theme = useTheme();
  const [loading, setLoading] = useState(false);

  // Monitor WebSocket connection status
  const { isConnected: wsConnected } = useWebSocketManager({
    autoConnect: false, // Just monitor, don't control connection
    enableIdleDisconnect: false
  });

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
      navigation.reset({
        index: 0,
        routes: [{ name: "Auth" }]
      });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text>Please login to view your profile information</Text>
        <Button
          mode="contained"
          onPress={() => navigation.navigate("Auth")}
          style={{ marginTop: 16 }}
        >
          Login
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Avatar.Image
          size={100}
          source={{
            uri:
              user.avatar_url ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                user.username
              )}`
          }}
          style={styles.avatar}
        />
        <Text style={styles.name}>{user.username}</Text>
        <Text style={styles.email}>{user?.email || "No email"}</Text>
      </View>

      {/* Connection Status */}
      <View style={styles.statusSection}>
        <Text style={styles.sectionTitle}>Connection Status</Text>
        <ConnectionStatus showDetails={true} />
      </View>

      <List.Section>
        <List.Item
          title="Update Profile"
          left={(props) => <List.Icon {...props} icon="account-edit" />}
          onPress={() => {
            /* TODO: Navigate to edit profile */
          }}
        />
        <Divider />
        <List.Item
          title="Settings"
          left={(props) => <List.Icon {...props} icon="cog" />}
          onPress={() => {
            /* TODO: Navigate to settings */
          }}
        />
        <Divider />
        <List.Item
          title="Help & Support"
          left={(props) => <List.Icon {...props} icon="help-circle" />}
          onPress={() => {
            /* TODO: Navigate to help */
          }}
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
          Logout
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff"
  },
  header: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f5f5f5"
  },
  avatar: {
    marginBottom: 16
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4
  },
  logoutContainer: {
    padding: 16
  },
  logoutButton: {
    borderColor: "#ff4444"
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  email: {
    fontSize: 16
  },
  statusSection: {
    padding: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16
  }
});

export default ProfileScreen;
