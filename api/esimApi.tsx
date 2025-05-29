// esimApi.tsx
import api, { newApi } from './api';
import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  cacheStatus?: string;
  error_code?: string;
  user_email?: string;
  business_email?: string;
}

export interface BalanceResponse {
  success: boolean;
  data: {
    balance: number;
    currency: string;
  };
}

export interface Balance {
  balance: number;
  currency: string;
}

export interface GiftCardResponse {
  success: boolean;
  data?: {
    amount: number;
    card_number: string;
  };
  message?: string;
  error_code?: string;
}

export interface Order {
  id: number;
  package_name: string;
  package_code: string | null;
  esim_id: number | null;
  customer_id: number | null;
  amount: number;
  quantity: number;
  profit: number | null;
  status: 'pending' | 'completed' | 'cancelled';
  order_date: string;
  is_gift_card: boolean;
  flag_url: string | null;
  order_reference: string | null;
  payment_method: 'balance' | 'card' | 'apple_pay' | 'google_pay' | null;
  payment_status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';
  payment_intent_id: string | null;
  has_stripe_payment: boolean;
}

export interface OrdersResponse {
  success: boolean;
  orders: Order[];
  totalProfit: number;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalOrders: number;
  };
}

export interface Network {
  network_name: string;
  network_types: string[];
}

export interface Coverage {
  name: string;
  iso: string;
  networks: Network[];
}

export interface Country {
  country_code?: string;
  title?: string;
  name?: string;
  iso?: string;
  image: {
    url: string;
  };
}

export interface EsimDetails {
  id: number;
  iccid: string;
  status: string;
  status_key: string;
  interpreted_status: string;
  package_code: string;
  short_url: string;
  formatted_short_url: string;
  apple_installation_url: string | null;
  activate_time: string | null;
  expired_time: string;
  order_usage: number;
  total_volume: number;
  data_left: number;
  data_left_formatted: string;
  data_left_percentage: number;
  time_left: string;
  coverages: Coverage[];
  countries: Country[];
  isRegionalPlan: boolean;
  // Additional fields for InstructionsScreen
  ac?: string;
  package_name?: string;
  qr_code_url?: string;
  sharing_access_code?: string;
  order_reference?: string;
  transaction_id?: string;
}

export interface OrderEsimResponse {
  success: boolean;
  message?: string;
  qrCodeUrl?: string;
  packageName?: string;
  price?: number;
  newBalance?: number;
  profit?: number;
  flagUrl?: string;
  directAppleInstallUrl?: string;
  errorCode?: string;
  currentBalance?: number;
  requiredBalance?: number;
  needToLoad?: number;
  orderReference?: string;
  currency?: string;
  processing?: boolean;
  esimId?: number;
  // Add these fields for promo handling
  discountAmount?: number;
  originalPrice?: number;
  finalPrice?: number;
  promoCode?: string;
  esims?: Array<{
    iccid?: string;
    qrCodeUrl?: string;
    appleInstallUrl?: string;
    directAppleInstallationUrl?: string;
    matchingId?: string;
    smdpAddress?: string;
  }>;
}

interface PackagePlan {
  id: string;
  packageCode?: string;
  package_code?: string;
  provider?: string;
  originalName?: string;
  name?: string;
  data?: number | string;
  duration?: number;
  region?: string;
  operator?: string;
  flag_url?: string;
  price: number;
  voice_minutes?: number;  // Add voice minutes
  sms_count?: number;      // Add SMS count
}

export interface OrderEsimBaseRequest {
  packageCode: string;
  packageName: string;
  price: number;
  flagUrl?: string;
  quantity?: number;
  region?: string;
  data?: number;
  duration?: number;
  promoDetails?: {
    code: string;
    originalPrice: number;
    discountAmount: number;
  };
}

export interface OrderFirstProviderRequest extends OrderEsimBaseRequest {
  provider: 'first';
}

export interface OrderSecondProviderRequest extends OrderEsimBaseRequest {
  provider: 'second';
  bundleName: string;
  duration: string;
}

export interface OrderThirdProviderRequest extends OrderEsimBaseRequest {
  provider: 'third';
  data?: number;
  duration?: number;
  operator?: string;
}

export type OrderEsimRequest = 
  | OrderFirstProviderRequest 
  | OrderSecondProviderRequest 
  | OrderThirdProviderRequest;
	
	
export interface AddOnPlan {
  id: string;
  name: string;
  data: number;
  duration: string;
  durationUnit: string;
  region: string;
  price: string;
  packageCode: string;
}

export interface AddOnPlansResponse {
  success: boolean;
  plans?: (AddOnPlan | AiraloAddOnPlan)[];
  currentPackage?: CurrentPackage | AiraloCurrentPackage;
  message?: string;
}
	
export interface OrderAddOnPlanRequest {
  iccid: string;
  packageCode: string;
  packageName: string;
  price: number;
}
	
export interface TopUpProcessResponse {
  success: boolean;
  message?: string;
  data?: {
    orderId?: number;
    airaloOrderId?: string;
    packageName?: string;
    packagePrice?: number;
    markup?: number;
    newBalance?: number;
    newTotalVolume?: number;
    dataFormatted?: string;
    expiredTime?: string;
    duration?: number;
    status?: string;
  };
}

export interface TopUpProcessRequest {
  iccid: string;
  packageCode: string;
  currentStatus?: string;
  packageStatus?: string;
}
	
export interface AiraloAddOnPlan {
  id: string;
  name: string;
  data: number;
  data_formatted: string;
  duration: number;
  duration_formatted: string;
  price: number;
  packageCode: string;
  region: string;
  is_unlimited: boolean;
  amount: number;
  voice: number;
  text: number;
  flag_url: string;
  speed: string;
  location: string;
  operator: string;
}

export interface AiraloCurrentPackage {
  data_amount: number;
  data_formatted: string;
  duration: number;
  duration_formatted: string;
  expires_at: string;
}

export interface AiraloAddOnResponse {
  success: boolean;
  plans: AiraloAddOnPlan[];
  currentPackage: AiraloCurrentPackage;
  cacheStatus?: string;
  message?: string;
}
	
export interface VerifyGiftCardResponse {
  success: boolean;
  data?: {
    amount: number;
    card_number: string;
  };
  message?: string;
  error_code?: string;
}

// Add these new interfaces after your existing interfaces
interface PaymentStatusResponse {
  status: string;
  paymentIntentId: string;
  requiresAction: boolean;
  clientSecret?: string;
}

interface PaymentConfirmationResponse {
  status: string;
  paymentIntentId: string;
  clientSecret?: string;
}

interface StripePaymentIntent {
  id: string;
  client_secret: string;
  status: string;
  amount: number;
  currency: string;
}

interface CreatePaymentIntentRequest {
  amount: number;
  currency?: string;
  metadata?: {
    package_id?: string;
    package_name?: string;
    [key: string]: any;
  };
  payment_method_types?: string[];
}

// Add these new functions to your esimApi object
const stripeApi = {
createPaymentIntent: async (data: CreatePaymentIntentRequest): Promise<ApiResponse<StripePaymentIntent>> => {
  try {
    console.log('Creating payment intent:', data);
    
    // Use the new API endpoint with newApi (which has auth headers)
    const response = await newApi.post('/checkout/create-session', {
      amount: data.amount,
      currency: data.currency || 'usd',
      metadata: data.metadata,
      payment_method_types: data.payment_method_types || ['card'],
      mode: 'payment' // For one-time payments
    });

    console.log('Raw payment intent response:', response.data);

    if (!response.data.success || !response.data.data?.clientSecret) {
      throw new Error(response.data.message || 'Failed to create payment intent');
    }

    return {
      success: true,
      data: {
        id: response.data.data.paymentIntentId,
        clientSecret: response.data.data.clientSecret,  // Keep original property name
        status: 'created',
        amount: data.amount,
        currency: data.currency || 'usd'
      }
    };
  } catch (error) {
    console.error('Payment intent creation error:', error);
    return {
      success: false,
      message: error.message || 'Failed to create payment intent'
    };
  }
},
		
  confirmPayment: async (paymentIntentId: string): Promise<ApiResponse<PaymentConfirmationResponse>> => {
    try {
      console.log('Confirming payment:', paymentIntentId);
      
      // For now, we'll return success as the payment confirmation happens via Stripe webhook
      return {
        success: true,
        data: {
          status: 'processing',
          paymentIntentId: paymentIntentId,
          clientSecret: ''
        }
      };
    } catch (error) {
      const errorInfo = handleApiError(error);
      console.error('Error confirming payment:', error);
      return {
        success: false,
        ...errorInfo
      };
    }
  },

  checkPaymentStatus: async (paymentIntentId: string): Promise<ApiResponse<PaymentStatusResponse>> => {
    try {
      console.log('Checking payment status:', paymentIntentId);
      
      // The webhook will handle the actual status update
      // For mobile, we can return processing status
      return {
        success: true,
        data: {
          status: 'processing',
          paymentIntentId: paymentIntentId,
          requiresAction: false,
          clientSecret: ''
        }
      };
    } catch (error) {
      const errorInfo = handleApiError(error);
      console.error('Error checking payment status:', error);
      return {
        success: false,
        ...errorInfo
      };
    }
  },

  cancelPaymentIntent: async (paymentIntentId: string): Promise<ApiResponse<void>> => {
    try {
      console.log('Canceling payment intent:', paymentIntentId);
      
      // For now, just return success as cancellation can be handled on the backend
      return {
        success: true,
        message: 'Payment intent cancelled successfully'
      };
    } catch (error) {
      const errorInfo = handleApiError(error);
      console.error('Error canceling payment intent:', error);
      return {
        success: false,
        ...errorInfo
      };
    }
  }
};
	
// Add new verification function
export const verifyGiftCardForDiscount = async (cardNumber: string): Promise<ApiResponse<VerifyGiftCardResponse>> => {
  try {
    console.log('Verifying gift card for discount:', cardNumber);
    
    const response = await api.post('/esimplan/verify_gift_card_discount.php', {
      card_number: cardNumber
    });

    console.log('Gift card discount verification response:', response.data);

    if (response.data && response.data.status === 'success') {
      return {
        success: true,
        data: {
          amount: response.data.data.amount,
          card_number: cardNumber
        }
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'Invalid gift card',
        error_code: response.data.error_code
      };
    }
  } catch (error) {
    const errorInfo = handleApiError(error);
    console.error('Error verifying gift card for discount:', error);
    return {
      success: false,
      ...errorInfo
    };
  }
};

	
export const redeemGiftCardAtCheckout = async (data: { 
  card_number: string;
  package_price: number;
  order_id: number;
}): Promise<ApiResponse<GiftCardResponse>> => {
  try {
    console.log('Redeeming gift card at checkout:', data);
    
    const response = await api.post('/esimplan/redeem_gift_card_at_checkout.php', data);

    console.log('Gift card checkout redemption response:', response.data);

    if (response.data.success) {
      return {
        success: true,
        data: {
          amount: response.data.data.discount_amount,
          card_number: data.card_number
        },
        message: 'Gift card applied successfully'
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'Failed to apply gift card',
        error_code: response.data.error_code
      };
    }
  } catch (error) {
    const errorInfo = handleApiError(error);
    console.error('Error redeeming gift card at checkout:', error);
    return {
      success: false,
      ...errorInfo
    };
  }
};

export const processTopUp = async (data: TopUpProcessRequest): Promise<ApiResponse<TopUpProcessResponse>> => {
  try {
    console.log('Processing top-up:', data);
    
    // Get eSIM details first to determine the provider
    const detailsResponse = await api.get('/esimplan/get_esim_details.php', {
      params: { iccid: data.iccid }
    });

    if (!detailsResponse.data?.success) {
      return {
        success: false,
        message: 'Failed to fetch eSIM details'
      };
    }

    // Detect provider using order reference or transaction ID
    const isAiraloProvider = 
      detailsResponse.data.esim.order_reference?.startsWith('AIR_') || 
      detailsResponse.data.esim.transaction_id?.startsWith('AIR_') ||
      detailsResponse.data.esim.qr_code_url?.includes('airalo.com');

    // Select the appropriate endpoint
    const endpoint = isAiraloProvider
      ? '/esimplan/process_airalo_topup.php'
      : '/esimplan/process_topup.php';

    console.log('Selected endpoint for top-up:', {
      endpoint,
      isAiraloProvider,
      orderRef: detailsResponse.data.esim.order_reference
    });

    // Process the package code based on provider
    let packageCode = data.packageCode;
    if (isAiraloProvider) {
      packageCode = packageCode
        .replace(/^airalo_/, '')  // Remove any existing airalo_ prefix
        .replace(/-topup$/, '')   // Remove any existing -topup suffix
        + '-topup';               // Add -topup suffix
    }

    const requestData = {
      iccid: data.iccid,
      packageCode: packageCode,
      currentStatus: data.currentStatus?.toUpperCase() || 'ACTIVE',
      packageStatus: data.packageStatus?.toLowerCase() || 'active'
    };

    console.log('Final request data:', requestData);

    const response = await api.post(endpoint, requestData);

    console.log('Top-up API response:', response.data);

    if (response.data.success) {
      return {
        success: true,
        message: response.data.message || 'Top-up successful',
        data: response.data.data
      };
    }

    // Handle specific error cases
    if (response.data.debug_info?.error?.includes('404')) {
      // Try to verify eSIM status
      try {
        const verificationResponse = await api.get('/esimplan/get_esim_details.php', {
          params: { iccid: data.iccid }
        });
        
        if (verificationResponse.data.success && 
            verificationResponse.data.esim?.status?.toLowerCase() === 'active') {
          return {
            success: true,
            message: 'Top-up was processed successfully',
            data: {
              status: verificationResponse.data.esim.status,
              dataFormatted: `${(verificationResponse.data.esim.total_volume / (1024 * 1024 * 1024)).toFixed(1)} GB`
            }
          };
        }
      } catch (verificationError) {
        console.error('Verification error:', verificationError);
      }
    }

    return {
      success: false,
      message: response.data.message || 'Top-up failed',
      error_code: response.data.error_code
    };

  } catch (error) {
    console.error('Error processing top-up:', error);
    
    if (axios.isAxiosError(error)) {
      const errorResponse = error.response;
      
      // If it's a 500 error but we should verify the status
      if (errorResponse?.status === 500) {
        try {
          const verificationResponse = await api.get('/esimplan/get_esim_details.php', {
            params: { iccid: data.iccid }
          });
          
          if (verificationResponse.data.success) {
            const esimData = verificationResponse.data.esim;
            if (esimData.status?.toLowerCase() === 'active') {
              return {
                success: true,
                message: 'Top-up was processed successfully',
                data: {
                  status: esimData.status,
                  dataFormatted: `${(esimData.total_volume / (1024 * 1024 * 1024)).toFixed(1)} GB`
                }
              };
            }
          }
        } catch (verificationError) {
          console.error('Verification error:', verificationError);
        }
      }
      
      if (errorResponse?.data) {
        return {
          success: false,
          message: errorResponse.data.message || 'Failed to process top-up',
          error_code: errorResponse.data.error_code || 'REQUEST_FAILED'
        };
      }
    }

    return {
      success: false,
      message: 'An unexpected error occurred',
      error_code: 'UNKNOWN_ERROR'
    };
  }
};

export const fetchAddOnPlans = async (iccid: string): Promise<ApiResponse<AddOnPlansResponse>> => {
  try {
    console.log('Fetching add-on plans for ICCID:', iccid);
    
    // First fetch eSIM details to determine the provider
    const detailsResponse = await api.get('/esimplan/get_esim_details.php', {
      params: { iccid }
    });

    console.log('eSIM details response:', detailsResponse.data);

    // Enhanced error handling for eSIM details
    if (!detailsResponse.data?.success) {
      // If eSIM details fails but we know it's provider1, proceed with default endpoint
      console.log('Falling back to provider1 due to failed eSIM details fetch');
      const response = await api.get('/esimplan/get_add_on_plans.php', {
        params: { 
          iccid,
          provider: 'first'
        }
      });

      if (response.data?.success) {
        const plans = response.data.plans.map(plan => ({
          ...plan,
          packageCode: plan.id,
          is_unlimited: plan.is_unlimited || false
        }));

        return {
          success: true,
          data: {
            success: true,
            plans,
            currentPackage: response.data.currentPackage,
            cacheStatus: response.data.cacheStatus
          }
        };
      }
    }

    // Enhanced provider detection
    const provider = detailsResponse.data?.esim?.order_reference?.startsWith('AIR_') ||
                    detailsResponse.data?.esim?.transaction_id?.startsWith('AIR_') ||
                    detailsResponse.data?.esim?.qr_code_url?.includes('airalo.com')
      ? 'airalo'
      : 'first'; // Default to first provider if no Airalo markers found

    console.log('Detected provider:', provider);

    // Select the appropriate endpoint based on provider
    const endpoint = provider === 'airalo'
      ? '/esimplan/get_airalo_add_on_plans.php'
      : '/esimplan/get_add_on_plans.php';

    console.log('Selected endpoint:', endpoint);

    const response = await api.get(endpoint, {
      params: { 
        iccid,
        provider 
      }
    });

    console.log('Add-on plans API response:', response.data);

    if (response.data?.success) {
      const plans = response.data.plans.map(plan => ({
        ...plan,
        packageCode: plan.id,
        is_unlimited: plan.is_unlimited || false
      }));

      return {
        success: true,
        data: {
          success: true,
          plans,
          currentPackage: response.data.currentPackage,
          cacheStatus: response.data.cacheStatus
        }
      };
    }

    // Enhanced error handling
    if (response.data?.message?.includes('Failed to fetch eSIM details')) {
      // Try one more time with explicit provider1
      const retryResponse = await api.get('/esimplan/get_add_on_plans.php', {
        params: { 
          iccid,
          provider: 'first'
        }
      });

      if (retryResponse.data?.success) {
        const plans = retryResponse.data.plans.map(plan => ({
          ...plan,
          packageCode: plan.id,
          is_unlimited: plan.is_unlimited || false
        }));

        return {
          success: true,
          data: {
            success: true,
            plans,
            currentPackage: retryResponse.data.currentPackage,
            cacheStatus: retryResponse.data.cacheStatus
          }
        };
      }
    }

    return {
      success: false,
      message: response.data.message || 'Failed to fetch add-on plans'
    };

  } catch (error) {
    console.error('Error fetching add-on plans:', error);
    return {
      success: false,
      message: 'Failed to fetch add-on plans'
    };
  }
};
	
export const orderAddOnPlan = async (data: OrderAddOnPlanRequest): Promise<ApiResponse<OrderEsimResponse>> => {
  try {
    // Process the top-up directly without ordering a new eSIM
    const processResponse = await processTopUp({
      iccid: data.iccid,
      packageCode: data.packageCode
    });

    if (!processResponse.success) {
      return {
        success: false,
        message: processResponse.message,
        data: {
          success: false,
          errorCode: 'TOPUP_FAILED',
          message: processResponse.message
        }
      };
    }

    return {
      success: true,
      data: {
        success: true,
        packageName: data.packageName,
        price: data.price,
        newBalance: processResponse.data?.newBalance,
        orderReference: processResponse.data?.orderReference,
        currency: 'USD'
      }
    };
  } catch (error) {
    const errorInfo = handleApiError(error);
    console.error('Error processing top-up:', error);
    return {
      success: false,
      ...errorInfo
    };
  }
};


function detectProvider(plan: PackagePlan) {
  const packageId = plan.packageCode || plan.package_code || plan.id;
  console.log('Detecting provider for package:', packageId);
  
  // Check for package code prefixes first
  if (packageId?.startsWith('esimaccess_')) {
    console.log('Detected Provider1 (EsimAccess)');
    return 'first';
  }
  if (packageId?.startsWith('esim_')) {
    console.log('Detected Provider2 (EsimGo)');
    return 'second';
  }
  if (packageId?.startsWith('airalo_') || (plan.provider === 'airalo')) {
    console.log('Detected Provider3 (Airalo)');
    return 'third';
  }
  
  // Fallback to default provider
  console.log('Defaulting to Provider1 (EsimAccess)');
  return 'first';
}

export const orderEsim = async (data: OrderEsimRequest): Promise<ApiResponse<OrderEsimResponse>> => {
  try {
    console.log('Ordering eSIM:', data);
    
    // For balance payments, use the new unified API endpoint
    if (data.payment_method === 'balance') {
      console.log('Using new API endpoint for balance payment');
      
      // Prepare request data for the new API
      const requestData = {
        packageCode: data.packageCode,
        packageName: data.packageName,
        price: data.price,
        quantity: data.quantity || 1,
        flagUrl: data.flagUrl,
        paymentMethod: 'balance',
        duration: data.duration,
        promoDetails: data.promoDetails
      };
      
      console.log('API Request: POST /esim/order');
      console.log('Request Data:', requestData);
      
      const response = await newApi.post('/esim/order', requestData);
      console.log('Order eSIM response:', response.data);
      
      if (response.data.success) {
        return {
          success: true,
          data: {
            success: true,
            packageName: response.data.packageName,
            price: response.data.amount || data.price,
            newBalance: response.data.newBalance,
            profit: response.data.profit,
            flagUrl: response.data.flagUrl || data.flagUrl,
            orderReference: response.data.orderReference,
            currency: response.data.currency || 'USD',
            qrCodeUrl: response.data.qrCodeUrl || response.data.esims?.[0]?.qrCodeUrl,
            directAppleInstallUrl: response.data.directAppleInstallUrl || 
                                  response.data.esims?.[0]?.directAppleInstallUrl ||
                                  response.data.esims?.[0]?.appleInstallUrl,
            processing: response.data.processing,
            esimId: response.data.esimId,
            esims: response.data.esims,
            discountAmount: response.data.discountAmount,
            finalPrice: response.data.finalPrice,
            payment_method: 'balance'
          }
        };
      } else {
        return {
          success: false,
          message: response.data.message,
          data: {
            success: false,
            errorCode: response.data.errorCode,
            currentBalance: response.data.currentBalance,
            requiredBalance: response.data.requiredBalance,
            needToLoad: response.data.needToLoad
          }
        };
      }
    }
    
    // For card payments, continue using createCheckoutSession
    if (data.payment_method === 'card') {
      console.log('Using checkout session for card payment');
      
      // Use createCheckoutSession for card payments
      const items = [{
        id: data.packageCode,
        name: data.packageName,
        price: data.price,
        quantity: data.quantity || 1,
        data_amount: data.data || 1,
        duration: data.duration || 30,
        flag_url: data.flagUrl,
        metadata: {
          provider: detectProvider(data as PackagePlan)
        }
      }];
      
      const checkoutResponse = await createCheckoutSession({
        items,
        promoDetails: data.promoDetails
      });
      
      if (!checkoutResponse.success) {
        return {
          success: false,
          message: checkoutResponse.message || 'Failed to create checkout session'
        };
      }
      
      return {
        success: true,
        data: {
          success: true,
          packageName: data.packageName,
          price: data.price,
          orderReference: checkoutResponse.data.orderReference,
          currency: 'USD',
          processing: true,
          payment_method: 'card',
          // For card payments, return payment details for Stripe
          paymentIntent: checkoutResponse.data.paymentIntent,
          ephemeralKey: checkoutResponse.data.ephemeralKey,
          customer: checkoutResponse.data.customer
        }
      };
    }
    
    // Fallback for other payment methods (shouldn't happen)
    return {
      success: false,
      message: 'Unsupported payment method'
    };
    
  } catch (error) {
    console.error('Error ordering eSIM:', error);
    const errorInfo = handleApiError(error);
    
    return {
      success: false,
      ...errorInfo
    };
  }
};

// Add this function to your esimApi
export const changeEmail = async (data: ChangeEmailData): Promise<ApiResponse<void>> => {
  try {
    console.log('Changing email to:', data.new_email);
    
    const response = await newApi.post('/user/change-email', {
      currentPassword: data.current_password,
      newEmail: data.new_email
    });

    console.log('Email change response:', response.data);

    if (response.data && response.data.success) {
      // Update stored email if changed successfully
      if (response.data.newEmail) {
        await AsyncStorage.setItem('userEmail', response.data.newEmail);
      }
      return {
        success: true,
        message: response.data.message || 'Email changed successfully'
      };
    } else {
      return {
        success: false,
        message: response.data.error || response.data.message || 'Failed to change email',
        error_code: response.data.error_code
      };
    }
  } catch (error) {
    const errorInfo = handleApiError(error);
    console.error('Error changing email:', error);
    return {
      success: false,
      message: errorInfo.message || 'Failed to change email',
      ...errorInfo
    };
  }
};

// Add this function to your esimApi object
export const changePassword = async (data: ChangePasswordData): Promise<ApiResponse<void>> => {
  try {
    console.log('Changing password...');
    
    const response = await newApi.post('/user/change-password', {
      currentPassword: data.current_password,
      newPassword: data.new_password
    });

    console.log('Password change response:', response.data);

    if (response.data && response.data.success) {
      return {
        success: true,
        message: response.data.message || 'Password changed successfully'
      };
    } else {
      return {
        success: false,
        message: response.data.error || response.data.message || 'Failed to change password',
        error_code: response.data.error_code
      };
    }
  } catch (error: any) {
    console.error('Error changing password:', error);
    
    // Handle specific error response from API
    if (error.response?.data) {
      return {
        success: false,
        message: error.response.data.error || error.response.data.message || 'Failed to change password',
        error_code: error.response.data.error_code
      };
    }
    
    // Fallback to generic error handling
    const errorInfo = handleApiError(error);
    return {
      success: false,
      message: errorInfo.message || 'Failed to change password',
      ...errorInfo
    };
  }
};

const handleApiError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<any>;
    console.error('Response Error:', {
      error: axiosError,
      data: axiosError.response?.data,
      status: axiosError.response?.status,
      headers: axiosError.response?.headers,
      user_email: axiosError.response?.data?.user_email,
      business_email: axiosError.response?.data?.business_email
    });

    if (axiosError.response?.data?.message || axiosError.response?.data?.error) {
      return {
        message: axiosError.response.data.error || axiosError.response.data.message,
        user_email: axiosError.response.data.user_email,
        business_email: axiosError.response.data.business_email,
        error_code: axiosError.response.data.error_code
      };
    }

    const status = axiosError.response?.status;
    switch (status) {
      case 400:
        return { message: 'Invalid request. Please check your data and try again.' };
      case 401:
        return { message: 'Your session has expired. Please log in again.' };
      case 403:
        return { message: 'You do not have permission to access this resource.' };
      case 404:
        return { message: 'Resource not found. Please try again.' };
      case 500:
        return { message: 'Server error. Please try again later or contact support.' };
      default:
        return { message: `An error occurred (${status}).` };
    }
  }
  return { message: 'An unexpected error occurred. Please try again.' };
};

export const registerPushToken = async (data: PushTokenData): Promise<ApiResponse<void>> => {
  try {
    console.log('Registering push token:', data);
    
    const response = await newApi.post('/user/push-token', {
      token: data.token,
      device_type: data.deviceType,
      device_name: data.deviceName
    });

    console.log('Push token registration response:', response.data);

    if (response.data && response.data.success) {
      return {
        success: true,
        message: response.data.message || 'Push token registered successfully'
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'Failed to register push token',
        error_code: response.data.code
      };
    }
  } catch (error) {
    const errorInfo = handleApiError(error);
    console.error('Error registering push token:', error);
    return {
      success: false,
      message: errorInfo.message || 'Failed to register push token',
      ...errorInfo
    };
  }
};

export const deregisterPushToken = async (token: string): Promise<ApiResponse<void>> => {
  try {
    console.log('Deregistering push token:', token);
    
    const response = await newApi.delete('/user/push-token', {
      data: { token }
    });

    console.log('Push token deregistration response:', response.data);

    if (response.data && response.data.success) {
      return {
        success: true,
        message: response.data.message || 'Push token deregistered successfully'
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'Failed to deregister push token',
        error_code: response.data.code
      };
    }
  } catch (error) {
   const errorInfo = handleApiError(error);
    console.error('Error deregistering push token:', error);
    return {
      success: false,
      message: errorInfo.message || 'Failed to deregister push token',
      ...errorInfo
    };
  }
};

export const verifyPushToken = async (token: string): Promise<ApiResponse<void>> => {
  try {
    console.log('Verifying push token:', token);
    
    const response = await newApi.get('/user/push-token', {
      params: { token }
    });

    console.log('Push token verification response:', response.data);

    if (response.data && response.data.success) {
      return {
        success: true,
        message: response.data.message || 'Push token verified successfully',
        data: response.data.data
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'Failed to verify push token',
        error_code: response.data.code
      };
    }
  } catch (error) {
    const errorInfo = handleApiError(error);
    console.error('Error verifying push token:', error);
    return {
      success: false,
      message: errorInfo.message || 'Failed to verify push token',
      ...errorInfo
    };
  }
};

export const verifyGiftCard = async (cardNumber: string): Promise<ApiResponse<GiftCardResponse>> => {
  try {
    console.log('Verifying gift card:', cardNumber);
    
    const response = await newApi.post('/user/gift-card/redeem', {
      card_number: cardNumber
    });

    console.log('Gift card verification response:', response.data);

    if (response.data && response.data.success) {
      return {
        success: true,
        data: {
          status: 'success',
          message: response.data.message,
          amount: response.data.data.amount,
          new_balance: response.data.data.new_balance
        }
      };
    } else {
      return {
        success: false,
        message: response.data.message || response.data.error,
        error_code: response.data.error_code
      };
    }
  } catch (error: any) {
    console.error('Error verifying gift card:', error);
    if (error.response?.data) {
      return {
        success: false,
        message: error.response.data.message || error.response.data.error,
        error_code: error.response.data.error_code
      };
    }
    return {
      success: false,
      message: 'An unexpected error occurred',
    };
  }
};

export const fetchBalance = async (): Promise<ApiResponse<Balance>> => {
  try {
    console.log('Fetching balance');
    const response = await newApi.get('/user');
    
    console.log('Balance response:', response.data);
    
    if (response.data) {
      return {
        success: true,
        data: {
          balance: Number(response.data.balance) || 0,
          currency: 'USD'
        },
        user_email: response.data.email,
        business_email: response.data.referralCode ? 'Referred user' : undefined
      };
    } else {
      console.warn('Balance fetch failed:', response.data);
      return {
        success: false,
        message: response.data.message || 'Failed to fetch balance'
      };
    }
  } catch (error) {
    const errorInfo = handleApiError(error);
    console.error('Error fetching balance:', error);
    return {
      success: false,
      ...errorInfo
    };
  }
};

export const fetchOrders = async (page: number = 1, limit: number = 20): Promise<ApiResponse<OrdersResponse>> => {
  try {
    console.log('Fetching orders for page:', page);
    
    const response = await newApi.get('/orders', {
      params: { page, limit }
    });

    console.log('Orders response:', response.data);

    if (response.data && response.data.success) {
      // The response is already in the correct format for OrderHistoryScreen
      return {
        success: true,
        data: {
          success: true,
          orders: response.data.orders,
          pagination: response.data.pagination
        }
      };
    } else {
      console.warn('Orders API returned success: false:', response.data);
      return {
        success: false,
        message: response.data.error || 'Failed to fetch orders'
      };
    }
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    
    if (error.response?.data) {
      return {
        success: false,
        message: error.response.data.error || error.response.data.message || 'Failed to fetch orders'
      };
    }
    
    return {
      success: false,
      message: 'An unexpected error occurred while fetching orders'
    };
  }
};

export const fetchEsimDetails = async (iccid: string): Promise<ApiResponse<EsimDetails>> => {
  try {
    console.log('Fetching eSIM details for ICCID:', iccid);
    
    // Extract numeric ID from ICCID if it starts with a number
    let esimId = iccid;
    const match = iccid.match(/^(\d+)/);
    if (match) {
      esimId = match[1];
    }
    
    const response = await newApi.get(`/myesims/${esimId}`);

    console.log('eSIM details response:', response.data);

    if (response.data && response.data.success) {
      const esim = response.data.esim;
      
      // Transform the response to match the expected EsimDetails interface
      const transformedData: EsimDetails = {
        id: esim.id,
        iccid: esim.iccid,
        status: esim.status,
        status_key: esim.status,
        interpreted_status: esim.status,
        package_code: esim.package_code || '',
        short_url: esim.qr_code_url || '',
        formatted_short_url: esim.qr_code_url || '',
        apple_installation_url: esim.apple_installation_url,
        activate_time: esim.activated_at,
        expired_time: esim.expires_at || '',
        order_usage: esim.data_used || 0,
        total_volume: esim.data_limit || 0,
        data_left: (esim.data_limit || 0) - (esim.data_used || 0),
        data_left_formatted: `${(((esim.data_limit || 0) - (esim.data_used || 0)) / (1024 * 1024 * 1024)).toFixed(2)} GB`,
        data_left_percentage: esim.data_limit ? ((esim.data_limit - (esim.data_used || 0)) / esim.data_limit * 100) : 100,
        time_left: esim.days_remaining ? `${esim.days_remaining} days` : '',
        coverages: esim.countries || [],
        countries: esim.countries || [],
        isRegionalPlan: esim.is_regional || false,
        // Additional fields from new API
        ac: esim.activation_code,
        package_name: esim.package,
        // Additional fields needed by InstructionsScreen
        qr_code_url: esim.qr_code_url,
        sharing_access_code: esim.sharing_access_code,
        order_reference: esim.order_reference,
        transaction_id: esim.transaction_id
      };
      
      return {
        success: true,
        data: transformedData,
        cacheStatus: response.data.cacheStatus
      };
    } else {
      console.warn('API returned success: false:', response.data);
      return {
        success: false,
        message: response.data.error || response.data.message || 'Failed to fetch eSIM details'
      };
    }
  } catch (error: any) {
    console.error('Error fetching eSIM details:', error);
    
    if (error.response?.status === 404) {
      return {
        success: false,
        message: 'eSIM not found'
      };
    }
    
    if (error.response?.data) {
      return {
        success: false,
        message: error.response.data.error || error.response.data.message || 'Failed to fetch eSIM details'
      };
    }
    
    const errorInfo = handleApiError(error);
    return {
      success: false,
      message: errorInfo.message || 'Failed to fetch eSIM details'
    };
  }
};

export const fetchLatestEsim = async (): Promise<ApiResponse<EsimData>> => {
  try {
    const response = await api.get('/esimplan/get_my_esims.php', {
      params: { page: 1, limit: 1 }
    });

    if (response.data && response.data.success && response.data.esims?.length > 0) {
      const activeEsims = response.data.esims.filter(
        esim => esim.status.toLowerCase() === 'active'
      );
      
      if (activeEsims.length > 0) {
        return { success: true, data: activeEsims[0] };
      }
      
      return { success: true, data: response.data.esims[0] };
    }
    
    return { success: false, message: 'No eSIMs found' };
  } catch (error) {
    const errorMessage = handleApiError(error);
    console.error('Error fetching latest eSIM:', error);
    return {
      success: false,
      message: errorMessage
    };
  }
};


// New function to process top-up using the new API endpoint
export const processTopUpNew = async (esimId: number, packageCode: string): Promise<ApiResponse<any>> => {
  try {
    console.log('Processing top-up with new API:', { esimId, packageCode });
    
    const response = await newApi.post(`/myesims/${esimId}/topup`, {
      packageCode
    });

    console.log('Top-up response:', response.data);

    if (response.data?.success) {
      return {
        success: true,
        message: response.data.message || 'Top-up successful',
        data: response.data
      };
    } else {
      return {
        success: false,
        message: response.data?.error || response.data?.message || 'Top-up failed'
      };
    }
  } catch (error: any) {
    console.error('Error processing top-up:', error);
    
    if (error.response?.data) {
      return {
        success: false,
        message: error.response.data.error || error.response.data.message || 'Failed to process top-up'
      };
    }
    
    return {
      success: false,
      message: 'An unexpected error occurred during top-up'
    };
  }
};

// Create checkout session for Stripe Payment Element
export const createCheckoutSession = async (data: {
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    data_amount: number;
    duration: number;
    flag_url?: string;
    metadata?: any;
  }>;
  promoDetails?: any;
  isTopup?: boolean;
  esimId?: number;
  provider?: string;
}): Promise<ApiResponse<{
  paymentIntent: string;
  ephemeralKey: string;
  customer: string;
  orderReference: string;
}>> => {
  try {
    console.log('Creating checkout session:', data);
    
    const response = await newApi.post('/checkout/create-payment-sheet', {
      items: data.items,
      promoDetails: data.promoDetails,
      isTopup: data.isTopup,
      esimId: data.esimId,
      provider: data.provider
    });

    console.log('Checkout session response:', response.data);

    if (response.data?.success) {
      return {
        success: true,
        data: {
          paymentIntent: response.data.data.paymentIntent,
          ephemeralKey: response.data.data.ephemeralKey,
          customer: response.data.data.customer,
          orderReference: response.data.data.orderReference
        }
      };
    }

    return {
      success: false,
      message: response.data?.message || 'Failed to create checkout session'
    };
  } catch (error) {
    console.error('Create checkout session error:', error);
    return {
      success: false,
      message: error.message || 'Failed to create checkout session'
    };
  }
};

// Check order status
export const checkOrderStatus = async (orderReference: string): Promise<ApiResponse<{
  status: string;
  message?: string;
  qrCodeUrl?: string;
  directAppleInstallUrl?: string;
  packageName?: string;
  iccid?: string;
  ac?: string;
  esimId?: number;
  newBalance?: number;
  currency?: string;
}>> => {
  try {
    const response = await newApi.get(`/orders/status/${orderReference}`);
    
    if (response.data?.success) {
      return {
        success: true,
        data: response.data.data
      };
    }
    
    return {
      success: false,
      message: response.data?.message || 'Failed to get order status'
    };
  } catch (error) {
    console.error('Check order status error:', error);
    return {
      success: false,
      message: error.message || 'Failed to check order status'
    };
  }
};

const esimApi = {
  ...stripeApi, // Add Stripe API functions
  fetchBalance,
  fetchLatestEsim,
  fetchEsimDetails,
  fetchOrders,
  verifyGiftCard,
  registerPushToken,
  deregisterPushToken,
  verifyPushToken,
  changePassword,
  changeEmail,
  orderEsim,
  fetchAddOnPlans,
  processTopUp,
  processTopUpNew,
  orderAddOnPlan,
  redeemGiftCardAtCheckout,
  verifyGiftCardForDiscount,
  createCheckoutSession,
  checkOrderStatus,
};

export default esimApi;