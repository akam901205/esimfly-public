export default {
  expo: {
    name: "eSimFly",
    slug: "esimfly-public",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    scheme: "esimfly",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    backgroundColor: "#1E1E1E",
    splash: {
      image: "./assets/splash-icon.png",
      imageWidth: 200,
      resizeMode: "contain",
      backgroundColor: "#1E1E1E"
    },
    androidNavigationBar: {
      backgroundColor: "#1E1E1E",
      barStyle: "light-content"
    },
    androidStatusBar: {
      backgroundColor: "#1E1E1E",
      barStyle: "light-content",
      translucent: false
    },
    ios: {
      supportsTablet: true,
      infoPlist: {
        LSApplicationQueriesSchemes: ["itms-apps"],
        NSCameraUsageDescription: "Allow eSimFly to access your camera to scan QR codes.",
        NSNotificationUsageDescription: "We'll send you updates about your eSIM status, account activities, and important alerts.",
        UIBackgroundModes: [
          "remote-notification",
          "fetch",
          "processing"
        ]
      },
      jsEngine: "hermes"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#1E1E1E"
      },
      permissions: [
        "INTERNET",
        "CAMERA",
        "NOTIFICATIONS",
        "android.permission.VIBRATE",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.POST_NOTIFICATIONS"
      ],
      softwareKeyboardLayoutMode: "pan",
      jsEngine: "hermes"
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-router",
      "expo-camera",
      [
        "expo-notifications",
        {
          icon: "./assets/notification_icon.png",
          color: "#1E1E1E",
          androidCollapsedTitle: "eSimFly",
          iosDisplayInForeground: true,
          channels: [
            {
              name: "default",
              importance: "max",
              vibrationPattern: [0, 250, 250, 250],
              lightColor: "#FF231F7C"
            }
          ]
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
        projectId: "a60875e0-8d9c-43f8-8f0f-ac4605f91fb1"
      }
    },
    owner: "akam90"
  }
};