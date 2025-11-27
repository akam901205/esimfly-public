import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { regions } from '../utils/regions';
import NetworkModal from '../components/NetworkModal';
import { colors } from '../theme/colors';
import {
  isUnlimitedPackage,
  normalizeDuration,
  filterPackagesByRegion,
  groupSimilarPackages,
  processProviderNetworks,
  getHighestSpeed,
  getNetworks,
  adjustDataDisplay
} from '../utils/PackageFilters';
import { normalizeCountryName } from '../utils/countryNormalizationUtils';
import { newApi } from '../api/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCurrencyConversion } from '../hooks/useCurrencyConversion';

const ICON_COLORS = {
  network: '#1F2937',
  speed: '#FF6B00',
};

const RegionalPackagesScreen = () => {
  const insets = useSafeAreaInsets();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [networkModalVisible, setNetworkModalVisible] = useState(false);
  const [selectedNetworks, setSelectedNetworks] = useState([]);
  const [selectedLocationNetworks, setSelectedLocationNetworks] = useState([]);
  const route = useRoute();
  const navigation = useNavigation();
  const { region, packageType } = route.params;
  const { formatPrice, userCurrency } = useCurrencyConversion();

  // Local formatLocationNetworkList function - use only API data
  const formatLocationNetworkList = (packageData) => {
    const locationNetworks = [];
    
    // If we have coverages array from API with network info per country
    if (packageData.coverages && Array.isArray(packageData.coverages)) {
      packageData.coverages.forEach(coverage => {
        // For Airalo, coverage.name might be a country code, so normalize it
        const rawName = coverage.name || 'Unknown';
        const countryName = normalizeCountryName(rawName);
        const countryCode = coverage.code || rawName;
        
        // Use actual networks from API if available
        const operatorList = coverage.networks && coverage.networks.length > 0 
          ? coverage.networks.map(network => ({
              operatorName: network.name || 'Network',
              networkType: network.type || packageData.speed || '4G'
            }))
          : [];
        
        if (operatorList.length > 0) {
          locationNetworks.push({
            locationName: countryName,
            countryCode: countryCode,
            operatorList: operatorList
          });
        }
      });
    } 
    // If we have coverage array (list of countries) from API
    else if (packageData.coverage && Array.isArray(packageData.coverage)) {
      packageData.coverage.forEach(country => {
        // Handle both string and object formats
        const rawName = typeof country === 'string' ? country : (country.name || country);
        const countryName = normalizeCountryName(rawName);
        const countryCode = typeof country === 'object' ? (country.code || '') : '';
        
        locationNetworks.push({
          locationName: countryName,
          countryCode: countryCode,
          operatorList: [] // No specific operator data from API
        });
      });
    }
    // If we have networks array without country mapping
    else if (packageData.networks && Array.isArray(packageData.networks)) {
      const uniqueNetworks = [];
      packageData.networks.forEach(network => {
        const networkName = typeof network === 'string' ? network : (network.name || 'Network');
        const networkType = typeof network === 'object' ? (network.type || packageData.speed || '4G') : (packageData.speed || '4G');
        
        if (!uniqueNetworks.find(n => n.operatorName === networkName)) {
          uniqueNetworks.push({
            operatorName: networkName,
            networkType: networkType
          });
        }
      });
      
      if (uniqueNetworks.length > 0) {
        locationNetworks.push({
          locationName: packageData.region || 'Regional Coverage',
          countryCode: '',
          operatorList: uniqueNetworks
        });
      }
    }
    
    return locationNetworks;
  };

  const handleNetworkPress = (packageData) => {
    const networks = getNetworks(packageData);
    const locationNetworks = formatLocationNetworkList(packageData);
    setSelectedNetworks(networks);
    setSelectedLocationNetworks(locationNetworks);
    setNetworkModalVisible(true);
  };

  const fetchPackages = useCallback(async () => {
    try {
      
      // Use the new API to fetch packages
      const response = await newApi.get('/user/esims/packages', {
        params: { 
          region: region,
          type: 'regional',
          limit: 100 
        }
      }).catch(error => {
        console.error('[DEBUG] Package fetch error:', error);
        return { data: { data: { packages: [] } } };
      });

      let allPackages = response.data?.data?.packages || [];
      
      // Map packages to match expected format
      allPackages = allPackages.map(pkg => {
        // Fix esimgo data format issues (0.98 -> 1, 1.95 -> 2, etc.)
        let correctedData = pkg.data;
        if (!pkg.isUnlimited && pkg.data) {
          const dataValue = parseFloat(pkg.data);
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
        }
        
        return {
          id: pkg.id,
          name: pkg.name,
          price: pkg.price,
          data: pkg.isUnlimited ? 'Unlimited' : correctedData,
          duration: pkg.duration,
          provider: pkg.provider,
          unlimited: pkg.isUnlimited,
          isUnlimited: pkg.isUnlimited,
          voiceMinutes: pkg.voiceMinutes,
          smsCount: pkg.smsCount,
          flagUrl: pkg.flagUrl,
          packageCode: pkg.slug,
          speed: pkg.speed || '4G',
          networks: pkg.networks || [],
          coverage: pkg.coverage || [],
          coverages: pkg.coverages || [],
          coverage_countries: pkg.coverage_countries || [],
          locationNetworkList: [],
          region: pkg.region || region
        };
      });

      // Define country names to exclude from regional packages
      const EXCLUDED_COUNTRIES = {
        'africa': ['South Africa', 'Central African Republic'],
        'asia': ['Japan', 'South Korea', 'China', 'India', 'Singapore', 'Malaysia', 'Thailand', 'Indonesia', 'Philippines', 'Vietnam'],
        'europe': ['United Kingdom', 'France', 'Germany', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Poland'],
        'latin america': ['Brazil', 'Mexico', 'Argentina', 'Chile', 'Colombia', 'Peru'],
        'middle east': ['Saudi Arabia', 'United Arab Emirates', 'Qatar', 'Kuwait', 'Bahrain', 'Oman']
      };

      // Filter by package type and exclude country-specific packages
      const filteredPackages = allPackages.filter(pkg => {
        // First check package type filter
        if (packageType === 'unlimited') {
          if (!pkg.unlimited && !pkg.isUnlimited) return false;
        } else if (packageType === 'regular') {
          if (pkg.unlimited || pkg.isUnlimited) return false;
        }

        // Then check if it's a country-specific package that should be excluded
        const packageNameLower = pkg.name.toLowerCase();
        const regionLower = region.toLowerCase();
        
        // Get the list of countries to exclude for this region
        const countriesToExclude = EXCLUDED_COUNTRIES[regionLower] || [];
        
        // Check if the package name starts with any excluded country
        for (const country of countriesToExclude) {
          const countryLower = country.toLowerCase();
          // Check if package name starts with country name followed by space, dash, or colon
          if (packageNameLower.startsWith(countryLower + ' ') ||
              packageNameLower.startsWith(countryLower + '-') ||
              packageNameLower.startsWith(countryLower + ':') ||
              packageNameLower === countryLower) {
            return false;
          }
        }
        
        return true;
      });

      // Normalize packages
      const normalizedPackages = filteredPackages.map(pkg => ({
        ...pkg,
        duration: normalizeDuration(pkg.duration),
        data: pkg.unlimited ? 'Unlimited' : (parseFloat(pkg.data) || 0),
        price: parseFloat(pkg.price) || 0,
        region: (pkg.region || '').trim().toLowerCase(),
        provider: pkg.provider || 'unknown'
      })).filter(pkg => pkg !== null);

      // Group packages by data amount and sort by price
      const groupedByData = {};
      
      normalizedPackages.forEach(pkg => {
        // Format data to remove decimals for whole numbers (1.0 -> 1)
        const formattedData = pkg.unlimited ? 'Unlimited' : 
          (Number.isInteger(pkg.data) || pkg.data % 1 === 0) ? 
          Math.floor(pkg.data) : pkg.data;
        
        // For unlimited packages, group by duration as well to show different day options
        const dataKey = pkg.unlimited ? `Unlimited-${pkg.duration}days` : `${formattedData}GB`;
        
        if (!groupedByData[dataKey]) {
          groupedByData[dataKey] = [];
        }
        
        groupedByData[dataKey].push(pkg);
      });
      
      // Process each group: special handling for Europe region
      const processedPackages = [];
      const isEuropeRegion = region.toLowerCase() === 'europe';
      
      Object.keys(groupedByData).forEach(dataKey => {
        const packagesForData = groupedByData[dataKey];
        
        // Filter out packages under 1 GB first
        const validPackages = packagesForData.filter(pkg => {
          if (pkg.data < 1 && !pkg.unlimited) {
            return false;
          }
          return true;
        });
        
        if (validPackages.length === 0) return; // Skip if no valid packages
        
        if (isEuropeRegion) {
          // For Europe region, show ALL unique packages (deduplicate exact matches)
          const uniquePackages = [];
          const seen = new Set();
          
          validPackages.forEach(pkg => {
            // Create key based on name, duration, and price to identify exact duplicates
            const uniqueKey = `${pkg.name}-${pkg.duration}-${pkg.price}`;
            
            if (!seen.has(uniqueKey)) {
              seen.add(uniqueKey);
              uniquePackages.push(pkg);
            } else {
            }
          });
          
          uniquePackages.forEach(pkg => processedPackages.push(pkg));
        } else {
          // For other regions, use normal cheapest-only logic
          // Sort by price (cheapest first)
          validPackages.sort((a, b) => a.price - b.price);
          
          // Only keep the cheapest package
          const cheapestPackage = validPackages[0];
          
          // Log what we're hiding
          if (validPackages.length > 1) {
            validPackages.slice(1).forEach(pkg => {
            });
          }
          
          processedPackages.push(cheapestPackage);
        }
      });
      
      // Sort final list by data amount (ascending) then by price
      processedPackages.sort((a, b) => {
        // Unlimited packages go to the end
        if (a.unlimited && !b.unlimited) return 1;
        if (!a.unlimited && b.unlimited) return -1;
        
        // Sort by data amount
        if (a.data !== b.data) {
          return a.data - b.data;
        }
        
        // Then by price
        return a.price - b.price;
      });
      
      setPackages(processedPackages);

    } catch (err) {
      console.error('[DEBUG] Error fetching packages:', err);
      setError('Unable to load packages at this time. Please try again later.');
      setPackages([]);
    } finally {
      setLoading(false);
    }
  }, [region, packageType]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: 5 }]}>
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
      <Text style={styles.headerTitle}>{region} Plans</Text>
      <View style={styles.headerIcon}>
        <Ionicons 
          name="globe-outline" 
          size={24} 
          color="#374151" 
        />
      </View>
    </View>
  );

const getFUPMessage = (provider) => {
  if (!provider) return null;

  const providerLower = provider.toLowerCase();

  if (providerLower.includes('airalo')) {
    return 'Fair Usage Policy: Speed reduced to 1 Mbps after 3 GB daily usage';
  } else if (providerLower.includes('esimgo')) {
    return 'Fair Usage Policy: Speed reduced to 512 Kbps after 1 GB daily usage';
  }

  return null;
};

const renderPackageItem = ({ item, index }) => {
    const RegionIcon = regions.find(r => r.name.toLowerCase() === region.toLowerCase())?.image;
    const highestSpeed = getHighestSpeed(item);
    const networkInfo = processProviderNetworks(item);
    const alternatives = item.alternatives || [];
    
    const displayData = item.data === 'Unlimited' || item.unlimited 
      ? 'Unlimited' 
      : `${Number.isInteger(item.data) || item.data % 1 === 0 ? Math.floor(item.data) : item.data} GB`;

    const navigateToDetails = () => {
      navigation.navigate('RegionalPackageDetails', {
        package: item,
        region: region
      });
    };

    return (
      <TouchableOpacity onPress={navigateToDetails} activeOpacity={0.9}>
        <View style={styles.packageItem}>
          <View style={styles.packageHeader}>
            <View style={styles.regionInfo}>
              {RegionIcon && <RegionIcon size={24} />}
              <Text style={styles.regionName}>{region}</Text>
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
            <View style={styles.packageDetailsLeft}>
              <Text style={styles.dataAmount}>{displayData}</Text>
              <Text style={styles.validityPeriod}>
                VALID FOR {String(item.duration).replace(/\s*(days?|Days?)\s*/gi, '')} DAYS
              </Text>
              {(item.data === 'Unlimited' || item.unlimited || item.isUnlimited) && getFUPMessage(item.provider) && (
                <View style={styles.fupContainer}>
                  <Ionicons name="information-circle-outline" size={11} color="#9CA3AF" />
                  <Text style={styles.fupText}>
                    {item.provider?.toLowerCase().includes('airalo')
                      ? 'FUP: 1Mbps after 3GB/day'
                      : 'FUP: 512Kbps after 1GB/day'}
                  </Text>
                </View>
              )}
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
                  <Text style={styles.networkButtonText}>
                    {networkInfo.countryCount} Countries
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.priceText}>
                {formatPrice(parseFloat(item.price))}
              </Text>
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

          {alternatives.length > 0 && (
            <View style={styles.alternativesContainer}>
              {alternatives.map((pkg, i) => (
                <TouchableOpacity 
                  key={i}
                  style={styles.alternativeItem}
                  onPress={() => navigation.navigate('RegionalPackageDetails', {
                    package: pkg,
                    region: region
                  })}
                >
                  <View style={styles.alternativeContent}>
                    <View style={styles.alternativeLeft}>
                      <View style={styles.altProviderBadge}>
                        <Text style={styles.altProviderText}>
                          {pkg.id === item.id ? "Main Plan" : "Alternative Plan"}
                        </Text>
                      </View>
                      <View style={styles.altCoverageBadge}>
                        <Ionicons name="globe-outline" size={12} color="#1F2937" />
                        <Text style={[styles.altCoverageText, { color: '#1F2937' }]}>
                          {processProviderNetworks(pkg).countryCount} Countries
                        </Text>
                      </View>
                    </View>
                    <View style={styles.alternativeRight}>
                      <Text style={styles.altPriceText}>
                        ${parseFloat(pkg.price).toFixed(2)}
                      </Text>
                      <View style={styles.compareContainer}>
                        <Text style={[
                          styles.compareText,
                          { color: pkg.price < item.price ? '#4CAF50' : '#FF6B6B' }
                        ]}>
                          {pkg.price < item.price 
                            ? `Save $${(item.price - pkg.price).toFixed(2)}`
                            : `+$${(pkg.price - item.price).toFixed(2)}`
                          }
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 0) }]}>
        <LinearGradient
          colors={['#F8F9FA', '#F3F4F6']}
          style={styles.backgroundGradient}
        />
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 0) }]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

 return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 0) }]}>
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
        locationNetworkList={selectedLocationNetworks}
      />
    </View>
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
    paddingHorizontal: 16,
    paddingBottom: 16,
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
    alignItems: 'flex-start',
  },
  packageDetailsLeft: {
    flex: 1,
    marginRight: 12,
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
  fupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  fupText: {
    fontSize: 10,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    marginLeft: 3,
    fontWeight: '500',
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
  buyButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  alternativesContainer: {
    marginTop: 12,
    gap: 8,
  },
  alternativeItem: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  alternativeContent: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alternativeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  altProviderBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  altProviderText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  altCoverageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FF6B0010',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  altCoverageText: {
    color: colors.text.secondary,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  alternativeRight: {
    alignItems: 'flex-end',
  },
  altPriceText: {
    color: '#1F2937',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  compareContainer: {
    marginTop: 4,
  },
  compareText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    fontWeight: '600',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
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
  }
});

export default RegionalPackagesScreen;