// components/chat/MessageInput.tsx
import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, IconButton } from 'react-native-paper';

interface Props {
  onSend: (text: string) => void;
  onAttach: () => void;
  onTyping: (isTyping: boolean) => void;
  onEmoji?: () => void;
  onRecord?: () => void;
  onImage?: () => void;
  disabled?: boolean;
  style?: any;
}

const MessageInput: React.FC<Props> = ({ 
  onSend, 
  onAttach, 
  onTyping,
  onEmoji = () => {},
  onRecord = () => {},
  onImage = () => {},
  disabled = false,
  style
}) => {
  const [text, setText] = useState('');
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleTextChange = (newText: string) => {
    setText(newText);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Notify typing status
    onTyping(true);

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 1000);
  };

  const handleSend = useCallback(() => {
    if (text.trim() && !disabled) {
      onSend(text.trim());
      setText('');
      onTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  }, [text, onSend, disabled, onTyping]);

  // Cleanup typing timeout on unmount
  React.useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <View style={[styles.container, style]}>
      <IconButton icon="emoticon-outline" size={22} onPress={onEmoji} style={styles.icon} />
      <TextInput
        value={text}
        onChangeText={handleTextChange}
        placeholder="Message"
        placeholderTextColor="#999"
        style={styles.input}
        underlineColor="transparent"
        mode="flat"
        multiline
        maxLength={1000}
        disabled={disabled}
      />
      <IconButton icon="paperclip" size={22} onPress={onAttach} style={styles.icon} />
      <IconButton icon="microphone" size={22} onPress={onRecord} style={styles.icon} />
      <IconButton icon="image-outline" size={22} onPress={onImage} style={styles.icon} />
      <IconButton
        icon="send"
        size={22}
        onPress={handleSend}
        disabled={!text.trim() || disabled}
        style={styles.icon}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    borderRadius: 0,
    margin: 0,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
    fontSize: 16,
    marginHorizontal: 4,
    minHeight: 36,
    maxHeight: 80,
    borderRadius: 8,
    paddingVertical: 4,
  },
  icon: {
    marginHorizontal: 2,
  },
});

export default MessageInput;
