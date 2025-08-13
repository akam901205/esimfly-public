# Android App Links Fix for eSIMfly (EAS Build)

## Problem
The app doesn't open when clicking `https://esimfly.net` links (like `https://esimfly.net?ref=IBO3151`). Instead, the link opens in the browser.

## Root Cause
Even though `app.config.js` has the correct intent filters configured, EAS Build's `expo prebuild` process isn't generating the required HTTPS intent filters in `AndroidManifest.xml`.

## Solution Overview
1. Create a custom Expo config plugin to ensure intent filters are added
2. Add deep link handling to the app
3. Build with EAS (no local installation required)

## Step-by-Step Fix

### Step 1: Create Config Plugin

Create a new file `plugins/withAndroidAppLinks.js`:

```javascript
const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withAndroidAppLinks(config) {
  return withAndroidManifest(config, async config => {
    const androidManifest = config.modResults;
    
    const mainApplication = androidManifest.manifest.application?.[0];
    if (!mainApplication) return config;
    
    const mainActivity = mainApplication.activity?.find(
      activity => activity.$['android:name'] === '.MainActivity'
    );
    
    if (!mainActivity) return config;
    
    if (!mainActivity['intent-filter']) {
      mainActivity['intent-filter'] = [];
    }
    
    // Check if HTTPS filter already exists
    const hasHttpsFilter = mainActivity['intent-filter'].some(filter => 
      filter.data?.some(data => data.$['android:scheme'] === 'https')
    );
    
    if (!hasHttpsFilter) {
      // Add App Links intent filter
      mainActivity['intent-filter'].push({
        $: { 'android:autoVerify': 'true' },
        action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
        category: [
          { $: { 'android:name': 'android.intent.category.DEFAULT' } },
          { $: { 'android:name': 'android.intent.category.BROWSABLE' } }
        ],
        data: [
          { 
            $: { 
              'android:scheme': 'https', 
              'android:host': 'esimfly.net',
              'android:pathPrefix': '/'
            } 
          },
          { 
            $: { 
              'android:scheme': 'https', 
              'android:host': 'www.esimfly.net',
              'android:pathPrefix': '/'
            } 
          }
        ]
      });
    }
    
    return config;
  });
};
```

### Step 2: Update app.config.js

Add the plugin to your `app.config.js` in the plugins array:

```javascript
{
  expo: {
    // ... your existing config
    plugins: [
      // ... your existing plugins
      "./plugins/withAndroidAppLinks"  // Add this line
    ]
  }
}
```

### Step 3: Add Deep Link Handling

Update `AppNavigator.tsx` to handle incoming URLs:

```typescript
// Add these imports at the top
import * as Linking from 'expo-linking';

// Add this before your AppNavigator function (around line 200)
const linking = {
  prefixes: ['esimfly://', 'https://esimfly.net', 'https://www.esimfly.net'],
  config: {
    screens: {
      Welcome: '',
      Auth: {
        screens: {
          Login: 'login',
          SignUp: 'signup',
          ForgotPassword: 'forgot-password',
          ResetPassword: 'reset-password'
        }
      },
      Main: {
        screens: {
          Shop: {
            screens: {
              ShopMain: 'shop',
              PackageType: 'packages/:country',
              CountryPackages: 'packages/:country/list',
              PackageDetails: 'package/:id'
            }
          },
          'My eSims': 'my-esims',
          Guides: 'guides',
          Profile: {
            screens: {
              ProfileMain: 'profile',
              OrderHistory: 'orders',
              Deposit: 'deposit'
            }
          }
        }
      }
    }
  }
};

// Update NavigationContainer (around line 453)
// Change from:
<NavigationContainer>

// To:
<NavigationContainer linking={linking}>
```

### Step 4: Handle Referral Codes

Update `App.tsx` to capture referral codes from URLs:

```typescript
// Add this import if not already present
import * as Linking from 'expo-linking';

// Add this function after your imports (around line 50)
function useDeepLinkHandler() {
  useEffect(() => {
    // Handle initial URL if app was opened from a link
    Linking.getInitialURL().then((url) => {
      if (url) {
        const { queryParams } = Linking.parse(url);
        if (queryParams?.ref) {
          // Store the referral code
          AsyncStorage.setItem('referralCode', queryParams.ref as string)
            .then(() => console.log('Stored referral code:', queryParams.ref))
            .catch(err => console.error('Error storing referral code:', err));
        }
      }
    });

    // Handle URL changes while app is open
    const subscription = Linking.addEventListener('url', (event) => {
      const { queryParams } = Linking.parse(event.url);
      if (queryParams?.ref) {
        AsyncStorage.setItem('referralCode', queryParams.ref as string)
          .then(() => console.log('Updated referral code:', queryParams.ref))
          .catch(err => console.error('Error updating referral code:', err));
      }
    });

    return () => subscription.remove();
  }, []);
}

// Then in your App component, add this line before the return statement:
export default function App() {
  const [isReady, setIsReady] = useState(false);
  
  useDeepLinkHandler(); // Add this line
  
  // ... rest of your component
}
```

### Step 5: Build with EAS

```bash
# For production build (AAB for Play Store)
eas build --platform android --profile production

# For testing (APK)
eas build --platform android --profile preview
```

### Step 6: Testing (No ADB Required)

After installing the app from the EAS build:

1. **Wait 20-30 seconds** for Android to verify the app links

2. **Test methods:**

   **Method 1: WhatsApp/Telegram/Email**
   - Send yourself: `https://esimfly.net?ref=IBO3151`
   - Click the link
   - App should open directly

   **Method 2: Notes App**
   - Create a note with: `https://esimfly.net?ref=IBO3151`
   - Make sure it becomes a clickable link
   - Tap it

   **Method 3: QR Code**
   - Generate a QR code for: `https://esimfly.net?ref=IBO3151`
   - Scan with any QR scanner
   - App should open

   **Method 4: Google Chrome**
   - Type in address bar: `https://esimfly.net?ref=IBO3151`
   - If working, you'll see "Open in eSIMfly" option

## Verification

### Success Indicators:
- ✅ App opens directly without browser
- ✅ No "Open with" dialog
- ✅ Referral code is captured (check AsyncStorage)

### If Not Working:
- ❌ Browser opens instead
- ❌ "Open with" dialog appears
- ❌ App not listed as option

## Troubleshooting

### 1. App Links Still Not Working
- Ensure you waited 20-30 seconds after install
- Try uninstalling and reinstalling the app
- Check that `assetlinks.json` is accessible: https://esimfly.net/.well-known/assetlinks.json

### 2. Build Errors
- Make sure `plugins/withAndroidAppLinks.js` is in the correct location
- Verify the plugin is added to `app.config.js`
- Check EAS build logs for errors

### 3. Referral Code Not Captured
- Add console.log statements to debug
- Check if Linking handlers are being called
- Verify AsyncStorage is working

## Important Notes

1. **assetlinks.json** is already correctly configured on your server ✅
2. **SHA256 fingerprints** in assetlinks.json match your app certificates ✅
3. **No local tools needed** - everything runs on EAS servers
4. **First time setup** may take longer for Android to verify

## Files Modified
1. Created: `plugins/withAndroidAppLinks.js`
2. Modified: `app.config.js`
3. Modified: `AppNavigator.tsx`
4. Modified: `App.tsx`

## Next Steps
After implementing these changes:
1. Commit the changes
2. Push to your repository
3. Run `eas build --platform android --profile production`
4. Submit to Play Store or test with preview build