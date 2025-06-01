import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { resetPassword } from '../api/authApi';
import { colors } from '../theme/colors';

type RootStackParamList = {
  ResetPassword: undefined;
  Login: undefined;
};

type ResetPasswordScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ResetPassword'>;
type ResetPasswordScreenRouteProp = RouteProp<RootStackParamList, 'ResetPassword'>;

type Props = {
  navigation: ResetPasswordScreenNavigationProp;
  route: ResetPasswordScreenRouteProp;
};

const ResetPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    if (!token.trim()) {
      Alert.alert('Error', 'Please enter the reset code from your email');
      return false;
    }

    if (!password) {
      Alert.alert('Error', 'Please enter a new password');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await resetPassword(token.trim(), password);
      
      if (response.success) {
        Alert.alert(
          'Success',
          'Your password has been reset successfully.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login'),
            },
          ],
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to reset password. Please try again.');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.content}>
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={styles.backButton}
                >
                  <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
                </TouchableOpacity>

                <View style={styles.iconContainer}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="key-outline" size={40} color={colors.stone[800]} />
                  </View>
                </View>

                <Text style={styles.title}>Reset Password</Text>
                <Text style={styles.subtitle}>
                  Enter the reset code from your email and create a new password.
                </Text>
              </View>

              {/* Form */}
              <View style={styles.formContainer}>
                {/* Reset Code Input */}
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="code-outline"
                    size={20}
                    color={colors.text.secondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Reset Code"
                    placeholderTextColor={colors.text.secondary}
                    value={token}
                    onChangeText={setToken}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    selectionColor={colors.stone[800]}
                    underlineColorAndroid="transparent"
                  />
                </View>

                {/* Password Input */}
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={colors.text.secondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="New Password"
                    placeholderTextColor={colors.text.secondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    selectionColor={colors.stone[800]}
                    underlineColorAndroid="transparent"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                    disabled={isLoading}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color={colors.text.secondary}
                    />
                  </TouchableOpacity>
                </View>

                {/* Confirm Password Input */}
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={colors.text.secondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    placeholderTextColor={colors.text.secondary}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    selectionColor={colors.stone[800]}
                    underlineColorAndroid="transparent"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeIcon}
                    disabled={isLoading}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color={colors.text.secondary}
                    />
                  </TouchableOpacity>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={colors.stone[50]} />
                  ) : (
                    <Text style={styles.submitButtonText}>Reset Password</Text>
                  )}
                </TouchableOpacity>

                {/* Back to Login */}
                <View style={styles.loginContainer}>
                  <Text style={styles.loginText}>Remember your password?</Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Login')}
                    disabled={isLoading}
                  >
                    <Text style={styles.loginLink}>Sign In</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
    zIndex: 1,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.stone[800],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 12,
    fontFamily: 'Quicksand-Bold',
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 24,
    fontFamily: 'Quicksand-Regular',
  },
  formContainer: {
    flex: 1,
    marginTop: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 16,
    fontFamily: 'Quicksand-Regular',
    outlineStyle: 'none',
  },
  eyeIcon: {
    padding: 8,
  },
  submitButton: {
    backgroundColor: colors.stone[800],
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
    shadowColor: colors.stone[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: colors.stone[50],
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Quicksand-SemiBold',
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  loginText: {
    color: colors.text.secondary,
    fontSize: 14,
    marginRight: 4,
    fontFamily: 'Quicksand-Regular',
  },
  loginLink: {
    color: colors.stone[800],
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Quicksand-SemiBold',
  },
});

export default ResetPasswordScreen;