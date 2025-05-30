export default {
  expo: {
    name: 'eSimFly',
    slug: 'esimfly-public',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    scheme: 'esimfly',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    backgroundColor: '#1E1E1E',
    splash: {
      image: './assets/splash.png',
      imageWidth: 200,
      resizeMode: 'contain',
      backgroundColor: '#1E1E1E'
    },
    androidNavigationBar: {
      backgroundColor: '#1E1E1E',
      barStyle: 'light-content'
    },
    androidStatusBar: {
      backgroundColor: '#1E1E1E',
      barStyle: 'light-content',
      translucent: false
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'net.esimfly.user.app',
      googleServicesFile: './GoogleService-Info.plist',
      config: {
        googleSignIn: {
          reservedClientId: 'com.googleusercontent.apps.1011374155272-a494qa47ev6t5ngn5n8a0p08mbknp7eu',
        },
        stripe: {
          merchantIdentifier: 'merchant.net.esimfly.user.app',
          enableApplePay: true,
          merchantCapabilities: ['3DS', 'debit', 'credit'],
          supportedNetworks: ['visa', 'mastercard', 'amex']
        }
      },
      usesAppleSignIn: true,
      buildNumber: '1',
      infoPlist: {
        LSApplicationQueriesSchemes: [
          'itms-apps',
          'stripe',
          'stripecheckout',
          'merchant.net.esimfly.user.app',
          'esimfly'
        ],
        NSCameraUsageDescription: 'Allow eSimFly to access your camera to scan QR codes.',
        NSNotificationUsageDescription: "We'll send you updates about your eSIM status, account activities, and important alerts.",
        UIBackgroundModes: [
          'remote-notification',
          'fetch',
          'processing'
        ]
      },
      jsEngine: 'hermes',
      deploymentTarget: '15.1'
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#1E1E1E'
      },
      package: 'net.esimfly.user.app',
      googleServicesFile: './google-services.json',
      permissions: [
        'INTERNET',
        'CAMERA',
        'NOTIFICATIONS',
        'android.permission.VIBRATE',
        'android.permission.RECEIVE_BOOT_COMPLETED',
        'android.permission.POST_NOTIFICATIONS',
        'android.permission.BILLING',
        'com.google.android.gms.permission.PAYMENTS'
      ],
      config: {
        googleSignIn: {
          apiKey: 'AIzaSyD0LjpBFaDVVo31gbKCuZ6Ys78sl0CfyyM',
          certificateHash: '97c27b89b3aee4ec38ce4b22143147b0cdfd2610',
        },
        googlePay: {
          environment: 'test',
          apiVersion: 2,
          apiVersionMinor: 0,
          merchantId: 'merchant.net.esimfly.user.app',
          allowedCardNetworks: ['VISA', 'MASTERCARD', 'AMEX'],
          allowedCardAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
          billingAddressRequired: true,
          billingAddressParameters: {
            format: 'FULL',
            phoneNumberRequired: true
          }
        }
      },
      versionCode: 1,
      softwareKeyboardLayoutMode: 'pan',
      jsEngine: 'hermes'
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/favicon.png'
    },
    plugins: [
      'expo-router',
      'expo-camera',
      'expo-localization',
      'expo-tracking-transparency',
      [
        'expo-build-properties',
        {
          android: {
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            buildToolsVersion: '35.0.0',
            kotlinVersion: '1.9.24',
          },
          ios: {
            useFrameworks: 'static',
            deploymentTarget: '15.1'
          },
        },
      ],
      [
        '@react-native-firebase/app',
        {
          android_google_services_version: '4.4.0',
          ios_google_services_version: '10.18.0',
        },
      ],
      '@react-native-firebase/auth',
      [
        '@react-native-google-signin/google-signin',
        {
          iosUrlScheme: 'com.googleusercontent.apps.1011374155272-a494qa47ev6t5ngn5n8a0p08mbknp7eu',
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/notification_icon.png',
          color: '#1E1E1E',
          androidCollapsedTitle: 'eSimFly',
          iosDisplayInForeground: true,
          channels: [
            {
              name: 'default',
              importance: 'max',
              vibrationPattern: [0, 250, 250, 250],
              lightColor: '#FF231F7C'
            }
          ]
        }
      ],
      [
        '@stripe/stripe-react-native',
        {
          enableGooglePay: true,
          enableApplePay: true,
          merchantIdentifier: 'merchant.net.esimfly.user.app',
          newArchEnabled: true,
          returnUrlScheme: 'esimfly',
          urlScheme: 'esimfly',
          standardMode: false,
          setSystemLocaleReporting: true,
          distributionMode: 'development'
        }
      ],
      [
        'expo-document-picker',
        {
          iCloudContainerEnvironment: 'Production'
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {
        origin: false
      },
      eas: {
        projectId: 'a60875e0-8d9c-43f8-8f0f-ac4605f91fb1'
      },
      stripe: {
        publishableKey: "pk_test_51QkpsjRsiK4Lxqyaz4hBVr6NyGJyM0Byyv4r2NDdPnhPaJbq6sRAlJZjij56Cmoaw5RRlMBHqLGePsFBFQC7UCzE003139zcQn",
        merchantId: "merchant.net.esimfly.user.app",
        useTestApi: true,
        googlePay: {
          testEnv: true,
          merchantCountryCode: 'US',
          currencyCode: 'USD',
          billingAddressRequired: true,
          emailRequired: true
        },
        applePay: {
          merchantCapabilities: ['3DS', 'debit', 'credit'],
          supportedNetworks: ['visa', 'mastercard', 'amex'],
          countryCode: 'US',
          currencyCode: 'USD',
          requiredBillingContactFields: ['emailAddress', 'name', 'phoneNumber', 'postalAddress']
        }
      }
    },
    owner: 'akam90'
  }
};