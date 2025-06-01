import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://esimfly.net/api/auth';
const REFERRAL_API_URL = 'https://esimfly.net/api/business/referral';

interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  redirect?: string;
  token?: string;
  expires_at?: string;
}

interface ReferralVerifyResponse {
  success: boolean;
  message?: string;
  business_user_id?: number;
}

function debugLog(...args: any[]) {
  console.log('[AuthAPI Debug]', ...args);
}

async function handleApiResponse(response: Response): Promise<AuthResponse> {
  debugLog('Response status:', response.status);
  debugLog('Response headers:', response.headers);

  const data = await response.json();
  debugLog('Response data:', data);

  if (data.token) {
    await AsyncStorage.setItem('userToken', data.token);
    await AsyncStorage.setItem('tokenExpires', data.expires_at);
  }

  return data;
}

export async function logout(): Promise<Response> {
  const url = `${API_URL}/logout`;
  console.log('Attempting logout');

  try {
    const headers = await getAuthHeader();
    const response = await fetch(url, {
      method: 'POST',
      headers,
    });

    console.log('Logout response status:', response.status);
    console.log('Logout response headers:', response.headers);

    // Clear stored token on successful logout
    if (response.ok) {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('tokenExpires');
    }

    return response;
  } catch (error) {
    console.error('Logout fetch error:', error);
    throw error;
  }
}

async function getAuthHeader(): Promise<Headers> {
  const token = await AsyncStorage.getItem('userToken');
  const headers = new Headers({
    'Content-Type': 'application/json',
    'x-client-type': 'mobile'
  });
  if (token) {
    headers.append('Authorization', `Bearer ${token}`);
  }
  return headers;
}

async function makeApiRequest(
    endpoint: string, 
    method: string, 
    body?: Record<string, string>, 
    baseUrl: string = API_URL
): Promise<AuthResponse> {
    const url = `${baseUrl}/${endpoint}`;
    debugLog(`Making ${method} request to ${url}`);
    if (body) {
        debugLog('Request body:', body);
    }

    try {
        const headers = await getAuthHeader();
        
        const response = await fetch(url, {
            method,
            headers,
            body: method === 'POST' && body ? JSON.stringify(body) : undefined
        });
        
        debugLog('Fetch completed');
        return await handleApiResponse(response);
    } catch (error) {
        debugLog('Fetch error:', error);
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            Alert.alert('Network Error', 'Unable to connect to the server. Please check your internet connection and try again.');
        } else {
            Alert.alert('Error', error.message || 'An unexpected error occurred');
        }
        throw error;
    }
}

export async function verifyReferralCode(code: string): Promise<ReferralVerifyResponse> {
    debugLog('Verifying referral code:', code);
    try {
        // Format the request body as form data
        const formData = new URLSearchParams();
        formData.append('code', code.trim());

        const response = await fetch(`${REFERRAL_API_URL}/verify_code.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData.toString()
        });

        const data = await response.json();
        debugLog('Referral code verification response:', data);
        return data;
    } catch (error) {
        debugLog('Referral code verification error:', error);
        throw error;
    }
}

export async function signIn(email: string, password: string): Promise<AuthResponse> {
  debugLog('Attempting sign in for email:', email);
  const response = await makeApiRequest('login', 'POST', { email, password });
  debugLog('Sign in response:', response);
  return response;
}

export async function signUp(
    email: string, 
    password: string, 
    referralCode?: string, 
    name?: string
): Promise<AuthResponse> {
    debugLog('Attempting sign up for email:', email);
    
    // Make the request to the new API endpoint
    const requestBody = {
        name: name || email.split('@')[0],
        email,
        password,
        referralCode: referralCode?.trim()
    };
    
    debugLog('Making POST request to register endpoint');
    debugLog('Request body:', requestBody);

    try {
        const headers = new Headers({
            'Content-Type': 'application/json',
            'x-client-type': 'mobile'
        });
        
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        debugLog('Sign up response:', data);
        
        // Store token if returned
        if (data.token) {
            await AsyncStorage.setItem('userToken', data.token);
            await AsyncStorage.setItem('tokenExpires', data.expires_at);
        }
        
        // If there's a message field but no success field, check status
        if (!data.hasOwnProperty('success') && response.status >= 400) {
            data.success = false;
            data.error = data.message || 'Signup failed';
        }
        
        return data;
    } catch (error) {
        debugLog('Sign up error:', error);
        throw error;
    }
}

export async function forgotPassword(email: string): Promise<AuthResponse> {
  debugLog('Attempting forgot password for email:', email);
  const response = await makeApiRequest('forgot-password', 'POST', { email });
  debugLog('Forgot password response:', response);
  return response;
}

export async function resetPassword(token: string, password: string): Promise<AuthResponse> {
  debugLog('Attempting password reset with token');
  const response = await makeApiRequest('reset-password', 'POST', { token, password });
  debugLog('Password reset response:', response);
  return response;
}

export async function deleteAccount(): Promise<AuthResponse> {
  debugLog('Attempting account deletion');
  const response = await makeApiRequest('delete_account.php', 'POST');
  debugLog('Account deletion response:', response);
  return response;
}

export async function refreshToken(): Promise<AuthResponse> {
  debugLog('Attempting token refresh');
  const response = await makeApiRequest('refresh-token', 'POST');
  debugLog('Token refresh response:', response);
  return response;
}

export async function verifyToken(): Promise<AuthResponse> {
  debugLog('Attempting token verification');
  const response = await makeApiRequest('verify-token', 'GET');
  debugLog('Token verification response:', response);
  return response;
}

export async function checkAccount(email: string): Promise<AuthResponse> {
  debugLog('Checking account existence for email:', email);
  const response = await makeApiRequest('check_account.php', 'POST', { email });
  debugLog('Account check response:', response);
  return response;
}

// Types export
export type { AuthResponse, ReferralVerifyResponse };