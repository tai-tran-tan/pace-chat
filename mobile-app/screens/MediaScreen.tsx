import React, { useState } from "react";
import { View, StyleSheet, FlatList, Image, TouchableOpacity, Dimensions } from "react-native";
import { Text, Chip, Card, IconButton, useTheme, Button } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import type { RootStackNavigationProp } from "../types/navigation";

// Media types
interface MediaItem {
  id: string;
  type: "image" | "video" | "note" | "poll" | "file" | "audio";
  title: string;
  description?: string;
  url?: string;
  thumbnail?: string;
  timestamp: string;
  chatName: string;
  sender: string;
  size?: string;
  duration?: string;
  pollOptions?: string[];
  pollResults?: number[];
  noteContent?: string;
}

const MediaScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const theme = useTheme();
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  const screenWidth = Dimensions.get("window").width;
  const imageSize = (screenWidth - 60) / 3; // 3 columns with padding

  // Dummy media data
  const dummyMedia: MediaItem[] = [
    {
      id: "1",
      type: "image",
      title: "Ảnh nhóm họp",
      description: "Ảnh chụp tại cuộc họp dự án",
      url: "https://picsum.photos/400/300?random=1",
      thumbnail: "https://picsum.photos/150/150?random=1",
      timestamp: "2 giờ trước",
      chatName: "Nhóm dự án ABC",
      sender: "Nguyễn Văn An"
    },
    {
      id: "2",
      type: "video",
      title: "Video demo sản phẩm",
      description: "Video giới thiệu tính năng mới",
      url: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4",
      thumbnail: "https://picsum.photos/150/150?random=2",
      timestamp: "1 ngày trước",
      chatName: "Nhóm Marketing",
      sender: "Trần Thị Bình",
      duration: "2:30"
    },
    {
      id: "3",
      type: "note",
      title: "Ghi chú cuộc họp",
      description: "Tóm tắt các điểm chính từ cuộc họp hôm nay",
      timestamp: "3 giờ trước",
      chatName: "Nhóm dự án ABC",
      sender: "Lê Văn Cường",
      noteContent: "1. Hoàn thành thiết kế UI/UX\n2. Bắt đầu phát triển backend\n3. Lên kế hoạch testing\n4. Chuẩn bị demo cho khách hàng"
    },
    // {
    //   id: "4",
    //   type: "poll",
    //   title: "Bình chọn thời gian họp",
    //   description: "Chọn thời gian phù hợp cho cuộc họp tuần tới",
    //   timestamp: "2 ngày trước",
    //   chatName: "Nhóm dự án ABC",
    //   sender: "Phạm Thị Dung",
    //   pollOptions: ["Thứ 2, 9:00", "Thứ 3, 14:00", "Thứ 4, 10:00", "Thứ 5, 15:00"],
    //   pollResults: [3, 5, 2, 4]
    // },
    {
      id: "5",
      type: "image",
      title: "Mockup thiết kế",
      description: "Bản thiết kế giao diện mới",
      url: "https://picsum.photos/400/300?random=3",
      thumbnail: "https://picsum.photos/150/150?random=3",
      timestamp: "4 giờ trước",
      chatName: "Nhóm Design",
      sender: "Hoàng Văn Em"
    },
    {
      id: "6",
      type: "file",
      title: "Tài liệu dự án.pdf",
      description: "Tài liệu chi tiết về dự án",
      timestamp: "1 tuần trước",
      chatName: "Nhóm dự án ABC",
      sender: "Vũ Thị Phương",
      size: "2.5 MB"
    },
    {
      id: "7",
      type: "audio",
      title: "Ghi âm cuộc họp",
      description: "Bản ghi âm cuộc họp tuần trước",
      timestamp: "3 ngày trước",
      chatName: "Nhóm dự án ABC",
      sender: "Đỗ Văn Giang",
      duration: "15:30"
    },
    {
      id: "8",
      type: "video",
      title: "Tutorial React Native",
      description: "Hướng dẫn sử dụng React Native",
      url: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4",
      thumbnail: "https://picsum.photos/150/150?random=4",
      timestamp: "5 ngày trước",
      chatName: "Nhóm Dev",
      sender: "Ngô Thị Hoa",
      duration: "8:45"
    }
  ];

  const filters = [
    { key: "all", label: "Tất cả", icon: "view-grid" },
    { key: "image", label: "Hình ảnh", icon: "image" },
    { key: "video", label: "Video", icon: "video" },
    { key: "note", label: "Ghi chú", icon: "note-text" },
    { key: "poll", label: "Bình chọn", icon: "poll" },
    { key: "file", label: "Tệp tin", icon: "file" },
    { key: "audio", label: "Âm thanh", icon: "music" }
  ];

  const filteredMedia = selectedFilter === "all" 
    ? dummyMedia 
    : dummyMedia.filter(item => item.type === selectedFilter);

  const getMediaIcon = (type: string) => {
    switch (type) {
      case "image":
        return "image";
      case "video":
        return "video";
      case "note":
        return "note-text";
      case "poll":
        return "poll";
      case "file":
        return "file";
      case "audio":
        return "music";
      default:
        return "file";
    }
  };

  const getMediaColor = (type: string) => {
    switch (type) {
      case "image":
        return "#4CAF50";
      case "video":
        return "#FF5722";
      case "note":
        return "#FF9800";
      case "poll":
        return "#9C27B0";
      case "file":
        return "#607D8B";
      case "audio":
        return "#E91E63";
      default:
        return "#9E9E9E";
    }
  };

  const renderMediaItem = ({ item }: { item: MediaItem }) => {
    if (selectedFilter === "all" || selectedFilter === "image" || selectedFilter === "video") {
      // Grid view for images and videos
      if (item.type === "image" || item.type === "video") {
        return (
          <TouchableOpacity
            style={[styles.gridItem, { width: imageSize, height: imageSize }]}
            onPress={() => setSelectedMedia(item)}
          >
            <Image
              source={{ uri: item.thumbnail }}
              style={styles.gridImage}
              resizeMode="cover"
            />
            {item.type === "video" && (
              <View style={styles.videoOverlay}>
                <IconButton icon="play" size={20} iconColor="#fff" />
                {item.duration && (
                  <Text style={styles.durationText}>{item.duration}</Text>
                )}
              </View>
            )}
            <View style={styles.mediaInfo}>
              <Text style={styles.mediaTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.mediaTimestamp}>{item.timestamp}</Text>
            </View>
          </TouchableOpacity>
        );
      }
    }

    // List view for other types
    return (
      <Card style={styles.mediaCard} onPress={() => setSelectedMedia(item)}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.mediaHeader}>
            <View style={[styles.mediaIcon, { backgroundColor: getMediaColor(item.type) }]}>
              <IconButton 
                icon={getMediaIcon(item.type)} 
                size={24} 
                iconColor="#fff" 
              />
            </View>
            <View style={styles.mediaDetails}>
              <Text style={styles.mediaTitle}>{item.title}</Text>
              <Text style={styles.mediaDescription}>{item.description}</Text>
              <Text style={styles.mediaMeta}>
                {item.chatName} • {item.sender} • {item.timestamp}
              </Text>
            </View>
          </View>

          {item.type === "note" && item.noteContent && (
            <View style={styles.noteContent}>
              <Text style={styles.noteText} numberOfLines={3}>
                {item.noteContent}
              </Text>
            </View>
          )}

          {item.type === "poll" && item.pollOptions && (
            <View style={styles.pollContent}>
              {item.pollOptions.map((option, index) => (
                <View key={index} style={styles.pollOption}>
                  <Text style={styles.pollOptionText}>{option}</Text>
                  <Text style={styles.pollResult}>
                    {item.pollResults?.[index] || 0} phiếu
                  </Text>
                </View>
              ))}
            </View>
          )}

          {(item.type === "file" || item.type === "audio") && (
            <View style={styles.fileInfo}>
              <Text style={styles.fileSize}>{item.size || item.duration}</Text>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Media</Text>
        <Text style={styles.subtitle}>{filteredMedia.length} mục</Text>
      </View>

      {/* Filter chips */}
      <View style={styles.filterContainer}>
        <FlatList
          data={filters}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <Chip
              selected={selectedFilter === item.key}
              onPress={() => setSelectedFilter(item.key)}
              style={[
                styles.filterChip,
                selectedFilter === item.key && { backgroundColor: theme.colors.primary }
              ]}
              textStyle={[
                styles.filterChipText,
                selectedFilter === item.key && { color: "#fff" }
              ]}
              icon={item.icon}
            >
              {item.label}
            </Chip>
          )}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filterList}
        />
      </View>

      {/* Media list */}
      <FlatList
        data={filteredMedia}
        renderItem={renderMediaItem}
        keyExtractor={(item) => item.id}
        style={styles.mediaList}
        numColumns={selectedFilter === "all" || selectedFilter === "image" || selectedFilter === "video" ? 3 : 1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.mediaListContent}
      />

      {/* Media detail modal */}
      {selectedMedia && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedMedia.title}</Text>
              <IconButton
                icon="close"
                size={24}
                onPress={() => setSelectedMedia(null)}
              />
            </View>
            
            {selectedMedia.type === "image" && selectedMedia.url && (
              <Image
                source={{ uri: selectedMedia.url }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}

            {selectedMedia.type === "video" && selectedMedia.url && (
              <View style={styles.videoContainer}>
                <Image
                  source={{ uri: selectedMedia.thumbnail }}
                  style={styles.modalImage}
                  resizeMode="cover"
                />
                <View style={styles.videoPlayButton}>
                  <IconButton icon="play" size={40} iconColor="#fff" />
                </View>
              </View>
            )}

            {selectedMedia.type === "note" && selectedMedia.noteContent && (
              <View style={styles.noteModalContent}>
                <Text style={styles.noteModalText}>{selectedMedia.noteContent}</Text>
              </View>
            )}

            <View style={styles.modalFooter}>
              <Text style={styles.modalMeta}>
                {selectedMedia.chatName} • {selectedMedia.sender} • {selectedMedia.timestamp}
              </Text>
              <Button
                mode="contained"
                onPress={() => {
                  setSelectedMedia(null);
                  // Navigate to chat
                  navigation.navigate("Chat", {
                    userId: "chat_id",
                    username: selectedMedia.chatName
                  });
                }}
              >
                Mở chat
              </Button>
            </View>
          </View>
        </View>
      )}
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
  filterContainer: {
    paddingVertical: 10
  },
  filterList: {
    paddingHorizontal: 20
  },
  filterChip: {
    marginRight: 8
  },
  filterChipText: {
    fontSize: 12
  },
  mediaList: {
    flex: 1
  },
  mediaListContent: {
    padding: 12
  },
  gridItem: {
    margin: 4,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative"
  },
  gridImage: {
    width: "100%",
    height: "100%"
  },
  videoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center"
  },
  durationText: {
    position: "absolute",
    bottom: 4,
    right: 4,
    color: "#fff",
    fontSize: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4
  },
  mediaInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 4
  },
  mediaTitle: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "500"
  },
  mediaTimestamp: {
    color: "#ccc",
    fontSize: 8
  },
  mediaCard: {
    marginBottom: 8,
    elevation: 2
  },
  cardContent: {
    padding: 16
  },
  mediaHeader: {
    flexDirection: "row",
    alignItems: "flex-start"
  },
  mediaIcon: {
    borderRadius: 8,
    marginRight: 12
  },
  mediaDetails: {
    flex: 1
  },
  mediaDescription: {
    fontSize: 14,
    color: "#666",
    marginTop: 2
  },
  mediaMeta: {
    fontSize: 12,
    color: "#999",
    marginTop: 4
  },
  noteContent: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 8
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20
  },
  pollContent: {
    marginTop: 12
  },
  pollOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 6,
    marginBottom: 4
  },
  pollOptionText: {
    fontSize: 14,
    flex: 1
  },
  pollResult: {
    fontSize: 12,
    color: "#666"
  },
  fileInfo: {
    marginTop: 12,
    alignItems: "flex-end"
  },
  fileSize: {
    fontSize: 12,
    color: "#666",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    margin: 20,
    maxHeight: "80%",
    width: "90%"
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0"
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1
  },
  modalImage: {
    width: "100%",
    height: 300
  },
  videoContainer: {
    position: "relative"
  },
  videoPlayButton: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -30,
    marginLeft: -30,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 30
  },
  noteModalContent: {
    padding: 16
  },
  noteModalText: {
    fontSize: 16,
    lineHeight: 24
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0"
  },
  modalMeta: {
    fontSize: 12,
    color: "#666",
    marginBottom: 12
  }
});

export default MediaScreen; 