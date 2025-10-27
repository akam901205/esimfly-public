const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Plugin to fix PayTabs manifest merger conflict
 * Based on: https://medium.com/@tola.adet/fixing-the-dreaded-android-manifest-merger-error-in-react-native-a-developers-guide-684da8d2bf12
 */
const withPayTabsManifest = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;

    // Add tools namespace to manifest root
    if (!manifest.manifest.$) {
      manifest.manifest.$ = {};
    }
    manifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    // Find the application element
    if (manifest.manifest.application && manifest.manifest.application[0]) {
      const application = manifest.manifest.application[0];

      if (!application.$) {
        application.$ = {};
      }

      // Set allowBackup to false to match PayTabs SDK requirement
      application.$['android:allowBackup'] = 'false';
      // Add tools:replace to override the conflict
      application.$['tools:replace'] = 'android:allowBackup';

      console.log('✓ PayTabs manifest conflict resolved: allowBackup=false with tools:replace');
    }

    return config;
  });
};

module.exports = withPayTabsManifest;