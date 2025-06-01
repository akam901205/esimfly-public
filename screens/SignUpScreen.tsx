import React, { useState, useRef } from 'react';
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
  Dimensions,
  Keyboard,
  TouchableWithoutFeedback,
  StatusBar,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { signUp } from '../api/authApi';
import { colors } from '../theme/colors';

type RootStackParamList = {
  SignUp: undefined;
  Login: undefined;
};

type SignUpScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SignUp'>;
type SignUpScreenRouteProp = RouteProp<RootStackParamList, 'SignUp'>;

type Props = {
  navigation: SignUpScreenNavigationProp;
  route: SignUpScreenRouteProp;
};

const { width } = Dimensions.get('window');

const SignUpScreen: React.FC<Props> = ({ navigation }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  
  // Input refs for focus management
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const referralRef = useRef<TextInput>(null);

  // Validation states
  const [validationErrors, setValidationErrors] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    let errors = {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    };
    let isValid = true;

    if (!fullName.trim()) {
      errors.fullName = 'Full name is required';
      isValid = false;
    }

    if (!email.trim()) {
      errors.email = 'Email is required';
      isValid = false;
    } else if (!validateEmail(email)) {
      errors.email = 'Please enter a valid email';
      isValid = false;
    }

    if (!password) {
      errors.password = 'Password is required';
      isValid = false;
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setValidationErrors(errors);

    if (!isValid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    return isValid;
  };

  const handleSignUp = async () => {
    Keyboard.dismiss();
    
    if (!validateForm()) {
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    try {
      const response = await signUp(email, password, referralCode || undefined, fullName);
      
      if (response.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Success',
          'Your account has been created successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login'),
            },
          ],
        );
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Sign Up Failed', response.message || 'An error occurred during sign up.');
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderInputField = (
    placeholder: string,
    value: string,
    onChangeText: (text: string) => void,
    icon: keyof typeof Ionicons.glyphMap,
    ref?: React.RefObject<TextInput>,
    nextRef?: React.RefObject<TextInput>,
    secureTextEntry?: boolean,
    showToggle?: boolean,
    onToggle?: () => void,
    error?: string,
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters',
    keyboardType?: 'default' | 'email-address',
    maxLength?: number,
  ) => {
    const isFocused = focusedInput === placeholder;
    const hasError = !!error;
    
    return (
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          hasError && styles.inputContainerError,
        ]}
      >
        <View style={styles.inputWrapper}>
          <Ionicons
            name={icon}
            size={20}
            color={hasError ? '#ef4444' : isFocused ? colors.stone[800] : colors.text.secondary}
            style={styles.inputIcon}
          />
          <TextInput
            ref={ref}
            style={[styles.input, hasError && styles.inputError]}
            placeholder={placeholder}
            placeholderTextColor={colors.text.secondary}
            value={value}
            onChangeText={(text) => {
              onChangeText(text);
              if (error) {
                setValidationErrors(prev => ({ ...prev, [placeholder.toLowerCase().replace(' ', '')]: '' }));
              }
            }}
            secureTextEntry={secureTextEntry}
            autoCapitalize={autoCapitalize}
            keyboardType={keyboardType}
            maxLength={maxLength}
            onFocus={() => {
              setFocusedInput(placeholder);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            onBlur={() => setFocusedInput(null)}
            onSubmitEditing={() => nextRef?.current?.focus()}
            returnKeyType={nextRef ? 'next' : 'done'}
            editable={!isLoading}
            selectionColor={colors.stone[800]}
            underlineColorAndroid="transparent"
            autoCorrect={false}
          />
          {showToggle && (
            <TouchableOpacity
              onPress={() => {
                onToggle?.();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={styles.eyeIcon}
              disabled={isLoading}
            >
              <Ionicons
                name={secureTextEntry ? 'eye-off' : 'eye'}
                size={20}
                color={colors.text.secondary}
              />
            </TouchableOpacity>
          )}
        </View>
        {hasError && (
          <View>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={[colors.background.primary, colors.background.secondary]}
          style={styles.gradient}
        />
        
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
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    navigation.goBack();
                  }}
                  style={styles.backButton}
                >
                  <BlurView intensity={20} style={styles.backButtonBlur}>
                    <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
                  </BlurView>
                </TouchableOpacity>
                
                <View style={styles.logoContainer}>
                  <View style={styles.logoCircle}>
                    <Ionicons name="person-add" size={40} color={colors.stone[800]} />
                  </View>
                </View>
                
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Join us to start your journey</Text>
              </View>

              {/* Form */}
              <View style={styles.formContainer}>
                {renderInputField(
                  'Full Name',
                  fullName,
                  setFullName,
                  'person-outline',
                  undefined,
                  emailRef,
                  false,
                  false,
                  undefined,
                  validationErrors.fullName,
                  'words',
                )}

                {renderInputField(
                  'Email',
                  email,
                  setEmail,
                  'mail-outline',
                  emailRef,
                  passwordRef,
                  false,
                  false,
                  undefined,
                  validationErrors.email,
                  'none',
                  'email-address',
                )}

                {renderInputField(
                  'Password',
                  password,
                  setPassword,
                  'lock-closed-outline',
                  passwordRef,
                  confirmPasswordRef,
                  !showPassword,
                  true,
                  () => setShowPassword(!showPassword),
                  validationErrors.password,
                  'none',
                )}

                {renderInputField(
                  'Confirm Password',
                  confirmPassword,
                  setConfirmPassword,
                  'lock-closed-outline',
                  confirmPasswordRef,
                  referralRef,
                  !showConfirmPassword,
                  true,
                  () => setShowConfirmPassword(!showConfirmPassword),
                  validationErrors.confirmPassword,
                  'none',
                )}

                {renderInputField(
                  'Referral Code (Optional)',
                  referralCode,
                  (text) => setReferralCode(text.toUpperCase()),
                  'gift-outline',
                  referralRef,
                  undefined,
                  false,
                  false,
                  undefined,
                  '',
                  'characters',
                  'default',
                  8,
                )}

                {/* Sign Up Button */}
                <TouchableOpacity
                  style={[styles.signUpButton, isLoading && styles.signUpButtonDisabled]}
                  onPress={handleSignUp}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={colors.stone[50]} />
                  ) : (
                    <Text style={styles.signUpButtonText}>Create Account</Text>
                  )}
                </TouchableOpacity>

                {/* Login Link */}
                <View style={styles.loginContainer}>
                  <Text style={styles.loginText}>Already have an account?</Text>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      navigation.navigate('Login');
                    }}
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
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
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
    zIndex: 1,
  },
  backButtonBlur: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
    fontFamily: 'Quicksand-Bold',
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    fontFamily: 'Quicksand-Regular',
  },
  formContainer: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
    borderRadius: 12,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputContainerFocused: {
    borderColor: colors.stone[800],
    borderWidth: 2,
    shadowColor: colors.stone[800],
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  inputContainerError: {
    borderColor: '#ef4444',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    color: colors.text.primary,
    fontSize: 16,
    fontFamily: 'Quicksand-Regular',
    outlineStyle: 'none',
  },
  inputError: {
    color: '#ef4444',
  },
  eyeIcon: {
    padding: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 16,
    marginBottom: 4,
    fontFamily: 'Quicksand-Regular',
  },
  signUpButton: {
    backgroundColor: colors.stone[800],
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 24,
    shadowColor: colors.stone[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  signUpButtonDisabled: {
    opacity: 0.7,
  },
  signUpButtonText: {
    color: colors.stone[50],
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Quicksand-SemiBold',
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
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

export default SignUpScreen;