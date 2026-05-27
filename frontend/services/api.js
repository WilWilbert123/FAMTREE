import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';

const getBaseUrl = () => {
  if (Platform.OS === 'android') {
    // CHANGE THIS TO YOUR CURRENT IP
    // Run 'ipconfig' in cmd to find your IP
    return 'http://192.168.0.223:5000/api';
  }
  return 'http://localhost:5000/api';
};

const API_URL = getBaseUrl();

console.log(`[API Service] Using API URL: ${API_URL}`);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('[API Request] Token added');
      }
    } catch (error) {
      console.log('[API Request] Error getting token:', error);
    }
    return config;
  },
  (error) => {
    console.log('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.status} - ${response.config.url}`);
    return response;
  },
  async (error) => {
    console.log('[API Response Error]');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    } else if (error.request) {
      console.log('No response received - Backend might not be running');
      console.log('Request URL:', error.config?.url);
    } else {
      console.log('Error:', error.message);
    }
    
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export default api;