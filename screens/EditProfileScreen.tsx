import React, { useState, useContext, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  Platform,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../api/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import esimApi from '../api/esimApi';
import { notificationManager } from '../components/NotificationManager';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';

const { height } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 84;

type TabType = 'password' | 'email';

const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const auth = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  
  const [activeTab, setActiveTab] = useState<TabType>('password');
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLogin, setIsSocialLogin] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    newEmail: '',
    emailPassword: ''
  });

  // Password visibility states
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
    email: false
  });

  // Handle input changes
  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Check if user signed in with Google/Apple
  useEffect(() => {
    const checkLoginMethod = async () => {
      try {
        const authMethod = await AsyncStorage.getItem('authMethod');
        if (authMethod === 'google' || authMethod === 'apple') {
          setIsSocialLogin(true);
          setActiveTab('email'); // Default to email tab for social users
        }
      } catch (error) {
        console.log('Error checking login method:', error);
      }
    };
    
    checkLoginMethod();
  }, []);

  // Toggle password visibility
  const togglePasswordVisibility = useCallback((field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  }, []);

  const handleChangePassword = async () => {
    if (isSocialLogin) {
      notificationManager.warning(
        'Not Available',
        'Password changes are not available for social login accounts'
      );
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = formData;

    if (!currentPassword || !newPassword || !confirmPassword) {
      notificationManager.warning(
        'Missing Fields',
        'Please fill in all password fields'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      notificationManager.warning(
        'Password Mismatch',
        'New password and confirm password do not match'
      );
      return;
    }

    if (newPassword.length < 8) {
      notificationManager.warning(
        'Invalid Password',
        'Password must be at least 8 characters long'
      );
      return;
    }

    setIsLoading(true);
    try {
      const response = await esimApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
      });

      if (response.success) {
        notificationManager.success(
          'Success',
          'Password changed successfully'
        );
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
        navigation.goBack();
      } else {
        notificationManager.error(
          'Error',
          response.message || 'Failed to change password'
        );
      }
    } catch (error) {
      notificationManager.error(
        'Error',
        'An unexpected error occurred'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeEmail = async () => {
    const { newEmail, emailPassword } = formData;

    if (!newEmail) {
      notificationManager.warning(
        'Missing Fields',
        'Please enter a new email address'
      );
      return;
    }

    // For social login users, don't require password
    if (!isSocialLogin && !emailPassword) {
      notificationManager.warning(
        'Missing Fields',
        'Please enter your current password'
      );
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      notificationManager.warning(
        'Invalid Email',
        'Please enter a valid email address'
      );
      return;
    }

    if (newEmail === auth.userEmail) {
      notificationManager.warning(
        'Invalid Email',
        'New email must be different from current email'
      );
      return;
    }

    setIsLoading(true);
    try {
      const response = await esimApi.changeEmail({
        current_password: isSocialLogin ? '' : emailPassword,
        new_email: newEmail
      });

      if (response.success) {
        notificationManager.success(
          'Success',
          'Email changed successfully'
        );
        setFormData(prev => ({
          ...prev,
          newEmail: '',
          emailPassword: ''
        }));
        navigation.goBack();
      } else {
        notificationManager.error(
          'Error',
          response.message || 'Failed to change email'
        );
      }
    } catch (error) {
      notificationManager.error(
        'Error',
        'An unexpected error occurred'
      );
    } finally {
      setIsLoading(false);
    }
  };

 return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={[colors.background.primary, colors.background.secondary]}
        style={styles.gradient}
      />
      <View style={[styles.content, { height: height - insets.top }]}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
		  <TouchableOpacity 
			style={styles.headerIcon}
			onPress={() => {
			  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
			  navigation.goBack();
			}}
		  >
			<Ionicons name="arrow-back" size={24} color="#333" />
		  </TouchableOpacity>
		  <Text style={styles.headerTitle}>Edit Profile</Text>
		  <View style={[styles.headerIcon, { backgroundColor: 'transparent', borderWidth: 0 }]} />
		</View>

        {!isSocialLogin && (
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'password' && styles.activeTab
              ]}
              onPress={() => setActiveTab('password')}
            >
              <Ionicons
            name="lock-closed-outline"
            size={20}
            color={colors.text.secondary}
          />
              <Text style={[
                styles.tabText,
                false
              ]}>
                Change Password
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'email' && styles.activeTab
              ]}
              onPress={() => setActiveTab('email')}
            >
              <Ionicons
              name="mail-outline"
              size={20}
              color={colors.text.secondary}
            />
              <Text style={[
                styles.tabText,
                false
              ]}>
                Change Email
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView 
          style={styles.scrollContent}
          contentContainerStyle={[
            styles.scrollContentContainer,
            { paddingBottom: TAB_BAR_HEIGHT + insets.bottom }
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            {isSocialLogin ? (
              // For social login users, only show email change form
              <>
                <Text style={styles.description}>
                  Change your account email. You signed in with {auth.userEmail?.includes('@privaterelay.appleid.com') ? 'Apple' : 'Google'}, so no password verification is needed.
                </Text>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Current Email</Text>
                  <Text style={styles.currentEmail}>{auth.userEmail}</Text>
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>New Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter new email"
                    placeholderTextColor="#888"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={formData.newEmail}
                    onChangeText={(text) => handleInputChange('newEmail', text)}
                  />
                </View>


                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleChangeEmail}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>Update Email</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : activeTab === 'password' ? (
              <>
                <Text style={styles.description}>
                  Change your account password. You'll need your current password to make this change.
                </Text>
                
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Current Password</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter current password"
                      placeholderTextColor="#888"
                      secureTextEntry={!showPasswords.current}
                      value={formData.currentPassword}
                      onChangeText={(text) => handleInputChange('currentPassword', text)}
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        togglePasswordVisibility('current');
                      }}
                    >
                      <Ionicons
                        name={showPasswords.current ? "eye-off" : "eye"}
                        size={22}
                        color="#6B7280"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>New Password</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter new password"
                      placeholderTextColor="#888"
                      secureTextEntry={!showPasswords.new}
                      value={formData.newPassword}
                      onChangeText={(text) => handleInputChange('newPassword', text)}
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        togglePasswordVisibility('new');
                      }}
                    >
                      <Ionicons
                        name={showPasswords.new ? "eye-off" : "eye"}
                        size={22}
                        color="#6B7280"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Confirm New Password</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm new password"
                      placeholderTextColor="#888"
                      secureTextEntry={!showPasswords.confirm}
                      value={formData.confirmPassword}
                      onChangeText={(text) => handleInputChange('confirmPassword', text)}
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        togglePasswordVisibility('confirm');
                      }}
                    >
                      <Ionicons
                        name={showPasswords.confirm ? "eye-off" : "eye"}
                        size={22}
                        color="#6B7280"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleChangePassword}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>Update Password</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.description}>
                  Change your account email. {!isSocialLogin && "You'll need your current password to make this change."}
                </Text>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Current Email</Text>
                  <Text style={styles.currentEmail}>{auth.userEmail}</Text>
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>New Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter new email"
                    placeholderTextColor="#888"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={formData.newEmail}
                    onChangeText={(text) => handleInputChange('newEmail', text)}
                  />
                </View>

                {!isSocialLogin && (
                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>Current Password</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter current password"
                        placeholderTextColor="#888"
                        secureTextEntry={!showPasswords.email}
                        value={formData.emailPassword}
                        onChangeText={(text) => handleInputChange('emailPassword', text)}
                      />
                      <TouchableOpacity
                        style={styles.eyeIcon}
                        onPress={() => togglePasswordVisibility('email')}
                      >
                        <Ionicons
                          name={showPasswords.email ? "eye-off" : "eye"}
                          size={24}
                          color="#888"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {isSocialLogin && (
                  <View style={styles.socialLoginInfo}>
                    <Ionicons name="information-circle" size={20} color={colors.primary.DEFAULT} />
                    <Text style={styles.socialLoginText}>
                      You signed in with {auth.userEmail?.includes('@privaterelay.appleid.com') ? 'Apple' : 'Google'}. 
                      No password verification needed for email changes.
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleChangeEmail}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>Update Email</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    fontFamily: 'Quicksand-Bold',
    flex: 1,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 0,
    backgroundColor: colors.background.primary,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderBottomWidth: 2,
    borderBottomColor: colors.border.light,
    gap: 8,
  },
  activeTab: {
    borderBottomColor: '#333',
  },
  tabText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Quicksand-SemiBold',
  },
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  description: {
    color: colors.text.secondary,
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    color: colors.text.primary,
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  currentEmail: {
    color: colors.text.secondary,
    fontSize: 16,
    backgroundColor: colors.background.tertiary,
    padding: 15,
    borderRadius: 8,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 8,
    padding: 15,
    color: colors.text.primary,
    fontSize: 16,
    paddingRight: 50,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    top: 15,
  },
  button: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Quicksand-SemiBold',
  },
  disabledTab: {
    opacity: 0.5,
  },
  disabledTabText: {
    color: colors.text.tertiary,
  },
  socialLoginInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT + '20',
    gap: 12,
  },
  socialLoginText: {
    fontSize: 14,
    color: colors.text.primary,
    fontFamily: 'Quicksand-Regular',
    flex: 1,
    lineHeight: 20,
  },
});

export default EditProfileScreen;