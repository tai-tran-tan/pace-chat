import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { IconButton } from 'react-native-paper';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCamera: () => void;
  onGallery: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

const ImageActionSheet: React.FC<Props> = ({ 
  visible, 
  onClose, 
  onCamera, 
  onGallery 
}) => {
  const handleCamera = () => {
    onCamera();
    onClose();
  };

  const handleGallery = () => {
    onGallery();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />
        
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Chọn hình ảnh</Text>
            <IconButton
              icon="close"
              size={20}
              onPress={onClose}
            />
          </View>
          
          <View style={styles.options}>
            <TouchableOpacity style={styles.option} onPress={handleCamera}>
              <IconButton icon="camera" size={32} />
              <Text style={styles.optionText}>Chụp ảnh</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.option} onPress={handleGallery}>
              <IconButton icon="image" size={32} />
              <Text style={styles.optionText}>Thư viện</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  options: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  option: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  optionText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
});

export default ImageActionSheet; 