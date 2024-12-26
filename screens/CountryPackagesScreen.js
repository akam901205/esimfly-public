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

const API_BASE_URL = 'https://esimfly.net/pages/esimplan';
const packageColors = [['#2A2A2A', '#1E1E1E']];

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

      // Same data amount comparison
      if (currentData === otherData) {
        const currentPricePerDay = currentPrice / currentPkg.duration;
        const otherPricePerDay = otherPrice / otherPkg.duration;
        
        // Other package is cheaper per day
        if (otherPricePerDay < currentPricePerDay) {
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
      
      // Fetch packages from all providers
      const [firstResponse, secondResponse, thirdResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/get_plans_esimaccess.php`, {
          params: { search: country, limit: 100 }
        }).catch(error => {
          console.error('[DEBUG] ESIMaccess fetch error:', error);
          return { data: { plans: [] } };
        }),
        axios.get(`${API_BASE_URL}/get_plans_esimgo.php`, {
          params: { search: country, limit: 100 }
        }).catch(error => {
          console.error('[DEBUG] ESIMgo fetch error:', error);
          return { data: { plans: [] } };
        }),
        axios.get(`${API_BASE_URL}/get_plans_airalo.php`, {
          params: { search: country, limit: 100 }
        }).catch(error => {
          console.error('[DEBUG] Airalo fetch error:', error);
          return { data: { plans: [] } };
        })
      ]);

      // Process and combine all plans with provider information
      let allPackages = [
        ...firstResponse.data.plans.map(plan => ({ ...plan, provider: 'esimaccess' })),
        ...secondResponse.data.plans.map(plan => ({ ...plan, provider: 'esimgo' })),
        ...thirdResponse.data.plans.map(plan => ({ ...plan, provider: 'airalo' }))
      ].map(plan => {
        // Normalize data value
        let dataValue = plan.data;
        if (typeof dataValue === 'string' && dataValue.toLowerCase() === 'unlimited') {
          dataValue = Infinity;
        } else if (typeof dataValue === 'string') {
          dataValue = parseFloat(dataValue.replace(/[^\d.]/g, ''));
        } else {
          dataValue = parseFloat(dataValue) || 0;
        }

        // Normalize duration
        let duration = plan.duration;
        if (typeof duration === 'string') {
          duration = parseInt(duration.replace(/[^0-9]/g, '')) || 0;
        } else {
          duration = parseInt(duration) || 0;
        }

        // Normalize price
        let price = typeof plan.price === 'string' ? 
          parseFloat(plan.price.replace(/[^\d.]/g, '')) : 
          parseFloat(plan.price) || 0;

        return {
          ...plan,
          data: dataValue,
          duration: duration,
          price: price,
          unlimited: dataValue === Infinity || plan.unlimited || 
                    (typeof plan.data === 'string' && plan.data.toLowerCase().includes('unlimited')),
          networkCount: getNetworkCount(plan)
        };
      });

      // Filter out packages with less than 1GB data
      allPackages = allPackages.filter(pkg => 
        pkg.unlimited || pkg.data >= 1
      );

      // Filter by country
      const countryFilteredPackages = allPackages.filter(pkg => {
        const searchCountry = country.toLowerCase();
        const pkgRegion = (pkg.region || '').toLowerCase();
        const pkgName = (pkg.name || '').toLowerCase();
        return pkgRegion.includes(searchCountry) || pkgName.includes(searchCountry);
      });

    // First pass: Group packages by data and price
    const packageGroups = new Map();
    
    countryFilteredPackages.forEach(pkg => {
      const key = `${pkg.data}-${pkg.price}`;
      if (!packageGroups.has(key)) {
        packageGroups.set(key, []);
      }
      packageGroups.get(key).push(pkg);
    });

    // Second pass: For each group, keep only the best package
    let optimizedPackages = [];
    packageGroups.forEach((packages, key) => {
      // Sort packages in the group by duration (descending) and provider priority
      const sortedPackages = packages.sort((a, b) => {
        if (a.duration !== b.duration) {
          return b.duration - a.duration; // Longer duration first
        }
        // If durations are equal, sort by provider priority
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
      // If same data amount but other package has better price/duration ratio
      if (currentPkg.data === otherPkg.data) {
        const currentRatio = currentPkg.duration / currentPkg.price;
        const otherRatio = otherPkg.duration / otherPkg.price;
        if (otherRatio > currentRatio) {
          return true;
        }
      }

      // If other package has more data, same or longer duration, but same or lower price
      if (otherPkg.data > currentPkg.data && 
          otherPkg.duration >= currentPkg.duration && 
          otherPkg.price <= currentPkg.price) {
        return true;
      }

      // If other package has same or more data, longer duration, and only slightly higher price
      if (otherPkg.data >= currentPkg.data && 
          otherPkg.duration > currentPkg.duration) {
        const priceDiffPercent = (otherPkg.price - currentPkg.price) / currentPkg.price;
        if (priceDiffPercent <= 0.1) { // 10% price difference threshold
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
        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{country} Plans</Text>
      <View style={styles.headerIcon}>
        <Ionicons name="cash-outline" size={24} color="#FFFFFF" />
      </View>
    </View>
  );

  const formatDataAmount = (data) => {
    if (data === 'Unlimited' || data === Infinity) return 'Unlimited';
    const numericData = parseFloat(data);
    if (isNaN(numericData)) return data;
    if (numericData >= 1) {
      return numericData === 49 ? '50 GB' : `${numericData} GB`;
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
    const gradientColors = packageColors[index % packageColors.length];
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
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.packageItem}
        >
          <View style={styles.packageHeader}>
            <View style={styles.countryInfo}>
              <FlagIcon countryCode={countryCode} size={24} />
              <Text style={styles.countryName}>{country}</Text>
            </View>
            {highestSpeed && (
              <View style={styles.speedContainer}>
                <Ionicons name="speedometer-outline" size={16} color="#FF6B6B" />
                <Text style={styles.speedText}>
                  {highestSpeed.toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.packageDetails}>
            <View>
              <Text style={styles.dataAmount}>
                {formatDataAmount(item.data)}
              </Text>
              <Text style={styles.validityPeriod}>
                VALID FOR {item.duration} DAYS
              </Text>
              {item.networkCount > 0 && (
			  <TouchableOpacity
				onPress={() => handleNetworkPress(item)}
				style={styles.networkButtonContainer}
			  >
				<LinearGradient
				  colors={[gradientColors[1], gradientColors[0]]}
				  start={{ x: 0, y: 0 }}
				  end={{ x: 1, y: 1 }}
				  style={styles.networkButton}
				>
				  <View style={styles.networkContent}>
					<Ionicons name="cellular-outline" size={16} color="#FFFFFF" />
					<Text style={styles.networkButtonText}>Networks</Text>
				  </View>
				</LinearGradient>
			  </TouchableOpacity>
			)}
			</View>
            <View style={styles.priceContainer}>
              <Text style={styles.priceText}>
                ${item.price.toFixed(2)}
              </Text>
              <TouchableOpacity onPress={handlePackagePress}>
                <LinearGradient
                  colors={[gradientColors[1], gradientColors[0]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.buyButton}
                >
                  <Text style={styles.buyButtonText}>BUY NOW</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <FlatList
	  data={packages}
	  renderItem={renderPackageItem}
	  keyExtractor={(item, index) => `${item.id}-${index}`}
	  contentContainerStyle={styles.listContainer}
	  ListEmptyComponent={() => (
		<View style={styles.emptyStateContainer}>
		  {loading ? (
			<ActivityIndicator size="large" color="#FF6B6B" />
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
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  listContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 80 : 60,
  },
  listFooter: {
    height: 20,
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
  countryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryName: {
    marginLeft: 8,
    fontSize: 18,
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  speedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  speedText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#FF6B6B',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  packageDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dataAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  validityPeriod: {
    fontSize: 14,
    color: '#BBBBBB',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    marginTop: 4,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF6B6B',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    marginBottom: 8,
  },
  buyButton: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    elevation: 3,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  buyButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
    padding: 16,
  },
  errorText: {
        color: '#FF6B6B',
        fontSize: 16,
        textAlign: 'center',
        fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
        marginBottom: 8,
    },
    noPackagesText: {
        color: '#BBBBBB',
        fontSize: 16,
        textAlign: 'center',
        fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
        marginTop: 20,
    },
    shadow: {
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
            },
            android: {
                elevation: 5,
            },
        }),
    },
    gradientBorder: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 107, 107, 0.3)',
    },
    networkContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    networkText: {
        color: '#BBBBBB',
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
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginRight: 8,
        marginBottom: 8,
    },
    coverageText: {
        color: '#FF6B6B',
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
        color: '#BBBBBB',
        fontSize: 12,
        fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        marginVertical: 8,
    },
    badgeContainer: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#FF6B6B',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
            },
            android: {
                elevation: 5,
            },
        }),
    },
    badgeText: {
        color: '#FFFFFF',
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
        backgroundColor: '#FF6B6B',
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
            },
            android: {
                elevation: 5,
            },
        }),
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyStateText: {
        color: '#BBBBBB',
        fontSize: 16,
        textAlign: 'center',
        fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
        marginTop: 12,
    },
    retryButton: {
        marginTop: 16,
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: '#FF6B6B',
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
        fontWeight: 'bold',
    },
networkButtonContainer: {
  marginTop: 8,
  borderRadius: 6,
  elevation: 3,
  shadowColor: '#FF6B6B',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
},
networkButton: {
  borderRadius: 6,
  paddingVertical: 9,    // Reduced from 10
  paddingHorizontal: 12, // Reduced from 20
  elevation: 3,
  shadowColor: '#FF6B6B',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
},
networkContent: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
},
networkButtonText: {
  fontSize: 13,         // Reduced from 14
  fontWeight: 'bold',
  color: '#FFFFFF',
  fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  marginLeft: 4,       // Reduced from 6
  textShadowColor: 'rgba(0, 0, 0, 0.75)',
  textShadowOffset: { width: -1, height: 1 },
  textShadowRadius: 10,
},
});

export default CountryPackagesScreen;