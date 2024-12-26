import React from 'react';
import { View, Image } from 'react-native';

// Import only needed PNG images
const DiscoverGlobalIcon = require('../assets/flags/global/discover-global.png');

const createGlobalComponent = (iconSource) => (props) => (
  <View style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}>
    <Image
      source={iconSource}
      style={{ width: 45, height: 45 }}
      resizeMode="contain"
    />
  </View>
);

const DiscoverGlobalComponent = createGlobalComponent(DiscoverGlobalIcon);

export const globalPackages = [
  { 
    id: "discover-global", 
    name: "Discover Global",
    image: DiscoverGlobalComponent 
  }
];

// Helper function to check if a package is a global package
export const isGlobalPackage = (packageName) => {
  const normalizedName = packageName.toLowerCase();
  return normalizedName.includes('discover global');
};

// Helper function to get the appropriate global icon component
export const getGlobalIcon = (packageName) => {
  return DiscoverGlobalComponent; // Now always returns DiscoverGlobalComponent
};

export default {
  globalPackages,
  isGlobalPackage,
  getGlobalIcon,
};