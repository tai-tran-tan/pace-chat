import {
  WsMessage,
  WsAuthMessage,
  WsAuthSuccess,
  WsAuthFailure,
  WsSendMessage,
  WsTypingIndicator,
  WsReadReceipt,
  WsMessageReceived,
  WsMessageDelivered,
  WsPresenceUpdate,
  Message,
} from '@/types';

type MessageHandler = (message: WsMessage) => void;
type ConnectionHandler = () => void;
type ErrorHandler = (error: Error) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout = 3000; // 3 seconds
  private messageHandlers: Set<MessageHandler> = new Set();
  private connectionHandlers: Set<ConnectionHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private isConnecting = false;
  private isAuthenticated = false;
  private pingInterval: NodeJS.Timeout | null = null;
  private pongTimeout: NodeJS.Timeout | null = null;
  private lastActivityTime = Date.now();

  // WebSocket server URL
  private readonly WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/chat';
  private readonly PING_INTERVAL = 30000; // 30 seconds
  private readonly PONG_TIMEOUT = 10000; // 10 seconds

  constructor() {
    // Don't auto-connect on initialization, wait for explicit connect call
  }

  // Check if user has valid session and force logout if invalid
  private async checkUserSession(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.log('WebSocket: No access token found, redirecting to login');
      this.forceLogout();
      return false;
    }

    // Basic token validation
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      
      console.log('WebSocket: Token payload:', payload);
      console.log('WebSocket: Token expiration:', new Date(payload.exp * 1000));
      console.log('WebSocket: Current time:', new Date(now * 1000));
      
      if (payload.exp <= now) {
        console.log('WebSocket: Token expired, redirecting to login');
        this.forceLogout();
        return false;
      }
      
      console.log('WebSocket: Token is valid, proceeding with connection');
      return true;
    } catch (error) {
      console.log('WebSocket: Invalid token format, redirecting to login');
      console.error('WebSocket: Token validation error:', error);
      this.forceLogout();
      return false;
    }
  }

  // Force logout and redirect to login
  private forceLogout(): void {
    // Clear all auth data
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    
    // Clear auth store
    if (typeof window !== 'undefined') {
      // Import dynamically to avoid circular dependency
      import('@/store/useAuthStore').then(({ useAuthStore }) => {
        useAuthStore.getState().logout();
      });
    }
    
    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
  }

  // Update last activity time
  private updateActivity(): void {
    this.lastActivityTime = Date.now();
  }

  // Start ping/pong mechanism
  private startPingPong(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'PING' });
        
        // Set pong timeout
        if (this.pongTimeout) {
          clearTimeout(this.pongTimeout);
        }
        
        this.pongTimeout = setTimeout(() => {
          console.log('WebSocket: Pong timeout, disconnecting');
          this.disconnect();
        }, this.PONG_TIMEOUT);
      }
    }, this.PING_INTERVAL);
  }

  // Stop ping/pong mechanism
  private stopPingPong(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }

  // Handle disconnect
  private handleDisconnect(): void {
    this.isConnecting = false;
    this.isAuthenticated = false;
    this.stopPingPong();

    // Attempt reconnection if not manually disconnected
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`WebSocket: Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectTimeout);
    } else {
      console.log('WebSocket: Max reconnection attempts reached');
      this.notifyErrorHandlers(new Error('Max reconnection attempts reached'));
    }
  }

  // Public method to connect - should be called after user login
  public async connect(): Promise<void> {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket: Already connecting or connected');
      return;
    }

    // Check user session before attempting connection
    const hasValidSession = await this.checkUserSession();
    if (!hasValidSession) {
      console.log('WebSocket: No valid user session, skipping connection');
      this.notifyErrorHandlers(new Error('No valid user session'));
      return;
    }

    this.isConnecting = true;
    console.log('WebSocket: Attempting to connect to:', this.WS_URL);

    return new Promise((resolve, reject) => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          throw new Error('No access token available');
        }

        console.log('WebSocket: Creating native WebSocket connection...');

        // Create native WebSocket connection
        // Send token during handshake, only authenticated user are allow to connect
        this.ws = new WebSocket(this.WS_URL + '?access_token=' + token);

        // Add connection timeout
        const connectionTimeout = setTimeout(() => {
          if (this.ws?.readyState === WebSocket.CONNECTING) {
            console.error('WebSocket: Connection timeout after 10 seconds');
            this.ws?.close();
            this.isConnecting = false;
            this.notifyErrorHandlers(new Error('Connection timeout'));
            reject(new Error('Connection timeout'));
          }
        }, 10000);

        this.ws.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log('WebSocket: Connection established successfully');
          console.log('WebSocket: ReadyState after open:', this.ws?.readyState);
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.updateActivity();
          this.startPingPong();
          this.notifyConnectionHandlers();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            console.log('WebSocket: Raw message received:', event.data);
            const message = JSON.parse(event.data) as WsMessage;
            console.log('WebSocket: Parsed message received:', JSON.stringify(message, null, 2));
            console.log('WebSocket: Message type:', message.type);
            this.updateActivity();
            
            // Handle ping/pong
            if (message.type === 'PONG') {
              if (this.pongTimeout) {
                clearTimeout(this.pongTimeout);
                this.pongTimeout = null;
              }
              return;
            }
            
            this.notifyMessageHandlers(message);
          } catch (error) {
            console.error('WebSocket: Error parsing message:', error);
            console.error('WebSocket: Raw message that failed to parse:', event.data);
          }
        };

        this.ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          console.log('WebSocket: Connection closed:', event.code, event.reason);
          console.log('WebSocket: Close event details:', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          });
          this.handleDisconnect();
        };

        this.ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error('WebSocket: Connection error:', error);
          console.error('WebSocket: Error event details:', error);
          this.isConnecting = false;
          this.notifyErrorHandlers(error);
        };

      } catch (error) {
        console.error('WebSocket: Error during connection:', error);
        this.isConnecting = false;
        this.notifyErrorHandlers(error as Error);
      }
    });
  }

  // Send message to server
  private send(message: WsMessage): void {
    console.log('WebSocket: Attempting to send message:', message.type);
    console.log('WebSocket: Connection state - connected:', this.ws?.readyState === WebSocket.OPEN);
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      this.updateActivity();
      console.log('WebSocket: Message sent successfully');
    } else {
      console.error('WebSocket: Cannot send message, not connected');
      console.error('WebSocket: Socket readyState:', this.ws?.readyState);
      throw new Error('WebSocket not connected');
    }
  }

  // Send raw message without authentication check (for AUTH messages)
  private sendRaw(message: WsMessage): void {
    console.log('WebSocket: Sending raw message:', message.type);
    console.log('WebSocket: Connection state - connected:', this.ws?.readyState === WebSocket.OPEN);
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      this.updateActivity();
      console.log('WebSocket: Raw message sent successfully');
    } else {
      console.error('WebSocket: Cannot send raw message, not connected');
      console.error('WebSocket: Socket readyState:', this.ws?.readyState);
      throw new Error('WebSocket not connected');
    }
  }

  // Public method to disconnect
  public disconnect(): void {
    console.log('WebSocket: Disconnecting...');
    this.isConnecting = false;
    this.isAuthenticated = false;
    this.stopPingPong();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // Send chat message
  public async sendMessage(conversationId: string, content: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const clientMessageId = crypto.randomUUID();
      const message: WsSendMessage = {
        type: 'SEND_MESSAGE',
        conversation_id: conversationId,
        content,
        client_message_id: clientMessageId,
      };

      // Set up a one-time handler for MESSAGE_DELIVERED
      const handleMessageDelivered = (wsMessage: WsMessage) => {
        if (wsMessage.type === 'MESSAGE_DELIVERED' && wsMessage.client_message_id === clientMessageId) {
          this.messageHandlers.delete(handleMessageDelivered);
          if (wsMessage.status === 'success') {
            resolve(wsMessage.server_message_id);
          } else {
            reject(new Error('Message delivery failed'));
          }
        }
      };

      // Add the handler
      this.messageHandlers.add(handleMessageDelivered);

      // Set timeout for message delivery
      const timeout = setTimeout(() => {
        this.messageHandlers.delete(handleMessageDelivered);
        reject(new Error('Message delivery timeout'));
      }, 10000); // 10 seconds timeout

      try {
        this.send(message);
        clearTimeout(timeout); // TODO: bro, check this 
      } catch (error) {
        this.messageHandlers.delete(handleMessageDelivered);
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  // Send typing indicator
  public sendTypingIndicator(conversationId: string, isTyping: boolean): void {
    const message: WsTypingIndicator = {
      type: 'TYPING_INDICATOR',
      conversation_id: conversationId,
      user_id: '', // Will be set by server based on auth token
      is_typing: isTyping,
    };
    this.send(message);
  }

  // Send read receipt
  public sendReadReceipt(conversationId: string, messageId: string): void {
    const message: WsReadReceipt = {
      type: 'READ_RECEIPT',
      conversation_id: conversationId,
      last_read_message_id: messageId,
    };
    this.send(message);
  }

  // Event handlers
  public onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  public onConnect(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    return () => {
      this.connectionHandlers.delete(handler);
    };
  }

  public onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => {
      this.errorHandlers.delete(handler);
    };
  }

  // Notify handlers
  private notifyMessageHandlers(message: WsMessage): void {
    this.messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    });
  }

  private notifyConnectionHandlers(): void {
    this.connectionHandlers.forEach(handler => {
      try {
        handler();
      } catch (error) {
        console.error('Error in connection handler:', error);
      }
    });
  }

  private notifyErrorHandlers(error: Error): void {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (handlerError) {
        console.error('Error in error handler:', handlerError);
      }
    });
  }

  // Getters
  public get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.isAuthenticated;
  }

  public get isAuth(): boolean {
    return this.isAuthenticated;
  }

  public get connectionState(): string {
    if (!this.ws) return 'disconnected';
    if (this.ws.readyState === WebSocket.CONNECTING) return 'connecting';
    if (this.ws.readyState === WebSocket.OPEN) return 'connected';
    return 'disconnected';
  }
}

// Create singleton instance
const socketService = new WebSocketService();
export default socketService; 