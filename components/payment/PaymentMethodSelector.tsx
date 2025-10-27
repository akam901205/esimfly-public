import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { PaymentButton } from './PaymentButton';
import { PayTabsButton } from './PayTabsButton';

interface PaymentMethodSelectorProps {
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
  onPaymentSuccess: (paymentData: any) => void;
  onPaymentError: (error: string) => void;
  onPaymentCancelled?: () => void;
  disabled?: boolean;
  isTopup?: boolean;
  esimId?: number;
  provider?: string;
  promoDetails?: any;
  userLocation?: string; // User's country or region
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  items,
  onPaymentSuccess,
  onPaymentError,
  onPaymentCancelled,
  disabled = false,
  isTopup = false,
  esimId,
  provider,
  promoDetails,
  userLocation,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'stripe' | 'paytabs' | null>(null);

  const totalAmountUSD = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalAmountIQD = Math.round(totalAmountUSD * 1320); // Approximate USD to IQD conversion

  // Determine if user is in Iraq or prefers IQD
  const isIraqiUser = userLocation === 'IQ' || userLocation === 'Iraq';
  const showPayTabs = Platform.OS !== 'web'; // PayTabs only works on mobile

  const handleStripeSuccess = (paymentIntent: any) => {
    onPaymentSuccess({
      method: 'stripe',
      paymentIntent,
      amount: totalAmountUSD,
      currency: 'USD'
    });
  };

  const handlePayTabsSuccess = (orderReference: string) => {
    onPaymentSuccess({
      method: 'paytabs',
      orderReference,
      amount: totalAmountIQD,
      currency: 'IQD'
    });
  };

  const handleStripeError = (error: Error) => {
    onPaymentError(`Stripe payment failed: ${error.message}`);
  };

  const handlePayTabsError = (error: string) => {
    onPaymentError(`Card payment failed: ${error}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Payment Method</Text>

      {/* Stripe Payment (USD) */}
      <View style={styles.paymentSection}>
        <Text style={styles.sectionTitle}>International Payment</Text>
        <Text style={styles.sectionDescription}>
          Pay with Apple Pay, Google Pay, or Credit Card in USD
        </Text>
        <PaymentButton
          amount={totalAmountUSD}
          onPaymentSuccess={handleStripeSuccess}
          onPaymentError={handleStripeError}
          disabled={disabled}
        />
      </View>

      {/* PayTabs Payment (IQD) - Only show on mobile and if relevant */}
      {showPayTabs && (
        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>
            Iraq Payment {isIraqiUser && <Text style={styles.recommended}>(Recommended)</Text>}
          </Text>
          <Text style={styles.sectionDescription}>
            Pay with Credit/Debit Card in Iraqi Dinar (IQD)
          </Text>
          <PayTabsButton
            items={items.map(item => ({
              ...item,
              price: Math.round(item.price * 1320) // Convert to IQD
            }))}
            onPaymentSuccess={handlePayTabsSuccess}
            onPaymentError={handlePayTabsError}
            onPaymentCancelled={onPaymentCancelled}
            disabled={disabled}
            isTopup={isTopup}
            esimId={esimId}
            provider={provider}
            promoDetails={promoDetails}
          />
        </View>
      )}

      <View style={styles.priceComparison}>
        <Text style={styles.comparisonTitle}>Price Comparison:</Text>
        <Text style={styles.comparisonText}>
          International: ${totalAmountUSD.toFixed(2)} USD
        </Text>
        {showPayTabs && (
          <Text style={styles.comparisonText}>
            Iraq: {totalAmountIQD.toLocaleString()} IQD
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  paymentSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  recommended: {
    color: '#28a745',
    fontSize: 14,
    fontWeight: 'normal',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 12,
    lineHeight: 20,
  },
  priceComparison: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  comparisonTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  comparisonText: {
    fontSize: 13,
    color: '#1976d2',
    lineHeight: 18,
  },
});