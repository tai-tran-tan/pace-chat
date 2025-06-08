// components/chat/MessageInput.tsx
import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, IconButton } from 'react-native-paper';

interface Props {
  onSend: (text: string) => void;
  onAttach: () => void;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
}

const MessageInput: React.FC<Props> = ({ 
  onSend, 
  onAttach, 
  onTyping,
  disabled = false 
}) => {
  const [text, setText] = useState('');
  const typingTimeoutRef = React.useRef<NodeJS.Timeout>();

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
    <View style={styles.container}>
      <IconButton
        icon="paperclip"
        size={24}
        onPress={onAttach}
        disabled={disabled}
        style={styles.attachButton}
      />
      <TextInput
        value={text}
        onChangeText={handleTextChange}
        placeholder="Type a message..."
        mode="outlined"
        multiline
        maxLength={1000}
        disabled={disabled}
        style={styles.input}
        right={
          <TextInput.Icon
            icon="send"
            disabled={!text.trim() || disabled}
            onPress={handleSend}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: '#fff',
  },
  attachButton: {
    margin: 0,
  },
});

export default MessageInput;
