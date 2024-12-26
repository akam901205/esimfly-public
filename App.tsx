import React, { useEffect } from 'react';
import { Platform, AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './AppNavigator';
import * as Notifications from 'expo-notifications';
import { NotificationManager, notificationManager } from './components/NotificationManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Declare global variable to track app state
global.isAppForegrounded = true;

// Configure foreground notification behavior based on platform
if (Platform.OS === 'ios') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: false,  // This prevents system alerts in foreground
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
    // Track app state changes
    const appStateSubscription = AppState.addEventListener('change', nextAppState => {
      global.isAppForegrounded = nextAppState === 'active';
    });

    const initializeNotifications = async () => {
      // Set up notification channel for Android
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

      // Only set up listeners if permissions were previously granted
      const permissionStatus = await AsyncStorage.getItem('notificationPermissionStatus');
      if (permissionStatus === 'granted') {
        // Handle foreground notifications with custom UI only
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

        // Handle background/quit state notifications
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

// Updated sendPushNotification function
export const sendPushNotification = async (expoPushToken, title, body, data = {}) => {
  const permissionStatus = await AsyncStorage.getItem('notificationPermissionStatus');
  if (permissionStatus !== 'granted') {
    return { status: 'error', message: 'Notifications not permitted' };
  }

  if (global.isAppForegrounded && Platform.OS === 'ios') {
    notificationManager.show(title, body, data.type || 'default');
    return { status: 'success' };
  }

  const message = {
    to: expoPushToken,
    sound: 'default',
    title,
    body,
    data: {
      ...data,
      timestamp: new Date().toISOString(),
    },
    priority: 'high',
    channelId: 'default',
    android: {
      priority: 'high',
      sound: true,
      sticky: false,
      vibrate: true,
      channelId: 'default',
      importance: 'high',
      visibility: 'public',
    },
    ios: {
      sound: true,
      _displayInForeground: false,
      priority: 'high',
    },
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.message || 'Failed to send notification');
    }
    return responseData;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};

export default function App() {
  return (
    <SafeAreaProvider>
      <NotificationManager />
      <NotificationConfiguration />
      <AppNavigator />
    </SafeAreaProvider>
  );
}