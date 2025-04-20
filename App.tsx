import React, { useEffect, useState } from 'react';
import { Platform, AppState, View, ActivityIndicator, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';
import AppNavigator from './AppNavigator';
import * as Notifications from 'expo-notifications';
import { NotificationManager, notificationManager } from './components/NotificationManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firebase from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { ToastProvider } from './components/ToastNotification';

// Stripe configuration
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51QkpsjRsiK4Lxqyaz4hBVr6NyGJyM0Byyv4r2NDdPnhPaJbq6sRAlJZjij56Cmoaw5RRlMBHqLGePsFBFQC7UCzE003139zcQn';
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
  const [isFirebaseInitialized, setIsFirebaseInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isStripeInitialized, setIsStripeInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Firebase
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const firebaseConfig = Platform.select({
          ios: {
            apiKey: "AIzaSyBppTW3G86gDswrWNG2G6XLSmOQT9YU8pM",
            authDomain: "esimfly-public.firebaseapp.com",
            projectId: "esimfly-public",
            storageBucket: "esimfly-public.firebasestorage.app",
            messagingSenderId: "1033438752251",
            appId: "1:1033438752251:ios:3685161cd7eb3acdd42f5e",
            bundleId: "net.esimfly.user.app",
            clientId: "1033438752251-rdl49po6ughkl452ijk0lav7k7cb07vt.apps.googleusercontent.com",
          },
          android: {
            apiKey: "AIzaSyD0LjpBFaDVVo31gbKCuZ6Ys78sl0CfyyM",
            authDomain: "esimfly-public.firebaseapp.com",
            projectId: "esimfly-public",
            storageBucket: "esimfly-public.firebasestorage.app",
            messagingSenderId: "1033438752251",
            appId: "1:1033438752251:android:26b80c83fd5bf473d42f5e",
          },
        });

        if (!firebase.apps.length) {
          await firebase.initializeApp(firebaseConfig);
        }

        setIsFirebaseInitialized(true);
      } catch (error) {
        console.error('Error during app initialization:', error);
        setError('Failed to initialize app');
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Listen for authentication state changes
  useEffect(() => {
    if (isFirebaseInitialized) {
      const unsubscribe = auth().onAuthStateChanged((user) => {
        setIsAuthenticated(!!user);
        setIsLoading(false);
      });

      return unsubscribe;
    }
  }, [isFirebaseInitialized]);

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