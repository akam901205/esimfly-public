// src/components/NotificationManager/NotificationComponent.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Animated, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Theme colors matching your app
export const THEME_COLORS = {
  background: '#1E1E1E',   // Dark background matching your app
  success: '#4CAF50',      // Green
  error: '#FF6347',        // Red (matching your logout button)
  warning: '#FFA500',      // Orange
  default: '#2A2A2A',      // Secondary background from balanceContainer
  text: '#FFFFFF',         // White text
  subText: '#888888',      // Grey text
  border: '#333333',       // Border color
};

export interface NotificationComponentProps {
  title: string;
  message: string;
  type: 'default' | 'success' | 'error' | 'warning';
  onClose: () => void;
  duration?: number;
}

export const NotificationComponent: React.FC<NotificationComponentProps> = ({
  title,
  message,
  type = 'default',
  onClose,
  duration = 5000,
}) => {
  const insets = useSafeAreaInsets();
  const [isVisible, setIsVisible] = useState(true);
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        speed: 12,
        bounciness: 8
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true
      })
    ]).start();

    const timer = setTimeout(hideNotification, duration);
    return () => clearTimeout(timer);
  }, []);

  const hideNotification = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      })
    ]).start(() => {
      setIsVisible(false);
      onClose();
    });
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return THEME_COLORS.success;
      case 'error': return THEME_COLORS.error;
      case 'warning': return THEME_COLORS.warning;
      default: return THEME_COLORS.default;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return 'checkmark-circle-outline';
      case 'error': return 'alert-circle-outline';
      case 'warning': return 'warning-outline';
      default: return 'notifications-outline';
    }
  };

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: getBackgroundColor(),
          marginTop: insets.top + 10,
          transform: [{ translateY: slideAnim }],
          opacity,
          borderColor: type === 'default' ? THEME_COLORS.border : 'transparent',
          borderWidth: type === 'default' ? 1 : 0,
        }
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={hideNotification}
        activeOpacity={0.8}
      >
        <View style={styles.leftContent}>
          <Ionicons
            name={getIcon()}
            size={24}
            color={THEME_COLORS.text}
            style={styles.icon}
          />
          <View style={styles.textContainer}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
          </View>
        </View>
        <Ionicons
          name="close-outline"
          size={24}
          color={THEME_COLORS.text}
          style={styles.closeIcon}
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    marginBottom: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: THEME_COLORS.text,
    fontWeight: 'bold',
    fontSize: 14,
  },
  message: {
    color: THEME_COLORS.text,
    fontSize: 12,
    opacity: 0.9,
    marginTop: 4,
  },
  closeIcon: {
    marginLeft: 8,
  },
});

export default NotificationComponent;