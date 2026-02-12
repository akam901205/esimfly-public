/**
 * React Native Device Fingerprinting Hook
 * Collects unique device characteristics for fraud prevention
 */

import { useState, useEffect } from 'react';
import * as Device from 'expo-device';
import * as Localization from 'expo-localization';
import Constants from 'expo-constants';
import { Dimensions, Platform } from 'react-native';

export interface DeviceFingerprintData {
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
  hardwareConcurrency: number;
  deviceMemory?: number;
  colorDepth: number;
  pixelRatio: number;
  touchSupport: boolean;
  deviceInfo?: {
    brand: string;
    modelName: string;
    osName: string;
    osVersion: string;
  };
}

export function useDeviceFingerprint() {
  const [fingerprint, setFingerprint] = useState<DeviceFingerprintData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const collectFingerprint = async () => {
      try {
        const { width, height } = Dimensions.get('screen');
        const scale = Dimensions.get('window').scale;

        // Build comprehensive device fingerprint
        const data: DeviceFingerprintData = {
          userAgent: `${Device.brand || 'Unknown'} ${Device.modelName || 'Unknown'} ${Device.osName || Platform.OS} ${Device.osVersion || 'Unknown'}`,
          screenResolution: `${Math.round(width)}x${Math.round(height)}`,
          timezone: Localization.timezone || 'Unknown',
          language: Localization.locale || 'en-US',
          platform: Platform.OS,
          hardwareConcurrency: Constants.systemCPU || 1,
          deviceMemory: Constants.systemMemory ? Math.round(Constants.systemMemory / (1024 * 1024 * 1024)) : undefined, // Convert to GB
          colorDepth: 24, // Most mobile devices use 24-bit color
          pixelRatio: scale,
          touchSupport: true, // All mobile devices have touch
          deviceInfo: {
            brand: Device.brand || 'Unknown',
            modelName: Device.modelName || 'Unknown',
            osName: Device.osName || Platform.OS,
            osVersion: Device.osVersion || 'Unknown'
          }
        };

        setFingerprint(data);
      } catch (error) {
        console.error('Error collecting device fingerprint:', error);
        // Set minimal fingerprint if error occurs
        setFingerprint({
          userAgent: Platform.OS,
          screenResolution: '0x0',
          timezone: 'Unknown',
          language: 'en-US',
          platform: Platform.OS,
          hardwareConcurrency: 1,
          colorDepth: 24,
          pixelRatio: 1,
          touchSupport: true
        });
      } finally {
        setIsLoading(false);
      }
    };

    collectFingerprint();
  }, []);

  return { fingerprint, isLoading };
}
