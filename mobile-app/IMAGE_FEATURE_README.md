# File Sharing Feature in Chat App

## Overview

The file sharing feature allows users to send images and files in conversations. This feature includes:

- Select images from native file chooser
- Select multiple images at once
- Upload files (PDF, DOC, TXT, etc.)
- Display images and files in chat
- View images in fullscreen
- Download files

## File Structure

### Components
- `components/chat/MessageBubble.tsx` - Display messages, images, and files
- `components/chat/MessageInput.tsx` - Input for sending messages with attachment menu
- `components/chat/ImageViewer.tsx` - Fullscreen image viewer modal
- `components/chat/LoadingIndicator.tsx` - Upload progress indicator

### Services
- `services/fileUpload.ts` - File upload service with native file chooser
- `services/socket.ts` - WebSocket service (updated to support message_type)

### Screens
- `screens/ChatScreen.tsx` - Main chat screen (updated)

## How to Use

### 1. Send Single Image
1. Open a conversation
2. Tap the paperclip icon (📎) in the input bar
3. Select "Single Image" from the menu
4. Choose an image using native file chooser
5. The image will be uploaded and sent

### 2. Send Multiple Images
1. Open a conversation
2. Tap the paperclip icon (📎) in the input bar
3. Select "Multiple Images" from the menu
4. Choose multiple images using native file chooser
5. All images will be uploaded and sent sequentially

### 3. Send File
1. Open a conversation
2. Tap the paperclip icon (📎) in the input bar
3. Select "File" from the menu
4. Choose any file type using native file chooser
5. The file will be uploaded and sent

### 4. View Image
1. Tap on an image in the chat
2. The image will open in fullscreen
3. Tap the close button to exit

### 5. Handle File
1. Tap on a file in the chat
2. Currently shows file URL (can be extended to download/open)

## API Endpoints

### Upload file
```
POST /messages/upload
Content-Type: multipart/form-data

Response:
{
  "file_url": "https://cdn.yourchatapp.com/uploads/2025/06/6/file-xyz.pdf",
  "file_type": "application/pdf",
  "file_size": 1234567
}
```

### WebSocket Message
```json
{
  "type": "SEND_MESSAGE",
  "conversation_id": "conv-1111-2222-3333-4444",
  "content": "https://cdn.yourchatapp.com/uploads/2025/06/6/file-xyz.pdf",
  "message_type": "file",
  "client_message_id": "client-msg-abc-123"
}
```

## Permissions

### iOS
- No additional permissions required (uses native file picker)

### Android
- No additional permissions required (uses native file picker)

## Dependencies

- `react-native-document-picker` - Native file chooser
- `react-native-paper` - UI components
- `axios` - HTTP requests

## Installation

1. Install dependencies:
```bash
npm install react-native-document-picker@^8.2.0
```

2. For iOS, add to `ios/Podfile`:
```ruby
pod 'RNReactNativeDocumentPicker', :path => '../node_modules/react-native-document-picker'
```

3. For Android, no additional setup required

4. Rebuild app:
```bash
expo start --clear
```

## Advanced Features

### 1. File Type Support
- Images: JPG, PNG, GIF, WebP
- Documents: PDF, DOC, DOCX, TXT
- Spreadsheets: XLS, XLSX
- Presentations: PPT, PPTX
- And more...

### 2. Loading States
- Display loading indicator during upload
- Optimistic updates for better UX
- Progress tracking for large files

### 3. Error Handling
- Handle file picker cancellation
- Handle upload errors
- Retry mechanism
- File size validation

### 4. File Validation
- Check file type
- File size limits
- File name sanitization

## Troubleshooting

### File Picker Issues
- Ensure react-native-document-picker is properly installed
- Check iOS/Android specific setup
- Clear cache and rebuild

### Upload Errors
- Check network connection
- Check server endpoint
- View console logs
- Check file size limits

### Files Not Displaying
- Check file URL
- Check CORS settings on server
- Check CDN configuration

## Future Enhancements

1. **File Download**: Implement actual file download functionality
2. **File Preview**: Add file preview for supported types
3. **File Sharing**: Allow sharing files to other apps
4. **File Management**: Add file deletion and management
5. **Compression**: Add file compression for large files
6. **Progress Bar**: Show upload/download progress
7. **File Search**: Search through shared files
8. **File Categories**: Organize files by type 