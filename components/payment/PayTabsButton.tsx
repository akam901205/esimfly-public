import React from 'react';
import { Platform, StyleSheet, Pressable, Text, View, ActivityIndicator } from 'react-native';
import { usePayTabs } from '../../hooks/usePayTabs';

interface PayTabsButtonProps {
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    data_amount?: number;
    duration?: number;
    flag_url?: string;
    metadata?: any;
  }>;
  onPaymentSuccess: (orderReference: string) => void;
  onPaymentError: (error: string) => void;
  onPaymentCancelled?: () => void;
  disabled?: boolean;
  isTopup?: boolean;
  esimId?: number;
  provider?: string;
  promoDetails?: any;
  buttonText?: string;
}

export const PayTabsButton: React.FC<PayTabsButtonProps> = ({
  items,
  onPaymentSuccess,
  onPaymentError,
  onPaymentCancelled,
  disabled = false,
  isTopup = false,
  esimId,
  provider,
  promoDetails,
  buttonText = 'Pay with Card (IQD)',
}) => {
  const { processPayment, isProcessing, showPaymentAlert } = usePayTabs();

  // Only show PayTabs button on mobile platforms (not web)
  if (Platform.OS === 'web') {
    return null;
  }

  const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handlePayTabsPress = async () => {
    try {
      const result = await processPayment({
        items,
        isTopup,
        esimId,
        provider,
        promoDetails,
      });

      if (result.success && result.orderReference) {
        // Show success alert and handle success callback
        showPaymentAlert(
          result,
          () => onPaymentSuccess(result.orderReference!),
          () => onPaymentError(result.error || 'Payment failed')
        );
      } else if (result.cancelled) {
        // Handle cancellation
        showPaymentAlert(
          result,
          undefined,
          onPaymentCancelled
        );
      } else {
        // Handle error
        showPaymentAlert(
          result,
          undefined,
          () => onPaymentError(result.error || 'Payment failed')
        );
      }
    } catch (error: any) {
      console.error('PayTabs button error:', error);
      onPaymentError(error.message || 'Payment processing failed');
    }
  };

  return (
    <Pressable
      style={[styles.button, disabled && styles.disabled]}
      onPress={handlePayTabsPress}
      disabled={disabled || isProcessing}
    >
      <View style={styles.buttonContent}>
        {isProcessing && (
          <ActivityIndicator
            size="small"
            color="#fff"
            style={styles.loadingIndicator}
          />
        )}
        <Text style={styles.buttonText}>
          {isProcessing ? 'Processing...' : `${buttonText} (${totalAmount.toLocaleString()} IQD)`}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF', // PayTabs blue color
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    minHeight: 56,
  },
  disabled: {
    opacity: 0.5,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingIndicator: {
    marginRight: 8,
  },
});