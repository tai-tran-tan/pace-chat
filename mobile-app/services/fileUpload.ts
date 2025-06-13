import api from './api';
import { Platform } from 'react-native';
import DocumentPicker from 'react-native-document-picker';

export interface FileUploadResponse {
  file_url: string;
  file_type: string;
  file_size: number;
}

export class FileUploadService {
  /**
   * Pick an image using native file chooser
   */
  static async pickImage(): Promise<string | null> {
    console.log('Opening native file chooser...');
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.images],
        copyTo: 'cachesDirectory', // Copy file to app cache for better performance
      });

      console.log('File picker result:', result);

      if (result && result.length > 0) {
        const file = result[0];
        return file.fileCopyUri || file.uri;
      }
      
      return null;
    } catch (error) {
      if (DocumentPicker.isCancel(error)) {
        console.log('User cancelled file picker');
        return null;
      }
      console.error('Error picking image:', error);
      throw error;
    }
  }

  /**
   * Pick multiple images using native file chooser
   */
  static async pickMultipleImages(): Promise<string[]> {
    console.log('Opening native file chooser for multiple images...');
    try {
      const result = await DocumentPicker.pickMultiple({
        type: [DocumentPicker.types.images],
        copyTo: 'cachesDirectory',
      });

      console.log('Multiple file picker result:', result);

      if (result && result.length > 0) {
        return result.map(file => file.fileCopyUri || file.uri).filter(Boolean);
      }
      
      return [];
    } catch (error) {
      if (DocumentPicker.isCancel(error)) {
        console.log('User cancelled multiple file picker');
        return [];
      }
      console.error('Error picking multiple images:', error);
      throw error;
    }
  }

  /**
   * Pick any file type using native file chooser
   */
  static async pickFile(): Promise<string | null> {
    console.log('Opening native file chooser for any file...');
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
        copyTo: 'cachesDirectory',
      });

      console.log('File picker result:', result);

      if (result && result.length > 0) {
        const file = result[0];
        return file.fileCopyUri || file.uri;
      }
      
      return null;
    } catch (error) {
      if (DocumentPicker.isCancel(error)) {
        console.log('User cancelled file picker');
        return null;
      }
      console.error('Error picking file:', error);
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
      throw new Error('Failed to upload file. Please try again.');
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
    } else if (extension === 'pdf') {
      mimeType = 'application/pdf';
    } else if (extension === 'doc') {
      mimeType = 'application/msword';
    } else if (extension === 'docx') {
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (extension === 'txt') {
      mimeType = 'text/plain';
    }

    // Generate unique filename
    const fileName = `file_${Date.now()}.${extension || 'jpg'}`;

    return { mimeType, fileName };
  }

  /**
   * Show file picker options (images only or all files)
   */
  static async showFilePickerOptions(imageOnly: boolean = true): Promise<string | null> {
    if (imageOnly) {
      return this.pickImage();
    } else {
      return this.pickFile();
    }
  }
}

export default FileUploadService; 