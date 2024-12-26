import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://esimfly.net/pages/auth';
const REFERRAL_API_URL = 'https://esimfly.net/pages/business/api/referral';

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
  const url = `${API_URL}/logout.php`;
  console.log('Attempting logout');

  try {
    const headers = await getAuthHeader();
    const response = await fetch(url, {
      method: 'POST',
      headers,
    });

    console.log('Logout response status:', response.status);
    console.log('Logout response headers:', response.headers);

    return response;
  } catch (error) {
    console.error('Logout fetch error:', error);
    throw error;
  }
}

async function getAuthHeader(): Promise<Headers> {
  const token = await AsyncStorage.getItem('userToken');
  const headers = new Headers({
    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
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
        
        if (method === 'POST' && body) {
            // Convert body to form data
            const formData = new URLSearchParams();
            Object.entries(body).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    formData.append(key, value);
                }
            });

            const response = await fetch(url, {
                method,
                headers,
                body: formData.toString()
            });
            
            debugLog('Fetch completed');
            return await handleApiResponse(response);
        } else {
            // Handle GET requests or requests without body
            const response = await fetch(url, {
                method,
                headers
            });
            
            debugLog('Fetch completed');
            return await handleApiResponse(response);
        }
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
  const response = await makeApiRequest('authenticate.php', 'POST', { email, password });
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
    
    // First verify the referral code
    let businessUserId = null;
    if (referralCode) {
        try {
            const verifyResponse = await verifyReferralCode(referralCode);
            if (verifyResponse.success && verifyResponse.business_user_id) {
                businessUserId = verifyResponse.business_user_id;
            } else {
                throw new Error(verifyResponse.message || 'Invalid referral code');
            }
        } catch (error) {
            debugLog('Error verifying referral code during signup:', error);
            throw error;
        }
    }

    // Create request body with all required fields
    const formData = new URLSearchParams();
    formData.append('email', email);
    formData.append('password', password);
    formData.append('confirmPassword', password);

    if (referralCode) {
        formData.append('referral_code', referralCode.trim());
    }

    if (businessUserId) {
        formData.append('business_user_id', businessUserId.toString());
    }

    if (name) {
        formData.append('name', name);
    }

    // Make the request
    const url = `${API_URL}/register_app.php`;
    debugLog(`Making POST request to ${url}`);
    debugLog('Request body:', formData.toString());

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData.toString()
        });

        const data = await response.json();
        debugLog('Sign up response:', data);
        return data;
    } catch (error) {
        debugLog('Sign up error:', error);
        throw error;
    }
}

export async function resetPassword(email: string): Promise<AuthResponse> {
  debugLog('Attempting password reset for email:', email);
  const response = await makeApiRequest('forgot-password.php', 'POST', { email });
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
  const response = await makeApiRequest('refresh_token.php', 'POST');
  debugLog('Token refresh response:', response);
  return response;
}

export async function verifyToken(): Promise<AuthResponse> {
  debugLog('Attempting token verification');
  const response = await makeApiRequest('verify_token.php', 'GET');
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