import React, { useEffect, useState } from 'react';
import { Platform, AppState, View, ActivityIndicator, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';
import AppNavigator from './AppNavigator';
import * as Notifications from 'expo-notifications';
import { NotificationManager, notificationManager } from './components/NotificationManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Firebase completely removed - using Google/Apple direct authentication
// Firebase auth removed to fix Expo SDK 54 iOS build conflicts
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { ToastProvider } from './components/ToastNotification';
import * as Linking from 'expo-linking';

// Stripe configuration
const STRIPE_PUBLISHABLE_KEY = 'pk_live_51Qbg8uHbrtyQ1AACqgu82JueHGZak2BUQHFIfWb9TIliG4gP8npvVPm73L6gIyEVxYruu9LBhxk5vL7dC9e3ptOr00smrvDnD7';
const STRIPE_MERCHANT_ID = 'merchant.net.esimfly.user.app';

// Declare global variable to track app state
global.isAppForegrounded = true;

// Configure foreground notification behavior based on platform
if (Platform.OS === 'ios') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: false,
      shouldPlaySound: false,
      shouldSetBadge: true,
      shouldPresentAlert: false,
    }),
  });
} else {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldPresentAlert: true,
    }),
  });
}

function NotificationConfiguration() {
  useEffect(() => {
    const appStateSubscription = AppState.addEventListener('change', nextAppState => {
      global.isAppForegrounded = nextAppState === 'active';
    });

    const initializeNotifications = async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          enableVibrate: true,
          enableLights: true,
        });
      }

      const permissionStatus = await AsyncStorage.getItem('notificationPermissionStatus');
      if (permissionStatus === 'granted') {
        const foregroundSubscription = Notifications.addNotificationReceivedListener(
          (notification) => {
            const { title, body, data } = notification.request.content;
            
            if (global.isAppForegrounded) {
              notificationManager.show(
                title || 'New Notification',
                body || '',
                data?.type || 'default',
                data?.duration || 5000
              );
            }
          }
        );

        const backgroundSubscription = Notifications.addNotificationResponseReceivedListener(
          (response) => {
            const { data } = response.notification.request.content;
            console.log('Notification tapped:', data);
          }
        );

        return () => {
          foregroundSubscription.remove();
          backgroundSubscription.remove();
        };
      }
    };

    initializeNotifications();

    return () => {
      appStateSubscription.remove();
    };
  }, []);

  return null;
}

export default function App() {
  const [isAppInitialized, setIsAppInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isStripeInitialized, setIsStripeInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize app without Firebase (using direct Google/Apple auth)
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // App initialization without Firebase
        setIsAppInitialized(true);
        setIsLoading(false);
      } catch (error) {
        console.error('Error during app initialization:', error);
        setError('Failed to initialize app');
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Check authentication state using token-based auth (instead of Firebase auth)
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        setIsAuthenticated(!!token);
        setIsLoading(false);
      } catch (error) {
        console.log('Error checking auth state:', error);
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    };

    if (isAppInitialized) {
      checkAuthState();
    }
  }, [isAppInitialized]);

  // Initialize Stripe
  useEffect(() => {
    const initializeStripe = async () => {
      try {
        await AsyncStorage.setItem('stripe_publishable_key', STRIPE_PUBLISHABLE_KEY);
        if (Platform.OS === 'ios') {
          await AsyncStorage.setItem('stripe_merchant_id', STRIPE_MERCHANT_ID);
        }
        setIsStripeInitialized(true);
      } catch (error) {
        console.error('Error initializing Stripe:', error);
        setError('Failed to initialize payment system');
      }
    };

    initializeStripe();
  }, []);

  // Handle deep links for referral codes
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      try {
        console.log('[DeepLink] Received URL:', url);
        const { queryParams } = Linking.parse(url);
        
        if (queryParams?.ref) {
          const referralCode = queryParams.ref as string;
          console.log('[DeepLink] Found referral code:', referralCode);
          
          // Store referral code for later use during registration
          await AsyncStorage.setItem('referralCode', referralCode);
          await AsyncStorage.setItem('referralCodeTimestamp', new Date().toISOString());
          
          console.log('[DeepLink] Stored referral code:', referralCode);
        }
      } catch (error) {
        console.error('[DeepLink] Error handling deep link:', error);
      }
    };

    // Handle initial URL when app is opened from a link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Handle URL changes when app is already open
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  if (isLoading || !isStripeInitialized) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#1E1E1E' 
      }}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        {error && (
          <Text style={{ 
            color: '#FF6B6B', 
            marginTop: 20,
            textAlign: 'center',
            paddingHorizontal: 20
          }}>
            {error}
          </Text>
        )}
      </View>
    );
  }

  return (
    <StripeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      merchantIdentifier={STRIPE_MERCHANT_ID}
      urlScheme="esimfly"
    >
      <SafeAreaProvider>
        <ToastProvider>
          <NotificationManager />
          <NotificationConfiguration />
          <AppNavigator isAuthenticated={isAuthenticated} />
        </ToastProvider>
      </SafeAreaProvider>
    </StripeProvider>
  );
}