import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const NewChatScreen = () => (
  <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
    <View style={styles.container}>
      <Text style={styles.text}>New Chat Screen</Text>
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 20 }
});

export default NewChatScreen; 