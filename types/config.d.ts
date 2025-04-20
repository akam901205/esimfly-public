// src/types/config.d.ts
declare module '../config' {
  interface Config {
    stripe: {
      publishableKey: string;
      merchantId: string;
    };
    api: {
      baseUrl: string;
      webhookUrl: string;
    };
    app: {
      name: string;
      website: string;
      scheme: string;
    };
  }

  const config: Config;
  export default config;
}