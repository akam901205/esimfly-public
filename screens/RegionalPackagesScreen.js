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

const ICON_COLORS = {
  network: '#1F2937',
  speed: '#FF6B00',
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
      
      // Debug: Log first package to see coverage structure
      if (allPackages.length > 0) {
        console.log('[DEBUG] Sample package coverage data:', {
          name: allPackages[0].name,
          coverage: allPackages[0].coverage?.slice(0, 3),
          coverages: allPackages[0].coverages?.slice(0, 3),
          coverageLength: allPackages[0].coverage?.length || allPackages[0].coverages?.length || 0
        });
      }
      
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
            console.log(`[DEBUG] Excluding country-specific package: ${pkg.name}`);
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
      
      // Process each group: only keep the cheapest package
      const processedPackages = [];
      
      Object.keys(groupedByData).forEach(dataKey => {
        const packagesForData = groupedByData[dataKey];
        
        // Filter out packages under 1 GB first
        const validPackages = packagesForData.filter(pkg => {
          if (pkg.data < 1 && !pkg.unlimited) {
            console.log(`[DEBUG] Hiding package under 1GB: ${pkg.name} (${pkg.data}GB)`);
            return false;
          }
          return true;
        });
        
        if (validPackages.length === 0) return; // Skip if no valid packages
        
        // Sort by price (cheapest first)
        validPackages.sort((a, b) => a.price - b.price);
        
        // Only keep the cheapest package
        const cheapestPackage = validPackages[0];
        console.log(`[DEBUG] Keeping cheapest ${dataKey} package: ${cheapestPackage.name} ($${cheapestPackage.price})`);
        
        // Log what we're hiding
        if (validPackages.length > 1) {
          validPackages.slice(1).forEach(pkg => {
            console.log(`[DEBUG] Hiding more expensive ${dataKey} package: ${pkg.name} ($${pkg.price})`);
          });
        }
        
        processedPackages.push(cheapestPackage);
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
    borderBottomWidth: 1,
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