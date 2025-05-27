import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { countries } from '../utils/countryData';
import NetworkModalGlobal from '../components/NetworkModalGlobal';
import { colors } from '../theme/colors'; //
import { newApi } from '../api/api';
import { getNetworks, formatLocationNetworkList } from '../utils/PackageFilters';

const API_BASE_URL = 'https://esimfly.net/pages/esimplan';

const ICON_COLORS = {
  header: colors.icon.header,    // For header icons
  network: '#007AFF',           // For card icons (matching regional)
  speed: '#2563eb',            // Keep blue for speed indicator
};


const packageColors = [
  [colors.background.secondary, colors.background.secondary], // Using the same color for both gradient stops to match regional
];

const GlobalPackagesScreen = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const route = useRoute();
  const navigation = useNavigation();
const [networkModalVisible, setNetworkModalVisible] = useState(false);
const [selectedPackage, setSelectedPackage] = useState(null);

  
  const { packageType, globalPackageName } = route.params || {};

  const getCountryName = useCallback((code) => {
    if (!code) return code;
    const foundCountry = countries.find(c => c.id === code.toLowerCase().trim());
    return foundCountry ? foundCountry.name : code;
  }, []);

console.log('[DEBUG] GlobalPackagesScreen params:', route.params);

  const parseIncompleteJSON = (jsonString) => {
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      console.log('[DEBUG] Initial parse failed, attempting to fix JSON');
      const plansMatch = jsonString.match(/"plans":\s*(\[[\s\S]*?\])(?=,\s*"pagination")/);
      if (plansMatch && plansMatch[1]) {
        try {
          const plansArray = JSON.parse(plansMatch[1]);
          return { plans: plansArray };
        } catch (e) {
          console.error('[DEBUG] Failed to parse plans array:', e);
        }
      }
      throw new Error('Unable to parse JSON response');
    }
  };

  const normalizeDuration = (duration) => {
    const lowerDuration = duration.toLowerCase();
    const number = parseInt(lowerDuration);
    if (lowerDuration.includes('day')) {
      return `${number} day${number > 1 ? 's' : ''}`;
    }
    return lowerDuration;
  };

  const adjustDataDisplay = (data) => {
    if (data === 49) return 50;
    return data;
  };

   const getSearchTerm = (packageName) => {
  // Normalize search terms to match database naming
  const normalized = packageName.toLowerCase();
  if (normalized.includes('139')) {
    return 'Global139';
  } else if (normalized.includes('138')) {
    return 'Global138';
  } else if (normalized.includes('120+')) {
    return 'Global';
  } else if (normalized.includes('discover global')) {
    return 'Global';
  } else if (normalized.includes('106')) {
    return 'Global';
  }
  return 'Global';
};

const fetchPackages = useCallback(async () => {
  if (!globalPackageName) {
    console.log('[DEBUG] No package name provided');
    setLoading(false);
    return;
  }

  try {
    console.log(`[DEBUG] Fetching packages for: ${globalPackageName}, type: ${packageType}`);
    
    // Use the new API to fetch global packages
    const response = await newApi.get('/user/esims/packages', {
      params: { 
        type: 'global',
        limit: 200 
      }
    }).catch(error => {
      console.error('[DEBUG] Package fetch error:', error);
      return { data: { data: { packages: [] } } };
    });

    const allPackages = response.data?.data?.packages || [];

    console.log(`[DEBUG] Total packages before filtering: ${allPackages.length}`);
    console.log(`[DEBUG] Raw packages:`, allPackages);

    // Map packages to match expected format
    const mappedPackages = allPackages.map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      price: pkg.price,
      data: pkg.isUnlimited ? 'Unlimited' : pkg.data,
      duration: pkg.duration,
      provider: pkg.provider,
      unlimited: pkg.isUnlimited,
      isUnlimited: pkg.isUnlimited,
      voice_minutes: pkg.voiceMinutes,
      sms_count: pkg.smsCount,
      flagUrl: pkg.flagUrl,
      packageCode: pkg.slug,
      speed: pkg.speed || '4G',
      networks: pkg.networks || [],
      coverage: pkg.coverage || [],
      coverages: pkg.coverages || [],
      region: pkg.region || 'Global',
      regionCountries: pkg.coverage || [],
      // Add coverage_countries for fallback
      coverage_countries: pkg.coverage_countries || pkg.coverage || []
    }));

    // Filter packages based on package type
    const filteredPackages = mappedPackages.filter(pkg => {
      if (!pkg || !pkg.name) return false;

      const pkgName = pkg.name.trim().toLowerCase();
      
      // Filter based on package type
      if (packageType === 'voice_sms') {
        // Only include packages with voice or SMS (check for non-null, non-undefined values)
        return (pkg.voice_minutes !== null && pkg.voice_minutes !== undefined && pkg.voice_minutes > 0) || 
               (pkg.sms_count !== null && pkg.sms_count !== undefined && pkg.sms_count > 0);
      } else if (packageType === 'unlimited') {
        // Only include unlimited packages
        return pkg.unlimited || pkg.isUnlimited;
      } else if (packageType === 'regular') {
        // Only include regular (non-unlimited, non-voice/SMS) packages
        return !pkg.unlimited && !pkg.isUnlimited && 
               (pkg.voice_minutes === null || pkg.voice_minutes === undefined || pkg.voice_minutes === 0) && 
               (pkg.sms_count === null || pkg.sms_count === undefined || pkg.sms_count === 0);
      }
      
      return true;
    });

    console.log(`[DEBUG] Filtered packages count: ${filteredPackages.length}`);
    filteredPackages.forEach(pkg => {
      console.log(`[DEBUG] Filtered package: ${pkg.name}, Data: ${pkg.data}, Region: ${pkg.region}`);
    });

    // Group packages by data and duration
   const groupedPackages = new Map();
    filteredPackages.forEach(pkg => {
      const key = `${pkg.data}-${pkg.duration}`;
      if (!groupedPackages.has(key) || parseFloat(pkg.price) < parseFloat(groupedPackages.get(key).price)) {
        groupedPackages.set(key, pkg);
      }
    });

    const uniquePackages = Array.from(groupedPackages.values());
    
    // Modified sorting logic - sort by price first
    const sortedPackages = uniquePackages.sort((a, b) => {
      // First sort by price (ascending)
      const priceA = parseFloat(a.price) || 0;
      const priceB = parseFloat(b.price) || 0;
      if (priceA !== priceB) {
        return priceA - priceB;
      }
      
      // For same price, handle unlimited packages next
      const isUnlimitedA = a.unlimited || (typeof a.data === 'string' && a.data.toLowerCase().includes('unlimited'));
      const isUnlimitedB = b.unlimited || (typeof b.data === 'string' && b.data.toLowerCase().includes('unlimited'));
      
      if (isUnlimitedA && !isUnlimitedB) return -1;
      if (!isUnlimitedA && isUnlimitedB) return 1;
      
      // For same price and unlimited status, sort by data amount
      const dataA = parseFloat(a.data) || 0;
      const dataB = parseFloat(b.data) || 0;
      return dataB - dataA;  // Higher data first for same price
    });

    setPackages(sortedPackages);
    setError(null);

    console.log(`[DEBUG] Final sorted packages: ${sortedPackages.length}`);
    sortedPackages.forEach(pkg => {
      console.log(`[DEBUG] Final package: ${pkg.name}, Data: ${pkg.data}, Price: ${pkg.price}`);
    });

  } catch (err) {
    console.error('[DEBUG] Error fetching packages:', err);
    setError('Failed to fetch packages. Please try again.');
  } finally {
    setLoading(false);
  }
}, [globalPackageName, packageType]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

const renderHeader = () => (
  <View style={styles.header}>
    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
      <Ionicons name="arrow-back" size={24} color={ICON_COLORS.header} />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>{globalPackageName || 'Global Plans'}</Text>
    <View style={styles.headerIcon}>
      <Ionicons name="globe-outline" size={24} color={ICON_COLORS.header} />
    </View>
  </View>
);

const formatDuration = (duration) => {
    if (!duration) return '';
    
    // Convert duration to string if it's a number
    const durationStr = duration.toString().toLowerCase();
    
    // Extract the numeric value
    const number = parseInt(durationStr);
    if (isNaN(number)) return duration;
    
    // Return formatted string
    return `${number} DAY${number !== 1 ? 'S' : ''}`;
  };

const renderPackageItem = ({ item, index }) => {
  const gradientColors = packageColors[index % packageColors.length];
  
  const getCountryCount = (item) => {
    const pkgName = item.name?.toLowerCase() || '';
    
    // For esimaccess packages
    if (item.regionCountries?.length > 0) {
      return item.regionCountries.length;
    }
    
    // Fallback to package name parsing
    if (pkgName.includes('139')) return 139;
    if (pkgName.includes('138')) return 138;
    if (pkgName.includes('106')) return 106;
    if (pkgName.includes('120+')) return 120;
    
    return 120; // Default fallback
  };

const handleNetworkPress = () => {
  if (!item) {
    console.log('[DEBUG] No package data to show in modal');
    return;
  }

  console.log('[DEBUG] Package data for modal:', {
    name: item.name,
    networks: item.networks?.length,
    coverage: item.coverage?.length,
    coverages: item.coverages?.length,
    provider: item.provider
  });
  
  setSelectedPackage(item);
  setNetworkModalVisible(true);
};

  const getNetworkCount = (item) => {
    if (item.provider === 'esimgo') {
      return item.networks?.reduce((total, country) => total + (country.networks?.length || 1), 0) || 0;
    } else if (item.provider === 'airalo') {
      return item.networks?.length || 0;
    } else {
      // For esimaccess packages
      console.log('\n[DEBUG-PACKAGE] ========== START NETWORK COUNT ==========');
      console.log('[DEBUG-PACKAGE] Package:', {
        name: item.name,
        provider: item.provider,
        totalNetworks: item.networks?.length,
        totalRegionCountries: item.regionCountries?.length
      });
      
      const networksByLocation = {};
      
      // First, create a map of all valid locations from regionCountries
      const validLocations = new Set();
      (item.regionCountries || []).forEach(code => {
        const countryName = getCountryName(code);
        validLocations.add(countryName);
        console.log('[DEBUG-PACKAGE] Added valid location:', {
          code,
          resolvedName: countryName
        });
      });
      
      console.log('[DEBUG-PACKAGE] Total valid locations:', validLocations.size);
      console.log('[DEBUG-PACKAGE] Valid locations:', Array.from(validLocations));

      // Create a map to track which networks were skipped and why
      const skippedNetworks = new Map();

      // Only process networks for valid locations
      (item.networks || []).forEach(network => {
        const locationName = getCountryName(network?.location || '');
        const networkName = network?.name || 'Network Operator';
        
        if (validLocations.has(locationName)) {
          if (!networksByLocation[locationName]) {
            networksByLocation[locationName] = new Set();
          }
          networksByLocation[locationName].add(networkName);
          
          console.log('[DEBUG-PACKAGE] Added network:', {
            location: locationName,
            networkName: networkName,
            currentLocationTotal: networksByLocation[locationName].size
          });
        } else {
          if (!skippedNetworks.has(locationName)) {
            skippedNetworks.set(locationName, new Set());
          }
          skippedNetworks.get(locationName).add(networkName);
          console.log('[DEBUG-PACKAGE] Skipped network - location not in regionCountries:', {
            location: locationName,
            networkName: networkName
          });
        }
      });

      // Print skipped networks summary
      console.log('\n[DEBUG-PACKAGE] Skipped Networks Summary:');
      skippedNetworks.forEach((networks, location) => {
        console.log(`[DEBUG-PACKAGE] ${location}: ${networks.size} networks skipped`);
      });

      // Count total unique networks only for valid locations
      let totalNetworks = 0;
      console.log('\n[DEBUG-PACKAGE] Final Network Counts by Location:');
      Object.entries(networksByLocation).forEach(([location, networks]) => {
        totalNetworks += networks.size;
        console.log('[DEBUG-PACKAGE] Location networks:', {
          location,
          uniqueNetworks: networks.size,
          networksArray: Array.from(networks),
          runningTotal: totalNetworks
        });
      });

      console.log('[DEBUG-PACKAGE] ========== NETWORK COUNT SUMMARY ==========');
      console.log('[DEBUG-PACKAGE] Total valid locations:', validLocations.size);
      console.log('[DEBUG-PACKAGE] Total locations with networks:', Object.keys(networksByLocation).length);
      console.log('[DEBUG-PACKAGE] Locations with skipped networks:', skippedNetworks.size);
      console.log('[DEBUG-PACKAGE] Final network count:', totalNetworks);
      console.log('[DEBUG-PACKAGE] ========== END NETWORK COUNT ==========\n');

      return totalNetworks;
    }
  };

  const navigateToDetails = () => {
    navigation.navigate('GlobalPackageDetails', {
      package: item,
      globalPackageName: globalPackageName
    });
  };
  
  return (
    <TouchableOpacity
      onPress={navigateToDetails}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.packageItem}
      >
        <View style={styles.packageHeader}>
          <View style={styles.regionInfo}>
            <Ionicons name="globe-outline" size={24} color={ICON_COLORS.network} />
            <Text style={styles.regionName}>Global</Text>
          </View>
          {item.speed && (
            <View style={[styles.speedContainer, { backgroundColor: `${ICON_COLORS.speed}15` }]}>
              <Ionicons name="cellular" size={16} color={ICON_COLORS.speed} />
              <Text style={[styles.speedText, { color: ICON_COLORS.speed }]}>{item.speed}</Text>
            </View>
          )}
        </View>

        <View style={styles.packageDetails}>
          <View>
            <Text style={styles.dataAmount}>
              {typeof item.data === 'string' && item.data.toLowerCase().includes('unlimited') 
                ? 'Unlimited' 
                : `${adjustDataDisplay(parseFloat(item.data))} GB`}
            </Text>
            <Text style={styles.validityPeriod}>
              VALID FOR {formatDuration(item.duration)}
            </Text>
            <TouchableOpacity
              onPress={() => handleNetworkPress()}
              style={styles.networkButton}
            >
              <View style={styles.networkContent}>
                <Ionicons name="globe-outline" size={16} color={ICON_COLORS.network} />
                <Text style={styles.networkButtonText}>
                  {getCountryCount(item)} Countries
                </Text>
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>${parseFloat(item.price).toFixed(2)}</Text>
            <TouchableOpacity 
              onPress={navigateToDetails}
              style={styles.buyButton}
            >
              <Text style={styles.buyButtonText}>BUY NOW</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

 return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <FlatList
        data={packages}
        renderItem={renderPackageItem}
        keyExtractor={(item, index) => `${item.packageCode}-${index}`}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={() => (
          <Text style={styles.noPackagesText}>
            No packages available for {globalPackageName || 'selected plan'}.
          </Text>
        )}
      />
      {networkModalVisible && selectedPackage && (
        <NetworkModalGlobal
          visible={networkModalVisible}
          onClose={() => {
            setNetworkModalVisible(false);
            setSelectedPackage(null);
          }}
          packageData={selectedPackage}
          globalPackageName={globalPackageName}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
 header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
 headerIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.background.headerIcon,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border.header,
    },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    fontFamily: 'Quicksand',
  },
  listContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 90 : 70,
  },
  packageItem: {
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  regionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  regionName: {
    marginLeft: 8,
    fontSize: 18,
    color: colors.text.primary,
    fontFamily: 'Quicksand',
  },
  speedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  speedText: {
    color: '#FF6B6B',
    marginLeft: 4,
    fontSize: 14,
    fontFamily: 'Quicksand',
  },
  packageDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dataAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.primary,
    fontFamily: 'Quicksand',
  },
  validityPeriod: {
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: 'Quicksand',
    marginTop: 4,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text.primary,  // Updated to use theme's primary text color
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    marginBottom: 8,
  },
  buyButton: {
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
      backgroundColor: '#2196f3',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 100,
      ...Platform.select({
        ios: {
          shadowColor: '#15803d',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    buyButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.stone[50],
      fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
      textAlign: 'center',
      letterSpacing: 0.5,
    },
  networkStatsContainer: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    color: colors.text.secondary,
    fontSize: 12,
    fontFamily: 'Quicksand',
    marginLeft: 4,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'Quicksand',
  },
  noPackagesText: {
    color: colors.text.secondary,
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'Quicksand',
    marginTop: 20,
  },
  listFooter: {
    height: 20,
  },
  buttonContainer: {
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
 networkButton: {
      marginTop: 8,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: colors.stone[100],
      borderWidth: 1,
      borderColor: colors.stone[200],
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      ...Platform.select({
        ios: {
          shadowColor: colors.stone[900],
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
        },
        android: {
          elevation: 1,
        },
      }),
    },
    networkContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    networkButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.stone[600],
      fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
      marginLeft: 4,
    },
  button: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    elevation: 3,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    marginLeft: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
});

export default GlobalPackagesScreen;