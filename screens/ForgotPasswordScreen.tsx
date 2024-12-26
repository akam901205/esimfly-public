import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../AppNavigator';
import Icon from 'react-native-vector-icons/Ionicons';
import LottieView from 'lottie-react-native';

type ForgotPasswordScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;

type Props = {
  navigation: ForgotPasswordScreenNavigationProp;
};

const { width } = Dimensions.get('window');

// Animation size configuration
const ANIMATION_SIZE_MULTIPLIER = 0.48; // 40% of screen width
const ANIMATION_CONTAINER_MARGIN = 10;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', content: '' });

  const handleResetPassword = async () => {
    if (!email) {
      showMessage('error', 'Please enter your email address.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('https://esimfly.net/pages/auth/send_reset_link.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `email=${encodeURIComponent(email)}&is_mobile=true`,
      });

      const data = await response.json();

      if (data.success) {
        showMessage('success', 'Password reset instructions sent to your email.');
        setTimeout(() => navigation.navigate('ResetPassword', { email }), 2000);
      } else {
        showMessage('error', data.error || 'Failed to send reset instructions');
      }
    } catch (error) {
      console.error('Error:', error);
      showMessage('error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const showMessage = (type: string, content: string) => {
    setMessage({ type, content });
    setTimeout(() => setMessage({ type: '', content: '' }), 3000);
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#1E1E1E" />
      <SafeAreaView style={styles.container}>
        {/* Header stays outside of KeyboardAvoidingView */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Forgot Password</Text>
          <View style={styles.rightPlaceholder} />
        </View>

        {/* Wrap content in KeyboardAvoidingView */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              bounces={false}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.content}>
                <View style={styles.animationContainer}>
                  <LottieView
                    source={require('../assets/animations/forgot_password.json')}
                    autoPlay
                    loop
                    style={styles.animation}
                    speed={1}
                  />
                </View>

                <Text style={styles.title}>Reset Your Password</Text>
                <Text style={styles.description}>
                  Enter your email address and we'll send you instructions to reset your password.
                </Text>
                
                <View style={styles.inputContainer}>
                  <Icon name="mail-outline" size={20} color="#FF6347" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#888888"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="send"
                    onSubmitEditing={handleResetPassword}
                  />
                </View>
                
                <TouchableOpacity 
                  style={styles.button} 
                  onPress={handleResetPassword} 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>Send Reset Instructions</Text>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.linkText}>Back to Sign In</Text>
                </TouchableOpacity>

                {message.content ? (
                  <View style={[styles.messageContainer, message.type === 'error' ? styles.errorContainer : styles.successContainer]}>
                    <Text style={styles.messageText}>{message.content}</Text>
                  </View>
                ) : null}
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Quicksand',
  },
  rightPlaceholder: {
    width: 40,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    // Add minimum height to ensure proper scrolling on smaller screens
    minHeight: '100%',
  },
  animationContainer: {
    alignItems: 'center',
    marginBottom: ANIMATION_CONTAINER_MARGIN,
  },
  animation: {
    width: width * ANIMATION_SIZE_MULTIPLIER,
    height: width * ANIMATION_SIZE_MULTIPLIER,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#888888',
    fontFamily: 'Quicksand',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 40,
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Quicksand',
  },
  button: {
    backgroundColor: '#FF6347',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Quicksand',
  },
  linkText: {
    textAlign: 'center',
    color: '#888888',
    fontSize: 14,
    marginTop: 20,
    fontFamily: 'Quicksand',
  },
  messageContainer: {
    padding: 10,
    borderRadius: 5,
    marginTop: 20,
    alignItems: 'center',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
  },
  successContainer: {
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
  },
  messageText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Quicksand',
  },
});