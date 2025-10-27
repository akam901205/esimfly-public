import { useState, useRef, useCallback, useContext } from 'react';
import { Alert, Platform } from 'react-native';
import PayTabsService, { defaultPayTabsConfig, PayTabsPaymentData } from '../services/PayTabsService';
import esimApi from '../api/esimApi';
import { AuthContext } from '../api/AuthContext';

interface UsePayTabsOptions {
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
  isTopup?: boolean;
  esimId?: number;
  provider?: string;
  promoDetails?: any;
}

interface PayTabsResult {
  success: boolean;
  orderReference?: string;
  error?: string;
  cancelled?: boolean;
  details?: {
    responseCode?: string;
    responseMessage?: string;
    cardScheme?: string;
    cardType?: string;
  };
}

export const usePayTabs = () => {
  const auth = useContext(AuthContext);
  const [isProcessing, setIsProcessing] = useState(false);
  const payTabsServiceRef = useRef<PayTabsService | null>(null);
  const currentOrderRefRef = useRef<string | null>(null);
  const originalCartIdRef = useRef<string | null>(null);

  // Initialize PayTabs service
  const getPayTabsService = useCallback(() => {
    if (!payTabsServiceRef.current) {
      payTabsServiceRef.current = new PayTabsService(defaultPayTabsConfig);
    }
    return payTabsServiceRef.current;
  }, []);

  const processPayment = useCallback(async (options: UsePayTabsOptions): Promise<PayTabsResult> => {
    if (isProcessing) {
      return {
        success: false,
        error: 'Payment already in progress'
      };
    }

    if (!auth.userToken || !auth.userEmail) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    // Check if platform is supported (PayTabs works on mobile only)
    if (Platform.OS === 'web') {
      return {
        success: false,
        error: 'PayTabs is not supported on web platform'
      };
    }

    setIsProcessing(true);

    try {
      // First, create PayTabs session with the backend
      const sessionResponse = await esimApi.createPayTabsSession(options);

      if (!sessionResponse.success || !sessionResponse.data) {
        throw new Error(sessionResponse.message || 'Failed to create PayTabs session');
      }

      const { cart_id, amount, orderReference } = sessionResponse.data;
      // Generate unique cart ID for mobile SDK to avoid "Duplicate Request" error
      const cartID = `${cart_id}_mobile_${Date.now()}`;
      currentOrderRefRef.current = orderReference;
      originalCartIdRef.current = cart_id; // Store original for webhook call

      // Prepare payment data for PayTabs SDK
      const paymentData: PayTabsPaymentData = {
        cartID,
        amount,
        cartDescription: `eSIM Purchase - ${options.items[0]?.name || 'eSIM Package'}`,
        customerName: auth.userEmail || 'Customer',
        customerEmail: auth.userEmail,
        customerPhone: '+964 700 000 0000',
        screenTitle: 'eSIMfly Payment'
      };

      // Get PayTabs service and start payment
      const payTabsService = getPayTabsService();
      const paymentResult = await payTabsService.startCardPayment(paymentData);

      // Handle PayTabs SDK result
      console.log('PayTabs SDK Full Result:', JSON.stringify(paymentResult, null, 2));

      if (paymentResult && paymentResult.PaymentDetails) {
        const paymentDetails = paymentResult.PaymentDetails;
        const responseStatus = paymentDetails.paymentResult?.responseStatus;
        const payResponseReturn = paymentDetails.payResponseReturn;

        // Check for successful payment (responseStatus 'A' = Approved, or payResponseReturn 'Authorised')
        if (responseStatus === 'A' || payResponseReturn === 'Authorised') {
          // Payment successful - now notify server via mobile webhook (same as B2B app)
          try {
            console.log('Payment approved, notifying server via mobile webhook...');

            // Prepare webhook data (same format as B2B app)
            const webhookData = {
              tran_ref: paymentDetails.transactionReference,
              cart_id: originalCartIdRef.current, // Use original cart_id for server matching
              cart_description: paymentDetails.cartDescription,
              cart_currency: paymentDetails.cartCurrency,
              cart_amount: paymentDetails.cartAmount,
              customer_details: {
                name: paymentDetails.billingDetails?.name,
                email: paymentDetails.billingDetails?.email,
                phone: paymentDetails.billingDetails?.phone,
                country: paymentDetails.billingDetails?.countryCode
              },
              payment_result: {
                response_status: responseStatus,
                response_code: paymentDetails.paymentResult?.responseCode,
                response_message: paymentDetails.paymentResult?.responseMessage,
                transaction_time: paymentDetails.paymentResult?.transactionTime || new Date().toISOString()
              },
              payment_info: {
                card_type: paymentDetails.paymentInfo?.cardType,
                card_scheme: paymentDetails.paymentInfo?.cardScheme,
                payment_description: paymentDetails.paymentInfo?.paymentDescription
              }
            };

            console.log('Webhook data being sent:', webhookData);

            // Call mobile webhook endpoint (same pattern as B2B app)
            const { newApi } = await import('../api/api');
            const notifyResponse = await newApi.post('/webhooks/paytabs-mobile', webhookData);

            console.log('Server notification response:', notifyResponse.data);

            if (notifyResponse.data.success) {
              // Server processed successfully
              return {
                success: true,
                orderReference: currentOrderRefRef.current || undefined
              };
            } else {
              throw new Error(notifyResponse.data.error || 'Server processing failed');
            }

          } catch (webhookError) {
            console.error('Failed to notify server of PayTabs payment:', webhookError);
            return {
              success: false,
              error: 'Payment successful but server processing failed. Please contact support.'
            };
          }

        } else if (responseStatus === 'C' || payResponseReturn === 'Cancelled') {
          // Payment cancelled by user
          return {
            success: false,
            cancelled: true,
            error: 'Payment cancelled by user'
          };
        } else {
          // Payment failed - provide detailed error message
          const responseCode = paymentDetails.paymentResult?.responseCode;
          const responseMessage = paymentDetails.paymentResult?.responseMessage || 'Payment failed';

          let userFriendlyMessage = responseMessage;

          // Provide more user-friendly error messages based on response code
          switch(responseCode) {
            case '300':
              userFriendlyMessage = 'Card declined. Please check your card details or try a different card.';
              break;
            case '100':
              userFriendlyMessage = 'Insufficient funds. Please check your card balance.';
              break;
            case '200':
              userFriendlyMessage = 'Card expired. Please use a valid card.';
              break;
            case '400':
              userFriendlyMessage = 'Invalid card details. Please check your card information.';
              break;
            default:
              userFriendlyMessage = `Payment declined: ${responseMessage}`;
          }

          return {
            success: false,
            error: userFriendlyMessage,
            details: {
              responseCode,
              responseMessage,
              cardScheme: paymentDetails.paymentInfo?.cardScheme,
              cardType: paymentDetails.paymentInfo?.cardType
            }
          };
        }
      } else if (paymentResult && paymentResult.pt_response_code === '100') {
        // Fallback: Old PayTabs format
        return {
          success: true,
          orderReference: currentOrderRefRef.current || undefined
        };
      } else if (paymentResult && paymentResult.pt_response_code === '101') {
        // Fallback: Old PayTabs format - cancelled
        return {
          success: false,
          cancelled: true,
          error: 'Payment cancelled by user'
        };
      } else {
        // Payment failed - fallback
        const errorMessage = paymentResult?.pt_result || paymentResult?.pt_response_msg || 'Payment failed';
        return {
          success: false,
          error: errorMessage
        };
      }

    } catch (error: any) {
      console.error('PayTabs payment error:', error);

      // Show user-friendly error
      let errorMessage = 'Payment failed. Please try again.';

      if (error.message?.includes('network') || error.message?.includes('connection')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.message?.includes('cancelled') || error.message?.includes('canceled')) {
        return {
          success: false,
          cancelled: true,
          error: 'Payment cancelled'
        };
      }

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, auth, getPayTabsService]);

  const checkPaymentStatus = useCallback(async (orderReference?: string): Promise<{
    success: boolean;
    status?: string;
    data?: any;
    error?: string;
  }> => {
    try {
      const orderRef = orderReference || currentOrderRefRef.current;

      if (!orderRef) {
        return {
          success: false,
          error: 'No order reference available'
        };
      }

      const response = await esimApi.checkOrderStatus(orderRef);

      if (response.success) {
        return {
          success: true,
          status: response.data?.status,
          data: response.data
        };
      } else {
        return {
          success: false,
          error: response.message || 'Failed to check payment status'
        };
      }
    } catch (error: any) {
      console.error('Error checking payment status:', error);
      return {
        success: false,
        error: 'Failed to check payment status'
      };
    }
  }, []);

  const showPaymentAlert = useCallback((result: PayTabsResult, onSuccess?: () => void, onError?: () => void) => {
    if (result.success) {
      Alert.alert(
        'Payment Successful',
        'Your payment has been processed successfully. Your eSIM will be activated shortly.',
        [
          {
            text: 'OK',
            onPress: onSuccess
          }
        ]
      );
    } else if (result.cancelled) {
      Alert.alert(
        'Payment Cancelled',
        'The payment was cancelled. You can try again when you\'re ready.',
        [
          {
            text: 'OK',
            onPress: onError
          }
        ]
      );
    } else {
      Alert.alert(
        'Payment Failed',
        result.error || 'The payment could not be processed. Please try again.',
        [
          {
            text: 'OK',
            onPress: onError
          }
        ]
      );
    }
  }, []);

  const reset = useCallback(() => {
    setIsProcessing(false);
    currentOrderRefRef.current = null;
    originalCartIdRef.current = null;
  }, []);

  return {
    processPayment,
    checkPaymentStatus,
    showPaymentAlert,
    reset,
    isProcessing,
    orderReference: currentOrderRefRef.current
  };
};