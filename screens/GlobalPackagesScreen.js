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

const ICON_COLORS = {
  network: '#1F2937',
  speed: '#FF6B00',
};

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
      <Ionicons name="arrow-back" size={24} color="#374151" />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>{globalPackageName || 'Global Plans'}</Text>
    <View style={styles.headerIcon}>
      <Ionicons name="globe-outline" size={24} color="#374151" />
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
      activeOpacity={0.9}
    >
      <View style={styles.packageItem}>
        <View style={styles.packageHeader}>
          <View style={styles.regionInfo}>
            <View style={styles.globeIconContainer}>
              <Ionicons name="globe-outline" size={18} color="#FF6B00" />
            </View>
            <Text style={styles.regionName}>Global</Text>
          </View>
          {item.speed && (
            <View style={[styles.speedContainer, { backgroundColor: `${ICON_COLORS.speed}15` }]}>
              <Ionicons name="speedometer-outline" size={16} color={ICON_COLORS.speed} />
              <Text style={[styles.speedText, { color: ICON_COLORS.speed }]}>
                {item.speed.toUpperCase()}
              </Text>
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
                <Ionicons name="cellular-outline" size={16} color={ICON_COLORS.network} />
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
              <View style={styles.buyButtonContent}>
                <View style={styles.buyButtonIconContainer}>
                  <Ionicons name="cart-outline" size={16} color="#FF6B00" />
                </View>
                <Text style={styles.buyButtonText}>BUY NOW</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#F8F9FA', '#F3F4F6']}
          style={styles.backgroundGradient}
        />
        <ActivityIndicator size="large" color="#FF6B00" />
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
      <LinearGradient
        colors={['#F8F9FA', '#F3F4F6']}
        style={styles.backgroundGradient}
      />
      {renderHeader()}
      <FlatList
        data={packages}
        renderItem={renderPackageItem}
        keyExtractor={(item, index) => `${item.packageCode}-${index}`}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={() => (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.noPackagesText}>
              No packages available for {globalPackageName || 'selected plan'}.
            </Text>
          </View>
        )}
        ListFooterComponent={<View style={styles.listFooter} />}
      />
      <NetworkModalGlobal
        visible={networkModalVisible}
        onClose={() => {
          setNetworkModalVisible(false);
          setTimeout(() => {
            setSelectedPackage(null);
          }, 300);
        }}
        packageData={selectedPackage || {}}
        globalPackageName={globalPackageName}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    borderBottomColor: '#E5E7EB',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    fontFamily: 'Quicksand-Bold',
    flex: 1,
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 80 : 60,
  },
  packageItem: {
    borderRadius: 16,
    marginBottom: 16,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
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
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  speedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B0010',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  speedText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#FF6B00',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  packageDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dataAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  validityPeriod: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    marginTop: 4,
    fontWeight: '500',
  },
  priceContainer: {
    alignItems: 'flex-end',
    minWidth: 120,
  },
  priceText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF6B00',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    marginBottom: 8,
  },
  buyButton: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  buyButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  buyButtonIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#FF6B0010',
    justifyContent: 'center',
    alignItems: 'center',
  },
  globeIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FF6B0010',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  buyButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
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
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    marginLeft: 4,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: colors.text.secondary,
    fontSize: 16,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    marginBottom: 8,
  },
  noPackagesText: {
    color: colors.text.secondary,
    fontSize: 16,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    marginTop: 20,
  },
  listFooter: {
    height: 20,
  },
  networkButton: {
    marginTop: 8,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  networkButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    marginLeft: 4,
  },
  networkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default GlobalPackagesScreen;