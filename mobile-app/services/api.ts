import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';

// Cấu hình API URL dựa trên platform
const API_URL = Platform.select({
  ios: 'http://localhost:8080/v1',     // iOS Simulator
  android: 'http://10.0.2.2:8080/v1',  // Android Emulator
  default: 'http://localhost:8080/v1'  // Fallback
});

console.log('Platform:', Platform.OS);
console.log('API URL:', API_URL);

// Cấu hình timeout và retry
const TIMEOUT = 30000; // Tăng timeout lên 30 giây
const MAX_RETRIES = 2; // Số lần retry tối đa

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Hàm retry request
const retryRequest = async (config: any, retryCount = 0): Promise<any> => {
  try {
    return await api(config);
  } catch (error: any) {
    if (
      retryCount < MAX_RETRIES && 
      (error.message.includes('timeout') || error.message === 'Network Error')
    ) {
      console.log(`Retrying request (${retryCount + 1}/${MAX_RETRIES}):`, config.url);
      // Tăng timeout cho mỗi lần retry
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
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
      isNetworkError: !error.response && error.message === 'Network Error',
      timeout: error.config?.timeout
    });

    // Xử lý timeout
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.log('Request timeout, attempting retry...');
      try {
        return await retryRequest(error.config);
      } catch (retryError) {
        throw new Error('Không thể kết nối đến server sau nhiều lần thử. Vui lòng thử lại sau.');
      }
    }

    if (error.message === 'Network Error') {
      try {
        await fetch(API_URL + '/health');
      } catch (e) {
        console.error('Server is not reachable:', e);
        throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng của bạn.');
      }
    }

    if (error.response?.status === 401) {
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
        throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }
    }

    // Xử lý các lỗi khác
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else if (error.message === 'Network Error') {
      throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng của bạn.');
    } else {
      throw error;
    }
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
      console.error('Login failed:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        data: error.response?.data
      });
      throw error;
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
