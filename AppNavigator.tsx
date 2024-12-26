import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, Text, Keyboard, Animated, Platform, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext, useAuth } from './api/AuthContext';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import NotificationService from './services/notificationService';
import CustomTabBar from './components/CustomTabBar';

// Import all screens
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import ShopScreen from './screens/ShopScreen';
import PackageTypeScreen from './screens/PackageTypeScreen';
import CountryPackagesScreen from './screens/CountryPackagesScreen';
import RegionalPackageTypeScreen from './screens/RegionalPackageTypeScreen';
import RegionalPackagesScreen from './screens/RegionalPackagesScreen';
import RegionalPackageDetailsScreen from './screens/RegionalPackageDetailsScreen';
import GlobalPackageTypeScreen from './screens/GlobalPackageTypeScreen';
import GlobalPackagesScreen from './screens/GlobalPackagesScreen';
import GlobalPackageDetailsScreen from './screens/GlobalPackageDetailsScreen';
import PackageDetailsScreen from './screens/PackageDetailsScreen';
import MyESimsScreen from './screens/MyESimsScreen';
import GuidesScreen from './screens/GuidesScreen';
import ProfileScreen from './screens/ProfileScreen';
import CheckoutScreen from './screens/CheckoutScreen';
import OrderHistoryScreen from './screens/OrderHistoryScreen';
import InstructionsScreen from './screens/InstructionsScreen';
import DepositScreen from './screens/DepositScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import PrivacyScreen from './screens/PrivacyScreen';
import TermsScreen from './screens/TermsScreen';

// Configure platform-specific settings for dark theme
async function configureNavigationBar() {
  if (Platform.OS === 'android') {
    try {
      await NavigationBar.setBackgroundColorAsync('#1E1E1E');
      await NavigationBar.setButtonStyleAsync('light');
      await NavigationBar.setBorderColorAsync('#1E1E1E');
      await NavigationBar.setVisibilityAsync('visible');
    } catch (error) {
      console.warn('Error setting navigation bar:', error);
    }
  }
}

// Configure notifications
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

// Type definitions for navigation
export type RootStackParamList = {
  Welcome: undefined;
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email: string };
};

export type ShopStackParamList = {
  ShopMain: undefined;
  PackageType: { country: string };
  CountryPackages: { 
    country: string; 
    packageType: 'regular' | 'unlimited' 
  };
  RegionalPackageType: { region: string };
  RegionalPackages: { 
    region: string; 
    packageType: 'regular' | 'unlimited' 
  };
  RegionalPackageDetails: {
    package: {
      id: string;
      name: string;
      region: string;
      regionCountries: string[];
      price: number;
      data: number | 'Unlimited';
      duration: string;
      packageCode: string;
      speed: string;
      flag_url: string;
      location: string;
      unlimited: boolean;
      networks: Array<{
        name: string;
        type: string;
        location: string;
        locationLogo: string;
      }>;
      locationNetworkList: Array<{
        locationName: string;
        locationLogo: string;
        operatorList: Array<{
          operatorName: string;
          networkType: string;
        }>;
      }>;
      provider: string;
      last_updated: string;
    };
    region: string;
  };
  GlobalPackageType: { globalPackageName: string };
  GlobalPackages: { 
    packageType: 'regular' | 'unlimited';
    globalPackageName: string;
  };
  GlobalPackageDetails: {
    package: {
      id: string;
      name: string;
      data: number | string;
      price: number;
      duration: string;
      speed: string;
      unlimited: boolean;
      region: string;
      provider: string;
    };
    globalPackageName: string;
  };
  PackageDetails: {
    package: {
      id: string;
      data: number | string;
      price: number;
      duration: string;
      unlimited: boolean;
      region: string;
    };
    country: string;
  };
  Checkout: {
    package: {
      id: string;
      data: number | string;
      price: number;
      duration: string;
      unlimited: boolean;
      region: string;
    };
    country: string;
  };
  Instructions: {
    qrData?: string;
    qrCodeUrl?: string;
    directAppleInstallUrl?: string;
    packageName?: string;
    orderNumber?: string;
    iccid?: string;
  };
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  OrderHistory: undefined;
  Deposit: undefined;
  EditProfile: undefined;
  Privacy: undefined;
  Terms: undefined;
};

export type MainTabParamList = {
  Shop: undefined;
  'My eSims': undefined;
  Guides: undefined;
  Profile: undefined;
};

// Create navigators
const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const ShopStack = createNativeStackNavigator<ShopStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Auth Navigator
function AuthNavigator() {
  return (
    <AuthStack.Navigator 
      screenOptions={{ 
        headerShown: false,
        contentStyle: {
          backgroundColor: '#1E1E1E'
        }
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </AuthStack.Navigator>
  );
}

// Profile Navigator
function ProfileNavigator() {
  return (
    <ProfileStack.Navigator 
      screenOptions={{ 
        headerShown: false,
        presentation: 'card',
        contentStyle: {
          backgroundColor: '#1E1E1E'
        }
      }}
      initialRouteName="ProfileMain"
    >
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="OrderHistory" component={OrderHistoryScreen} />
      <ProfileStack.Screen name="Deposit" component={DepositScreen} />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
      <ProfileStack.Screen name="Privacy" component={PrivacyScreen} />
      <ProfileStack.Screen name="Terms" component={TermsScreen} />
    </ProfileStack.Navigator>
  );
}

// Shop Navigator
function ShopNavigator() {
  return (
    <ShopStack.Navigator 
      screenOptions={{ 
        headerShown: false,
        presentation: 'card',
        contentStyle: {
          backgroundColor: '#1E1E1E'
        }
      }}
    >
      <ShopStack.Screen name="ShopMain" component={ShopScreen} />
      <ShopStack.Screen name="PackageType" component={PackageTypeScreen} />
      <ShopStack.Screen name="CountryPackages" component={CountryPackagesScreen} />
      <ShopStack.Screen name="RegionalPackageType" component={RegionalPackageTypeScreen} />
      <ShopStack.Screen name="RegionalPackages" component={RegionalPackagesScreen} />
      <ShopStack.Screen name="RegionalPackageDetails" component={RegionalPackageDetailsScreen} />
      <ShopStack.Screen name="GlobalPackageType" component={GlobalPackageTypeScreen} />
      <ShopStack.Screen name="GlobalPackages" component={GlobalPackagesScreen} />
      <ShopStack.Screen name="GlobalPackageDetails" component={GlobalPackageDetailsScreen} />
      <ShopStack.Screen name="PackageDetails" component={PackageDetailsScreen} />
      <ShopStack.Screen name="Checkout" component={CheckoutScreen} options={{ presentation: 'modal' }} />
      <ShopStack.Screen name="Terms" component={TermsScreen} options={{ presentation: 'modal' }} />
      <ShopStack.Screen name="Instructions" component={InstructionsScreen} options={{ presentation: 'modal' }} />
    </ShopStack.Navigator>
  );
}

// Main Navigator with Tab Bar
function MainNavigator() {
  const tabBarOpacity = useRef(new Animated.Value(1)).current;
  const tabBarTranslateY = useRef(new Animated.Value(0)).current;
  const responseListener = useRef<any>();

  useEffect(() => {
    // Set status bar and navigation bar properties
    StatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('#1E1E1E');
      configureNavigationBar();
    }

    const initializeServices = async () => {
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
        responseListener.current = Notifications.addNotificationResponseReceivedListener(
          (response) => {
            const { data } = response.notification.request.content;
            console.log('Notification tapped:', data);
          }
        );
      }
    };

    initializeServices();

    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        Animated.parallel([
          Animated.timing(tabBarOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(tabBarTranslateY, {
            toValue: 100,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    );

    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        Animated.parallel([
          Animated.timing(tabBarOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(tabBarTranslateY, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    );

    return () => {
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return (
    <Tab.Navigator
      tabBar={props => (
        <CustomTabBar 
          {...props} 
          style={{
            opacity: tabBarOpacity,
            transform: [{ translateY: tabBarTranslateY }],
          }}
        />
      )}
      screenOptions={{
        headerShown: false,
        unmountOnBlur: true,
      }}
    >
      <Tab.Screen 
        name="Shop" 
        component={ShopNavigator}
        options={{
          unmountOnBlur: false
        }}
      />
      <Tab.Screen 
        name="My eSims" 
        component={MyESimsScreen}
        options={{
          unmountOnBlur: true
        }}
      />
      <Tab.Screen 
        name="Guides" 
        component={GuidesScreen}
        options={{
          unmountOnBlur: true
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileNavigator}
        options={{
          unmountOnBlur: true
        }}
      />
    </Tab.Navigator>
  );
}

// Root Navigator
function AppNavigator() {
  const auth = useAuth();

  useEffect(() => {
    // Set status bar and navigation bar properties
    StatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('#1E1E1E');
      configureNavigationBar();
    }
  }, []);

  if (auth.isLoading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#1E1E1E'
      }}>
        <StatusBar barStyle="light-content" backgroundColor="#1E1E1E" />
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthContext.Provider value={auth}>
        <NavigationContainer>
          <StatusBar barStyle="light-content" backgroundColor="#1E1E1E" />
          <RootStack.Navigator 
            screenOptions={{ 
              headerShown: false,
              presentation: 'card',
              contentStyle: {
                backgroundColor: '#1E1E1E'
              }
            }}
          >
            {auth.userToken === null ? (
              <>
                <RootStack.Screen name="Welcome" component={WelcomeScreen} />
                <RootStack.Screen name="Auth" component={AuthNavigator} />
              </>
            ) : (
              <RootStack.Screen
                name="Main" 
                component={MainNavigator}
                options={{
                  animationEnabled: false
                }}
              />
            )}
          </RootStack.Navigator>
        </NavigationContainer>
      </AuthContext.Provider>
    </SafeAreaProvider>
  );
}

export default AppNavigator;