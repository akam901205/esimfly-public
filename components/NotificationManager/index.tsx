import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationComponent from './NotificationComponent';

type NotificationType = 'default' | 'success' | 'error' | 'warning';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  duration: number;
}

export const NotificationManager: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  useEffect(() => {
    const initializeManager = async () => {
      // Initialize the manager
      notificationManager.init(setNotifications);
      
      // Check permission status
      const permissionStatus = await AsyncStorage.getItem('notificationPermissionStatus');
      notificationManager.updatePermissionStatus(permissionStatus === 'granted');
    };

    initializeManager();

    // Listen for app state changes to check notification permissions
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        const permissionStatus = await AsyncStorage.getItem('notificationPermissionStatus');
        notificationManager.updatePermissionStatus(permissionStatus === 'granted');
      }
    });

    return () => {
      notificationManager._setNotifications = null;
      subscription.remove();
    };
  }, []);

  return (
    <View style={styles.container}>
      {notifications.map((notification) => (
        <NotificationComponent
          key={notification.id}
          title={notification.title}
          message={notification.message}
          type={notification.type}
          duration={notification.duration}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </View>
  );
};

export const notificationManager = {
  _setNotifications: null as null | React.Dispatch<React.SetStateAction<Notification[]>>,
  _permissionGranted: false,

  init(setNotificationsFunction: React.Dispatch<React.SetStateAction<Notification[]>>) {
    this._setNotifications = setNotificationsFunction;
  },

  updatePermissionStatus(isGranted: boolean) {
    this._permissionGranted = isGranted;
  },

  async checkPermissionStatus() {
    const permissionStatus = await AsyncStorage.getItem('notificationPermissionStatus');
    this._permissionGranted = permissionStatus === 'granted';
    return this._permissionGranted;
  },

  show(
    title: string,
    message: string,
    type: NotificationType = 'default',
    duration = 5000
  ) {
    if (!this._setNotifications) {
      console.warn('NotificationManager not initialized');
      return;
    }

    // Always show permission-related notifications
    const isPermissionRelated = 
      title.includes('Notifications') || 
      message.includes('notifications') ||
      type === 'success';

    if (!this._permissionGranted && !isPermissionRelated) {
      return;
    }

    const notification: Notification = {
      id: Date.now(),
      title,
      message,
      type,
      duration,
    };

    this._setNotifications((prev) => [...prev, notification]);
  },

  success(title: string, message: string, duration?: number) {
    this.show(title, message, 'success', duration);
  },

  error(title: string, message: string, duration?: number) {
    this.show(title, message, 'error', duration);
  },

  warning(title: string, message: string, duration?: number) {
    this.show(title, message, 'warning', duration);
  },

  info(title: string, message: string, duration?: number) {
    this.show(title, message, 'default', duration);
  },
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
});

export default NotificationManager;