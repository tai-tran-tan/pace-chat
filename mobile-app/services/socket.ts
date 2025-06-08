import AsyncStorage from '@react-native-async-storage/async-storage';

// WebSocket message types
export type WsMessageType = 
  | 'AUTH'
  | 'AUTH_SUCCESS'
  | 'AUTH_FAILURE'
  | 'SEND_MESSAGE'
  | 'MESSAGE_DELIVERED'
  | 'MESSAGE_RECEIVED'
  | 'TYPING_INDICATOR'
  | 'READ_RECEIPT'
  | 'MESSAGE_READ_STATUS'
  | 'PRESENCE_UPDATE'
  | 'CONVERSATION_UPDATE';

// WebSocket message interfaces
interface BaseWsMessage {
  type: WsMessageType;
}

interface WsAuthMessage extends BaseWsMessage {
  type: 'AUTH';
  token: string;
}

interface WsAuthSuccess extends BaseWsMessage {
  type: 'AUTH_SUCCESS';
  user_id: string;
}

interface WsAuthFailure extends BaseWsMessage {
  type: 'AUTH_FAILURE';
  reason: string;
}

interface WsSendMessage extends BaseWsMessage {
  type: 'SEND_MESSAGE';
  conversation_id: string;
  content: string;
  message_type: 'text' | 'image' | 'video' | 'file';
  client_message_id: string;
}

interface WsMessageDelivered extends BaseWsMessage {
  type: 'MESSAGE_DELIVERED';
  client_message_id: string;
  server_message_id: string;
  timestamp: string;
  status: 'success' | 'failure';
}

interface WsMessageReceived extends BaseWsMessage {
  type: 'MESSAGE_RECEIVED';
  message: {
    message_id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    message_type: 'text' | 'image' | 'video' | 'file';
    timestamp: string;
    read_by: string[];
  };
}

interface WsTypingIndicator extends BaseWsMessage {
  type: 'TYPING_INDICATOR';
  conversation_id: string;
  user_id: string;
  is_typing: boolean;
}

interface WsReadReceipt extends BaseWsMessage {
  type: 'READ_RECEIPT';
  conversation_id: string;
  last_read_message_id: string;
}

interface WsMessageReadStatus extends BaseWsMessage {
  type: 'MESSAGE_READ_STATUS';
  conversation_id: string;
  message_id: string;
  reader_id: string;
  read_at: string;
}

interface WsPresenceUpdate extends BaseWsMessage {
  type: 'PRESENCE_UPDATE';
  user_id: string;
  status: 'online' | 'offline' | 'away';
  last_seen?: string;
}

interface WsConversationUpdate extends BaseWsMessage {
  type: 'CONVERSATION_UPDATE';
  conversation_id: string;
  change_type: 'name_changed' | 'participant_added' | 'participant_removed';
  new_name?: string;
  participant_id?: string;
}

type WsMessage = 
  | WsAuthMessage
  | WsAuthSuccess
  | WsAuthFailure
  | WsSendMessage
  | WsMessageDelivered
  | WsMessageReceived
  | WsTypingIndicator
  | WsReadReceipt
  | WsMessageReadStatus
  | WsPresenceUpdate
  | WsConversationUpdate;

// WebSocket event handlers
type MessageHandler = (message: WsMessage) => void;
type ConnectionHandler = () => void;
type ErrorHandler = (error: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout = 3000; // 3 seconds
  private messageHandlers: Set<MessageHandler> = new Set();
  private connectionHandlers: Set<ConnectionHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private isConnecting = false;

  // WebSocket server URL
  private readonly WS_URL = 'ws://localhost:8080/ws/chat';

  constructor() {
    // Initialize WebSocket connection when service is created
    this.connect();
  }

  // Connect to WebSocket server
  private async connect() {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isConnecting = true;
    console.log('WebSocket: Attempting to connect...');

    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        throw new Error('No access token available');
      }

      this.ws = new WebSocket(this.WS_URL);

      this.ws.onopen = () => {
        console.log('WebSocket: Connection established');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.authenticate(token);
        this.notifyConnectionHandlers();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WsMessage;
          console.log('WebSocket: Message received:', message.type);
          this.notifyMessageHandlers(message);
        } catch (error) {
          console.error('WebSocket: Error parsing message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket: Connection closed');
        this.isConnecting = false;
        this.handleDisconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket: Connection error:', error);
        this.isConnecting = false;
        this.notifyErrorHandlers(error);
      };

    } catch (error) {
      console.error('WebSocket: Connection failed:', error);
      this.isConnecting = false;
      this.handleDisconnect();
    }
  }

  // Handle disconnection and attempt reconnection
  private handleDisconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`WebSocket: Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => this.connect(), this.reconnectTimeout);
    } else {
      console.error('WebSocket: Max reconnection attempts reached');
      this.notifyErrorHandlers(new Error('Max reconnection attempts reached'));
    }
  }

  // Authenticate WebSocket connection
  private authenticate(token: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const authMessage: WsAuthMessage = {
        type: 'AUTH',
        token,
      };
      this.send(authMessage);
    }
  }

  // Send message to WebSocket server
  public send(message: WsMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket: Sending message:', message.type);
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket: Cannot send message, connection not open');
      throw new Error('WebSocket connection not open');
    }
  }

  // Send chat message
  public sendMessage(conversationId: string, content: string, messageType: 'text' | 'image' | 'video' | 'file' = 'text') {
    const clientMessageId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const message: WsSendMessage = {
      type: 'SEND_MESSAGE',
      conversation_id: conversationId,
      content,
      message_type: messageType,
      client_message_id: clientMessageId,
    };
    this.send(message);
    return clientMessageId;
  }

  // Send typing indicator
  public sendTypingIndicator(conversationId: string, isTyping: boolean) {
    const message: WsTypingIndicator = {
      type: 'TYPING_INDICATOR',
      conversation_id: conversationId,
      user_id: '', // Will be set by server based on auth token
      is_typing: isTyping,
    };
    this.send(message);
  }

  // Send read receipt
  public sendReadReceipt(conversationId: string, lastReadMessageId: string) {
    const message: WsReadReceipt = {
      type: 'READ_RECEIPT',
      conversation_id: conversationId,
      last_read_message_id: lastReadMessageId,
    };
    this.send(message);
  }

  // Add message handler
  public onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  // Add connection handler
  public onConnect(handler: ConnectionHandler) {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  // Add error handler
  public onError(handler: ErrorHandler) {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  // Notify all message handlers
  private notifyMessageHandlers(message: WsMessage) {
    this.messageHandlers.forEach(handler => handler(message));
  }

  // Notify all connection handlers
  private notifyConnectionHandlers() {
    this.connectionHandlers.forEach(handler => handler());
  }

  // Notify all error handlers
  private notifyErrorHandlers(error: any) {
    this.errorHandlers.forEach(handler => handler(error));
  }

  // Close WebSocket connection
  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Create singleton instance
export const socketService = new WebSocketService();

export default socketService; 