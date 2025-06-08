import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://localhost:8080/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Debug log for each request
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to handle refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }
        const response = await api.post('/auth/refresh-token', {
          refresh_token: refreshToken,
        });
        const { token } = response.data;
        await AsyncStorage.setItem('access_token', token);
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh token fails, logout user
        await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
        throw refreshError;
      }
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authApi = {
  login: async (username: string, password: string) => {
    console.log('Attempting login with username:', username);
    try {
      const response = await api.post('/auth/login', { username, password });
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