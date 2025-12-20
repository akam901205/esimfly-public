import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { newApi } from '../api/api';
import { useToast } from '../components/ToastNotification';
import { AuthContext } from '../api/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DeleteAccountScreen: React.FC = () => {
  const navigation = useNavigation();
  const toast = useToast();
  const auth = React.useContext(AuthContext);
  const insets = useSafeAreaInsets();
  
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [isSocialLogin, setIsSocialLogin] = useState(false);

  React.useEffect(() => {
    // Check if user signed in with Google/Apple
    checkLoginMethod();
  }, []);

  const checkLoginMethod = async () => {
    try {
      const authMethod = await AsyncStorage.getItem('authMethod');
      if (authMethod === 'google' || authMethod === 'apple') {
        setIsSocialLogin(true);
      }
    } catch (error) {
      console.log('Error checking login method:', error);
    }
  };

  const handleDeleteAccount = async () => {
    // Validate confirmation text
    if (confirmText.toLowerCase() !== 'delete') {
      Alert.alert('Invalid Confirmation', 'Please type DELETE to confirm account deletion');
      return;
    }

    // Validate password only for non-social login users
    if (!isSocialLogin && !password) {
      Alert.alert('Password Required', 'Please enter your password to confirm account deletion');
      return;
    }

    // Show final confirmation
    Alert.alert(
      'Final Confirmation',
      'Are you absolutely sure you want to delete your account? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

            try {
              // For non-social login users, verify password first
              if (!isSocialLogin) {
                const loginResponse = await newApi.post('/auth/login', {
                  email: auth.userEmail,
                  password: password,
                });

                if (!loginResponse.data.success) {
                  throw new Error('Invalid password');
                }
              }

              // Now delete the account
              const response = await newApi.post('/user/delete-account');

              if (response.data.success) {
                toast.success('Account deleted successfully');
                
                // Sign out and redirect to welcome screen
                await auth.signOut();
              } else {
                throw new Error(response.data.error || 'Failed to delete account');
              }
            } catch (error: any) {
              console.error('Error deleting account:', error);
              
              let errorMessage = 'Failed to delete account. Please try again.';
              if (error.message === 'Invalid password') {
                errorMessage = 'Invalid password. Please enter your correct password.';
              } else if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
              }
              
              Alert.alert('Error', errorMessage);
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 0) }]}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={[colors.background.primary, colors.background.secondary]}
        style={styles.gradient}
      />

      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerIcon}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delete Account</Text>
        <View style={[styles.headerIcon, { backgroundColor: 'transparent', borderWidth: 0 }]} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.warningCard}>
          <View style={styles.warningIconContainer}>
            <Ionicons name="warning" size={40} color="#EF4444" />
          </View>
          <Text style={styles.warningTitle}>Account Deletion Warning</Text>
          <Text style={styles.warningText}>
            Deleting your account is permanent and cannot be undone. All your data will be immediately deleted.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What will be deleted:</Text>
          <View style={styles.deleteList}>
            <View style={styles.deleteItem}>
              <Ionicons name="close-circle" size={20} color="#EF4444" />
              <Text style={styles.deleteItemText}>All your eSIMs and usage history</Text>
            </View>
            <View style={styles.deleteItem}>
              <Ionicons name="close-circle" size={20} color="#EF4444" />
              <Text style={styles.deleteItemText}>Order history and receipts</Text>
            </View>
            <View style={styles.deleteItem}>
              <Ionicons name="close-circle" size={20} color="#EF4444" />
              <Text style={styles.deleteItemText}>Account balance (if any)</Text>
            </View>
            <View style={styles.deleteItem}>
              <Ionicons name="close-circle" size={20} color="#EF4444" />
              <Text style={styles.deleteItemText}>Personal information and preferences</Text>
            </View>
            <View style={styles.deleteItem}>
              <Ionicons name="close-circle" size={20} color="#EF4444" />
              <Text style={styles.deleteItemText}>Access to the app and services</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Before you go:</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              • Make sure to use or transfer any remaining balance{'\n'}
              • Download any receipts you might need{'\n'}
              • Save any important eSIM information{'\n'}
              • This action is immediate and irreversible
            </Text>
          </View>
        </View>

        <View style={styles.confirmSection}>
          <Text style={styles.label}>Type "DELETE" to confirm</Text>
          <TextInput
            style={styles.input}
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder="Type DELETE here"
            placeholderTextColor={colors.text.secondary}
            autoCapitalize="characters"
          />

          {!isSocialLogin && (
            <>
              <Text style={[styles.label, { marginTop: 20 }]}>Enter your password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.text.secondary}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color={colors.text.secondary} 
                  />
                </TouchableOpacity>
              </View>
            </>
          )}

          {isSocialLogin && (
            <View style={styles.socialLoginInfo}>
              <Ionicons name="information-circle" size={20} color={colors.primary} />
              <Text style={styles.socialLoginText}>
                You signed in with {auth.userEmail?.includes('@privaterelay.appleid.com') ? 'Apple' : 'Google/Apple'}. 
                No password verification needed.
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.deleteButton,
            isDeleting && styles.deleteButtonDisabled,
          ]}
          onPress={handleDeleteAccount}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="trash" size={20} color="#ffffff" />
              <Text style={styles.deleteButtonText}>Delete My Account</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 5,
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
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  warningCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  warningIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#991B1B',
    fontFamily: 'Quicksand-Bold',
    marginBottom: 12,
  },
  warningText: {
    fontSize: 14,
    color: '#7F1D1D',
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'Quicksand-Regular',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
    fontFamily: 'Quicksand-SemiBold',
  },
  deleteList: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  deleteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  deleteItemText: {
    fontSize: 14,
    color: colors.text.primary,
    marginLeft: 12,
    flex: 1,
    fontFamily: 'Quicksand-Regular',
  },
  infoCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  infoText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 22,
    fontFamily: 'Quicksand-Regular',
  },
  confirmSection: {
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 8,
    fontFamily: 'Quicksand-Medium',
  },
  input: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text.primary,
    fontFamily: 'Quicksand-Regular',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: colors.text.primary,
    fontFamily: 'Quicksand-Regular',
  },
  passwordToggle: {
    padding: 16,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  deleteButtonDisabled: {
    opacity: 0.7,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Quicksand-SemiBold',
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    fontFamily: 'Quicksand-SemiBold',
  },
  socialLoginInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.primary + '20',
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

export default DeleteAccountScreen;