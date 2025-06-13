import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import LoadingIndicator from './LoadingIndicator';

interface Props {
  text: string;
  isMine: boolean;
  timestamp: string;
  isRead: boolean;
  messageType?: 'text' | 'image' | 'video' | 'file';
  onImagePress?: () => void;
  onFilePress?: () => void;
  isUploading?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');
const maxImageWidth = screenWidth * 0.6; // 60% of screen width
const maxImageHeight = 300;

const MessageBubble: React.FC<Props> = ({ 
  text, 
  isMine, 
  timestamp, 
  isRead, 
  messageType = 'text',
  onImagePress,
  onFilePress,
  isUploading = false
}) => {
  const isImage = messageType === 'image';
  const isFile = messageType === 'file';
  const isUploadingContent = (isImage || isFile) && isUploading;

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'file-pdf-box';
      case 'doc':
      case 'docx':
        return 'file-word-box';
      case 'xls':
      case 'xlsx':
        return 'file-excel-box';
      case 'ppt':
      case 'pptx':
        return 'file-powerpoint-box';
      case 'txt':
        return 'file-document';
      default:
        return 'file';
    }
  };

  const getFileName = (url: string) => {
    return url.split('/').pop() || 'Unknown file';
  };

  const renderContent = () => {
    if (isImage) {
      if (isUploadingContent) {
        return <LoadingIndicator message="Đang tải lên hình ảnh..." />;
      }
      
      return (
        <TouchableOpacity onPress={onImagePress} activeOpacity={0.9}>
          <Image
            source={{ uri: text }}
            style={styles.image}
            resizeMode="cover"
          />
        </TouchableOpacity>
      );
    }

    if (isFile) {
      if (isUploadingContent) {
        return <LoadingIndicator message="Đang tải lên file..." />;
      }

      const fileName = getFileName(text);
      const fileIcon = getFileIcon(fileName);

      return (
        <TouchableOpacity onPress={onFilePress} activeOpacity={0.7} style={styles.fileContainer}>
          <IconButton icon={fileIcon} size={32} style={styles.fileIcon} />
          <View style={styles.fileInfo}>
            <Text style={styles.fileName} numberOfLines={2}>
              {fileName}
            </Text>
            <Text style={styles.fileType}>
              {fileName.split('.').pop()?.toUpperCase() || 'FILE'}
            </Text>
          </View>
          <IconButton icon="download" size={20} style={styles.downloadIcon} />
        </TouchableOpacity>
      );
    }

    return (
      <Text style={[
        styles.text,
        isMine ? styles.mineText : styles.otherText
      ]}>
        {text}
      </Text>
    );
  };

  return (
    <View style={[
      styles.container,
      isMine ? styles.mineContainer : styles.otherContainer
    ]}>
      <View style={[
        styles.bubble,
        isMine ? styles.mineBubble : styles.otherBubble,
        (isImage || isFile) && styles.mediaBubble
      ]}>
        {renderContent()}
      </View>
      <View style={styles.footer}>
        <Text style={styles.timestamp}>{timestamp}</Text>
        {isMine && !isUploadingContent && (
          <Text style={styles.readStatus}>
            {isRead ? '✓✓' : '✓'}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 8,
  },
  mineContainer: {
    alignItems: 'flex-end',
  },
  otherContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
  },
  mineBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#E5E5EA',
    borderBottomLeftRadius: 4,
  },
  mediaBubble: {
    padding: 8,
  },
  imageBubble: {
    padding: 4,
  },
  text: {
    fontSize: 16,
    lineHeight: 20,
  },
  mineText: {
    color: '#fff',
  },
  otherText: {
    color: '#000',
  },
  image: {
    width: maxImageWidth,
    height: maxImageHeight,
    borderRadius: 12,
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
    padding: 12,
    minWidth: 200,
  },
  fileIcon: {
    margin: 0,
  },
  fileInfo: {
    flex: 1,
    marginLeft: 8,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 2,
  },
  fileType: {
    fontSize: 12,
    color: '#666',
  },
  downloadIcon: {
    margin: 0,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginHorizontal: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  readStatus: {
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 4,
  },
});

export default MessageBubble;