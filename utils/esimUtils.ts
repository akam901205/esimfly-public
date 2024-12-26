import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Types
interface SupportedDevice {
  model: string;
  minOSVersion: number;
}

interface AndroidDevice {
  models: string[];
  identifiers?: string[];
  minVersion: number;
  yearIntroduced: number;
}

interface DeviceCapabilities {
  osVersion: number;
  deviceType: number;
  totalMemory?: number;
  manufacturer: string | null;
  modelName: string | null;
  modelId: string | null;
  brand: string | null;
  designName: string | null;
  productName: string | null;
  deviceYearClass: number;
  supportedCpuArchitectures: string[] | null;
}

// iOS Devices Database
const iOSSupportedDevices: SupportedDevice[] = [
  // Base models that introduced eSIM
  { model: 'iPhone11,2', minOSVersion: 12.0 }, // iPhone XS
  { model: 'iPhone11,4', minOSVersion: 12.0 }, // iPhone XS Max
  { model: 'iPhone11,6', minOSVersion: 12.0 }, // iPhone XS Max Global
  { model: 'iPhone11,8', minOSVersion: 12.0 }, // iPhone XR
  
  // All subsequent models support eSIM
  // iPhone 11 Series
  { model: 'iPhone12,1', minOSVersion: 13.0 }, // iPhone 11
  { model: 'iPhone12,3', minOSVersion: 13.0 }, // iPhone 11 Pro
  { model: 'iPhone12,5', minOSVersion: 13.0 }, // iPhone 11 Pro Max
  { model: 'iPhone12,8', minOSVersion: 13.0 }, // iPhone SE 2nd Gen
  
  // iPhone 12 Series
  { model: 'iPhone13,1', minOSVersion: 14.0 }, // iPhone 12 Mini
  { model: 'iPhone13,2', minOSVersion: 14.0 }, // iPhone 12
  { model: 'iPhone13,3', minOSVersion: 14.0 }, // iPhone 12 Pro
  { model: 'iPhone13,4', minOSVersion: 14.0 }, // iPhone 12 Pro Max
  
  // iPhone 13 Series
  { model: 'iPhone14,4', minOSVersion: 15.0 }, // iPhone 13 Mini
  { model: 'iPhone14,5', minOSVersion: 15.0 }, // iPhone 13
  { model: 'iPhone14,2', minOSVersion: 15.0 }, // iPhone 13 Pro
  { model: 'iPhone14,3', minOSVersion: 15.0 }, // iPhone 13 Pro Max
  
  // iPhone 14 Series
  { model: 'iPhone14,7', minOSVersion: 16.0 }, // iPhone 14
  { model: 'iPhone14,8', minOSVersion: 16.0 }, // iPhone 14 Plus
  { model: 'iPhone15,2', minOSVersion: 16.0 }, // iPhone 14 Pro
  { model: 'iPhone15,3', minOSVersion: 16.0 }, // iPhone 14 Pro Max
  
  // iPhone 15 Series
  { model: 'iPhone15,4', minOSVersion: 17.0 }, // iPhone 15
  { model: 'iPhone15,5', minOSVersion: 17.0 }, // iPhone 15 Plus
  { model: 'iPhone16,1', minOSVersion: 17.0 }, // iPhone 15 Pro
  { model: 'iPhone16,2', minOSVersion: 17.0 }, // iPhone 15 Pro Max
];

// Android Manufacturers Database
const androidManufacturers: Record<string, AndroidDevice[]> = {
  'Samsung': [
    {
      models: [
        'SM-F700', 'SM-F707', 'SM-F711', 'SM-F721', // Flip series
        'SM-F900', 'SM-F907', 'SM-F916', 'SM-F926', 'SM-F936', 'SM-F946', // Fold series
        'SM-G980', 'SM-G981', 'SM-G985', 'SM-G986', 'SM-G988', // S20 series
        'SM-G990', 'SM-G991', 'SM-G996', 'SM-G998', // S21 series
        'SM-S901', 'SM-S906', 'SM-S908', // S22 series
        'SM-S911', 'SM-S916', 'SM-S918', // S23 series
      ],
      minVersion: 9,
      yearIntroduced: 2020
    }
  ],
  'Google': [
    {
      models: ['Pixel'],
      identifiers: [
        'walleye', 'taimen', // Pixel 2
        'blueline', 'crosshatch', // Pixel 3
        'flame', 'coral', // Pixel 4
        'redfin', 'bramble', // Pixel 5
        'oriole', 'raven', // Pixel 6
        'panther', 'cheetah', // Pixel 7
        'shiba', 'husky', // Pixel 8
      ],
      minVersion: 9,
      yearIntroduced: 2017
    }
  ],
  'OnePlus': [
    {
      models: [
        'OnePlus 8', 'OnePlus 8T', 'OnePlus 9', 
        'OnePlus 9 Pro', 'OnePlus 10 Pro', 'OnePlus 11'
      ],
      minVersion: 9,
      yearIntroduced: 2020
    }
  ],
  'Nothing': [
    {
      models: ['Nothing Phone'],
      minVersion: 9,
      yearIntroduced: 2022
    }
  ],
  'Motorola': [
    {
      models: ['razr', 'edge', 'edge+', 'edge 20', 'edge 30'],
      minVersion: 9,
      yearIntroduced: 2020
    }
  ],
  'Sony': [
    {
      models: ['Xperia 1', 'Xperia 5', 'Xperia 10'],
      minVersion: 9,
      yearIntroduced: 2020
    }
  ]
};

// Helper Functions
const getDeviceCapabilities = async (): Promise<DeviceCapabilities> => {
  return {
    osVersion: parseFloat(Device.osVersion),
    deviceType: await Device.getDeviceTypeAsync(),
    totalMemory: Device.totalMemory,
    manufacturer: Device.manufacturer,
    modelName: Device.modelName,
    modelId: Device.modelId,
    brand: Device.brand,
    designName: Device.designName,
    productName: Device.productName,
    deviceYearClass: Device.deviceYearClass,
    supportedCpuArchitectures: Device.supportedCpuArchitectures,
  };
};

const checkIOSESIMSupport = (deviceInfo: DeviceCapabilities): boolean => {
  try {
    // Check minimum OS version
    if (deviceInfo.osVersion < 12.0) return false;

    // Check against known supported devices
    if (deviceInfo.modelId) {
      const isSupported = iOSSupportedDevices.some(device => 
        deviceInfo.modelId?.includes(device.model) && 
        deviceInfo.osVersion >= device.minOSVersion
      );

      if (isSupported) return true;

      // Future-proof check for newer models
      const modelNumber = parseFloat(deviceInfo.modelId.replace('iPhone', ''));
      if (modelNumber >= 11.2) { // XS and later always support eSIM
        return true;
      }
    }

    // Additional future-proof checks
    const isNewDevice = deviceInfo.deviceYearClass >= 2018;
    const hasHighMemory = deviceInfo.totalMemory ? deviceInfo.totalMemory >= 2 * 1024 * 1024 * 1024 : false;

    return isNewDevice && hasHighMemory;
  } catch (error) {
    console.error('Error in iOS eSIM support check:', error);
    return false;
  }
};

const checkAndroidESIMSupport = (deviceInfo: DeviceCapabilities): boolean => {
  try {
    if (!deviceInfo.manufacturer || !deviceInfo.modelName || deviceInfo.osVersion < 9) {
      return false;
    }

    const manufacturerLower = deviceInfo.manufacturer.toLowerCase();
    const modelLower = deviceInfo.modelName.toLowerCase();
    const productLower = deviceInfo.productName?.toLowerCase() || '';

    // Check known manufacturers
    for (const [brand, devices] of Object.entries(androidManufacturers)) {
      if (manufacturerLower.includes(brand.toLowerCase())) {
        for (const device of devices) {
          // Check model numbers
          const modelMatch = device.models.some(model => 
            modelLower.includes(model.toLowerCase())
          );

          // Check identifiers
          const identifierMatch = device.identifiers?.some(id => 
            productLower.includes(id.toLowerCase())
          );

          if (modelMatch || identifierMatch) {
            return deviceInfo.osVersion >= device.minVersion;
          }
        }
      }
    }

    // Future-proof checks for unknown/newer models
    const isNewDevice = deviceInfo.deviceYearClass >= 2020;
    const hasHighMemory = deviceInfo.totalMemory ? deviceInfo.totalMemory >= 4 * 1024 * 1024 * 1024 : false;
    const isHighEndManufacturer = [
      'samsung', 'google', 'oneplus', 'sony', 'motorola', 'nothing', 'xiaomi', 'oppo', 'vivo'
    ].some(brand => manufacturerLower.includes(brand));

    // Samsung-specific future-proof check
    if (manufacturerLower.includes('samsung')) {
      const modelMatch = modelLower.match(/sm-[fgns](\d{3}|\d{4})/i);
      if (modelMatch) {
        const modelNumber = parseInt(modelMatch[1]);
        if (modelNumber >= 900 || modelLower.includes('fold') || modelLower.includes('flip')) {
          return true;
        }
      }
    }

    // Generic future-proof check
    return isHighEndManufacturer && isNewDevice && hasHighMemory && deviceInfo.osVersion >= 10;

  } catch (error) {
    console.error('Error in Android eSIM support check:', error);
    return false;
  }
};

// Main Export Functions
export const checkESIMSupport = async (): Promise<boolean> => {
  try {
    const deviceInfo = await getDeviceCapabilities();
    console.log('Device Capabilities:', deviceInfo);

    // Basic device type check
    if (deviceInfo.deviceType === Device.DeviceType.DESKTOP || 
        deviceInfo.deviceType === Device.DeviceType.UNKNOWN) {
      return false;
    }

    // Platform-specific checks
    if (Platform.OS === 'ios') {
      return checkIOSESIMSupport(deviceInfo);
    }

    if (Platform.OS === 'android') {
      return checkAndroidESIMSupport(deviceInfo);
    }

    return false;
  } catch (error) {
    console.error('Error checking eSIM support:', error);
    return false;
  }
};

export const getESIMStatus = async () => {
  const deviceInfo = await getDeviceCapabilities();
  const isSupported = await checkESIMSupport();

  return {
    isSupported,
    deviceInfo: {
      manufacturer: deviceInfo.manufacturer,
      model: deviceInfo.modelName,
      modelId: deviceInfo.modelId,
      os: Platform.OS,
      osVersion: deviceInfo.osVersion,
      yearClass: deviceInfo.deviceYearClass
    }
  };
};

export const getESIMCarriers = async (): Promise<string[]> => {
  return ['Carrier support check not implemented'];
};