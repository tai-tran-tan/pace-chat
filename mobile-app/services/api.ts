import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';

// Configure API URL based on platform
const API_URL = Platform.select({
  ios: 'http://localhost:8080/v1',     // iOS Simulator
  android: 'http://10.0.2.2:8080/v1',  // Android Emulator
  default: 'http://localhost:8080/v1'  // Fallback
});

console.log('Platform:', Platform.OS);
console.log('API URL:', API_URL);

// Configure timeout and retry
const TIMEOUT = 30000; // Increase timeout to 30 seconds
const MAX_RETRIES = 2; // Maximum retry attempts

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Retry request function
const retryRequest = async (config: any, retryCount = 0): Promise<any> => {
  try {
    return await api(config);
  } catch (error: any) {
    if (
      retryCount < MAX_RETRIES && 
      (error.message.includes('timeout') || error.message === 'Network Error')
    ) {
      console.log(`Retrying request (${retryCount + 1}/${MAX_RETRIES}):`, config.url);
      // Increase timeout for each retry
      const newConfig = {
        ...config,
        timeout: TIMEOUT * (retryCount + 2)
      };
      return retryRequest(newConfig, retryCount + 1);
    }
    throw error;
  }
};

// Debug log for each request
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    console.log('Making API request:', {
      url: config.url,
      method: config.method,
      hasToken: !!token,
      timeout: config.timeout,
      headers: config.headers
    });

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('API Request Error:', {
      message: error.message,
      config: error.config
    });
    return Promise.reject(error);
  }
);

// Interceptor to handle responses and errors
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data,
      time: response.headers['x-response-time']
    });
    return response;
  },
  async (error) => {
    // Get message from server if available
    const serverMessage = error.response?.data?.message;
    const errorMessage = serverMessage || error.message;

    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: errorMessage,
      data: error.response?.data,
      isNetworkError: !error.response && error.message === 'Network Error',
      timeout: error.config?.timeout
    });

    // Handle timeout
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.log('Request timeout, attempting retry...');
      try {
        return await retryRequest(error.config);
      } catch (retryError) {
        throw new Error('Unable to connect to server after multiple attempts. Please try again later.');
      }
    }

    if (error.message === 'Network Error') {
      try {
        await fetch(API_URL + '/health');
      } catch (e) {
        console.error('Server is not reachable:', e);
        throw new Error('Unable to connect to server. Please check your network connection.');
      }
    }

    if (error.response?.status === 401) {
      // If it's a login/register error, throw error with message from server
      if (error.config?.url === '/auth/login' || error.config?.url === '/auth/register') {
        throw new Error(errorMessage);
      }

      // If it's a token expiration error, try to refresh token
      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (refreshToken) {
          console.log('Attempting to refresh token');
          const response = await api.post('/auth/refresh-token', {
            refresh_token: refreshToken
          });
          
          if (response.data.token) {
            console.log('Token refreshed successfully');
            useAuthStore.getState().setToken(response.data.token);
            
            const originalRequest = error.config;
            originalRequest.headers.Authorization = `Bearer ${response.data.token}`;
            return retryRequest(originalRequest);
          }
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        useAuthStore.getState().logout();
        throw new Error('Login session expired. Please login again.');
      }
    }

    // Handle other errors
    throw new Error(errorMessage);
  }
);

// Auth API calls
export const authApi = {
  login: async (username: string, password: string) => {
    console.log('Attempting login with username:', username);
    try {
      const response = await retryRequest({
        method: 'post',
        url: '/auth/login',
        data: { username, password }
      });
      
      console.log('Login response:', {
        status: response.status,
        data: {
          user_id: response.data.user_id,
          username: response.data.username,
          hasToken: !!response.data.token,
          hasRefreshToken: !!response.data.refresh_token
        }
      });
      
      const { token, refresh_token, user_id, username: responseUsername } = response.data;
      await AsyncStorage.multiSet([
        ['access_token', token],
        ['refresh_token', refresh_token],
        ['user', JSON.stringify({ user_id, username: responseUsername })],
      ]);
      console.log('Login successful, tokens stored');
      return response.data;
    } catch (error: any) {
      // Get message from server if available
      const serverMessage = error.response?.data?.message;
      const errorMessage = serverMessage || error.message;
      
      console.error('Login failed:', {
        status: error.response?.status,
        message: errorMessage,
        data: error.response?.data
      });
      
      // Throw error with message from server
      throw new Error(errorMessage);
    }
  },

  register: async (username: string, password: string, email: string) => {
    console.log('Attempting register with:', { username, email });
    try {
      const response = await api.post('/auth/register', { username, password, email });
      console.log('Register response:', {
        status: response.status,
        data: response.data
      });
      return response.data;
    } catch (error: any) {
      console.error('Register failed:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        data: error.response?.data
      });
      throw error;
    }
  },

  logout: async () => {
    await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
  },

  getCurrentUser: async () => {
    const userStr = await AsyncStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
};

export default api;
