// components/chat/MessageInput.tsx
import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Or use any icon lib you prefer

type Props = {
  onSend: (message: string) => void;
  onAttach: () => void;
};

const MessageInput = ({ onSend, onAttach }: Props) => {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (text.trim().length > 0) {
      onSend(text);
      setText('');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onAttach}>
        <Ionicons name="attach" size={24} color="#555" />
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Type a message"
        value={text}
        onChangeText={setText}
        multiline
      />

      <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
        <Ionicons name="send" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#ddd',
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    marginHorizontal: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 20,
  },
});

export default MessageInput;
