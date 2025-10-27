import {
  RNPaymentSDKLibrary,
  PaymentSDKConfiguration,
  PaymentSDKBillingDetails
} from '@paytabs/react-native-paytabs';

export interface PayTabsConfig {
  profileID: string;
  serverKey: string;
  clientKey: string;
  currency: string;
  isTestMode?: boolean;
}

export interface PayTabsPaymentData {
  cartID: string;
  amount: number;
  cartDescription: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  screenTitle?: string;
  billingAddress?: {
    name: string;
    email: string;
    phone: string;
    addressLine: string;
    city: string;
    state: string;
    countryCode: string;
    zip: string;
  };
  shippingAddress?: {
    name: string;
    email: string;
    phone: string;
    addressLine: string;
    city: string;
    state: string;
    countryCode: string;
    zip: string;
  };
}

export class PayTabsService {
  private config: PayTabsConfig;

  constructor(config: PayTabsConfig) {
    this.config = config;
  }

  /**
   * Create a PayTabs payment configuration for eSIM purchases and balance top-ups
   */
  createPaymentConfiguration(paymentData: PayTabsPaymentData): PaymentSDKConfiguration {
    const configuration = new PaymentSDKConfiguration();

    // Basic payment info
    configuration.profileID = this.config.profileID;
    configuration.serverKey = this.config.serverKey;
    configuration.clientKey = this.config.clientKey;
    configuration.cartID = paymentData.cartID;
    configuration.currency = this.config.currency;
    configuration.amount = paymentData.amount;
    configuration.cartDescription = paymentData.cartDescription;

    // Create minimal billing details for digital services (SDK requires these fields)
    const billingDetails = new PaymentSDKBillingDetails();
    billingDetails.name = paymentData.customerName;
    billingDetails.email = paymentData.customerEmail;
    billingDetails.phone = paymentData.customerPhone || '+964 700 000 0000';
    billingDetails.addressLine = 'N/A'; // Minimal placeholder for digital service
    billingDetails.city = 'Baghdad'; // Required by SDK
    billingDetails.state = 'BG'; // Minimal state code
    billingDetails.countryCode = 'IQ';
    billingDetails.zip = '10001'; // Required by SDK

    configuration.billingDetails = billingDetails;

    // Shipping details not required for digital services (eSIMs, balance top-up)
    // configuration.shippingDetails = billingDetails; // Removed

    // Merchant details
    configuration.merchantName = 'eSIMfly Public';
    configuration.merchantCountryCode = 'IQ';
    configuration.screenTitle = paymentData.screenTitle || 'Card Payment';

    // Payment options - Hide billing form but provide data in background
    configuration.hideShipping = true;
    configuration.showBillingInfo = false; // Hide billing form from user
    configuration.showShippingInfo = false;

    return configuration;
  }

  /**
   * Start PayTabs card payment
   */
  async startCardPayment(paymentData: PayTabsPaymentData): Promise<any> {
    try {
      console.log('PayTabs Service - Starting payment with data:', paymentData);

      const configuration = this.createPaymentConfiguration(paymentData);

      console.log('PayTabs Configuration Created:', {
        profileID: configuration.profileID,
        serverKey: configuration.serverKey ? 'SET' : 'NOT SET',
        clientKey: configuration.clientKey ? 'SET' : 'NOT SET',
        cartID: configuration.cartID,
        amount: configuration.amount,
        currency: configuration.currency,
        merchantName: configuration.merchantName,
        merchantCountryCode: configuration.merchantCountryCode,
        screenTitle: configuration.screenTitle,
        billingDetailsType: typeof configuration.billingDetails,
        shippingDetailsType: typeof configuration.shippingDetails
      });

      // Debug the billing details
      if (configuration.billingDetails) {
        console.log('Billing Details:', {
          name: configuration.billingDetails.name,
          email: configuration.billingDetails.email,
          phone: configuration.billingDetails.phone,
          countryCode: configuration.billingDetails.countryCode
        });
      }

      console.log('About to call PayTabs SDK...');

      const result = await RNPaymentSDKLibrary.startCardPayment(JSON.stringify(configuration));

      console.log('PayTabs SDK Result:', result);
      return result;

    } catch (error) {
      console.error('PayTabs Service Error Details:', {
        error: error,
        errorMessage: error.message,
        errorCode: error.code,
        errorStack: error.stack
      });
      throw new Error(`PayTabs SDK Error: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Start PayTabs Apple Pay payment (if supported)
   */
  async startApplePayPayment(paymentData: PayTabsPaymentData): Promise<any> {
    try {
      const configuration = this.createPaymentConfiguration(paymentData);

      // Apple Pay specific configuration
      configuration.applePayMerchantID = 'merchant.net.esimfly.app';

      const result = await RNPaymentSDKLibrary.startApplePayPayment(JSON.stringify(configuration));

      console.log('PayTabs Apple Pay Result:', result);
      return result;

    } catch (error) {
      console.error('PayTabs Apple Pay error:', error);
      throw error;
    }
  }

  /**
   * Query transaction status
   */
  async queryTransaction(transactionReference: string): Promise<any> {
    try {
      const configuration = new PaymentSDKConfiguration();
      configuration.profileID = this.config.profileID;
      configuration.serverKey = this.config.serverKey;
      configuration.clientKey = this.config.clientKey;

      const result = await RNPaymentSDKLibrary.queryTransaction(
        JSON.stringify(configuration),
        transactionReference
      );

      return result;
    } catch (error) {
      console.error('PayTabs query transaction error:', error);
      throw error;
    }
  }
}

// Default PayTabs configuration for Iraq (Production)
export const defaultPayTabsConfig: PayTabsConfig = {
  profileID: '167819', // Production profile ID
  serverKey: 'SKJ92ZMRTJ-JLTGW2BD96-N2ZRBGBJJB', // Production server key
  clientKey: 'C2K2Q6-D9GN6B-7TVM2D-9VKVBN', // Production client key
  currency: 'IQD',
  isTestMode: false
};

export default PayTabsService;