import { useState, useRef, useCallback } from 'react';
import { useStripe } from '@stripe/stripe-react-native';
import esimApi from '../api/esimApi';

interface UsePaymentSheetOptions {
  amount: number;
  currency?: string;
  metadata?: Record<string, any>;
}

export const usePaymentSheet = () => {
  const { initPaymentSheet, presentPaymentSheet, resetPaymentSheetCustomer } = useStripe();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const currentPaymentIntentRef = useRef<string | null>(null);
  const currentClientSecretRef = useRef<string | null>(null);

  const initialize = useCallback(async (options: UsePaymentSheetOptions) => {
    // Prevent double initialization
    if (isInitializing || isInitialized) {
      console.log('Payment sheet already initialized or initializing');
      return {
        success: true,
        paymentIntentId: currentPaymentIntentRef.current,
        clientSecret: currentClientSecretRef.current
      };
    }

    setIsInitializing(true);
    
    try {
      // Reset any existing state
      if (resetPaymentSheetCustomer) {
        await resetPaymentSheetCustomer();
      }
      
      // Create payment intent
      const response = await esimApi.createPaymentIntent({
        amount: options.amount,
        currency: options.currency || 'usd',
        metadata: options.metadata || {},
        payment_method_types: ['card']
      });

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to create payment intent');
      }

      const clientSecret = response.data.clientSecret || response.data.client_secret;
      const paymentIntentId = response.data.id;

      if (!clientSecret) {
        throw new Error('No client secret received');
      }

      // Initialize payment sheet
      const { error } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'eSimFly',
        returnURL: 'esimfly://checkout',
        defaultBillingDetails: {
          address: { country: 'hk' }
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      // Store references
      currentPaymentIntentRef.current = paymentIntentId;
      currentClientSecretRef.current = clientSecret;
      
      setIsInitialized(true);
      
      return {
        success: true,
        paymentIntentId,
        clientSecret
      };
    } catch (error: any) {
      console.error('Payment sheet initialization error:', error);
      return {
        success: false,
        error: error.message || 'Failed to initialize payment'
      };
    } finally {
      setIsInitializing(false);
    }
  }, [initPaymentSheet, resetPaymentSheetCustomer, isInitialized, isInitializing]);

  const present = useCallback(async () => {
    if (!isInitialized) {
      throw new Error('Payment sheet not initialized');
    }

    const { error } = await presentPaymentSheet();
    
    if (error) {
      return {
        success: false,
        error: error.message,
        cancelled: error.code === 'Canceled'
      };
    }

    return {
      success: true,
      paymentIntentId: currentPaymentIntentRef.current
    };
  }, [presentPaymentSheet, isInitialized]);

  const reset = useCallback(() => {
    setIsInitialized(false);
    setIsInitializing(false);
    currentPaymentIntentRef.current = null;
    currentClientSecretRef.current = null;
  }, []);

  return {
    initialize,
    present,
    reset,
    isInitialized,
    isInitializing,
    paymentIntentId: currentPaymentIntentRef.current
  };
};