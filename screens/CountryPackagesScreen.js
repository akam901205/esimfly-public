import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { countries, FlagIcon } from '../utils/countryData';
import NetworkModal from '../components/NetworkModalSingelCountry';
import { colors } from '../theme/colors';
import { newApi } from '../api/api';

const packageColors = [['#f4f4f5', '#f4f4f5']];

const ICON_COLORS = {
  network: '#FF6B00',
  speed: '#FF6B00',
};

const CountryPackagesScreen = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [networkModalVisible, setNetworkModalVisible] = useState(false);
  const [selectedNetworks, setSelectedNetworks] = useState([]);
  const route = useRoute();
  const navigation = useNavigation();
  const { country, packageType } = route.params;
	
const getNetworks = (packageData) => {
    const networks = [];
    
    // Add speed information if available
    if (packageData.speed) {
      networks.push({
        type: 'speed',
        value: packageData.speed,
        icon: 'speedometer-outline'
      });
    }

    // Process networks based on provider type
    if (packageData.packageCode?.startsWith('airalo_')) {
      // Airalo provider
      if (packageData.coverages && packageData.coverages.length > 0) {
        packageData.coverages.forEach(coverage => {
          if (coverage.networks && coverage.networks.length > 0) {
            coverage.networks.forEach(network => {
              networks.push({
                type: 'network',
                value: network.name,
                icon: 'wifi-outline'
              });
            });
          }
        });
      }
    } else if (packageData.id?.startsWith('esim_')) {
      // ESIMgo provider
      if (packageData.networks && Array.isArray(packageData.networks)) {
        packageData.networks.forEach(countryNetwork => {
          if (countryNetwork.networks && Array.isArray(countryNetwork.networks)) {
            countryNetwork.networks.forEach(network => {
              if (network.name) {
                networks.push({
                  type: 'network',
                  value: network.name,
                  icon: 'wifi-outline',
                  speeds: network.type ? network.type.split(',').map(s => s.trim()) : []
                });
              }
            });
          } else if (countryNetwork.name) {
            networks.push({
              type: 'network',
              value: countryNetwork.name,
              icon: 'wifi-outline',
              speeds: countryNetwork.type ? countryNetwork.type.split(',').map(s => s.trim()) : []
            });
          }
        });
      }
    } else {
      // ESIMaccess provider
      if (packageData.networks && packageData.networks.length > 0) {
        packageData.networks.forEach(network => {
          if (typeof network === 'object' && network.name) {
            networks.push({
              type: 'network',
              value: network.name,
              icon: 'wifi-outline',
              speeds: network.type ? network.type.split(/[,\/]/).map(t => t.trim().toUpperCase()) : []
            });
          } else if (typeof network === 'string') {
            networks.push({
              type: 'network',
              value: network,
              icon: 'wifi-outline'
            });
          }
        });
      }
    }

    return networks;
  };
	
const handleNetworkPress = (packageData) => {
    const networks = getNetworks(packageData);
    setSelectedNetworks(networks);
    setNetworkModalVisible(true);
  };
	


  const getNetworkCount = (plan) => {
    // For Provider 2 (esim_)
    if (plan.id?.startsWith('esim_')) {
      if (plan.networks && Array.isArray(plan.networks)) {
        let count = 0;
        plan.networks.forEach(countryNetwork => {
          // Check if networks is nested inside country object
          if (countryNetwork.networks && Array.isArray(countryNetwork.networks)) {
            count += countryNetwork.networks.length;
          }
          // Handle direct network objects
          else if (countryNetwork.name) {
            count += 1;
          }
        });
        return count;
      }
      return 0;
    }
    
    // For Provider 3 (Airalo)
    if (plan.packageCode?.startsWith('airalo_')) {
      if (plan.coverages && Array.isArray(plan.coverages)) {
        let count = 0;
        plan.coverages.forEach(coverage => {
          if (coverage.networks && Array.isArray(coverage.networks)) {
            count += coverage.networks.length;
          }
        });
        return count;
      }
      return 0;
    }
    
    // For Provider 1 (ESIMaccess) and others
    return Array.isArray(plan.networks) ? plan.networks.length : 0;
  };
	
const filterOptimalPackages = (packages) => {
  // Separate unlimited and regular packages
  const unlimitedPackages = packages.filter(pkg => 
    pkg.data === 'Unlimited' || pkg.data === Infinity || pkg.unlimited
  );
  
  const regularPackages = packages.filter(pkg => 
    pkg.data !== 'Unlimited' && pkg.data !== Infinity && !pkg.unlimited
  );

  // Only apply optimization to regular packages
  const optimizedRegularPackages = regularPackages.filter(currentPkg => {
    return !regularPackages.some(otherPkg => {
      if (currentPkg === otherPkg) return false;

      const currentPrice = parseFloat(currentPkg.price);
      const otherPrice = parseFloat(otherPkg.price);
      const currentData = parseFloat(currentPkg.data);
      const otherData = parseFloat(otherPkg.data);
      
      // Cross-data amount comparison
      if (otherData > currentData) {
        // Remove current package if there's another with more data for same/less price
        if (otherPrice <= currentPrice && otherPkg.duration >= currentPkg.duration) {
          return true;
        }

        // Remove if price difference is minimal (within 10%) but data difference is significant (>20%)
        const priceDiffPercentage = (otherPrice - currentPrice) / currentPrice;
        const dataDiffPercentage = (otherData - currentData) / currentData;
        
        if (priceDiffPercentage <= 0.1 && dataDiffPercentage > 0.2 && 
            otherPkg.duration >= currentPkg.duration) {
          return true;
        }
      }


      return false;
    });
  });

  // For unlimited packages, only filter within unlimited packages for better duration/price
  const optimizedUnlimitedPackages = unlimitedPackages.filter(currentPkg => {
    return !unlimitedPackages.some(otherPkg => {
      if (currentPkg === otherPkg) return false;

      const currentPrice = parseFloat(currentPkg.price);
      const otherPrice = parseFloat(otherPkg.price);
      
      // Only compare unlimited packages with same or better duration
      if (otherPkg.duration >= currentPkg.duration) {
        // Remove if other package is cheaper or same price with longer duration
        return otherPrice < currentPrice || 
               (otherPrice === currentPrice && otherPkg.duration > currentPkg.duration);
      }
      
      return false;
    });
  });

  // Combine optimized packages
  return [...optimizedUnlimitedPackages, ...optimizedRegularPackages];
};


 const fetchPackages = useCallback(async () => {
    try {
      console.log('[DEBUG] Fetching packages for:', { country, packageType });
      setLoading(true);
      
      // Fetch packages from the new API
      const response = await newApi.get('/user/esims/packages', {
        params: { 
          country: country,
          type: 'country',
          limit: 100 
        }
      }).catch(error => {
        console.error('[DEBUG] Package fetch error:', error);
        return { data: { data: { packages: [] } } };
      });

      // Process packages from the new API
      let allPackages = response.data?.data?.packages || [];
      
      // Map the packages to match the expected format
      allPackages = allPackages.map(plan => {
        // Fix esimgo data format issues (0.98 -> 1, 1.95 -> 2, etc.)
        let correctedData = plan.data;
        if (!plan.isUnlimited && plan.data) {
          const dataValue = parseFloat(plan.data);
          // Debug log for esimgo packages
          if (plan.provider === 'esimgo' || plan.id?.startsWith('esim_')) {
            console.log('[DEBUG] ESIMgo data correction:', {
              provider: plan.provider,
              originalData: plan.data,
              parsedValue: dataValue,
              name: plan.name
            });
          }
          
          // Common esimgo data mappings
          if (dataValue >= 0.95 && dataValue <= 1.05) correctedData = 1;
          else if (dataValue >= 1.9 && dataValue <= 2.1) correctedData = 2;
          else if (dataValue >= 2.9 && dataValue <= 3.1) correctedData = 3;
          else if (dataValue >= 4.8 && dataValue <= 5.2) correctedData = 5;
          else if (dataValue >= 9.7 && dataValue <= 10.3) correctedData = 10;
          else if (dataValue >= 19.4 && dataValue <= 20.6) correctedData = 20;
          else if (dataValue >= 48.5 && dataValue <= 50.5) correctedData = 50;
          else if (dataValue >= 97 && dataValue <= 100) correctedData = 100;
          else {
            // For other values, round to nearest integer if close
            const rounded = Math.round(dataValue);
            if (Math.abs(dataValue - rounded) < 0.1) {
              correctedData = rounded;
            } else {
              correctedData = dataValue;
            }
          }
          
          // Log the correction if it happened
          if (correctedData !== dataValue && (plan.provider === 'esimgo' || plan.id?.startsWith('esim_'))) {
            console.log('[DEBUG] ESIMgo data corrected:', dataValue, '->', correctedData);
          }
        }
        
        const dataValue = plan.isUnlimited ? Infinity : correctedData;
        const duration = plan.duration || 0;
        const price = plan.price || 0;

        return {
          id: plan.id,
          name: plan.name,
          price: price,
          data: dataValue,
          duration: duration,
          provider: plan.provider,
          isUnlimited: plan.isUnlimited,
          voiceMinutes: plan.voiceMinutes,
          smsCount: plan.smsCount,
          flagUrl: plan.flagUrl,
          packageCode: plan.slug,
          // Add fields that might be needed for network display
          speed: plan.speed || null,
          networks: plan.networks || [],
          coverages: plan.coverages || [],
          unlimited: dataValue === Infinity || plan.isUnlimited,
          networkCount: 0 // Will be calculated later
        };
      });

      // Filter out packages with less than 1GB data and 1-day packages
      allPackages = allPackages.filter(pkg => 
        (pkg.unlimited || pkg.data >= 1) && pkg.duration > 1
      );

      // Filter by country
      const countryFilteredPackages = allPackages.filter(pkg => {
        const searchCountry = country.toLowerCase();
        const pkgRegion = (pkg.region || '').toLowerCase();
        const pkgName = (pkg.name || '').toLowerCase();
        
        return pkgRegion.includes(searchCountry) || 
               pkgName.includes(searchCountry);
      });

    // First pass: Group packages by data and duration
    const packageGroups = new Map();
    
    countryFilteredPackages.forEach(pkg => {
      const key = `${pkg.data}-${pkg.duration}`;
      if (!packageGroups.has(key)) {
        packageGroups.set(key, []);
      }
      packageGroups.get(key).push(pkg);
    });

    // Second pass: For each group, keep only the best package
    let optimizedPackages = [];
    packageGroups.forEach((packages, key) => {
      // Sort packages in the group by price (ascending) and provider priority
      const sortedPackages = packages.sort((a, b) => {
        if (a.price !== b.price) {
          return a.price - b.price; // Cheaper price first
        }
        // If prices are equal, sort by provider priority
        const providerPriority = {
          'esimaccess': 3,
          'airalo': 2,
          'esimgo': 1
        };
        return providerPriority[b.provider] - providerPriority[a.provider];
      });
      
      // Keep only the first (best) package from each group
      optimizedPackages.push(sortedPackages[0]);
    });

    // Third pass: Remove suboptimal packages
   // Third pass: Remove suboptimal packages with separate logic for unlimited packages
optimizedPackages = optimizedPackages.filter(currentPkg => {
  return !optimizedPackages.some(otherPkg => {
    if (currentPkg === otherPkg) return false;

    // If current package is unlimited, use simpler filtering logic
    if (currentPkg.unlimited) {
      // Only filter out if there's another unlimited package with:
      // 1. Same duration but lower price, or
      // 2. Longer duration but same or lower price
      if (otherPkg.unlimited) {
        if (currentPkg.duration === otherPkg.duration) {
          return otherPkg.price < currentPkg.price;
        }
        if (otherPkg.duration > currentPkg.duration) {
          return otherPkg.price <= currentPkg.price;
        }
      }
      return false;
    }

    // Regular package filtering logic
    if (!currentPkg.unlimited) {

      // If other package has more data, same or longer duration, but same or lower price
      if (otherPkg.data > currentPkg.data && 
          otherPkg.duration >= currentPkg.duration && 
          otherPkg.price <= currentPkg.price) {
        return true;
      }

      // NEW: If packages have same data amount, filter out shorter duration with higher price
      if (Math.abs(otherPkg.data - currentPkg.data) < 0.1) { // Same data amount (with small tolerance)
        // If current package has shorter duration but costs more or same
        if (currentPkg.duration < otherPkg.duration && currentPkg.price >= otherPkg.price) {
          console.log(`[DEBUG] Filtering out: ${currentPkg.name} (${currentPkg.data}GB, ${currentPkg.duration} days, $${currentPkg.price}) because ${otherPkg.name} (${otherPkg.data}GB, ${otherPkg.duration} days, $${otherPkg.price}) is better`);
          return true;
        }
      }

      // Check for disproportionate price increases (same duration)
      if (currentPkg.duration === otherPkg.duration && otherPkg.data < currentPkg.data) {
        const dataIncreaseFactor = currentPkg.data / otherPkg.data;
        const priceIncreaseFactor = currentPkg.price / otherPkg.price;
        
        // Calculate price per GB for both packages
        const currentPricePerGB = currentPkg.price / currentPkg.data;
        const otherPricePerGB = otherPkg.price / otherPkg.data;
        
        // If bigger package has higher price per GB, it's bad value
        if (currentPricePerGB > otherPricePerGB * 1.1) { // Allow only 10% tolerance
          console.log(`[DEBUG] Filtering out bad value package: ${currentPkg.name} (${currentPkg.data}GB at $${currentPricePerGB.toFixed(2)}/GB) vs ${otherPkg.name} (${otherPkg.data}GB at $${otherPricePerGB.toFixed(2)}/GB)`);
          return true;
        }
        
        // Also filter if price increase is more than data increase (with small tolerance)
        if (priceIncreaseFactor > dataIncreaseFactor * 1.05) { // Only 5% tolerance
          console.log(`[DEBUG] Filtering out disproportionate price: ${currentPkg.name} (${currentPkg.data}GB, $${currentPkg.price}) - ${priceIncreaseFactor.toFixed(2)}x price for ${dataIncreaseFactor.toFixed(2)}x data`);
          return true;
        }
      }

    }

    return false;
  });
});

    // Filter by package type
    const typeFilteredPackages = packageType === 'unlimited' 
      ? optimizedPackages.filter(pkg => pkg.unlimited)
      : optimizedPackages.filter(pkg => !pkg.unlimited);

    // Final sorting
    const sortedPackages = typeFilteredPackages.sort((a, b) => {
  // First by price (ascending)
  if (a.price !== b.price) {
    return a.price - b.price;
  }
  // Then by data amount (descending) for same price
  if (a.data !== b.data) {
    return b.data - a.data;
  }
  // Finally by duration (descending) for same price and data
  return b.duration - a.duration;
});

    console.log(`[DEBUG] Final packages count: ${sortedPackages.length}`);
    setPackages(sortedPackages);
    setError(null);

  } catch (err) {
    console.error('[DEBUG] Error fetching packages:', err);
    setError('Failed to fetch packages. Please try again.');
  } finally {
    setLoading(false);
  }
}, [country, packageType]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const renderHeader = () => (
  <View style={styles.header}>
    <TouchableOpacity 
      onPress={() => navigation.goBack()} 
      style={styles.headerIcon}
    >
      <Ionicons 
        name="arrow-back" 
        size={24} 
        color="#374151" 
      />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>{country} Plans</Text>
    <View style={styles.headerIcon}>
      <Ionicons 
        name="pricetag-outline" 
        size={24} 
        color="#374151" 
      />
    </View>
  </View>
);

  const formatDataAmount = (data) => {
    if (data === 'Unlimited' || data === Infinity) return 'Unlimited';
    const numericData = parseFloat(data);
    if (isNaN(numericData)) return data;
    if (numericData >= 1) {
      // Format whole numbers without decimals (1.0 -> 1)
      const displayValue = Number.isInteger(numericData) || numericData % 1 === 0 
        ? Math.floor(numericData) 
        : numericData;
      return displayValue === 49 ? '50 GB' : `${displayValue} GB`;
    }
    return `${numericData * 1000} MB`;
  };

  const getHighestSpeed = (speed) => {
    if (!speed) return null;
    
    let speeds = [];
    if (Array.isArray(speed)) {
      speeds = speed.map(s => s.toLowerCase());
    } else if (typeof speed === 'string') {
      speeds = speed.toLowerCase().split(/[^a-z0-9]+/);
    } else {
      return null;
    }
    
    const speedOrder = ['2g', '3g', '4g', '5g'];
    return speedOrder.reduce((highest, current) => 
      speeds.includes(current) ? current : highest
    , null);
  };

const renderPackageItem = ({ item, index }) => {
  const countryCode = countries.find(c => 
    c.name.toLowerCase() === country.toLowerCase()
  )?.id || '';
  const highestSpeed = getHighestSpeed(item.speed);

  const handlePackagePress = () => {
    navigation.navigate('PackageDetails', {
      package: {
        ...item,
        data: item.data,
        price: item.price,
        duration: typeof item.duration === 'string' ? 
          item.duration.replace(' days', '') : item.duration,
        unlimited: item.unlimited || item.data === 'Unlimited',
        region: item.region,
        networkCount: item.networkCount
      },
      country: country
    });
  };

  return (
    <TouchableOpacity onPress={handlePackagePress} activeOpacity={0.9}>
      <View style={styles.packageItem}>
        <View style={styles.packageHeader}>
          <View style={styles.countryInfo}>
            <FlagIcon countryCode={countryCode} size={24} />
            <Text style={styles.countryName}>{country}</Text>
          </View>
          {highestSpeed && (
            <View style={[styles.speedContainer, { backgroundColor: `${ICON_COLORS.speed}15` }]}>
              <Ionicons name="speedometer-outline" size={16} color={ICON_COLORS.speed} />
              <Text style={[styles.speedText, { color: ICON_COLORS.speed }]}>
                {highestSpeed.toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.packageDetails}>
          <View>
            <Text style={styles.dataAmount}>
              {item.data === 'Unlimited' || item.unlimited 
                ? 'Unlimited' 
                : formatDataAmount(item.data)}
            </Text>
            <Text style={styles.validityPeriod}>
              VALID FOR {item.duration} DAYS
            </Text>
            {item.networkCount > 0 && (
              <TouchableOpacity
                onPress={() => handleNetworkPress(item)}
                style={styles.networkButton}
              >
                <View style={styles.networkContent}>
                  <Ionicons 
                    name="cellular-outline" 
                    size={16} 
                    color={ICON_COLORS.network}
                  />
                  <Text style={styles.networkButtonText}>Networks</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>
              ${item.price.toFixed(2)}
            </Text>
            <TouchableOpacity 
              onPress={handlePackagePress} 
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
	  keyExtractor={(item, index) => `${item.id}-${index}`}
	  contentContainerStyle={styles.listContainer}
	  ListEmptyComponent={() => (
		<View style={styles.emptyStateContainer}>
		  {loading ? (
			<ActivityIndicator size="large" color="#FF6B00" />
		  ) : (
			<Text style={styles.noPackagesText}>
			  No packages available for this selection.
			</Text>
		  )}
		</View>
	  )}
	  ListFooterComponent={<View style={styles.listFooter} />}
	/>
      
      <NetworkModal
        visible={networkModalVisible}
        onClose={() => setNetworkModalVisible(false)}
        networks={selectedNetworks}
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
  listFooter: {
    height: 20,
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
  countryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryName: {
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
    minWidth: 120, // Ensure consistent width for price container
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
  buyButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    padding: 16,
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
  gradientBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  networkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  networkText: {
    color: colors.text.secondary,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    marginLeft: 4,
  },
  coverageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  coverageItem: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  coverageText: {
    color: colors.text.secondary,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  featureIcon: {
    width: 16,
    height: 16,
    marginRight: 4,
  },
  featureText: {
    color: colors.text.secondary,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: 8,
  },
  badgeContainer: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.stone[800],
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: colors.background.primary,
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    fontWeight: 'bold',
  },
  refreshButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.stone[800],
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    color: colors.text.secondary,
    fontSize: 16,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    marginTop: 12,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.stone[800],
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.background.primary,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    fontWeight: 'bold',
  },
  networkButtonContainer: {
    marginTop: 8,
    borderRadius: 6,
  },
networkButton: {
    marginTop: 8,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FF6B0010',
    borderWidth: 1,
    borderColor: '#FF6B0020',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    ...Platform.select({
      ios: {
        shadowColor: '#FF6B00',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  networkButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF6B00',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    marginLeft: 4,
  },
  networkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CountryPackagesScreen;