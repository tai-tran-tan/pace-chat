import api from './api';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export interface FileUploadResponse {
  file_url: string;
  file_type: string;
  file_size: number;
}

export class FileUploadService {
  /**
   * Pick an image from camera or gallery
   */
  static async pickImage(): Promise<string | null> {
    console.log('Opening image picker...');
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('Media library permission status:', status);
      if (status !== 'granted') {
        throw new Error('Permission to access camera roll is required!');
      }

      console.log('About to launch image picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      console.log('Image picker result:', result);

      if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri;
      }
      
      return null;
    } catch (error) {
      console.error('Error picking image (outer catch):', error);
      throw error;
    }
  }

  /**
   * Take a photo using camera
   */
  static async takePhoto(): Promise<string | null> {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission to access camera is required!');
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri;
      }
      
      return null;
    } catch (error) {
      console.error('Error taking photo:', error);
      throw error;
    }
  }

  /**
   * Upload file to server
   */
  static async uploadFile(fileUri: string): Promise<FileUploadResponse> {
    try {
      console.log('Uploading file:', fileUri);

      // Create form data
      const formData = new FormData();
      
      // Get file info
      const fileInfo = await this.getFileInfo(fileUri);
      
      formData.append('file', {
        uri: fileUri,
        type: fileInfo.mimeType,
        name: fileInfo.fileName,
      } as any);

      // Upload to server
      const response = await api.post('/messages/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 seconds for file upload
      });

      console.log('File upload successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('File upload failed:', error);
      throw new Error('Failed to upload image. Please try again.');
    }
  }

  /**
   * Get file information from URI
   */
  private static async getFileInfo(fileUri: string): Promise<{ mimeType: string; fileName: string }> {
    // Extract file extension from URI
    const extension = fileUri.split('.').pop()?.toLowerCase();
    
    // Determine MIME type based on extension
    let mimeType = 'image/jpeg'; // default
    if (extension === 'png') {
      mimeType = 'image/png';
    } else if (extension === 'gif') {
      mimeType = 'image/gif';
    } else if (extension === 'webp') {
      mimeType = 'image/webp';
    }

    // Generate unique filename
    const fileName = `image_${Date.now()}.${extension || 'jpg'}`;

    return { mimeType, fileName };
  }

  /**
   * Show image picker options (camera or gallery)
   */
  static async showImagePickerOptions(): Promise<string | null> {
    // For now, we'll just use gallery picker
    // In a real app, you might want to show an action sheet with options
    return this.pickImage();
  }
}

export default FileUploadService; 