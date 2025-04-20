// components/payment/PaymentButton.tsx
import React from 'react';
import { Platform, StyleSheet, Pressable, Text } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';

interface PaymentButtonProps {
  amount: number;
  onPaymentSuccess: (paymentIntent: any) => void;
  onPaymentError: (error: Error) => void;
  disabled?: boolean;
}

export const PaymentButton: React.FC<PaymentButtonProps> = ({
  amount,
  onPaymentSuccess,
  onPaymentError,
  disabled = false,
}) => {
  const stripe = useStripe();
  const [loading, setLoading] = React.useState(false);

  const isNativePayAvailable = async () => {
    if (Platform.OS === 'ios') {
      const isApplePaySupported = await stripe.isApplePaySupported();
      return isApplePaySupported;
    } else {
      const { error, isSupported } = await stripe.initGooglePay({
        testEnv: __DEV__, // Use test environment for development
        merchantName: 'eSimFly',
        countryCode: 'US',
        billingAddressConfig: {
          format: 'FULL',
          isPhoneNumberRequired: true,
          isRequired: true,
        },
      });
      return isSupported && !error;
    }
  };

  const handleNativePayPress = async () => {
    try {
      setLoading(true);
      
      if (Platform.OS === 'ios') {
        const { error: presentError } = await stripe.presentApplePay({
          cartItems: [
            {
              label: 'eSIM Package',
              amount: amount.toString(),
            },
          ],
          country: 'US',
          currency: 'USD',
        });

        if (presentError) {
          throw presentError;
        }

        // After user confirms payment
        const { error: confirmError, paymentIntent } = await stripe.confirmApplePayPayment(
          'your_client_secret_here'
        );

        if (confirmError) {
          throw confirmError;
        }

        onPaymentSuccess(paymentIntent);
      } else {
        const { error: paymentError, paymentIntent } = await stripe.initGooglePay({
          amount,
          currencyCode: 'USD',
        });

        if (paymentError) {
          throw paymentError;
        }

        onPaymentSuccess(paymentIntent);
      }
    } catch (error) {
      onPaymentError(error as Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      style={[styles.button, disabled && styles.disabled]}
      onPress={handleNativePayPress}
      disabled={disabled || loading}
    >
      <Text style={styles.buttonText}>
        {Platform.OS === 'ios' ? 'Pay with Apple Pay' : 'Pay with Google Pay'}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
