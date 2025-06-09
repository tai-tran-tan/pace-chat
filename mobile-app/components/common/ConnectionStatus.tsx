import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Chip } from 'react-native-paper';
import { useWebSocketManager } from '../../hooks/useWebSocketManager';

interface ConnectionStatusProps {
  showDetails?: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ showDetails = false }) => {
  const { isConnected } = useWebSocketManager({
    autoConnect: false, // Don't auto connect, just monitor status
    enableIdleDisconnect: false
  });

  const getStatusColor = () => {
    return isConnected ? '#4CAF50' : '#F44336';
  };

  const getStatusText = () => {
    return isConnected ? 'Connected' : 'Disconnected';
  };

  const getStatusIcon = () => {
    return isConnected ? 'wifi' : 'wifi-off';
  };

  if (!showDetails) {
    return (
      <View style={styles.container}>
        <Chip
          icon={getStatusIcon()}
          textStyle={{ color: getStatusColor() }}
          style={[styles.chip, { borderColor: getStatusColor() }]}
        >
          {getStatusText()}
        </Chip>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Chip
        icon={getStatusIcon()}
        textStyle={{ color: getStatusColor() }}
        style={[styles.chip, { borderColor: getStatusColor() }]}
      >
        {getStatusText()}
      </Chip>
      {showDetails && (
        <Text style={[styles.details, { color: getStatusColor() }]}>
          WebSocket: {isConnected ? 'Active' : 'Inactive'}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  chip: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  details: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default ConnectionStatus; 