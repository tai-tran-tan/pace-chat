import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
  text: string;
  isMine?: boolean;
};

const MessageBubble = ({ text, isMine }: Props) => (
  <View
    style={[
      styles.bubble,
      isMine ? styles.mine : styles.theirs,
    ]}
  >
    <Text style={isMine ? styles.myText : styles.theirText}>
      {text}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  bubble: {
    padding: 10,
    marginVertical: 4,
    marginHorizontal: 10,
    borderRadius: 18,
    maxWidth: '80%',
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E5EA',
  },
  myText: {
    color: 'white',
    fontSize: 16,
  },
  theirText: {
    color: '#333',
    fontSize: 16,
  },
});

export default MessageBubble;