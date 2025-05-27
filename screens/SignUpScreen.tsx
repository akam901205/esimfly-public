import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signUp } from '../api/authApi';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../AppNavigator';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../theme/colors';

type SignUpScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SignUp'>;

type Props = {
  navigation: SignUpScreenNavigationProp;
};

const { width } = Dimensions.get('window');

export default function SignUpScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState('');

  const handleReferralCodeChange = (code: string) => {
    setReferralCode(code.toUpperCase());
  };

  const handleSignUp = async () => {
    // Basic validation
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'All fields are required');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      // Pass name and optional referral code to signUp
      const response = await signUp(email, password, referralCode || undefined, name);
      if (response.success) {
        Alert.alert('Success', 'Account created successfully', [
          { text: 'OK', onPress: () => navigation.replace('Login') }
        ]);
      } else {
        Alert.alert('Error', response.error || response.message || 'Failed to create account');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.background.tertiary} />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sign Up</Text>
          <View style={styles.rightPlaceholder} />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Create Your Account</Text>
          <Text style={styles.subtitle}>Sign up to get started</Text>

          {/* Name Input */}
          <View style={styles.inputContainer}>
            <Icon name="person-outline" size={20} color={colors.accent.DEFAULT} style={[styles.inputIcon, { color: colors.accent.DEFAULT }]} />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor={colors.text.tertiary}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              editable={!isLoading}
            />
          </View>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Icon name="mail-outline" size={20} color={colors.accent.DEFAULT} style={[styles.inputIcon, { color: colors.accent.DEFAULT }]} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.text.tertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Icon name="lock-closed-outline" size={20} color={colors.accent.DEFAULT} style={[styles.inputIcon, { color: colors.accent.DEFAULT }]} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.text.tertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
              disabled={isLoading}
            >
              <Icon name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Icon name="lock-closed-outline" size={20} color={colors.accent.DEFAULT} style={[styles.inputIcon, { color: colors.accent.DEFAULT }]} />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor={colors.text.tertiary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={isLoading}
            >
              <Icon name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>

          {/* Referral Code Input (Optional) */}
          <View style={styles.inputContainer}>
            <Icon name="gift-outline" size={20} color={colors.accent.DEFAULT} style={[styles.inputIcon, { color: colors.accent.DEFAULT }]} />
            <TextInput
              style={styles.input}
              placeholder="Referral Code (Optional)"
              placeholderTextColor={colors.text.tertiary}
              value={referralCode}
              onChangeText={handleReferralCodeChange}
              autoCapitalize="characters"
              editable={!isLoading}
              maxLength={8}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              isLoading && styles.buttonDisabled
            ]}
            onPress={handleSignUp}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.background.primary} />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <View style={styles.signInContainer}>
            <Text style={styles.signInText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.signInLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.tertiary,
  },
  buttonDisabled: {
    backgroundColor: colors.text.tertiary,
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Quicksand',
  },
  rightPlaceholder: {
    width: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: colors.text.primary,
    fontFamily: 'Quicksand',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: colors.text.secondary,
    fontFamily: 'Quicksand',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 40,
    color: colors.text.primary,
    fontSize: 16,
    fontFamily: 'Quicksand',
  },
  eyeIcon: {
    padding: 10,
  },
  button: {
    backgroundColor: colors.primary.DEFAULT,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: colors.background.primary,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Quicksand',
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  signInText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontFamily: 'Quicksand',
  },
  signInLink: {
    color: colors.primary.DEFAULT,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Quicksand',
  },
});