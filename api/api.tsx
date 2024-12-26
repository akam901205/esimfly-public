import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://esimfly.net/pages';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Debug logging
    console.log('API Request:', config.method.toUpperCase(), config.url);
    console.log('Request Headers:', config.headers);
    console.log('Request Data:', config.data);
    
    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Debug logging
    console.log('API Response:', response.status, response.config.url);
    console.log('Response Data:', response.data);
    
    return response;
  },
  (error) => {
    console.error('Response Error:', error);
    if (error.response) {
      console.error('Error Data:', error.response.data);
      console.error('Error Status:', error.response.status);
      console.error('Error Headers:', error.response.headers);
    }
    return Promise.reject(error);
  }
);

export default api;