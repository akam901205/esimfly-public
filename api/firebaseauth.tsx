import auth from '@react-native-firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import { NEW_API_BASE_URL } from './api';

interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  redirect?: string;
  token?: string;
  expires_at?: string;
  user?: any;
}

// Use the centralized base URL
const API_URL = `${NEW_API_BASE_URL}/auth`;
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

    // Get stored referral code if available
    const storedReferralCode = await AsyncStorage.getItem('referralCode');
    debugLog('Stored referral code:', storedReferralCode);

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
          id_token: idToken || firebaseToken,
          referralCode: storedReferralCode
        })
      });

      const data = await handleApiResponse(response);

      if (data.success) {
        const token = data.token || firebaseToken;
        
        // Store all auth data concurrently
        await Promise.all([
          AsyncStorage.setItem('userToken', token),
          data.expires_at ? AsyncStorage.setItem('tokenExpires', data.expires_at) : null,
          data.user ? AsyncStorage.setItem('userData', JSON.stringify(data.user)) : null,
          AsyncStorage.setItem('authMethod', 'google'), // Store auth method
          AsyncStorage.removeItem('referralCode') // Clear referral code after successful use
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
    
    // Enhanced debugging
    debugLog('Platform:', Platform.OS, Platform.Version);
    debugLog('Is Apple Auth Supported:', appleAuth.isSupported);
    
    // Check if Apple auth is available
    if (!appleAuth.isSupported) {
      throw new Error('Apple Sign-In is not supported on this device');
    }
    
    // Additional check
    try {
      const credentialState = await appleAuth.getCredentialStateForUser('unknown');
      debugLog('Credential state check passed');
    } catch (e) {
      debugLog('Credential state check error (expected):', e);
    }

    // Perform Apple sign-in request
    const appleAuthRequestResponse = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
    });

    debugLog('Apple auth response received');

    // Ensure we have the required data
    if (!appleAuthRequestResponse.identityToken) {
      throw new Error('Apple Sign-In failed - no identity token returned');
    }

    // Get the credential state for the user
    const credentialState = await appleAuth.getCredentialStateForUser(appleAuthRequestResponse.user);
    
    if (credentialState === appleAuth.State.AUTHORIZED) {
      debugLog('User is authorized');
      
      // Create a Firebase credential with the token
      const { identityToken, nonce } = appleAuthRequestResponse;
      const appleCredential = auth.AppleAuthProvider.credential(identityToken, nonce);
      
      // Sign in with Firebase
      const userCredential = await auth().signInWithCredential(appleCredential);
      debugLog('Firebase sign-in successful');
      
      const firebaseToken = await userCredential.user.getIdToken();
      debugLog('Firebase token obtained');

      // Get stored referral code if available
      const storedReferralCode = await AsyncStorage.getItem('referralCode');
      debugLog('Stored referral code:', storedReferralCode);

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
          apple_token: identityToken,
          referralCode: storedReferralCode,
          user_data: {
            email: appleAuthRequestResponse.email || userCredential.user.email,
            name: appleAuthRequestResponse.fullName && 
                  (appleAuthRequestResponse.fullName.givenName || appleAuthRequestResponse.fullName.familyName) ? 
              `${appleAuthRequestResponse.fullName.givenName || ''} ${appleAuthRequestResponse.fullName.familyName || ''}`.trim() : 
              userCredential.user.displayName || null,
            user: appleAuthRequestResponse.user
          }
        })
      });

      const data = await handleApiResponse(response);
      debugLog('Server response:', data);

      if (data.success) {
        const token = data.token || firebaseToken;
        
        // Store all auth data
        await Promise.all([
          AsyncStorage.setItem('userToken', token),
          data.expires_at ? AsyncStorage.setItem('tokenExpires', data.expires_at) : null,
          data.user ? AsyncStorage.setItem('userData', JSON.stringify(data.user)) : null,
          AsyncStorage.setItem('authMethod', 'apple'), // Store auth method
          AsyncStorage.removeItem('referralCode') // Clear referral code after successful use
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
    } else {
      throw new Error('Apple Sign-In was not authorized');
    }
  } catch (error) {
    debugLog('Apple sign-in error:', error);
    
    let errorMessage = 'An error occurred during Apple sign-in';
    
    if (error.code === appleAuth.Error.CANCELED) {
      errorMessage = 'Sign-in was cancelled';
    } else if (error.code === appleAuth.Error.FAILED) {
      errorMessage = 'Apple Sign-In failed';
    } else if (error.code === appleAuth.Error.INVALID_RESPONSE) {
      errorMessage = 'Invalid response from Apple';
    } else if (error.code === appleAuth.Error.NOT_SUPPORTED) {
      errorMessage = 'Apple Sign-In is not supported on this device';
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
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
      AsyncStorage.removeItem('userData'),
      AsyncStorage.removeItem('authMethod')
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