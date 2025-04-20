import Constants from 'expo-constants';
import getEnvVars from './env';

const ENV = getEnvVars();

export default {
  stripe: {
    publishableKey: ENV.STRIPE_PUBLISHABLE_KEY,
    merchantId: ENV.MERCHANT_ID,
  },
  api: {
    baseUrl: ENV.apiUrl,
    webhookUrl: ENV.webhookUrl,
  },
  app: {
    name: 'eSimFly',
    website: 'https://esimfly.net',
    scheme: 'esimfly'
  }
};