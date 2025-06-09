import React from "react";
import { View, StyleSheet, FlatList } from "react-native";
import { Text, Avatar, List, Searchbar, useTheme } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import type { RootStackNavigationProp } from "../types/navigation";

// Contact type
interface Contact {
  id: string;
  name: string;
  avatar_url?: string | null;
  email?: string;
  phone?: string;
  status?: "online" | "offline" | "away";
  lastSeen?: string;
}

const ContactScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = React.useState("");

  // Dummy contacts data
  const dummyContacts: Contact[] = [
    {
      id: "1",
      name: "Nguyễn Văn An",
      email: "an.nguyen@example.com",
      phone: "+84 123 456 789",
      status: "online",
      lastSeen: "2 phút trước"
    },
    {
      id: "2",
      name: "Trần Thị Bình",
      email: "binh.tran@example.com",
      phone: "+84 987 654 321",
      status: "offline",
      lastSeen: "1 giờ trước"
    },
    {
      id: "3",
      name: "Lê Văn Cường",
      email: "cuong.le@example.com",
      phone: "+84 555 123 456",
      status: "away",
      lastSeen: "30 phút trước"
    },
    {
      id: "4",
      name: "Phạm Thị Dung",
      email: "dung.pham@example.com",
      phone: "+84 777 888 999",
      status: "online",
      lastSeen: "5 phút trước"
    },
    {
      id: "5",
      name: "Hoàng Văn Em",
      email: "em.hoang@example.com",
      phone: "+84 111 222 333",
      status: "offline",
      lastSeen: "2 giờ trước"
    },
    {
      id: "6",
      name: "Vũ Thị Phương",
      email: "phuong.vu@example.com",
      phone: "+84 444 555 666",
      status: "online",
      lastSeen: "1 phút trước"
    },
    {
      id: "7",
      name: "Đỗ Văn Giang",
      email: "giang.do@example.com",
      phone: "+84 888 999 000",
      status: "away",
      lastSeen: "45 phút trước"
    },
    {
      id: "8",
      name: "Ngô Thị Hoa",
      email: "hoa.ngo@example.com",
      phone: "+84 333 444 555",
      status: "offline",
      lastSeen: "3 giờ trước"
    }
  ];

  // Filter contacts based on search query
  const filteredContacts = dummyContacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleContactPress = (contact: Contact) => {
    navigation.navigate("Chat", {
      userId: contact.id,
      username: contact.name
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "#4CAF50";
      case "away":
        return "#FF9800";
      case "offline":
        return "#9E9E9E";
      default:
        return "#9E9E9E";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "online":
        return "Trực tuyến";
      case "away":
        return "Vắng mặt";
      case "offline":
        return "Ngoại tuyến";
      default:
        return "Không xác định";
    }
  };

  const renderContact = ({ item }: { item: Contact }) => (
    <List.Item
      title={item.name}
      description={item.email}
      left={(props) => (
        <View style={styles.avatarContainer}>
          <Avatar.Image
            size={50}
            source={{
              uri:
                item.avatar_url ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  item.name
                )}&size=50`
            }}
            style={styles.avatar}
          />
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: getStatusColor(item.status || "offline") }
            ]}
          />
        </View>
      )}
      right={() => (
        <View style={styles.contactInfo}>
          <Text
            style={[
              styles.statusText,
              { color: getStatusColor(item.status || "offline") }
            ]}
          >
            {getStatusText(item.status || "offline")}
          </Text>
          <Text style={styles.lastSeen}>{item.lastSeen}</Text>
        </View>
      )}
      onPress={() => handleContactPress(item)}
      style={styles.contactItem}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Danh bạ</Text>
        <Text style={styles.subtitle}>{filteredContacts.length} liên hệ</Text>
      </View>

      {/* <Searchbar
        placeholder="Tìm kiếm liên hệ..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
        iconColor={theme.colors.primary}
      /> */}

      <FlatList
        data={filteredContacts}
        renderItem={renderContact}
        keyExtractor={(item) => item.id}
        style={styles.contactList}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff"
  },
  header: {
    padding: 20,
    paddingBottom: 10
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 4
  },
  subtitle: {
    fontSize: 16,
    color: "#666"
  },
  searchbar: {
    margin: 20,
    marginTop: 0,
    marginBottom: 10,
    elevation: 2
  },
  contactList: {
    flex: 1,
    padding: 12
  },
  contactItem: {
    paddingVertical: 8
  },
  avatarContainer: {
    position: "relative",
    marginRight: 8
  },
  avatar: {
    marginRight: 0
  },
  statusIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#fff"
  },
  contactInfo: {
    alignItems: "flex-end",
    justifyContent: "center"
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 2
  },
  lastSeen: {
    fontSize: 11,
    color: "#999"
  },
  separator: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginLeft: 70
  }
});

export default ContactScreen;
