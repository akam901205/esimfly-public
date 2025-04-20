// esimApi.tsx
import api from './api';
import axios, { AxiosError } from 'axios';

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
    
    const response = await api.post('/public_app/api/payments/create-intent.php', {
      amount: data.amount,
      currency: data.currency || 'usd',
      metadata: data.metadata,
      payment_method_types: data.payment_method_types || ['card']
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
      
      const response = await api.post('/public_app/api/payments/confirm-payment.php', {
        paymentIntentId
      });

      console.log('Payment confirmation response:', response.data);

      if (response.data.success) {
        return {
          success: true,
          data: {
            status: response.data.data.status,
            paymentIntentId: paymentIntentId,
            clientSecret: response.data.data.clientSecret
          }
        };
      }

      return {
        success: false,
        message: response.data.message || 'Failed to confirm payment'
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
      
      const response = await api.get('/public_app/api/payments/check-status.php', {
        params: { paymentIntentId }
      });

      console.log('Payment status response:', response.data);

      if (response.data.success) {
        return {
          success: true,
          data: {
            status: response.data.data.status,
            paymentIntentId: paymentIntentId,
            requiresAction: response.data.data.requires_action || false,
            clientSecret: response.data.data.client_secret
          }
        };
      }

      return {
        success: false,
        message: response.data.message || 'Failed to check payment status'
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
      
      const response = await api.post('/public_app/api/payments/cancel-intent.php', {
        paymentIntentId
      });

      console.log('Payment cancellation response:', response.data);

      if (response.data.success) {
        return {
          success: true,
          message: 'Payment intent cancelled successfully'
        };
      }

      return {
        success: false,
        message: response.data.message || 'Failed to cancel payment intent'
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
    
    // Handle payment intent creation for card payments
    let paymentIntentId: string | undefined;
    if (data.payment_method === 'card') {
      const paymentIntent = await stripeApi.createPaymentIntent({
		  amount: Math.round(data.price * 100),
		  metadata: {
			package_id: data.packageCode,  // Changed from package_code
			package_name: data.packageName,
			provider: detectProvider(data as PackagePlan)
		  }
		});

      if (!paymentIntent.success) {
        return {
          success: false,
          message: paymentIntent.message || 'Payment initialization failed'
        };
      }
      paymentIntentId = paymentIntent.data.id;
    }
    
    const provider = detectProvider(data as PackagePlan);
    console.log('Detected provider:', provider);
    
    let endpoint: string;
    let requestData: any;
    let packageCode = data.packageCode;
    
    // Standardize flag URL format
    const flagUrl = data.flagUrl?.startsWith('/img/flags/') 
      ? data.flagUrl 
      : `/img/flags/${data.flagUrl?.toLowerCase() || 'UNKNOWN.png'}`;
    
    // Strip provider prefixes from package code
    if (packageCode?.startsWith('esimaccess_')) {
      packageCode = packageCode.replace('esimaccess_', '');
    } else if (packageCode?.startsWith('airalo_')) {
      packageCode = packageCode.replace('airalo_', '');
    }
    
    switch (provider) {
      case 'second':
        endpoint = '/public_app/api/order/order_second_esim.php';
        requestData = {
          bundleName: packageCode,
          quantity: 1,
          packageName: data.packageName,
          duration: data.duration?.toString(),
          flagUrl: flagUrl,
          payment_method: data.payment_method,
          payment_intent_id: paymentIntentId,
          price: data.price,
          ...(data.promoDetails && { promoDetails: data.promoDetails })
        };
        break;
        
      case 'third':
        endpoint = '/public_app/api/order/order_third_esim.php';
        requestData = {
          packageCode: packageCode,
          packageName: data.packageName,
          price: data.price,
          quantity: 1,
          flagUrl: flagUrl,
          data: data.data,
          duration: data.duration,
          region: data.region,
          operator: (data as any).operator,
          payment_method: data.payment_method,
          payment_intent_id: paymentIntentId,
          planDetails: {
            data: data.data,
            duration: data.duration,
            region: data.region || '',
            type: 'local'
          },
          ...(data.promoDetails && { promoDetails: data.promoDetails })
        };
        break;
        
      default: // first provider
        endpoint = '/public_app/api/order/order_esim.php';
        requestData = {
          packageCode: packageCode,
          packageName: data.packageName,
          price: data.price,
          quantity: 1,
          flagUrl: flagUrl,
          payment_method: data.payment_method,
          payment_intent_id: paymentIntentId,
          ...(data.promoDetails && { promoDetails: data.promoDetails })
        };
    }

    console.log(`Making ${provider} provider request to ${endpoint}:`, requestData);
    
    const response = await api.post(endpoint, requestData);
    console.log('Order eSIM response:', response.data);

    if (response.data.success) {
      // If using card payment, confirm the payment
      if (data.payment_method === 'card' && paymentIntentId) {
        const confirmResponse = await stripeApi.confirmPayment(paymentIntentId);
        if (!confirmResponse.success) {
          return {
            success: false,
            message: 'Payment confirmation failed',
            data: {
              success: false,
              errorCode: 'PAYMENT_CONFIRMATION_FAILED'
            }
          };
        }
      }

      return {
        success: true,
        data: {
          success: true,
          packageName: response.data.packageName,
          price: response.data.price,
          newBalance: response.data.newBalance,
          profit: response.data.profit,
          flagUrl: response.data.flagUrl,
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
          payment_intent_id: paymentIntentId,
          payment_method: data.payment_method
        }
      };
    } else {
      // If payment failed, void the payment intent
      if (paymentIntentId) {
        await stripeApi.cancelPaymentIntent(paymentIntentId);
      }

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
  } catch (error) {
    console.error('Error ordering eSIM:', error);
    const errorInfo = handleApiError(error);
    
    // If there was a payment intent created, try to cancel it
    if (data.payment_method === 'card' && (data as any).payment_intent_id) {
      try {
        await stripeApi.cancelPaymentIntent((data as any).payment_intent_id);
      } catch (cancelError) {
        console.error('Error canceling payment intent:', cancelError);
      }
    }
    
    return {
      success: false,
      ...errorInfo
    };
  }
};

// Add this function to your esimApi
export const changeEmail = async (data: ChangeEmailData): Promise<ApiResponse<void>> => {
  try {
    console.log('Changing email');
    
    const response = await api.post('/esimplan/changing_email.php', {
      current_password: data.current_password,
      new_email: data.new_email
    });

    console.log('Email change response:', response.data);

    if (response.data && response.data.success) {
      return {
        success: true,
        message: 'Email changed successfully'
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'Failed to change email',
        error_code: response.data.error_code
      };
    }
  } catch (error) {
    const errorInfo = handleApiError(error);
    console.error('Error changing email:', error);
    return {
      success: false,
      ...errorInfo
    };
  }
};

// Add this function to your esimApi object
export const changePassword = async (data: ChangePasswordData): Promise<ApiResponse<void>> => {
  try {
    console.log('Changing password');
    
    const response = await api.post('/esimplan/changing_password.php', {
      current_password: data.current_password,
      new_password: data.new_password,
      confirm_password: data.confirm_password
    });

    console.log('Password change response:', response.data);

    if (response.data && response.data.success) {
      return {
        success: true,
        message: 'Password changed successfully'
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'Failed to change password',
        error_code: response.data.error_code
      };
    }
  } catch (error) {
    const errorInfo = handleApiError(error);
    console.error('Error changing password:', error);
    return {
      success: false,
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

    if (axiosError.response?.data?.message) {
      return {
        message: axiosError.response.data.message,
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
    
    const response = await api.post('/esimplan/register_push_token.php', {
      token: data.token,
      device_type: data.deviceType,
      device_name: data.deviceName
    });

    console.log('Push token registration response:', response.data);

    if (response.data && response.data.success) {
      return {
        success: true,
        message: 'Push token registered successfully'
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'Failed to register push token',
        error_code: response.data.error_code
      };
    }
  } catch (error) {
    const errorInfo = handleApiError(error);
    console.error('Error registering push token:', error);
    return {
      success: false,
      ...errorInfo
    };
  }
};

export const deregisterPushToken = async (token: string): Promise<ApiResponse<void>> => {
  try {
    console.log('Deregistering push token:', token);
    
    const response = await api.delete('/esimplan/register_push_token.php', {
      data: { token }
    });

    console.log('Push token deregistration response:', response.data);

    if (response.data && response.data.success) {
      return {
        success: true,
        message: 'Push token deregistered successfully'
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'Failed to deregister push token',
        error_code: response.data.error_code
      };
    }
  } catch (error) {
   const errorInfo = handleApiError(error);
    console.error('Error deregistering push token:', error);
    return {
      success: false,
      ...errorInfo
    };
  }
};

export const verifyPushToken = async (token: string): Promise<ApiResponse<void>> => {
  try {
    console.log('Verifying push token:', token);
    
    const response = await api.post('/esimplan/register_push_token.php', {
      token,
      action: 'verify'
    });

    console.log('Push token verification response:', response.data);

    if (response.data && response.data.success) {
      return {
        success: true,
        message: 'Push token verified successfully'
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'Failed to verify push token',
        error_code: response.data.error_code
      };
    }
  } catch (error) {
    const errorInfo = handleApiError(error);
    console.error('Error verifying push token:', error);
    return {
      success: false,
      ...errorInfo
    };
  }
};

export const verifyGiftCard = async (cardNumber: string): Promise<ApiResponse<GiftCardResponse>> => {
  try {
    console.log('Verifying gift card:', cardNumber);
    
    const response = await api.post('/esimplan/gift_card_verification.php', {
      card_number: cardNumber
    });

    console.log('Gift card verification response:', response.data);

    if (response.data && response.data.status === 'success') {
      return {
        success: true,
        data: {
          status: response.data.status,
          message: response.data.message,
          amount: response.data.data.amount,
          user_email: response.data.user_email,
          business_email: response.data.business_email
        }
      };
    } else {
      return {
        success: false,
        message: response.data.message,
        error_code: response.data.error_code,
        user_email: response.data.user_email,
        business_email: response.data.business_email
      };
    }
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response?.data) {
      return {
        success: false,
        message: error.response.data.message,
        error_code: error.response.data.error_code,
        user_email: error.response.data.user_email,
        business_email: error.response.data.business_email
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
    const response = await api.get('/esimplan/get_balance.php');
    
    console.log('Balance response:', response.data);
    
    if (response.data && response.data.success) {
      return {
        success: true,
        data: {
          balance: Number(response.data.data.balance),
          currency: response.data.data.currency || 'USD'
        }
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

export const fetchOrders = async (page: number = 1): Promise<ApiResponse<OrdersResponse>> => {
  try {
    console.log('Fetching orders for page:', page);
    
    const response = await api.get('/public_app/api/order/get_orders.php', {
      params: { page }
    });

    console.log('Orders response:', response.data);

    if (response.data && response.data.success) {
      return {
        success: true,
        data: response.data
      };
    } else {
      console.warn('Orders API returned success: false:', response.data);
      return {
        success: false,
        message: response.data.message || 'Failed to fetch orders'
      };
    }
  } catch (error) {
    const errorMessage = handleApiError(error);
    console.error('Error fetching orders:', error);
    return {
      success: false,
      message: errorMessage
    };
  }
};

export const fetchEsimDetails = async (iccid: string): Promise<ApiResponse<EsimDetails>> => {
  try {
    console.log('Fetching eSIM details for ICCID:', iccid);
    
    const response = await api.get('/esimplan/get_esim_details.php', {
      params: { iccid }
    });

    console.log('eSIM details response:', response.data);

    if (response.data && response.data.success) {
      return {
        success: true,
        data: response.data.esim,
        cacheStatus: response.data.cacheStatus
      };
    } else {
      console.warn('API returned success: false:', response.data);
      return {
        success: false,
        message: response.data.message || 'Failed to fetch eSIM details'
      };
    }
  } catch (error) {
    const errorMessage = handleApiError(error);
    console.error('Error fetching eSIM details:', error);
    return {
      success: false,
      message: errorMessage
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
  orderAddOnPlan,
  redeemGiftCardAtCheckout,
  verifyGiftCardForDiscount,
};

export default esimApi;