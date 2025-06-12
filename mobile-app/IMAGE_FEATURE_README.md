# Image Sending Feature in Chat App

## Overview

The image sending feature allows users to send images in conversations. This feature includes:

- Select images from gallery
- Take photos using camera
- Upload images to server
- Display images in chat
- View images in fullscreen

## File Structure

### Components
- `components/chat/MessageBubble.tsx` - Display messages and images
- `components/chat/MessageInput.tsx` - Input for sending messages and images
- `components/chat/ImageViewer.tsx` - Fullscreen image viewer modal
- `components/chat/ImageActionSheet.tsx` - Action sheet for choosing image source
- `components/chat/LoadingIndicator.tsx` - Upload progress indicator

### Services
- `services/fileUpload.ts` - File upload service
- `services/socket.ts` - WebSocket service (updated to support message_type)

### Screens
- `screens/ChatScreen.tsx` - Main chat screen (updated)

## How to Use

### 1. Send Image
1. Open a conversation
2. Tap the image icon (📷) in the input bar
3. Choose "Take Photo" or "Gallery"
4. Select/take an image
5. The image will be uploaded and sent

### 2. View Image
1. Tap on an image in the chat
2. The image will open in fullscreen
3. Tap the close button to exit

## API Endpoints

### Upload file
```
POST /messages/upload
Content-Type: multipart/form-data

Response:
{
  "file_url": "https://cdn.yourchatapp.com/uploads/2025/06/6/image-xyz.jpg",
  "file_type": "image/jpeg",
  "file_size": 1234567
}
```

### WebSocket Message
```json
{
  "type": "SEND_MESSAGE",
  "conversation_id": "conv-1111-2222-3333-4444",
  "content": "https://cdn.yourchatapp.com/uploads/2025/06/6/image-xyz.jpg",
  "message_type": "image",
  "client_message_id": "client-msg-abc-123"
}
```

## Permissions

### iOS
- `NSCameraUsageDescription` - Camera access permission
- `NSPhotoLibraryUsageDescription` - Photo library access permission

### Android
- `android.permission.CAMERA` - Camera permission
- `android.permission.READ_EXTERNAL_STORAGE` - Read file permission
- `android.permission.WRITE_EXTERNAL_STORAGE` - Write file permission

## Dependencies

- `expo-image-picker` - Image selection and capture
- `react-native-paper` - UI components
- `axios` - HTTP requests

## Installation

1. Install dependencies:
```bash
npm install expo-image-picker
```

2. Update `app.json` with required permissions

3. Rebuild app:
```bash
expo start --clear
```

## Advanced Features

### 1. Compression
Images are compressed with quality 0.8 to reduce file size

### 2. Loading States
- Display loading indicator during upload
- Optimistic updates for better UX

### 3. Error Handling
- Handle permission errors
- Handle upload errors
- Retry mechanism

### 4. File Validation
- Check file type (images only)
- File size limits

## Troubleshooting

### Permission Errors
- Check permissions in device Settings
- Ensure app.json has correct permissions

### Upload Errors
- Check network connection
- Check server endpoint
- View console logs

### Images Not Displaying
- Check image URL
- Check CORS settings on server
- Check CDN configuration 