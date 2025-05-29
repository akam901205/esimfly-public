const ENV = {
  development: {
    STRIPE_PUBLISHABLE_KEY: "pk_test_51RG2D2QWsnHfV82B6REWVQkt54sufye1qezd220k5KnIUEhTZ8zSgK3qcbkiwv7uQ736MVCperOxslEenpj0yTK700Gv9z9Gs1",
    MERCHANT_ID: "merchant.net.esimfly.user.app",
    apiUrl: "https://esimfly.net",
    webhookUrl: "https://esimfly.net/api/stripe/webhook"
  },
  production: {
    // Production keys for later
    STRIPE_PUBLISHABLE_KEY: "pk_test_51RG2D2QWsnHfV82B6REWVQkt54sufye1qezd220k5KnIUEhTZ8zSgK3qcbkiwv7uQ736MVCperOxslEenpj0yTK700Gv9z9Gs1",
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