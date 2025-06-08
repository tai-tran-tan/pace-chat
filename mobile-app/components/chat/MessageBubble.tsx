import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

interface Props {
  text: string;
  isMine: boolean;
  timestamp: string;
  isRead: boolean;
}

const MessageBubble: React.FC<Props> = ({ text, isMine, timestamp, isRead }) => {
  return (
    <View style={[
      styles.container,
      isMine ? styles.mineContainer : styles.otherContainer
    ]}>
      <View style={[
        styles.bubble,
        isMine ? styles.mineBubble : styles.otherBubble
      ]}>
        <Text style={[
          styles.text,
          isMine ? styles.mineText : styles.otherText
        ]}>
          {text}
        </Text>
      </View>
      <View style={styles.footer}>
        <Text style={styles.timestamp}>{timestamp}</Text>
        {isMine && (
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