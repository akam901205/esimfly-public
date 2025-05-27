import auth from '@react-native-firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';

interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  redirect?: string;
  token?: string;
  expires_at?: string;
  user?: any;
}

const API_URL = 'https://esimfly.net/api/auth';
const GOOGLE_WEB_CLIENT_ID = '1033438752251-fqjcq85gla40nd9k2tvj61stiuvaem2o.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID = '1033438752251-rdl49po6ughkl452ijk0lav7k7cb07vt.apps.googleusercontent.com';

function debugLog(...args: any[]) {
  if (__DEV__) {
    console.log('[FirebaseAuth Debug]', ...args);
  }
}

const initializeGoogleSignIn = async () => {
  try {
    await GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: true,
      iosClientId: Platform.OS === 'ios' ? GOOGLE_IOS_CLIENT_ID : undefined,
    });
    debugLog('Google Sign In configured successfully');
  } catch (error) {
    debugLog('Google Sign In configuration error:', error);
    throw error;
  }
};

const handleApiResponse = async (response: Response) => {
  debugLog('Response status:', response.status);
  debugLog('Response headers:', Object.fromEntries(response.headers.entries()));

  const responseText = await response.text();
  debugLog('Raw server response:', responseText);

  if (!responseText) {
    throw new Error(`Empty response from server (Status: ${response.status})`);
  }

  try {
    return JSON.parse(responseText);
  } catch (parseError) {
    debugLog('JSON parse error:', parseError);
    throw new Error(`Server error (${response.status}): ${responseText}`);
  }
};

export const signInWithGoogle = async (): Promise<AuthResponse> => {
  try {
    debugLog('Starting Google sign-in process');
    
    await initializeGoogleSignIn();

    if (Platform.OS === 'android') {
      const playServices = await GoogleSignin.hasPlayServices({ 
        showPlayServicesUpdateDialog: true 
      });
      debugLog('Play services check:', playServices);
    }

    // Clear any existing sign in
    try {
      await GoogleSignin.signOut();
    } catch (error) {
      debugLog('Sign out error (ignorable):', error);
    }

    debugLog('Attempting Google sign in...');
    const signInResult = await GoogleSignin.signIn();
    debugLog('Google Sign-in successful, userInfo received:', signInResult);

    // Correctly access idToken from the data object
    const idToken = signInResult.data?.idToken;
    
    if (!idToken) {
      debugLog('No ID token in response:', signInResult);
      throw new Error('Failed to obtain Google ID Token');
    }

    debugLog('ID Token obtained successfully');

    // Get Firebase credential
    const googleCredential = auth.GoogleAuthProvider.credential(idToken);
    const userCredential = await auth().signInWithCredential(googleCredential);
    debugLog('Firebase credential obtained');

    const firebaseToken = await userCredential.user.getIdToken();
    debugLog('Firebase token obtained');

    // Send to backend for verification
    try {
      const response = await fetch(`${API_URL}/google-callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-client-type': 'mobile'
        },
        body: JSON.stringify({ 
          id_token: idToken || firebaseToken
        })
      });

      const data = await handleApiResponse(response);

      if (data.success) {
        const token = data.token || firebaseToken;
        
        // Store all auth data concurrently
        await Promise.all([
          AsyncStorage.setItem('userToken', token),
          data.expires_at ? AsyncStorage.setItem('tokenExpires', data.expires_at) : null,
          data.user ? AsyncStorage.setItem('userData', JSON.stringify(data.user)) : null
        ].filter(Boolean));

        return {
          success: true,
          token,
          message: data.message,
          user: data.user,
          expires_at: data.expires_at
        };
      } else {
        throw new Error(data.error || 'Failed to authenticate with server');
      }

    } catch (apiError) {
      debugLog('API request error:', apiError);
      throw apiError;
    }

  } catch (error) {
    debugLog('Google sign-in error:', error);
    
    let errorMessage = 'An error occurred during Google sign-in';
    
    if (error.code) {
      switch (error.code) {
        case statusCodes.SIGN_IN_CANCELLED:
          errorMessage = 'Sign-in was cancelled';
          break;
        case statusCodes.IN_PROGRESS:
          errorMessage = 'Sign-in is in progress';
          break;
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          errorMessage = 'Play services not available or outdated';
          break;
        case 'DEVELOPER_ERROR':
          errorMessage = 'Google Sign In configuration error. Please check your credentials.';
          break;
        default:
          errorMessage = error.message || 'Authentication failed';
      }
    }

    Alert.alert('Login Error', errorMessage);
    return {
      success: false,
      error: errorMessage
    };
  }
};

export const signInWithApple = async (): Promise<AuthResponse> => {
  try {
    debugLog('Starting Apple sign-in process');
    
    // Get provider
    const provider = new auth.AppleAuthProvider();
    debugLog('Apple provider created');

    // Sign in with Firebase using Apple provider
    const userCredential = await auth().signInWithProvider(provider);
    debugLog('User credential obtained');
    
    const firebaseToken = await userCredential.user.getIdToken();
    debugLog('Firebase token obtained');

    // Send to backend for verification
    const response = await fetch(`${API_URL}/apple-callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-client-type': 'mobile'
      },
      body: JSON.stringify({ 
        id_token: firebaseToken,
        user_data: {
          email: userCredential.user.email,
          name: userCredential.user.displayName
        }
      })
    });

    const data = await response.json();
    debugLog('Server response:', data);

    if (data.success) {
      await AsyncStorage.setItem('userToken', data.token);
      if (data.expires_at) {
        await AsyncStorage.setItem('tokenExpires', data.expires_at);
      }
      if (data.user) {
        await AsyncStorage.setItem('userData', JSON.stringify(data.user));
      }
      return {
        success: true,
        token: data.token,
        message: data.message,
        user: data.user,
        expires_at: data.expires_at
      };
    } else {
      throw new Error(data.error || 'Failed to authenticate with server');
    }
  } catch (error) {
    debugLog('Apple sign-in error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred during Apple sign-in';
    Alert.alert('Login Error', errorMessage);
    return {
      success: false,
      error: errorMessage
    };
  }
};

export const signOutFirebase = async (): Promise<void> => {
  try {
    debugLog('Starting Firebase sign-out process');
    const currentUser = auth().currentUser;
    if (currentUser) {
      await auth().signOut();
    }
    
    try {
      await GoogleSignin.signOut();
    } catch (error) {
      debugLog('Google sign out error (ignorable):', error);
    }
    
    // Clear all auth-related storage
    await Promise.all([
      AsyncStorage.removeItem('userToken'),
      AsyncStorage.removeItem('tokenExpires'),
      AsyncStorage.removeItem('userData')
    ]);
    
    debugLog('Sign-out completed successfully');
  } catch (error) {
    debugLog('Firebase sign-out error:', error);
    throw error;
  }
};

export const getCurrentUser = () => {
  return auth().currentUser;
};

export const checkFirebaseToken = async (): Promise<boolean> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      return false;
    }
    const token = await currentUser.getIdToken(true);
    return !!token;
  } catch (error) {
    debugLog('Check Firebase token error:', error);
    return false;
  }
};

export const onAuthStateChanged = (callback: (user: any) => void) => {
  return auth().onAuthStateChanged(callback);
};

export const revokeFirebaseAccess = async (): Promise<void> => {
  try {
    const currentUser = auth().currentUser;
    if (currentUser) {
      await currentUser.delete();
    }
    await signOutFirebase();
  } catch (error) {
    debugLog('Revoke access error:', error);
    throw error;
  }
};