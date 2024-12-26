import React, { useContext, useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  Image, 
  Switch,
  Dimensions,
  ScrollView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../api/AuthContext';
import { logout as apiLogout } from '../api/authApi';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import esimApi from '../api/esimApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import type { BalanceData } from '../api/esimApi';
import NotificationService from '../services/notificationService';
import { notificationManager } from '../components/NotificationManager';

const TAB_BAR_HEIGHT = 84;
const WINDOW_HEIGHT = Dimensions.get('window').height;

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const auth = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState<string>('');

  const getFormattedBalance = () => {
    if (isLoadingBalance) return 'Loading...';
    if (!balance?.balance) return '$0.00';
    return `$${Number(balance.balance).toFixed(2)}`;
  };

  const fetchUserBalance = async () => {
    try {
      const response = await esimApi.fetchBalance();
      if (response.success && response.data) {
        setBalance(response.data);
      } else {
        console.warn('Failed to fetch balance:', response.message);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const checkNotificationStatus = async () => {
    try {
      const isEnabled = await NotificationService.isNotificationsEnabled();
      setNotificationsEnabled(isEnabled);
      if (isEnabled) {
        const token = await NotificationService.getCurrentToken();
        if (token) setExpoPushToken(token);
      }
    } catch (error) {
      console.error('Error checking notification status:', error);
    }
  };

  const toggleNotifications = async () => {
    try {
      if (!notificationsEnabled) {
        if (Platform.OS === 'ios') {
          const { status } = await Notifications.requestPermissionsAsync({
            ios: {
              allowAlert: true,
              allowBadge: true,
              allowSound: true,
              allowAnnouncements: true,
            },
          });

          if (status !== 'granted') {
            notificationManager.warning(
              'Permission Required',
              'Please enable notifications in your device settings to receive updates'
            );
            return;
          }
        }

        const token = await NotificationService.registerForPushNotifications(true);
        if (token) {
          setExpoPushToken(token);
          setNotificationsEnabled(true);
          await AsyncStorage.setItem('notificationPermissionStatus', 'granted');
          notificationManager.updatePermissionStatus(true);
          
          notificationManager.success(
            'Notifications Enabled',
            'You will now receive notifications from our app'
          );
        }
      } else {
        const success = await NotificationService.deregisterPushNotifications();
        if (success) {
          setExpoPushToken('');
          setNotificationsEnabled(false);
          await AsyncStorage.setItem('notificationPermissionStatus', 'denied');
          notificationManager.updatePermissionStatus(false);
          
          notificationManager.info(
            'Notifications Disabled',
            'You will no longer receive notifications from our app'
          );
        }
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      notificationManager.error('Error', 'Failed to update notification settings');
    }
  };

  useEffect(() => {
    const initializeScreen = async () => {
      await NotificationService.initialize();
      await checkNotificationStatus();
      await fetchUserBalance();
    };

    initializeScreen();

    const foregroundSubscription = Notifications.addNotificationReceivedListener(
      notification => {
        if (global.isAppForegrounded && Platform.OS === 'ios') {
          const { title, body, data } = notification.request.content;
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
      response => {
        console.log('Notification tapped:', response);
        const { data } = response.notification.request.content;
        if (data?.screen) {
          navigation.navigate(data.screen);
        }
      }
    );

    const focusSubscription = navigation.addListener('focus', () => {
      fetchUserBalance();
      checkNotificationStatus();
    });

    return () => {
      if (foregroundSubscription) foregroundSubscription.remove();
      if (backgroundSubscription) backgroundSubscription.remove();
      focusSubscription();
    };
  }, [navigation]);

  if (!auth) {
    console.error('AuthContext is not available');
    return null;
  }

  const { signOut, userEmail } = auth;

  const handleLogout = async () => {
    try {
      const response = await apiLogout();
      if (response.status === 200 || response.status === 302) {
        await signOut();
        notificationManager.info('Logged Out', 'You have been successfully logged out');
      } else {
        console.error('Unexpected logout response:', response);
        notificationManager.error('Logout Failed', 'An unexpected error occurred. Please try again.');
      }
    } catch (error) {
      console.error('Logout error:', error);
      notificationManager.error('Logout Error', 'An unexpected error occurred. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.content, { height: WINDOW_HEIGHT - insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        <ScrollView 
          style={styles.scrollContent}
          contentContainerStyle={[
            styles.scrollContentContainer,
            { paddingBottom: TAB_BAR_HEIGHT + insets.bottom }
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.profileInfo}>
            <Image
              source={require('../assets/images/sim-card.png')}
              style={[styles.avatar, { resizeMode: 'contain' }]}
            />
            <Text style={styles.email}>{userEmail || 'johndoe@example.com'}</Text>
            <View style={styles.balanceContainer}>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={styles.balanceAmount}>{getFormattedBalance()}</Text>
            </View>
          </View>
          
          <View style={styles.options}>
            <TouchableOpacity 
              style={styles.option}
              onPress={() => navigation.navigate('Deposit')}
            >
              <Ionicons name="wallet-outline" size={24} color="#FFFFFF" />
              <Text style={styles.optionText}>Add Balance</Text>
              <Ionicons name="chevron-forward" size={24} color="#888" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.option}
              onPress={() => navigation.navigate('EditProfile')}
            >
              <Ionicons name="person-outline" size={24} color="#FFFFFF" />
              <Text style={styles.optionText}>Edit Profile</Text>
              <Ionicons name="chevron-forward" size={24} color="#888" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.option}
              onPress={() => navigation.navigate('OrderHistory')}
            >
              <Ionicons name="receipt-outline" size={24} color="#FFFFFF" />
              <Text style={styles.optionText}>Order History</Text>
              <Ionicons name="chevron-forward" size={24} color="#888" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.option}>
              <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
              <Text style={styles.optionText}>Notifications</Text>
              <Switch
                value={notificationsEnabled}
                onValueChange={toggleNotifications}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={notificationsEnabled ? '#f5dd4b' : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
              />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.option}
              onPress={() => navigation.navigate('Privacy')}
            >
              <Ionicons name="shield-outline" size={24} color="#FFFFFF" />
              <Text style={styles.optionText}>Privacy</Text>
              <Ionicons name="chevron-forward" size={24} color="#888" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.option}
              onPress={() => navigation.navigate('Terms')}
            >
              <Ionicons name="document-text-outline" size={24} color="#FFFFFF" />
              <Text style={styles.optionText}>Terms of Service</Text>
              <Ionicons name="chevron-forward" size={24} color="#888" />
            </TouchableOpacity>
          </View>

          <View style={styles.logoutButtonContainer}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  content: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#1E1E1E',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingTop: 20,
  },
  profileInfo: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
    backgroundColor: '#2A2A2A',
    overflow: 'hidden',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#888',
    marginBottom: 15,
  },
  balanceContainer: {
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    padding: 15,
    borderRadius: 12,
    width: '100%',
    marginTop: 10,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 5,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  options: {
    marginTop: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  optionText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
    color: '#FFFFFF',
  },
  logoutButtonContainer: {
    padding: 20,
    marginTop: 20,
  },
  logoutButton: {
    padding: 15,
    backgroundColor: '#FF6347',
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProfileScreen;