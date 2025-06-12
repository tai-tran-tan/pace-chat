import React from 'react';
import { StyleSheet } from 'react-native';
import { Avatar, useTheme } from 'react-native-paper';

interface DefaultAvatarProps {
  username: string;
  size?: number;
}

const DefaultAvatar: React.FC<DefaultAvatarProps> = ({ username, size = 50 }) => {
  const theme = useTheme();
  const firstLetter = username.charAt(0).toUpperCase();
  
  const colors = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#96CEB4',
    '#FFEEAD',
    '#D4A5A5',
    '#9B59B6',
    '#3498DB',
    '#E67E22',
    '#2ECC71',
  ];
  
  const colorIndex = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  const backgroundColor = colors[colorIndex];

  return (
    <Avatar.Text
      size={size}
      label={firstLetter}
      style={[styles.avatar, { backgroundColor }]}
      labelStyle={styles.label}
    />
  );
};

const styles = StyleSheet.create({
  avatar: {
    marginRight: 12,
  },
  label: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default DefaultAvatar; 