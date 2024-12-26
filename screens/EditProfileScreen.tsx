import React, { useState, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Dimensions,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../api/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import esimApi from '../api/esimApi';
import { notificationManager } from '../components/NotificationManager';

const { height } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 84;

type TabType = 'password' | 'email';

const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const auth = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  
  const [activeTab, setActiveTab] = useState<TabType>('password');
  const [isLoading, setIsLoading] = useState(false);
  
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

  // Toggle password visibility
  const togglePasswordVisibility = useCallback((field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  }, []);

  const handleChangePassword = async () => {
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

    if (!newEmail || !emailPassword) {
      notificationManager.warning(
        'Missing Fields',
        'Please fill in all email fields'
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
        current_password: emailPassword,
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
      <View style={[styles.content, { height: height - insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Edit Profile</Text>
        </View>

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
              color={activeTab === 'password' ? '#FF6B6B' : '#888'}
            />
            <Text style={[
              styles.tabText,
              activeTab === 'password' && styles.activeTabText
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
              color={activeTab === 'email' ? '#FF6B6B' : '#888'}
            />
            <Text style={[
              styles.tabText,
              activeTab === 'email' && styles.activeTabText
            ]}>
              Change Email
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollContent}
          contentContainerStyle={[
            styles.scrollContentContainer,
            { paddingBottom: TAB_BAR_HEIGHT + insets.bottom }
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            {activeTab === 'password' ? (
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
                      onPress={() => togglePasswordVisibility('current')}
                    >
                      <Ionicons
                        name={showPasswords.current ? "eye-off" : "eye"}
                        size={24}
                        color="#888"
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
                      onPress={() => togglePasswordVisibility('new')}
                    >
                      <Ionicons
                        name={showPasswords.new ? "eye-off" : "eye"}
                        size={24}
                        color="#888"
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
                      onPress={() => togglePasswordVisibility('confirm')}
                    >
                      <Ionicons
                        name={showPasswords.confirm ? "eye-off" : "eye"}
                        size={24}
                        color="#888"
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
                  Change your account email. You'll need your current password to make this change.
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
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#1E1E1E',
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 0,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#333',
    gap: 8,
  },
  activeTab: {
    borderBottomColor: '#FF6B6B',
  },
  tabText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FF6B6B',
  },
  card: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 20,
  },
  description: {
    color: '#888',
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  currentEmail: {
    color: '#888',
    fontSize: 16,
    backgroundColor: '#1E1E1E',
    padding: 15,
    borderRadius: 8,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    padding: 15,
    color: '#FFFFFF',
    fontSize: 16,
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    top: 15,
  },
  button: {
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EditProfileScreen;