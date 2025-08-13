import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../api/AuthContext';
import * as esimApi from '../api/esimApi';
import { logout } from '../api/authApi';
import { colors } from '../theme/colors';
import notificationService from '../services/notificationService';

const { width } = Dimensions.get('window');

interface BalanceResponse {
  success: boolean;
  data?: {
    balance: number;
    currency: string;
  };
}

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showArrow?: boolean;
  color?: string;
  isLast?: boolean;
}

const ProfileScreen: React.FC = ({ navigation }: any) => {
  const auth = React.useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState('');

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const headerScale = useRef(new Animated.Value(1)).current;
  const cardAnimations = useRef([...Array(6)].map(() => new Animated.Value(1))).current;

  useEffect(() => {
    checkNotificationPermissions();
  }, []);

  const checkNotificationPermissions = async () => {
    const isEnabled = await notificationService.isNotificationsEnabled();
    setNotificationsEnabled(isEnabled);
    if (isEnabled) {
      const token = await notificationService.getCurrentToken();
      if (token) setExpoPushToken(token);
    }
  };

  const fetchBalance = async () => {
    try {
      const balanceData = await esimApi.fetchBalance();
      console.log('Balance data:', balanceData);
      if (balanceData.success && balanceData.data) {
        setBalance(balanceData);
      } else {
        console.warn('Invalid balance data:', balanceData);
        setBalance(null);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalance(null);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchBalance();
    }, [])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await fetchBalance();
    setIsRefreshing(false);
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              await logout();
              await auth.signOut();
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ],
    );
  };

  const toggleNotifications = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!notificationsEnabled) {
      const token = await notificationService.registerForPushNotifications();
      if (token) {
        setExpoPushToken(token);
        setNotificationsEnabled(true);
      }
    } else {
      await notificationService.deregisterPushNotifications();
      setNotificationsEnabled(false);
      setExpoPushToken('');
    }
  };

  const MenuItem: React.FC<MenuItemProps> = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    showArrow = true, 
    color,
    isLast = false 
  }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={[styles.menuItem, isLast && styles.menuItemLast]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress();
          }}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
        >
          <View style={styles.menuItemLeft}>
            <View style={styles.menuIconContainer}>
              <Ionicons name={icon} size={24} color={color || '#333'} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuItemTitle}>{title}</Text>
              {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
            </View>
          </View>
          {showArrow && (
            <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const formatBalance = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getInitials = (email: string) => {
    return email ? email.charAt(0).toUpperCase() : 'U';
  };


  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[colors.background.primary, colors.background.secondary]}
        style={styles.gradient}
      />
      
      {/* Fixed safe area spacer - NOT scrollable */}
      <View style={{ paddingTop: Math.max(insets.top, 10) }}>
        
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 40, 60) }}
          bounces={false}
          overScrollMode="never"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary.DEFAULT}
            />
          }
        >
          <View style={styles.content}>
          {/* Header Section */}
          <View style={styles.headerSection}>
            <LinearGradient
              colors={['#f8f9fa', '#ffffff']}
              style={styles.headerGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            >
              <View style={styles.profileInfo}>
                <View style={styles.avatarContainer}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{getInitials(auth.userEmail || '')}</Text>
                  </View>
                  <View style={styles.onlineDot} />
                </View>
                
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{auth.userEmail?.split('@')[0] || 'User'}</Text>
                  <Text style={styles.userEmail}>{auth.userEmail}</Text>
                </View>
              </View>

              {/* Balance Card */}
              <BlurView intensity={20} style={styles.balanceCard}>
                <View style={styles.balanceContent}>
                  <Text style={styles.balanceLabel}>Available Balance</Text>
                  
                  {isLoadingBalance ? (
                    <View style={styles.balanceLoadingContainer}>
                      <ActivityIndicator size="small" color="#333" />
                    </View>
                  ) : (
                    <Text style={styles.balanceAmount}>
                      {balance?.data ? formatBalance(balance.data.balance, balance.data.currency) : '$0.00'}
                    </Text>
                  )}
                </View>
              </BlurView>
            </LinearGradient>
          </View>


          {/* Menu Sections */}
          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.menuCard}>
              <MenuItem
                icon="person-outline"
                title="Edit Profile"
                subtitle="Update your personal information"
                onPress={() => navigation.navigate('EditProfile')}
                color={colors.primary.DEFAULT}
              />
              <MenuItem
                icon="receipt-outline"
                title="Order History"
                subtitle="View your past purchases"
                onPress={() => navigation.navigate('OrderHistory')}
                color="#10b981"
              />
              <MenuItem
                icon="gift-outline"
                title="Redeem Gift Card"
                subtitle="Add balance using gift card code"
                onPress={() => navigation.navigate('Deposit')}
                color="#ec4899"
                isLast
              />
            </View>
          </View>

          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            <View style={styles.menuCard}>
              <View style={styles.menuItem}>
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuIconContainer}>
                    <Ionicons name="notifications-outline" size={24} color="#8b5cf6" />
                  </View>
                  <View style={styles.menuTextContainer}>
                    <Text style={styles.menuItemTitle}>Push Notifications</Text>
                    <Text style={styles.menuItemSubtitle}>Get updates about your eSIMs</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={toggleNotifications}
                  style={[
                    styles.toggle,
                    notificationsEnabled && styles.toggleActive,
                  ]}
                >
                  <Animated.View
                    style={[
                      styles.toggleDot,
                      notificationsEnabled && styles.toggleDotActive,
                    ]}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>Support & Legal</Text>
            <View style={styles.menuCard}>
              <MenuItem
                icon="help-circle-outline"
                title="Help Center"
                subtitle="Get help and support"
                onPress={() => navigation.navigate('Support')}
                color="#06b6d4"
              />
              <MenuItem
                icon="shield-checkmark-outline"
                title="Privacy Policy"
                onPress={() => navigation.navigate('Privacy')}
                color="#10b981"
              />
              <MenuItem
                icon="cash-outline"
                title="Refund Policy"
                onPress={() => navigation.navigate('RefundPolicy')}
                color="#f59e0b"
              />
              <MenuItem
                icon="document-text-outline"
                title="Terms of Service"
                onPress={() => navigation.navigate('Terms')}
                color="#6366f1"
                isLast
              />
            </View>
          </View>

          {/* Danger Zone */}
          <View style={styles.menuSection}>
            <Text style={[styles.sectionTitle, { color: '#ef4444' }]}>Danger Zone</Text>
            <View style={styles.menuCard}>
              <MenuItem
                icon="trash-outline"
                title="Delete Account"
                subtitle="Permanently delete your account"
                onPress={() => navigation.navigate('DeleteAccount')}
                color="#ef4444"
                isLast
              />
            </View>
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>

          {/* Version Info */}
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
        </ScrollView>
        
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    paddingBottom: 40,
  },
  headerSection: {
    marginBottom: 24,
  },
  headerGradient: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10b981',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
    fontFamily: 'Quicksand-SemiBold',
  },
  userEmail: {
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: 'Quicksand-Regular',
  },
  balanceCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: -8,
  },
  balanceContent: {
    padding: 24,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'Quicksand-Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  addButton: {
    padding: 4,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 24,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    textAlign: 'center',
  },
  balanceLoadingContainer: {
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  menuSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
    fontFamily: 'Quicksand-SemiBold',
  },
  menuCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  menuTextContainer: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 2,
    fontFamily: 'Quicksand-Medium',
  },
  menuItemSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    fontFamily: 'Quicksand-Regular',
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border.light,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#333',
  },
  toggleDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background.primary,
    transform: [{ translateX: 0 }],
  },
  toggleDotActive: {
    transform: [{ translateX: 20 }],
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  signOutText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    fontFamily: 'Quicksand-SemiBold',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 24,
    marginBottom: 20,
    fontFamily: 'Quicksand-Regular',
  },
});

export default ProfileScreen;