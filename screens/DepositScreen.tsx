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
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
    
    const businessEmail = balance?.business_email || 'support@esimforyou.net';
    const mailtoUrl = `mailto:${businessEmail}?subject=${subject}&body=${body}`;
    
    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        Alert.alert(
          'Contact Support',
          `Please email us at ${businessEmail} and include your email: ${userEmail}`
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        `Please contact support at ${businessEmail} and include your email: ${userEmail}`
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

        if (response.message && response.message.includes('already been redeemed')) {
          errorTitle = 'Card Already Used';
          showSupportOption = true;
        } else {
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
            case 'CARD_NOT_AUTHORIZED':
              errorTitle = 'Unauthorized Card';
              showSupportOption = true;
              break;
            default:
              showSupportOption = true;
              if (response.business_email && !errorMessage.includes('contact')) {
                errorMessage += `\n\nPlease contact support at ${response.business_email}`;
              }
              break;
          }
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
      <View style={[styles.content, { height: WINDOW_HEIGHT - insets.top }]}>
        <View style={styles.header}>
  <TouchableOpacity 
    style={[styles.headerIcon, { backgroundColor: colors.background.headerIcon }]}
    onPress={() => navigation.goBack()}
  >
    <Ionicons name="arrow-back" size={24} color={colors.icon.header} />
  </TouchableOpacity>
  <Text style={styles.headerTitle}>Add Balance</Text>
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
            <Text style={styles.balanceAmount}>
              {isLoadingBalance ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                getFormattedBalance()
              )}
            </Text>
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
              onPress={handleVerifyGiftCard}
              disabled={isLoading || giftCardNumber.length !== 6}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.verifyButtonText}>Verify & Add Balance</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={24} color="#FFB74D" />
            <Text style={styles.infoText}>
              Gift cards can only be used once and are linked to specific business accounts. 
              You must be registered under the business that issued this gift card to add the balance. 
              {lastRequestId ? `\n\nIf you need help, contact your business administrator and reference your email: ${lastRequestId}` : ''}
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
    padding: 16,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.headerIcon,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.header,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
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
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  balanceLabel: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 5,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
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
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  input: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 8,
    padding: 15,
    color: colors.text.primary,
    fontSize: 16,
    marginBottom: 20,
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  verifyButton: {
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  verifyButtonText: {
    color: colors.stone[50],
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
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
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: 8,
    padding: 15,
    marginTop: 20,
  },
  supportButtonText: {
    color: colors.stone[50],
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
});

export default DepositScreen;