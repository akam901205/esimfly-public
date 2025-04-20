import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ToastType = 'success' | 'error' | 'info' | 'default';

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

interface ToastProps {
  message: string;
  type: ToastType;
  index: number;
}

const TOAST_DURATION = 4000;
const ANIMATION_DURATION = 200;

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType }>>([]);
  
  const showToast = (message: string, type: ToastType = 'default') => {
    const id = Date.now().toString();
    setToasts(currentToasts => [...currentToasts, { id, message, type }]);
    
    setTimeout(() => {
      setToasts(currentToasts => currentToasts.filter(toast => toast.id !== id));
    }, TOAST_DURATION);
  };

  const contextValue: ToastContextType = {
    showToast,
    success: (message) => showToast(message, 'success'),
    error: (message) => showToast(message, 'error'),
    info: (message) => showToast(message, 'info'),
  };

  return (
    <ToastContext.Provider value={contextValue}>
      <View style={styles.container}>
        {children}
        <View style={styles.toastContainer} pointerEvents="box-none">
          {toasts.map((toast, index) => (
            <Toast 
              key={toast.id} 
              message={toast.message} 
              type={toast.type}
              index={index}
            />
          ))}
        </View>
      </View>
    </ToastContext.Provider>
  );
};

const Toast: React.FC<ToastProps> = ({ message, type, index }) => {
  const translateY = useRef(new Animated.Value(20)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start();

    const hideTimeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 20,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    }, TOAST_DURATION - ANIMATION_DURATION);

    return () => clearTimeout(hideTimeout);
  }, []);

  const getIconName = () => {
    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'alert-circle';
      case 'info':
        return 'information-circle';
      default:
        return 'notifications';
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return '#27AE60';
      case 'error':
        return '#E74C3C';
      case 'info':
        return '#3498DB';
      default:
        return '#34495E';
    }
  };

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          transform: [{ translateY }],
          opacity,
          backgroundColor: getBackgroundColor(),
          bottom: (index * 70) + 10,
        },
      ]}
    >
      <Ionicons name={getIconName()} size={24} color="white" />
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toastContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    minWidth: 160,
    maxWidth: Dimensions.get('window').width - 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  message: {
    color: 'white',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Quicksand',
  },
});