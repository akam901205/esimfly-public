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
import { newApi } from '../api/api';

const API_BASE_URL = 'https://esimfly.net/pages/esimplan';

const ICON_COLORS = {
  network: '#007AFF',
  speed: '#2563eb',
};

const RegionalPackagesScreen = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [networkModalVisible, setNetworkModalVisible] = useState(false);
  const [selectedNetworks, setSelectedNetworks] = useState([]);
  const [selectedLocationNetworks, setSelectedLocationNetworks] = useState([]);
  const route = useRoute();
  const navigation = useNavigation();
  const { region, packageType } = route.params;

  // Local formatLocationNetworkList function (aligned with RegionalPackageDetailsScreen)
  const formatLocationNetworkList = (packageData) => {
    const locationNetworks = [];
    
    // Helper function to get country code
    const getCountryCode = (countryName) => {
      if (!countryName) return '';
      
      // Special mappings for country names to codes
      const countryMappings = {
        'united states': 'us',
        'united kingdom': 'gb',
        'united arab emirates': 'ae',
        'south korea': 'kr',
        'south africa': 'za',
        'new zealand': 'nz',
        'puerto rico': 'pr',
        'hong kong': 'hk',
        'czech republic': 'cz',
        'dominican republic': 'do',
        'costa rica': 'cr',
        'el salvador': 'sv',
        'saint lucia': 'lc',
        'trinidad and tobago': 'tt',
        'antigua and barbuda': 'ag',
        'saint kitts and nevis': 'kn',
        'saint vincent and the grenadines': 'vc',
        'democratic republic of the congo': 'cd',
        'central african republic': 'cf'
      };
      
      const normalized = countryName.toLowerCase();
      return countryMappings[normalized] || countryName.substring(0, 2).toLowerCase();
    };
    
    // First, get the list of countries
    let countryList = [];
    
    if (packageData.coverage && Array.isArray(packageData.coverage)) {
      countryList = packageData.coverage;
    } else if (packageData.coverages && Array.isArray(packageData.coverages)) {
      // For coverages, each item represents a country with its networks
      packageData.coverages.forEach(coverage => {
        const countryName = coverage.name || 'Unknown';
        const countryCode = getCountryCode(countryName);
        
        // Don't show the actual operator count if it's too high (like 90)
        // Instead show a reasonable default
        const operatorList = coverage.networks && coverage.networks.length > 0 
          ? coverage.networks.slice(0, 5).map(network => ({
              operatorName: network.name || 'Network',
              networkType: network.type || '4G'
            }))
          : [{ operatorName: 'Multiple networks available', networkType: packageData.speed || '4G' }];
        
        locationNetworks.push({
          locationName: countryName,
          countryCode: countryCode,
          operatorList: operatorList
        });
      });
      
      // Return early if we have coverages with network info
      return locationNetworks;
    } else if (packageData.coverage_countries && Array.isArray(packageData.coverage_countries)) {
      countryList = packageData.coverage_countries;
    }
    
    // If we have a country list with networks, distribute them
    if (countryList.length > 0 && packageData.networks && Array.isArray(packageData.networks) && packageData.networks.length > 0) {
      // Create a map of common operators by country
      const operatorsByCountry = {
        'Norway': ['Telenor', 'Telia', 'Ice'],
        'Germany': ['Vodafone', 'O2', 'T-Mobile'],
        'Belgium': ['Base', 'Orange', 'Proximus'],
        'Finland': ['Elisa', 'Telia', 'DNA'],
        'Portugal': ['NOS', 'Vodafone', 'MEO'],
        'Bulgaria': ['A1', 'Telenor', 'Vivacom'],
        'Denmark': ['3', 'Telia', 'TDC'],
        'Lithuania': ['Tele2', 'BITĖ', 'Telia'],
        'Luxembourg': ['POST', 'Tango', 'Orange'],
        'Latvia': ['Tele2', 'LMT', 'Bite'],
        'Croatia': ['A1', 'Telemach', 'T-Mobile'],
        'Ukraine': ['lifecell', 'Kyivstar', 'Vodafone'],
        'France': ['Orange', 'SFR', 'Bouygues', 'Free Mobile'],
        'Hungary': ['Telenor', 'Vodafone', 'T-Mobile'],
        'Sweden': ['3', 'Tele2', 'Telia'],
        'Slovenia': ['Mobitel', 'A1', 'Telemach'],
        'Slovakia': ['Orange', 'O2', 'T-Mobile'],
        'United Kingdom': ['3', 'Vodafone', 'O2', 'EE'],
        'Ireland': ['3', 'Eir', 'Vodafone'],
        'Estonia': ['Tele2', 'Elisa', 'Telia'],
        'Switzerland': ['Sunrise', 'Salt', 'Swisscom'],
        'Malta': ['GO', 'Vodafone', 'Melita'],
        'Iceland': ['Nova', 'Síminn', 'Vodafone'],
        'Italy': ['Iliad', 'Vodafone', 'Wind', 'TIM'],
        'Greece': ['Vodafone', 'Wind', 'Cosmote'],
        'Spain': ['Vodafone', 'Orange', 'Movistar', 'Yoigo'],
        'Austria': ['3', 'A1', 'T-Mobile'],
        'Cyprus': ['PrimeTel', 'Epic', 'Cyta'],
        'Czech Republic': ['Vodafone', 'O2', 'T-Mobile'],
        'Poland': ['Orange', 'Play', 'Plus', 'T-Mobile'],
        'Romania': ['Vodafone', 'Orange', 'Digi.Mobil'],
        'Liechtenstein': ['FL1', '7acht', 'Salt'],
        'Netherlands': ['Vodafone', 'KPN', 'T-Mobile'],
        'Turkey': ['Avea', 'Turkcell', 'Vodafone']
      };
      
      // Extract all network names from the package
      const availableNetworks = packageData.networks.map(n => 
        typeof n === 'string' ? n : (n.name || 'Network')
      );
      
      // Create entries for each country
      countryList.forEach(country => {
        const countryName = country.name || country;
        const countryCode = country.code || getCountryCode(countryName);
        
        // Get operators for this country
        const countryOperators = operatorsByCountry[countryName] || [];
        
        // Find matching operators from available networks
        const matchingOperators = countryOperators
          .filter(op => availableNetworks.some(net => 
            net.toLowerCase().includes(op.toLowerCase()) || 
            op.toLowerCase().includes(net.toLowerCase())
          ))
          .slice(0, 3); // Limit to 3 operators per country
        
        // Create operator list
        const operatorList = matchingOperators.length > 0
          ? matchingOperators.map(op => ({
              operatorName: op,
              networkType: packageData.speed || '4G/5G'
            }))
          : [{
              operatorName: `${Math.min(3, Math.floor(availableNetworks.length / countryList.length))} major operators`,
              networkType: packageData.speed || '4G/5G'
            }];
        
        locationNetworks.push({
          locationName: countryName,
          countryCode: countryCode,
          operatorList: operatorList
        });
      });
    } else if (countryList.length > 0) {
      // If we have a country list but no network details
      countryList.forEach(country => {
        const countryName = country.name || country;
        const countryCode = country.code || getCountryCode(countryName);
        
        locationNetworks.push({
          locationName: countryName,
          countryCode: countryCode,
          operatorList: [{ 
            operatorName: 'Multiple networks available', 
            networkType: packageData.speed || '4G' 
          }]
        });
      });
    } else if (packageData.networks && Array.isArray(packageData.networks)) {
      // Fallback: If no country info, show region with networks
      const uniqueNetworks = [];
      packageData.networks.forEach(network => {
        const networkName = typeof network === 'string' ? network : (network.name || 'Network');
        if (!uniqueNetworks.find(n => n.operatorName === networkName)) {
          uniqueNetworks.push({
            operatorName: networkName,
            networkType: network.type || packageData.speed || '4G'
          });
        }
      });
      
      if (uniqueNetworks.length > 0) {
        locationNetworks.push({
          locationName: packageData.region || 'Regional Coverage',
          countryCode: '',
          operatorList: uniqueNetworks.slice(0, 5) // Limit to first 5 operators
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
      console.log(`[DEBUG] Fetching packages for region: ${region}, type: ${packageType}`);
      
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
      allPackages = allPackages.map(pkg => ({
        id: pkg.id,
        name: pkg.name,
        price: pkg.price,
        data: pkg.isUnlimited ? 'Unlimited' : pkg.data,
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
        locationNetworkList: [],
        region: pkg.region || region
      }));

      // Filter by package type
      const filteredPackages = allPackages.filter(pkg => {
        if (packageType === 'unlimited') {
          return pkg.unlimited || pkg.isUnlimited;
        } else if (packageType === 'regular') {
          return !pkg.unlimited && !pkg.isUnlimited;
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

      // Group similar packages
      const groupedPackages = groupSimilarPackages(normalizedPackages, region);
      setPackages(groupedPackages);

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
    <View style={styles.header}>
      <TouchableOpacity 
        onPress={() => navigation.goBack()} 
        style={styles.headerIcon}
      >
        <Ionicons 
          name="arrow-back" 
          size={24} 
          color={colors.icon.header} 
        />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{region} Plans</Text>
      <View style={styles.headerIcon}>
        <Ionicons 
          name="globe-outline" 
          size={24} 
          color={colors.icon.header} 
        />
      </View>
    </View>
  );

const renderPackageItem = ({ item, index }) => {
    const RegionIcon = regions.find(r => r.name.toLowerCase() === region.toLowerCase())?.image;
    const highestSpeed = getHighestSpeed(item);
    const networkInfo = processProviderNetworks(item);
    const alternatives = item.alternatives || [];
    
    const displayData = item.data === 'Unlimited' || item.unlimited 
      ? 'Unlimited' 
      : `${adjustDataDisplay(item.data)} GB`;

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
            <View>
              <Text style={styles.dataAmount}>{displayData}</Text>
              <Text style={styles.validityPeriod}>
                VALID FOR {item.duration} DAYS
              </Text>
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
                ${parseFloat(item.price).toFixed(2)}
              </Text>
              <TouchableOpacity 
                onPress={navigateToDetails}
                style={styles.buyButton}
              >
                <Text style={styles.buyButtonText}>BUY NOW</Text>
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
                        <Ionicons name="globe-outline" size={12} color={colors.text.secondary} />
                        <Text style={styles.altCoverageText}>
                          {processProviderNetworks(pkg).countryCount}
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
          <View style={styles.emptyStateContainer}>
            {loading ? (
              <ActivityIndicator size="large" color="#2196f3" />
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
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  listContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 80 : 60,
  },
  packageItem: {
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.light,
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
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  speedText: {
    marginLeft: 4,
    fontSize: 12,
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
    color: colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  validityPeriod: {
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    marginTop: 4,
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
  networkButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.stone[600],
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
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text.primary,
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
  alternativesContainer: {
    marginTop: 12,
    gap: 8,
  },
  alternativeItem: {
    borderRadius: 8,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  alternativeContent: {
    padding: 12,
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
    backgroundColor: colors.background.tertiary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  altProviderText: {
    color: colors.text.primary,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  altCoverageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background.tertiary,
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
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  compareText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    fontWeight: 'bold',
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