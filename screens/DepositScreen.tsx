import React, { useState, useEffect, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Platform,
  Linking,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { AuthContext } from '../api/AuthContext';
import { EventEmitter } from '../utils/EventEmitter';
import esimApi from '../api/esimApi';
import type { BalanceData } from '../api/esimApi';
import { colors } from '../theme/colors';


const TAB_BAR_HEIGHT = 84;
const WINDOW_HEIGHT = Dimensions.get('window').height;

interface ErrorLog {
  timestamp: string;
  errorCode?: string;
  userEmail?: string;
  message: string;
  cardNumber: string;
}

const DepositScreen: React.FC = () => {
  const [giftCardNumber, setGiftCardNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const auth = useContext(AuthContext);

  if (!auth) return null;

  const { userEmail } = auth;

  const getFormattedBalance = () => {
    if (isLoadingBalance) return 'Loading...';
    if (!balance?.balance) return '$0.00';
    return `$${Number(balance.balance).toFixed(2)}`;
  };

  const logError = (error: ErrorLog) => {
    setErrorLogs(prev => [...prev, {
      ...error,
      userEmail
    }]);
  };

  const contactSupport = async () => {
    if (!userEmail) return;

    const subject = encodeURIComponent('Gift Card Verification Issue');
    const body = encodeURIComponent(
      `User Email: ${userEmail}\n` +
      `Gift Card Number: ${giftCardNumber}\n` +
      `Platform: ${Platform.OS}\n` +
      `Version: ${Platform.Version}\n` +
      `\nPlease describe your issue below:\n`
    );
    
    const supportEmail = 'support@esimfly.net';
    const mailtoUrl = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
    
    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        Alert.alert(
          'Contact Support',
          `Please email us at ${supportEmail} and include your email: ${userEmail}`
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        `Please contact support at ${supportEmail} and include your email: ${userEmail}`
      );
    }
  };

  const fetchUserBalance = async () => {
    try {
      const response = await esimApi.fetchBalance();
      if (response.success && response.data) {
        setBalance(response.data);
        
        // Dispatch balance update event
        EventEmitter.dispatch('BALANCE_UPDATED', {
          balance: response.data.balance,
          currency: response.data.currency || 'USD'
        });
      } else {
        logError({
          timestamp: new Date().toISOString(),
          message: response.message || 'Failed to fetch balance',
          cardNumber: '',
        });
      }
    } catch (error) {
      logError({
        timestamp: new Date().toISOString(),
        message: 'Error fetching balance',
        cardNumber: '',
      });
    } finally {
      setIsLoadingBalance(false);
    }
  };

  useEffect(() => {
    fetchUserBalance();
  }, []);

  const handleVerifyGiftCard = async () => {
    if (!userEmail) {
      Alert.alert('Error', 'Unable to verify user information. Please try again later.');
      return;
    }

    if (giftCardNumber.length !== 6) {
      Alert.alert('Invalid Input', 'Gift card number must be exactly 6 digits');
      return;
    }

    setIsLoading(true);
    try {
      const response = await esimApi.verifyGiftCard(giftCardNumber);
      console.log('Gift card verification response:', response);
      
      if (response.success && response.data?.amount) {
	  // First fetch the updated balance
	  const balanceResponse = await esimApi.fetchBalance();

	  if (balanceResponse.success && balanceResponse.data) {
		setBalance(balanceResponse.data);

		// Dispatch the total balance, not just the added amount
		EventEmitter.dispatch('BALANCE_UPDATED', {
		  balance: balanceResponse.data.balance, // This is the total balance
		  currency: balanceResponse.data.currency || 'USD'
		});
	  }

	  Alert.alert(
		'Success', 
		`Balance of $${Number(response.data.amount).toFixed(2)} has been added to your account`,
		[{ text: 'OK', onPress: () => navigation.goBack() }]
	  );
      } else {
        setLastRequestId(userEmail);

        logError({
          timestamp: new Date().toISOString(),
          errorCode: response.error_code,
          message: response.message || 'Verification failed',
          cardNumber: giftCardNumber
        });

        let errorTitle = 'Verification Failed';
        let errorMessage = response.message || 'Failed to verify gift card';
        let showSupportOption = false;

        switch (response.error_code) {
          case 'CARD_NUMBER_MISSING':
            errorTitle = 'Invalid Input';
            errorMessage = 'Please enter a gift card number';
            break;
          case 'INVALID_CARD_FORMAT':
            errorTitle = 'Invalid Format';
            errorMessage = 'Gift card number must be exactly 6 digits';
            break;
          case 'CARD_NOT_FOUND':
            errorTitle = 'Invalid Card';
            errorMessage = 'This gift card number does not exist';
            break;
          case 'CARD_ALREADY_USED':
            errorTitle = 'Card Already Used';
            errorMessage = 'This gift card has already been redeemed';
            showSupportOption = true;
            break;
          case 'INSUFFICIENT_BALANCE':
            errorTitle = 'No Balance';
            errorMessage = 'This gift card has no remaining balance';
            break;
          default:
            errorTitle = 'Error';
            showSupportOption = true;
            break;
        }

        Alert.alert(
          errorTitle,
          errorMessage,
          showSupportOption ? 
            [
              { text: 'Contact Support', onPress: contactSupport },
              { text: 'OK', style: 'cancel' }
            ] :
            [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error in handleVerifyGiftCard:', error);
      setLastRequestId(userEmail);

      logError({
        timestamp: new Date().toISOString(),
        message: 'Unexpected error during verification',
        cardNumber: giftCardNumber
      });
      
      Alert.alert(
        'Error',
        'An unexpected error occurred. Would you like to contact support?',
        [
          { text: 'Contact Support', onPress: contactSupport },
          { text: 'Cancel', style: 'cancel' }
        ]
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
      <View style={[styles.content, { height: WINDOW_HEIGHT - insets.top }]}>
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
  <Text style={styles.headerTitle}>Redeem Gift Card</Text>
  <View style={[styles.headerIcon, { backgroundColor: 'transparent', borderWidth: 0 }]} />
</View>

        <ScrollView 
          style={styles.scrollContent}
          contentContainerStyle={[
            styles.scrollContentContainer,
            { paddingBottom: TAB_BAR_HEIGHT + insets.bottom }
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            {isLoadingBalance ? (
              <ActivityIndicator color="#333" size="small" />
            ) : (
              <Text style={styles.balanceAmount}>{getFormattedBalance()}</Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Enter Gift Card Number</Text>
            <TextInput
			  style={styles.input}
			  value={giftCardNumber}
			  onChangeText={text => setGiftCardNumber(text.replace(/[^0-9]/g, ''))}
			  placeholder="Enter 6-digit code"
			  placeholderTextColor={colors.text.secondary}
			  keyboardType="number-pad"
			  maxLength={6}
			  autoCapitalize="none"
			  autoCorrect={false}
			/>
            <TouchableOpacity 
              style={[
                styles.verifyButton,
                { opacity: isLoading || giftCardNumber.length !== 6 ? 0.7 : 1 }
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                handleVerifyGiftCard();
              }}
              disabled={isLoading || giftCardNumber.length !== 6}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.verifyButtonText}>Redeem Gift Card</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={24} color="#FFB74D" />
            <Text style={styles.infoText}>
              Gift cards can only be used once. Enter your 6-digit gift card code to add the balance to your account.
            </Text>
          </View>

          {errorLogs.length > 0 && (
            <TouchableOpacity 
              style={styles.supportButton}
              onPress={contactSupport}
            >
              <Ionicons name="mail-outline" size={20} color="#FFFFFF" />
              <Text style={styles.supportButtonText}>Contact Support</Text>
            </TouchableOpacity>
          )}
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
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 20,
  },
  balanceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  balanceLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'Quicksand-Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  label: {
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: 10,
    fontFamily: 'Quicksand-Medium',
  },
  input: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    padding: 15,
    color: colors.text.primary,
    fontSize: 16,
    marginBottom: 20,
    letterSpacing: 2,
    fontFamily: 'Quicksand-Regular',
  },
  verifyButton: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Quicksand-SemiBold',
  },
  infoCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  infoText: {
    color: colors.text.secondary,
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
    fontFamily: 'Quicksand-Regular',
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 15,
    marginTop: 20,
  },
  supportButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: 'Quicksand-SemiBold',
  },
});

export default DepositScreen;