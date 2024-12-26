import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import esimApi from '../api/esimApi';

class NotificationService {
  private static instance: NotificationService;
  private currentToken: string | null = null;
  private initialized: boolean = false;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private async getDeviceInfo(): Promise<string> {
    try {
      let deviceName = 'Unknown Device';
      if (Device.modelName) {
        deviceName = Device.modelName;
      } else if (Device.deviceName) {
        deviceName = await Device.deviceName;
      }
      return deviceName;
    } catch (error) {
      console.error('Error getting device info:', error);
      return 'Unknown Device';
    }
  }

  async initialize() {
    // Configure platform-specific notification handling
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
          priority: Notifications.AndroidNotificationPriority.HIGH,
        }),
      });

      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        enableVibrate: true,
        enableLights: true,
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('silent', {
        name: 'Silent',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 0, 0, 0],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
        enableVibrate: false,
        enableLights: false,
        sound: null,
      });
    }

    // Check for existing permissions and token
    const savedToken = await AsyncStorage.getItem('pushToken');
    const permissionStatus = await AsyncStorage.getItem('notificationPermissionStatus');

    if (permissionStatus === 'granted') {
      if (savedToken) {
        this.currentToken = savedToken;
        console.log('Restored push token:', savedToken);
        try {
          await this.verifyTokenWithServer(savedToken);
        } catch (error) {
          console.warn('Failed to verify token with server:', error);
          // Don't clear token on verification failure
        }
      } else {
        // If we have permission but no token, try to get a new one
        try {
          await this.registerForPushNotifications(true);
        } catch (error) {
          console.warn('Failed to recreate push token:', error);
        }
      }
    }

    this.initialized = true;
  }

  private async verifyTokenWithServer(token: string): Promise<boolean> {
    try {
      const response = await esimApi.verifyPushToken(token);
      return response.success;
    } catch (error) {
      console.error('Error verifying token with server:', error);
      return false;
    }
  }

  async registerForPushNotifications(forceNew = false): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.warn('Must use physical device for Push Notifications');
        return null;
      }

      // Check existing token first if not forcing new
      if (this.currentToken && !forceNew) {
        try {
          const isValid = await this.verifyTokenWithServer(this.currentToken);
          if (isValid) {
            return this.currentToken;
          }
        } catch (error) {
          console.warn('Error verifying existing token:', error);
        }
      }

      // Check/request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowAnnouncements: true,
            provisional: false
          },
        });
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        await AsyncStorage.setItem('notificationPermissionStatus', 'denied');
        return null;
      }

      // Get new token
      const token = (await Notifications.getExpoPushTokenAsync({
        projectId: '4ce0ba64-0a19-4c80-9f1e-4cb7df2c2496'
      })).data;

      // Try to register with server if logged in
      try {
        const deviceName = await this.getDeviceInfo();
        const registerResponse = await esimApi.registerPushToken({
          token,
          deviceType: Platform.OS,
          deviceName
        });

        if (!registerResponse.success) {
          console.warn('Failed to register token with server:', registerResponse.message);
          // Continue anyway as we want to maintain local settings
        }
      } catch (error) {
        console.warn('Error registering with server:', error);
        // Continue anyway to maintain local settings
      }

      // Save locally regardless of server registration
      this.currentToken = token;
      await AsyncStorage.setItem('pushToken', token);
      await AsyncStorage.setItem('notificationPermissionStatus', 'granted');

      return token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  async deregisterPushNotifications(): Promise<boolean> {
    try {
      // Only try to deregister from server if we have a token
      if (this.currentToken) {
        try {
          const deregisterResponse = await esimApi.deregisterPushToken(this.currentToken);
          if (!deregisterResponse.success && deregisterResponse.code !== 'AUTH_REQUIRED') {
            console.warn('Failed to deregister token from server:', deregisterResponse.message);
          }
        } catch (error) {
          console.warn('Error deregistering from server:', error);
        }
      }

      // Keep the permission status but clear the token
      this.currentToken = null;
      await AsyncStorage.removeItem('pushToken');
      
      return true;
    } catch (error) {
      console.error('Error removing push token:', error);
      return false;
    }
  }

  async sendPushNotification(
    title: string, 
    body: string, 
    data: any = {},
    options: {
      silent?: boolean;
      critical?: boolean;
      volume?: number;
    } = {}
  ) {
    const targetToken = this.currentToken;
    if (!targetToken) {
      console.error('No push token available');
      return false;
    }

    const message = {
      to: targetToken,
      title,
      body,
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
      sound: options.silent ? null : 'default',
      priority: options.silent ? 'normal' : 'high',
      channelId: options.silent ? 'silent' : 'default',
      
      android: {
        channelId: options.silent ? 'silent' : 'default',
        priority: options.silent ? 'normal' : 'high',
        sound: !options.silent,
        vibrate: options.silent ? null : [0, 250, 250, 250],
        sticky: false,
        importance: options.silent ? 'normal' : 'high',
        visibility: 'public',
      },
      
      ios: {
        sound: !options.silent,
        _displayInForeground: false,
        priority: options.silent ? 'normal' : 'high',
        critical: options.critical ?? false,
        volume: options.volume ?? 1.0,
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

      return true;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  async getCurrentToken() {
    if (!this.currentToken) {
      const savedToken = await AsyncStorage.getItem('pushToken');
      if (savedToken) this.currentToken = savedToken;
    }
    return this.currentToken;
  }

  async isNotificationsEnabled() {
    const permissionStatus = await AsyncStorage.getItem('notificationPermissionStatus');
    if (permissionStatus !== 'granted') return false;

    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  // Methods for debug/testing removed as requested

  async setUpNotificationListeners(
    onReceive?: (notification: Notifications.Notification) => void,
    onResponse?: (response: Notifications.NotificationResponse) => void
  ) {
    const foregroundSubscription = Notifications.addNotificationReceivedListener(
      notification => {
        console.log('Received notification:', notification);
        onReceive?.(notification);
      }
    );

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      response => {
        console.log('Notification response:', response);
        onResponse?.(response);
      }
    );

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }
}

export default NotificationService.getInstance();