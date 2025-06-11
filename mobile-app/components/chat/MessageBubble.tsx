import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import LoadingIndicator from './LoadingIndicator';

interface Props {
  text: string;
  isMine: boolean;
  timestamp: string;
  isRead: boolean;
  messageType?: 'text' | 'image' | 'video' | 'file';
  onImagePress?: () => void;
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
  isUploading = false
}) => {
  const isImage = messageType === 'image';
  const isUploadingImage = isImage && isUploading;

  const renderContent = () => {
    if (isImage) {
      if (isUploadingImage) {
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
        isImage && styles.imageBubble
      ]}>
        {renderContent()}
      </View>
      <View style={styles.footer}>
        <Text style={styles.timestamp}>{timestamp}</Text>
        {isMine && !isUploadingImage && (
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
    maxWidth: '80%',
  },
  mineContainer: {
    alignSelf: 'flex-end',
  },
  otherContainer: {
    alignSelf: 'flex-start',
  },
  bubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '100%',
  },
  mineBubble: {
    backgroundColor: '#0084ff',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#e9e9eb',
    borderBottomLeftRadius: 4,
  },
  imageBubble: {
    padding: 4,
    backgroundColor: 'transparent',
  },
  text: {
    fontSize: 16,
    lineHeight: 20,
  },
  mineText: {
    color: '#ffffff',
  },
  otherText: {
    color: '#000000',
  },
  image: {
    width: maxImageWidth,
    height: maxImageHeight,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginHorizontal: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#8e8e93',
  },
  readStatus: {
    fontSize: 12,
    color: '#0084ff',
    marginLeft: 4,
  },
});

export default MessageBubble;