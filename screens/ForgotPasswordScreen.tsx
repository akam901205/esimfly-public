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
import { forgotPassword } from '../api/authApi';
import { colors } from '../theme/colors';

type RootStackParamList = {
  ForgotPassword: undefined;
  ResetPassword: undefined;
  Login: undefined;
};

type ForgotPasswordScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;
type ForgotPasswordScreenRouteProp = RouteProp<RootStackParamList, 'ForgotPassword'>;

type Props = {
  navigation: ForgotPasswordScreenNavigationProp;
  route: ForgotPasswordScreenRouteProp;
};

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();

    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const response = await forgotPassword(email);
      
      if (response.success) {
        Alert.alert(
          'Success',
          'Password reset instructions have been sent to your email address.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('ResetPassword'),
            },
          ],
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to send reset email. Please try again.');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
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
                    <Ionicons name="lock-closed-outline" size={40} color={colors.stone[800]} />
                  </View>
                </View>

                <Text style={styles.title}>Forgot Password?</Text>
                <Text style={styles.subtitle}>
                  Enter your email address and we'll send you instructions to reset your password.
                </Text>
              </View>

              {/* Form */}
              <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={colors.text.secondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Email Address"
                    placeholderTextColor={colors.text.secondary}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    selectionColor={colors.stone[800]}
                    underlineColorAndroid="transparent"
                  />
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
                    <Text style={styles.submitButtonText}>Send Reset Instructions</Text>
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
    marginBottom: 24,
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
  submitButton: {
    backgroundColor: colors.stone[800],
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
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

export default ForgotPasswordScreen;