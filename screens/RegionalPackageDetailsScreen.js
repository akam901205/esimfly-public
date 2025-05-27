import React, { useState, useMemo, useEffect } from 'react';
import { 
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
   TextInput,
	ActivityIndicator,
Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { regions } from '../utils/regions';
import { countries } from '../utils/countryData';
import NetworkModal from '../components/NetworkModal';
import { colors } from '../theme/colors';
import esimApi from '../api/esimApi';


const { width } = Dimensions.get('window');

const RegionalPackageDetailsScreen = () => {
  const [networkModalVisible, setNetworkModalVisible] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [promoCode, setPromoCode] = useState('');
  const [verifiedPromoCode, setVerifiedPromoCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [discountedPrice, setDiscountedPrice] = useState(null);
  const [originalPrice, setOriginalPrice] = useState(null);
  
  const route = useRoute();
  const navigation = useNavigation();
  const params = route.params;
  const packageData = params.package;
  const region = params.region;

  useEffect(() => {
    setOriginalPrice(packageData.price);
  }, [packageData.price]);

  // Add handleRedemption function
  const handleRedemption = async () => {
    if (!promoCode.trim()) {
      return;
    }

    setIsRedeeming(true);
    try {
      const response = await esimApi.verifyGiftCardForDiscount(promoCode.toUpperCase());
      console.log('Gift card verification response:', response);
      
      if (response.success && response.data?.amount) {
        const discountAmount = Math.min(response.data.amount, originalPrice);
        const newPrice = originalPrice - discountAmount;
        
        setDiscountedPrice(newPrice);
        setVerifiedPromoCode(promoCode.toUpperCase());
        
        Alert.alert(
          'Success',
          `Promo code applied! Discount: $${discountAmount.toFixed(2)}`
        );
      } else {
        setVerifiedPromoCode('');
        setDiscountedPrice(null);
        Alert.alert(
          'Error',
          response.message || 'Invalid promo code'
        );
      }
    } catch (error) {
      console.error('Redemption error:', error);
      setVerifiedPromoCode('');
      setDiscountedPrice(null);
      Alert.alert(
        'Error',
        'An error occurred while processing your request'
      );
    } finally {
      setIsRedeeming(false);
    }
  };
	
  const regionInfo = useMemo(() => {
    return regions.find(r => r.name.toLowerCase() === region.toLowerCase());
  }, [region]);

  const getCountryNameByCode = (code) => {
    if (!code) return '';
    const country = countries.find(c => c.id.toLowerCase() === code.toLowerCase());
    return country ? country.name : code;
  };

  const getNetworks = (packageData) => {
    console.log('[DEBUG] RegionalPackageDetailsScreen getNetworks:', packageData);
    const networks = [];
    
    if (!packageData) return networks;

    // Add speed indicator
    if (packageData.speed) {
      networks.push({
        type: 'speed',
        value: packageData.speed,
        icon: 'speedometer-outline'
      });
    }

    if (packageData.provider === 'esimgo') {
      // Process networks array directly
      if (packageData.networks && Array.isArray(packageData.networks)) {
        packageData.networks.forEach(network => {
          if (typeof network === 'string') {
            networks.push({
              type: 'network',
              value: network,
              icon: 'wifi-outline'
            });
          } else if (network.name) {
            networks.push({
              type: 'network',
              value: network.name,
              icon: 'wifi-outline',
              speeds: network.type ? [network.type] : ['4G']
            });
          }
        });
      }
    } else if (packageData.provider === 'airalo') {
      // Use a Set to track unique networks
      const uniqueNetworkNames = new Set();
      
      // Process networks array from API
      if (packageData.networks && Array.isArray(packageData.networks)) {
        packageData.networks.forEach(network => {
          let networkName = '';
          if (typeof network === 'string') {
            networkName = network;
          } else if (network.name) {
            networkName = network.name;
          }
          
          if (networkName && !uniqueNetworkNames.has(networkName)) {
            uniqueNetworkNames.add(networkName);
            networks.push({
              type: 'network',
              value: networkName,
              icon: 'wifi-outline'
            });
          }
        });
      }
      
      // Process coverages if no direct networks
      if (networks.filter(n => n.type === 'network').length === 0 && packageData.coverages) {
        packageData.coverages.forEach(coverage => {
          if (coverage.networks && Array.isArray(coverage.networks)) {
            coverage.networks.forEach(network => {
              const networkName = network.name || network;
              if (networkName && !uniqueNetworkNames.has(networkName)) {
                uniqueNetworkNames.add(networkName);
                networks.push({
                  type: 'network',
                  value: networkName,
                  icon: 'wifi-outline',
                  location: coverage.name
                });
              }
            });
          }
        });
      }
    } else if (packageData.provider === 'esimaccess') {
      // Process networks for ESIMAccess
      if (packageData.networks && Array.isArray(packageData.networks)) {
        packageData.networks.forEach(network => {
          if (typeof network === 'string') {
            networks.push({
              type: 'network',
              value: network,
              icon: 'wifi-outline'
            });
          } else if (network.name) {
            networks.push({
              type: 'network',
              value: network.name,
              icon: 'wifi-outline'
            });
          }
        });
      }
    }

    // If no networks found, show default message
    if (networks.filter(n => n.type === 'network').length === 0) {
      let defaultMessage = 'Multiple operators available';
      
      if (packageData.provider === 'airalo') {
        defaultMessage = 'Coverage across multiple countries';
      } else if (packageData.provider === 'esimgo') {
        defaultMessage = 'Premium regional coverage';
      } else if (packageData.provider === 'esimaccess') {
        defaultMessage = 'Wide regional coverage';
      }
      
      networks.push({
        type: 'info',
        value: defaultMessage,
        icon: 'wifi-outline'
      });
    }

    console.log('[DEBUG] Final Processed Networks:', networks);
    return networks;
  };
	
  const formatLocationNetworkList = (packageData) => {
    if (!packageData) return [];
    
    console.log('[DEBUG] formatLocationNetworkList:', packageData);
    
    // For the new API format, we'll create a location network list with countries
    const locationNetworks = [];
    
    // Helper function to get country code from name
    const getCountryCode = (countryName) => {
      if (!countryName) return '';
      
      // Try to find the country in the countries list
      const country = countries.find(c => 
        c.name.toLowerCase() === countryName.toLowerCase()
      );
      
      if (country) return country.id.toLowerCase();
      
      // Common mappings for countries that might not match exactly
      const countryMappings = {
        'united states': 'us',
        'united kingdom': 'gb',
        'south korea': 'kr',
        'north macedonia': 'mk',
        'czech republic': 'cz',
        'bosnia and herzegovina': 'ba',
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
    <Text style={styles.headerTitle}>{region}</Text>
    <View style={styles.headerIcon}>
      <Ionicons 
        name="cash-outline" 
        size={24} 
        color={colors.icon.header} 
      />
    </View>
  </View>
);

  const TopRegion = () => {
  const RegionIcon = regionInfo?.image;
  
  // Calculate country count based on available data
  let countryCount = 0;
  let countryList = [];
  
  if (packageData.coverage && Array.isArray(packageData.coverage)) {
    // For packages with coverage array (from API)
    countryCount = packageData.coverage.length;
    countryList = packageData.coverage;
  } else if (packageData.coverages && Array.isArray(packageData.coverages)) {
    // For packages with coverages array (Airalo)
    countryCount = packageData.coverages.length;
    countryList = packageData.coverages.map(c => ({ 
      name: c.name, 
      code: c.name.toLowerCase() 
    }));
  } else if (packageData.coverage_countries && Array.isArray(packageData.coverage_countries)) {
    // For packages with coverage_countries
    countryCount = packageData.coverage_countries.length;
    countryList = packageData.coverage_countries;
  }

  return (
    <View style={styles.topFlagContainer}>
      <LinearGradient
        colors={[colors.background.secondary, colors.background.tertiary]}
        style={styles.flagGradient}
      >
        <View style={styles.flagWrapper}>
          {RegionIcon ? 
            <RegionIcon width={50} height={50} /> : 
            <Ionicons 
              name="globe-outline" 
              size={40} 
              color={colors.icon.active} 
            />
          }
        </View>
      </LinearGradient>
      <Text style={styles.topRegionName}>{region}</Text>
      <Text style={styles.coverageText}>
        Coverage in {countryCount} countries
      </Text>
    </View>
  );
};

const DataPriceSection = () => (
    <View style={styles.dataPrice}>
      <View style={styles.dataSection}>
        <Text style={styles.sectionLabel}>Data</Text>
        <Text style={styles.dataAmount}>
          {packageData.data === 'Unlimited' ? 'Unlimited' : `${packageData.data}GB`}
        </Text>
      </View>
      <View style={styles.priceSection}>
        <Text style={styles.sectionLabel}>Price</Text>
        {discountedPrice !== null ? (
          <>
            <Text style={styles.priceAmount}>
              ${discountedPrice.toFixed(2)}
            </Text>
            <Text style={styles.originalPrice}>
              ${originalPrice.toFixed(2)}
            </Text>
          </>
        ) : (
          <Text style={styles.priceAmount}>
            ${originalPrice?.toFixed(2)}
          </Text>
        )}
      </View>
    </View>
  );

  const ValiditySection = () => (
  <View style={styles.validitySection}>
    <View style={styles.validityInner}>
      <View style={styles.validityIconContainer}>
        <Ionicons 
          name="time-outline" 
          size={24} 
          color={colors.icon.active} 
        />
      </View>
      <Text style={styles.validityDuration}>
        Valid for {packageData.duration} days
      </Text>
    </View>
  </View>
);



const PromoCodeSection = () => {
  const [localPromoCode, setLocalPromoCode] = useState('');
  const [localIsRedeeming, setLocalIsRedeeming] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const localHandleRedemption = async () => {
    // Validate promo code format
    if (!localPromoCode.trim()) {
      Alert.alert('Error', 'Please enter a promo code');
      return;
    }

    if (localPromoCode.length < 6) {
      Alert.alert('Error', 'Promo code must be 6 characters');
      return;
    }

    setLocalIsRedeeming(true);
    try {
      const response = await esimApi.verifyGiftCardForDiscount(localPromoCode.toUpperCase());
      console.log('Gift card verification response:', response);
      
      if (response.success && response.data?.amount) {
        const discountAmount = Math.min(response.data.amount, originalPrice);
        const newPrice = originalPrice - discountAmount;
        
        setDiscountedPrice(newPrice);
        setVerifiedPromoCode(localPromoCode.toUpperCase());
        
        Alert.alert(
          'Success',
          `Promo code applied! Discount: $${discountAmount.toFixed(2)}`
        );
      } else {
        setVerifiedPromoCode('');
        setDiscountedPrice(null);
        Alert.alert(
          'Error',
          response.message || 'Invalid promo code'
        );
      }
    } catch (error) {
      console.error('Redemption error:', error);
      setVerifiedPromoCode('');
      setDiscountedPrice(null);
      Alert.alert(
        'Error',
        'An error occurred while processing your request'
      );
    } finally {
      setLocalIsRedeeming(false);
    }
  };

  return (
    <View style={styles.promoSection}>
      <Text style={styles.sectionTitle}>Apply code</Text>
      <TouchableOpacity 
        activeOpacity={1} 
        style={styles.promoContainer}
        onPress={() => setIsFocused(true)}
      >
        <TextInput
          style={[
            styles.promoInput,
            { color: colors.text.primary }
          ]}
          placeholder="Enter referral or promo code"
          placeholderTextColor={colors.text.secondary}
          value={localPromoCode}
          onChangeText={(text) => {
            const cleanText = text.replace(/[^A-Za-z0-9]/g, '');
            setLocalPromoCode(cleanText.slice(0, 6));
          }}
          autoCapitalize="characters"
          maxLength={6}
          selectionColor={colors.stone[800]}
          focus={isFocused}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        <TouchableOpacity 
          style={[
            styles.redeemButton,
            !localPromoCode.trim() || localPromoCode.length < 6 ? styles.redeemButtonDisabled : null
          ]}
          onPress={localHandleRedemption}
          disabled={!localPromoCode.trim() || localPromoCode.length < 6 || localIsRedeeming}
        >
          {localIsRedeeming ? (
            <ActivityIndicator size="small" color="#FF6B6B" />
          ) : (
            <Text style={styles.redeemText}>Redeem</Text>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
};

  const InfoSection = () => (
    <View style={styles.infoSection}>
      <Text style={styles.sectionTitle}>MORE INFO</Text>
      
      <View style={styles.infoRow}>
        <View style={styles.infoLeft}>
          <Ionicons name="cellular-outline" size={20} color="#888" />
          <Text style={styles.infoLabel}>Networks</Text>
        </View>
        <TouchableOpacity 
          style={styles.viewAllButton}
          onPress={() => {
            setSelectedCountry(null);
            setNetworkModalVisible(true);
          }}
        >
          <Text style={styles.viewAllText}>View all</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoLeft}>
          <Ionicons name="card-outline" size={20} color="#888" />
          <Text style={styles.infoLabel}>Plan Type</Text>
        </View>
        <Text style={styles.infoValue}>Regional Data</Text>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoLeft}>
          <Ionicons name="reload-circle-outline" size={20} color="#888" />
          <Text style={styles.infoLabel}>Top Up</Text>
        </View>
        <Text style={styles.infoValue}>Available</Text>
      </View>

      <View style={styles.policySection}>
        <View style={styles.infoLeft}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#888" />
          <Text style={styles.infoLabel}>Activation Policy</Text>
        </View>
        <Text style={styles.policyText}>
          The validity period starts when the SIM connects to any supported networks in the covered region.
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
      >
        <TopRegion />
        <DataPriceSection />
        <ValiditySection />
        <PromoCodeSection />
        <InfoSection />
      </ScrollView>
      
      <View style={styles.bottomContainer}>
  <Text style={styles.disclaimer}>
    Before completing this order, please confirm your device is eSIM compatible and network-unlocked
    <Text style={styles.learnMore}> Learn more</Text>
  </Text>
<TouchableOpacity 
  onPress={() => {
    navigation.navigate('Checkout', {
      package: {
        ...packageData,
        data: packageData.data === 'Unlimited' || packageData.unlimited ? 'Unlimited' : packageData.data,
        duration: typeof packageData.duration === 'object' ? 
          packageData.duration.name || packageData.duration.toString() : 
          packageData.duration,
        price: packageData.price,
        coverage: packageData.provider === 'esimgo' 
          ? packageData.coverage?.length || 0
          : packageData.provider === 'airalo'
            ? packageData.coverage?.length || 0
            : packageData.locationNetworkList?.length || 0,
        // Include raw coverage data for proper count
        locationNetworkList: packageData.locationNetworkList,
        countryNetworks: packageData.networks
      },
      region: region,
      isRegional: true
    });
  }}
  activeOpacity={0.8}
>
    <LinearGradient
      colors={['#2ECC71', '#27AE60']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.buyButton}
    >
      <Text style={styles.buyButtonText}>
        ${packageData.price.toFixed(2)} • Buy Now
      </Text>
      <View style={styles.buyButtonDot} />
    </LinearGradient>
  </TouchableOpacity>
</View>

      <NetworkModal
        visible={networkModalVisible}
        onClose={() => {
          setNetworkModalVisible(false);
          setSelectedCountry(null);
        }}
        networks={getNetworks(packageData)}
        locationNetworkList={formatLocationNetworkList(packageData)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
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
  scrollView: {
    flex: 1,
    padding: 16,
  },
  topFlagContainer: {
    alignItems: 'center',
    marginVertical: 24,
    paddingHorizontal: 16,
  },
  flagGradient: {
    padding: 3,
    borderRadius: 42,
    marginBottom: 16,
  },
  flagWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  topRegionName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  coverageText: {
    fontSize: 16,
    color: colors.text.secondary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  dataPrice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  dataSection: {
    flex: 1,
  },
  priceSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  sectionLabel: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  dataAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  priceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  validitySection: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  validityInner: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: 'center',  // Center children horizontally
    paddingVertical: 20,   // More vertical padding for better spacing
  },
  validityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,     // Space between icon and text
  },
  validityDuration: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    textAlign: 'center',  // Center the text
  },
  promoSection: {
    marginBottom: 24,
  },
  promoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  promoPlaceholder: {
    fontSize: 16,
    color: colors.text.secondary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
 promoInput: {
  flex: 1,
  fontSize: 16,
  color: colors.text.primary,
  fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  padding: 0,
  marginRight: 12,
  height: 40,
},
  redeemButton: {
    backgroundColor: colors.background.redeemButton,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.redeemButton,
  },
  redeemText: {
    fontSize: 14,
    color: colors.text.redeemText,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  infoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 16,
    color: colors.text.primary,
    marginLeft: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  infoValue: {
    fontSize: 16,
    color: colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  viewAllButton: {
    backgroundColor: colors.background.tertiary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  viewAllText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  policySection: {
    marginTop: 16,
  },
  policyText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    lineHeight: 20,
  },
  bottomContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 85 : 75,
    backgroundColor: colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    marginBottom: Platform.OS === 'ios' ? 20 : 0,
    ...Platform.select({
      ios: {
        shadowColor: colors.stone[900],
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  disclaimer: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    textAlign: 'center',
  },
  learnMore: {
    color: colors.text.secondary,
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 25,
    marginBottom: Platform.OS === 'ios' ? 6 : 0,
    ...Platform.select({
      ios: {
        shadowColor: colors.stone[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  buyButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.stone[50],
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  buyButtonDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.stone[50],
    marginLeft: 8,
  },
});

export default RegionalPackageDetailsScreen;