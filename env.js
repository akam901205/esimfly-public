const ENV = {
  development: {
    STRIPE_PUBLISHABLE_KEY: "pk_test_51QkpsjRsiK4Lxqyaz4hBVr6NyGJyM0Byyv4r2NDdPnhPaJbq6sRAlJZjij56Cmoaw5RRlMBHqLGePsFBFQC7UCzE003139zcQn",
    MERCHANT_ID: "merchant.net.esimfly.user.app",
    apiUrl: "https://esimfly.net",
    webhookUrl: "https://esimfly.net/pages/public_app/api/payments/webhook.php"
  },
  production: {
    // Production keys for later
    STRIPE_PUBLISHABLE_KEY: "your_live_key_here",
    MERCHANT_ID: "merchant.net.esimfly.user.app",
    apiUrl: "https://esimfly.net",
    webhookUrl: "https://esimfly.net/api/stripe/webhook"
  }
};

const getEnvVars = (env = process.env.NODE_ENV) => {
  if (env === "development") {
    return ENV.development;
  }
  return ENV.production;
};

export default getEnvVars;