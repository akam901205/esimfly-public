import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Animated,
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

type ResetPasswordScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ResetPassword'>;

type Props = {
  navigation: ResetPasswordScreenNavigationProp;
  route: { params: { email: string } };
};

const { width } = Dimensions.get('window');

// Animation size configuration
const ANIMATION_SIZE_MULTIPLIER = 0.4; // 40% of screen width
const ANIMATION_CONTAINER_MARGIN = 10;

export default function ResetPasswordScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const [resetKey, setResetKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', content: '' });
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleResetKeyChange = (text: string) => {
    const cleanedText = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    let formattedText = '';
    for (let i = 0; i < cleanedText.length; i++) {
      if (i > 0 && i % 6 === 0) {
        formattedText += '-';
      }
      formattedText += cleanedText[i];
    }
    setResetKey(formattedText);
  };

  const handleResetPassword = async () => {
    if (!resetKey || !newPassword || !confirmPassword) {
      showMessage('error', 'Please fill in all fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showMessage('error', 'Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('https://esimfly.net/pages/auth/process_reset_password.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `token=${encodeURIComponent(resetKey)}&password=${encodeURIComponent(newPassword)}&confirm_password=${encodeURIComponent(confirmPassword)}`,
      });

      const data = await response.json();

      if (data.success) {
        showMessage('success', 'Password reset successfully.');
        setTimeout(() => navigation.navigate('Login'), 2000);
      } else {
        showMessage('error', data.error || 'Failed to reset password');
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
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reset Password</Text>
          <View style={styles.rightPlaceholder} />
        </View>

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
              <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                <View style={styles.animationContainer}>
                  <LottieView
                    source={require('../assets/animations/verification_code.json')}
                    autoPlay
                    loop
                    style={styles.animation}
                    speed={1}
                  />
                </View>

                <Text style={styles.title}>Set New Password</Text>
                <Text style={styles.description}>
                  Enter the reset key sent to your email and your new password.
                </Text>
                
                <View style={styles.inputContainer}>
                  <Icon name="key-outline" size={20} color="#FF6347" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="XXXXXX-XXXXXX-XXXXXX"
                    placeholderTextColor="#888888"
                    value={resetKey}
                    onChangeText={handleResetKeyChange}
                    maxLength={20}
                    autoCapitalize="characters"
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Icon name="lock-closed-outline" size={20} color="#FF6347" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="New Password"
                    placeholderTextColor="#888888"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Icon name="lock-closed-outline" size={20} color="#FF6347" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm New Password"
                    placeholderTextColor="#888888"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    returnKeyType="done"
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
                    <Text style={styles.buttonText}>Reset Password</Text>
                  )}
                </TouchableOpacity>
                
                {message.content ? (
                  <View style={[styles.messageContainer, message.type === 'error' ? styles.errorContainer : styles.successContainer]}>
                    <Text style={styles.messageText}>{message.content}</Text>
                  </View>
                ) : null}
              </Animated.View>
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