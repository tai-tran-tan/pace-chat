import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  ApiResponse, 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest, 
  RegisterResponse,
  User,
  Conversation,
  Message,
  FileUploadResponse,
  SearchResult,
  PaginatedResponse,
  PaginationParams
} from '@/types';
import { getToast } from '@/lib/utils';

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;
  private isDevelopment: boolean;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/v1';
    this.isDevelopment = process.env.NODE_ENV === 'development';
    
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle token refresh and global error handling
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Handle token refresh for 401 errors
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = this.getRefreshToken();
            if (refreshToken) {
              const response = await this.refreshToken(refreshToken);
              this.setTokens(response.data.access_token, response.data.refresh_token);
              originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            this.clearTokens();
            window.location.href = '/auth/login';
            return Promise.reject(refreshError);
          }
        }

        // Global error handling for development mode
        if (this.isDevelopment) {
          this.handleDevelopmentError(error);
        }

        return Promise.reject(error);
      }
    );
  }

  // Development error handler with toast messages
  private handleDevelopmentError(error: any) {
    const toast = getToast();
    if (!toast) return;
    
    let errorMessage = 'API Error';
    let errorDetails = '';

    if (error.response) {
      // Server responded with error status
      const { status, data, config } = error.response;
      
      errorMessage = `API Error (${status})`;
      
      // Get endpoint info
      const method = config?.method?.toUpperCase() || 'UNKNOWN';
      const url = config?.url || 'unknown endpoint';
      const endpoint = `${method} ${url}`;
      
      // Get error details - handle empty object case
      if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        if (data.message) {
          errorDetails = data.message;
        } else if (data.error) {
          errorDetails = data.error;
        } else {
          errorDetails = 'Unknown server error';
        }
      } else if (typeof data === 'string' && data.trim()) {
        errorDetails = data;
      } else {
        // Handle empty object or no data case
        switch (status) {
          case 401:
            errorDetails = 'Authentication required. Please log in again.';
            break;
          case 403:
            errorDetails = 'Access forbidden. You do not have permission.';
            break;
          case 404:
            errorDetails = 'Resource not found.';
            break;
          case 500:
            errorDetails = 'Internal server error. Please try again later.';
            break;
          default:
            errorDetails = 'An error occurred. Please try again.';
        }
      }

      // Show different toast based on error type
      switch (status) {
        case 400:
          toast.error(`Bad Request: ${errorDetails}`, {
            description: `Endpoint: ${endpoint}`,
            duration: 5000,
          });
          break;
        case 401:
          toast.error(`Unauthorized: ${errorDetails}`, {
            description: `Endpoint: ${endpoint}`,
            duration: 5000,
          });
          break;
        case 403:
          toast.error(`Forbidden: ${errorDetails}`, {
            description: `Endpoint: ${endpoint}`,
            duration: 5000,
          });
          break;
        case 404:
          toast.error(`Not Found: ${errorDetails}`, {
            description: `Endpoint: ${endpoint}`,
            duration: 5000,
          });
          break;
        case 422:
          toast.error(`Validation Error: ${errorDetails}`, {
            description: `Endpoint: ${endpoint}`,
            duration: 5000,
          });
          break;
        case 429:
          toast.error(`Rate Limited: ${errorDetails}`, {
            description: `Endpoint: ${endpoint}`,
            duration: 5000,
          });
          break;
        case 500:
          toast.error(`Server Error (500): ${errorDetails}`, {
            description: `Endpoint: ${endpoint}`,
            duration: 8000,
          });
          break;
        case 502:
          toast.error(`Bad Gateway (502): ${errorDetails}`, {
            description: `Endpoint: ${endpoint}`,
            duration: 8000,
          });
          break;
        case 503:
          toast.error(`Service Unavailable (503): ${errorDetails}`, {
            description: `Endpoint: ${endpoint}`,
            duration: 8000,
          });
          break;
        default:
          toast.error(`${errorMessage}: ${errorDetails}`, {
            description: `Endpoint: ${endpoint}`,
            duration: 5000,
          });
      }

      // Log detailed error to console for debugging
      console.group(`🚨 API Error (${status}) - ${endpoint}`);
      console.error('Error Response:', data);
      console.error('Request Config:', config);
      console.error('Full Error:', error);
      console.groupEnd();

    } else if (error.request) {
      // Request was made but no response received
      errorMessage = 'Network Error';
      errorDetails = 'No response received from server';
      
      toast.error('Network Error: No response from server', {
        description: 'Please check your internet connection and try again',
        duration: 5000,
      });

      console.group('🚨 Network Error');
      console.error('Request made but no response:', error.request);
      console.error('Full Error:', error);
      console.groupEnd();

    } else {
      // Something else happened
      errorMessage = 'Request Error';
      errorDetails = error.message || 'Unknown error occurred';
      
      toast.error('Request Error: Failed to make request', {
        description: errorDetails,
        duration: 5000,
      });

    //   console.group('🚨 Request Error');
    //   console.error('Error setting up request:', error.message);
    //   console.error('Full Error:', error);
    //   console.groupEnd();
    }
  }

  // Token management
  private getAccessToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  }

  private getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refresh_token');
    }
    return null;
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
    }
  }

  private clearTokens(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  // Auth endpoints
  async login(credentials: LoginRequest): Promise<AxiosResponse<ApiResponse<LoginResponse>>> {
    const response = await this.api.post('/auth/login', credentials);
    if (response.data.success) {
      this.setTokens(response.data.data.access_token, response.data.data.refresh_token);
    }
    return response;
  }

  async register(userData: RegisterRequest): Promise<AxiosResponse<ApiResponse<RegisterResponse>>> {
    const response = await this.api.post('/auth/register', userData);
    if (response.data.success) {
      this.setTokens(response.data.data.access_token, response.data.data.refresh_token);
    }
    return response;
  }

  async logout(): Promise<AxiosResponse<ApiResponse>> {
    const response = await this.api.post('/auth/logout');
    this.clearTokens();
    return response;
  }

  async refreshToken(token: string): Promise<AxiosResponse<ApiResponse<LoginResponse>>> {
    return this.api.post('/auth/refresh', { refresh_token: token });
  }

  async getCurrentUser(): Promise<AxiosResponse<ApiResponse<User>>> {
    return this.api.get('/auth/me');
  }

  // User endpoints
  async getUsers(params?: PaginationParams): Promise<AxiosResponse<ApiResponse<PaginatedResponse<User>>>> {
    return this.api.get('/users', { params });
  }

  async getUserById(userId: string): Promise<AxiosResponse<ApiResponse<User>>> {
    return this.api.get(`/users/${userId}`);
  }

  async updateProfile(userData: Partial<User>): Promise<AxiosResponse<ApiResponse<User>>> {
    return this.api.put('/users/profile', userData);
  }

  async uploadAvatar(file: File): Promise<AxiosResponse<ApiResponse<{ avatar_url: string }>>> {
    const formData = new FormData();
    formData.append('avatar', file);
    return this.api.post('/users/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // Conversation endpoints
  async getConversations(): Promise<AxiosResponse<ApiResponse<Conversation[]>>> {
    return this.api.get('/conversations');
  }

  async getConversationById(conversationId: string): Promise<AxiosResponse<ApiResponse<Conversation>>> {
    return this.api.get(`/conversations/${conversationId}`);
  }

  async createConversation(participantIds: string[], name?: string): Promise<AxiosResponse<ApiResponse<Conversation>>> {
    return this.api.post('/conversations', {
      participant_ids: participantIds,
      name,
      type: participantIds.length > 1 ? 'group' : 'direct',
    });
  }

  async updateConversation(conversationId: string, updates: Partial<Conversation>): Promise<AxiosResponse<ApiResponse<Conversation>>> {
    return this.api.put(`/conversations/${conversationId}`, updates);
  }

  async deleteConversation(conversationId: string): Promise<AxiosResponse<ApiResponse>> {
    return this.api.delete(`/conversations/${conversationId}`);
  }

  async addParticipants(conversationId: string, participantIds: string[]): Promise<AxiosResponse<ApiResponse<Conversation>>> {
    return this.api.post(`/conversations/${conversationId}/participants`, {
      participant_ids: participantIds,
    });
  }

  async removeParticipant(conversationId: string, participantId: string): Promise<AxiosResponse<ApiResponse>> {
    return this.api.delete(`/conversations/${conversationId}/participants/${participantId}`);
  }

  // Message endpoints
  async getMessages(conversationId: string, params?: PaginationParams): Promise<AxiosResponse<ApiResponse<PaginatedResponse<Message>>>> {
    return this.api.get(`/conversations/${conversationId}/messages`, { params });
  }

  async markMessagesAsRead(conversationId: string, messageIds: string[]): Promise<AxiosResponse<ApiResponse>> {
    return this.api.post(`/conversations/${conversationId}/messages/read`, {
      message_ids: messageIds,
    });
  }

  // File upload endpoints
  async uploadFile(file: File): Promise<AxiosResponse<ApiResponse<FileUploadResponse>>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // Search endpoints
  async search(query: string): Promise<AxiosResponse<ApiResponse<SearchResult>>> {
    return this.api.get('/search', { params: { q: query } });
  }

  // Health check
  async healthCheck(): Promise<AxiosResponse<ApiResponse>> {
    return this.api.get('/health');
  }
}

// Create singleton instance
const apiService = new ApiService();
export default apiService; 