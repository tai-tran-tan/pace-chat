// User types
export interface User {
  user_id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string | null;
  status: 'online' | 'offline' | 'away';
  last_seen?: string | null;
  created_at: string;
  updated_at: string;
}

// Conversation types
export interface Conversation {
  conversation_id: string;
  title?: string | null;
  type: 'private' | 'group';
  participants: ConversationParticipant[];
  last_message_preview?: string | null;
  last_message_timestamp?: string | null;
  unread_count?: number | null;
}

export interface ConversationParticipant {
  user_id: string;
  username: string;
  avatar_url?: string | null;
  status: 'online' | 'offline' | 'away';
  joined_at: string;
}

// Message types
export interface Message {
  message_id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string | null;
  content: string;
  timestamp: string;
  read_by: string[];
  reply_to?: Message | null;
}

// WebSocket message types
export interface WsMessage {
  type: string;
  [key: string]: any;
}

export interface WsAuthMessage extends WsMessage {
  type: 'AUTH';
  token: string;
}

export interface WsAuthSuccess extends WsMessage {
  type: 'AUTH_SUCCESS';
  user_id: string;
}

export interface WsAuthFailure extends WsMessage {
  type: 'AUTH_FAILURE';
  reason: string;
}

export interface WsSendMessage extends WsMessage {
  type: 'SEND_MESSAGE';
  conversation_id: string;
  content: string;
  client_message_id: string;
}

export interface WsTypingIndicator extends WsMessage {
  type: 'TYPING_INDICATOR';
  conversation_id: string;
  user_id: string;
  is_typing: boolean;
}

export interface WsReadReceipt extends WsMessage {
  type: 'READ_RECEIPT';
  conversation_id: string;
  last_read_message_id: string;
}

export interface WsMessageReceived extends WsMessage {
  type: 'MESSAGE_RECEIVED';
  message: Message;
}

export interface WsMessageDelivered extends WsMessage {
  type: 'MESSAGE_DELIVERED';
  client_message_id: string;
  server_message_id: string;
  timestamp: string;
  status: 'success' | 'failure';
}

export interface WsPresenceUpdate extends WsMessage {
  type: 'PRESENCE_UPDATE';
  user_id: string;
  status: 'online' | 'offline' | 'away';
  last_seen: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

export interface RegisterRequest {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

// Form types
export interface LoginFormData {
  username: string;
  password: string;
}

export interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// UI State types
export interface Theme {
  mode: 'light' | 'dark' | 'system';
}

export interface AppState {
  theme: Theme;
  sidebarOpen: boolean;
  currentConversationId: string | null;
}

// Navigation types
export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

// File upload types
export interface FileUploadResponse {
  file_id: string;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
}

// Search types
export interface SearchResult {
  conversations: Conversation[];
  users: User[];
}

// User search result type (simplified for search)
export interface UserSearchResult {
  user_id: string;
  username: string;
  avatar_url?: string | null;
}

// Conversation search result type
export interface ConversationSearchResult {
  conversation_id: string;
  type: 'private' | 'group';
  name?: string | null;
  participants: UserSearchResult[];
  last_message_preview?: string | null;
  last_message_timestamp?: string | null;
  unread_count: number;
}

// Search state type
export interface SearchState {
  query: string;
  results: {
    users: UserSearchResult[];
    conversations: ConversationSearchResult[];
  };
  isLoading: boolean;
  isSearching: boolean;
  error: string | null;
}

// Error types
export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

// Loading states
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
} 