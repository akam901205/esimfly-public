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
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { regions } from '../utils/regions';
import { countries, FlagIcon } from '../utils/countryData';
import NetworkModal from '../components/NetworkModal';
import { colors } from '../theme/colors';
import esimApi from '../api/esimApi';
import { newApi } from '../api/api';
import { BlurView } from 'expo-blur';
import { normalizeCountryName } from '../utils/countryNormalizationUtils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCurrencyConversion } from '../hooks/useCurrencyConversion';


const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const RegionalPackageDetailsScreen = () => {
  const insets = useSafeAreaInsets();
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
  const { formatPrice, userCurrency } = useCurrencyConversion();
  
  console.log('[DEBUG] RegionalPackageDetailsScreen - packageData:', JSON.stringify(packageData, null, 2));

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
          `Promo code applied! Discount: ${formatPrice(discountAmount)}`
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
    
    console.log('[DEBUG] formatLocationNetworkList:', {
      provider: packageData.provider,
      coverages: packageData.coverages?.length || 0,
      coverage: packageData.coverage?.length || 0,
      coverage_countries: packageData.coverage_countries?.length || 0,
      networks: packageData.networks?.length || 0,
      sample_coverage: packageData.coverages?.[0],
      sample_network: packageData.networks?.[0]
    });
    
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
    
    // Check for coverages first (has network info per country)
    if (packageData.coverages && Array.isArray(packageData.coverages)) {
      // For coverages, each item represents a country with its networks
      packageData.coverages.forEach(coverage => {
        // For Airalo, coverage.name might be a country code, so normalize it
        const rawName = coverage.name || 'Unknown';
        const countryName = normalizeCountryName(rawName);
        const countryCode = coverage.code || rawName;
        
        // Use actual networks from API data
        const operatorList = coverage.networks && coverage.networks.length > 0 
          ? coverage.networks.map(network => ({
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
    } else if (packageData.coverage && Array.isArray(packageData.coverage)) {
      countryList = packageData.coverage;
    } else if (packageData.coverage_countries && Array.isArray(packageData.coverage_countries)) {
      countryList = packageData.coverage_countries;
    }
    
    // If we have a country list without specific network info per country
    if (countryList.length > 0) {
      // For all providers, if we don't have country-specific network mapping,
      // show countries without networks (not all networks for all countries)
      countryList.forEach(country => {
        // Handle both string and object formats
        const rawName = typeof country === 'string' ? country : (country.name || country);
        const countryName = normalizeCountryName(rawName);
        const countryCode = typeof country === 'object' ? (country.code || '') : '';
        
        locationNetworks.push({
          locationName: countryName,
          countryCode: countryCode,
          operatorList: [] // Empty operator list when we don't have country-specific data
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
    <View style={[styles.headerContainer, { height: Math.max(insets.top + 60, 60) }]}>
      {/* Fixed header background with blur effect */}
      <View style={styles.headerBackground}>
        <BlurView intensity={80} tint="light" style={styles.headerBlur} />
      </View>
      
      {/* Header content */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <LinearGradient
            colors={['#FFFFFF', '#F9FAFB']}
            style={styles.headerButtonGradient}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </LinearGradient>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>
          {region || 'Regional Package'}
        </Text>
        
        <TouchableOpacity onPress={() => {}} style={styles.headerButton}>
          <LinearGradient
            colors={['#FFFFFF', '#F9FAFB']}
            style={styles.headerButtonGradient}
          >
            <Ionicons name="share-outline" size={24} color="#1F2937" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  const TopRegion = () => {
    const RegionIcon = regionInfo?.image;
    
    // Calculate country count based on available data
    let countryCount = 0;
    let countryList = [];
    
    if (packageData.coverage && Array.isArray(packageData.coverage)) {
      countryCount = packageData.coverage.length;
      countryList = packageData.coverage;
    } else if (packageData.coverages && Array.isArray(packageData.coverages)) {
      countryCount = packageData.coverages.length;
      countryList = packageData.coverages.map(c => ({ 
        name: c.name, 
        code: c.code || c.name.toLowerCase() 
      }));
    } else if (packageData.coverage_countries && Array.isArray(packageData.coverage_countries)) {
      countryCount = packageData.coverage_countries.length;
      countryList = packageData.coverage_countries;
    }

    // Get up to 3 country flags for preview
    const getCountryFlags = () => {
      const flagsToShow = countryList.slice(0, 3).map((country, index) => {
        const countryCode = country.code || 
          countries.find(c => c.name.toLowerCase() === (country.name || country).toLowerCase())?.id || 
          '';
        
        return (
          <View key={index} style={[styles.flagPreview, { marginLeft: index > 0 ? -15 : 0 }]}>
            <FlagIcon countryCode={countryCode} size={40} />
          </View>
        );
      });
      
      if (countryList.length > 3) {
        flagsToShow.push(
          <View key="more" style={[styles.flagPreview, styles.moreFlagsPreview, { marginLeft: -15 }]}>
            <Text style={styles.moreFlagsText}>+{countryList.length - 3}</Text>
          </View>
        );
      }
      
      return flagsToShow;
    };

    return (
      <View style={styles.topFlagContainer}>
        <View style={styles.flagWrapper}>
          <LinearGradient
            colors={['#FF6B00', '#FF8533']}
            style={styles.flagGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.flagInnerWrapper}>
              <LinearGradient
                colors={['#FFFFFF', '#F9FAFB']}
                style={styles.regionIconContainer}
              >
                <View style={styles.flagsGrid}>
                  {getCountryFlags()}
                </View>
              </LinearGradient>
            </View>
          </LinearGradient>
        </View>
        <Text style={styles.topRegionName}>{region}</Text>
        <Text style={styles.packageName}>{countryCount} Countries • Regional Coverage</Text>
      </View>
    );
  };

  const DataPriceSection = () => {
    return (
      <View style={styles.dataPriceContainer}>
        <LinearGradient
          colors={['#FFFFFF', '#FAFAFA']}
          style={styles.cardGradient}
        >
          <View style={styles.dataPrice}>
            <View style={styles.dataSection}>
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={['#4F46E5', '#6366F1']}
                  style={styles.iconGradient}
                >
                  <MaterialCommunityIcons name="database" size={24} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <Text style={styles.sectionLabel}>Data</Text>
              <Text style={[styles.dataAmount, userCurrency === 'IQD' && styles.dataAmountIQD]}>
                {packageData.data === 'Unlimited' ? 'Unlimited' : `${packageData.data}GB`}
              </Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.priceSection}>
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={['#FF6B00', '#FF8533']}
                  style={styles.iconGradient}
                >
                  <MaterialIcons name="attach-money" size={24} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <Text style={styles.sectionLabel}>Price</Text>
              {discountedPrice !== null ? (
                <View style={styles.priceContainer}>
                  <Text style={[styles.priceAmount, userCurrency === 'IQD' && styles.priceAmountIQD]}>
                    {formatPrice(discountedPrice)}
                  </Text>
                  <Text style={styles.originalPrice}>
                    {formatPrice(originalPrice)}
                  </Text>
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>
                      -{((originalPrice - discountedPrice) / originalPrice * 100).toFixed(0)}%
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={[styles.priceAmount, userCurrency === 'IQD' && styles.priceAmountIQD]}>
                  {formatPrice(originalPrice || 0)}
                </Text>
              )}
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  };

  const ValiditySection = () => (
    <View style={styles.validitySection}>
      <LinearGradient
        colors={['#FFF7ED', '#FFEDD5']}
        style={styles.validityCard}
      >
        <View style={styles.validityIconContainer}>
          <LinearGradient
            colors={['#FF6B00', '#FF8533']}
            style={styles.iconGradient}
          >
            <Ionicons name="time-outline" size={28} color="#FFFFFF" />
          </LinearGradient>
        </View>
        <View style={styles.validityContent}>
          <Text style={styles.validityLabel}>Validity Period</Text>
          <Text style={styles.validityDuration}>
            {String(packageData.duration).replace(/\s*(days?|Days?)\s*/gi, '')} Days
          </Text>
          <Text style={styles.validityNote}>Activates on first use</Text>
        </View>
      </LinearGradient>
    </View>
  );



  const PromoCodeSection = () => {
    const [localPromoCode, setLocalPromoCode] = useState('');
    const [localIsRedeeming, setLocalIsRedeeming] = useState(false);

    const handleInputFocus = () => {
      setIsPromoInputFocused(true);
    };

    const handleInputBlur = () => {
      setIsPromoInputFocused(false);
    };

    const localHandleRedemption = async () => {
      if (!localPromoCode.trim()) {
        return;
      }

      if (localPromoCode.length < 6) {
        Alert.alert('Error', 'Promo code must be 6 characters');
        return;
      }

      setLocalIsRedeeming(true);
      try {
        const response = await newApi.post('/user/gift-card/check', {
          card_number: localPromoCode.toUpperCase()
        });
        
        if (response.data.success && response.data.data?.remaining_balance > 0) {
          const discountAmount = Math.min(response.data.data.remaining_balance, originalPrice);
          const newPrice = originalPrice - discountAmount;
          
          setDiscountedPrice(newPrice);
          setVerifiedPromoCode(localPromoCode.toUpperCase());
          setPromoCode(localPromoCode.toUpperCase());
          
          Alert.alert(
            'Success! 🎉',
            `Gift card applied!\nDiscount: ${formatPrice(discountAmount)}`
          );
        } else {
          setVerifiedPromoCode('');
          setDiscountedPrice(null);
          Alert.alert(
            'Invalid Code',
            response.data.message || 'Invalid or empty gift card'
          );
        }
      } catch (error) {
        console.error('Gift card check error:', error);
        setVerifiedPromoCode('');
        setDiscountedPrice(null);
        Alert.alert(
          'Error',
          'An error occurred while checking the gift card'
        );
      } finally {
        setLocalIsRedeeming(false);
      }
    };

    return (
      <View style={styles.promoSection}>
        <LinearGradient
          colors={['#FFFFFF', '#FAFAFA']}
          style={styles.promoCard}
        >
          <View style={styles.promoHeader}>
            <MaterialCommunityIcons name="ticket-percent" size={24} color="#FF6B00" />
            <Text style={styles.sectionTitle}>Have a promo code?</Text>
          </View>
          
          <View style={styles.promoInputContainer}>
            <TextInput
              style={styles.promoInput}
              placeholder="Enter 6-digit code"
              placeholderTextColor="#9CA3AF"
              value={localPromoCode}
              onChangeText={(text) => {
                const cleanText = text.replace(/[^A-Za-z0-9]/g, '');
                setLocalPromoCode(cleanText.slice(0, 6));
              }}
              autoCapitalize="characters"
              maxLength={6}
              selectionColor="#FF6B00"
            />
            {localPromoCode.length > 0 && (
              <Text style={styles.charCounter}>
                {localPromoCode.length}/6
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.redeemButton,
              (!localPromoCode.trim() || localPromoCode.length < 6) && styles.redeemButtonDisabled
            ]}
            onPress={localHandleRedemption}
            disabled={!localPromoCode.trim() || localPromoCode.length < 6 || localIsRedeeming}
          >
            <LinearGradient
              colors={
                (!localPromoCode.trim() || localPromoCode.length < 6)
                  ? ['#E5E7EB', '#D1D5DB']
                  : ['#FF6B00', '#FF8533']
              }
              style={styles.redeemButtonGradient}
            >
              {localIsRedeeming ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="redeem" size={20} color="#FFFFFF" />
                  <Text style={styles.redeemText}>Apply Code</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {verifiedPromoCode && (
            <View style={styles.successBadge}>
              <MaterialIcons name="check-circle" size={20} color="#10B981" />
              <Text style={styles.successText}>Code Applied!</Text>
            </View>
          )}
        </LinearGradient>
      </View>
    );
  };

  const InfoSection = () => {
    const InfoCard = ({ icon, iconColor, label, value, onPress, isButton, index }) => {
      return (
        <View>
          <TouchableOpacity
            style={[
              styles.infoCard,
              isButton && styles.infoCardButton
            ]}
            onPress={onPress}
            disabled={!onPress}
          >
            <View style={styles.infoCardContent}>
              <View style={[styles.infoIconContainer, { backgroundColor: `${iconColor}15` }]}>
                {icon}
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>{label}</Text>
                {typeof value === 'string' ? (
                  <Text style={styles.infoValue}>{value}</Text>
                ) : (
                  value
                )}
              </View>
            </View>
          </TouchableOpacity>
        </View>
      );
    };

    return (
      <View style={styles.infoSection}>
        <Text style={styles.infoSectionTitle}>Package Details</Text>
        
        <View style={styles.infoGrid}>
          <InfoCard
            icon={<Ionicons name="map" size={24} color="#4F46E5" />}
            iconColor="#4F46E5"
            label="Coverage"
            value={
              <View style={styles.networkPreview}>
                <Text style={styles.networkCount}>
                  {formatLocationNetworkList(packageData).length} Countries
                </Text>
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => {
                    setSelectedCountry(null);
                    setNetworkModalVisible(true);
                  }}
                >
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>
            }
            onPress={() => {
              setSelectedCountry(null);
              setNetworkModalVisible(true);
            }}
            isButton
            index={0}
          />

          <InfoCard
            icon={<MaterialCommunityIcons name="sim" size={24} color="#10B981" />}
            iconColor="#10B981"
            label="Plan Type"
            value="Regional Data eSIM"
            index={1}
          />

          <InfoCard
            icon={<MaterialIcons name="add-circle" size={24} color="#FF6B00" />}
            iconColor="#FF6B00"
            label="Top Up"
            value={
              <View style={styles.topUpContainer}>
                <Text style={styles.topUpAvailable}>Available</Text>
                <MaterialIcons name="check-circle" size={16} color="#10B981" />
              </View>
            }
            index={2}
          />

          <InfoCard
            icon={<Ionicons name="speedometer" size={24} color="#8B5CF6" />}
            iconColor="#8B5CF6"
            label="Network Speed"
            value={packageData.speed || '5G/LTE'}
            index={3}
          />
        </View>

        <View style={styles.policyCard}>
          <LinearGradient
            colors={['#EEF2FF', '#E0E7FF']}
            style={styles.policyGradient}
          >
            <View style={styles.policyHeader}>
              <View style={[styles.infoIconContainer, { backgroundColor: '#4F46E515' }]}>
                <Ionicons name="shield-checkmark" size={24} color="#4F46E5" />
              </View>
              <Text style={styles.policyTitle}>Activation Policy</Text>
            </View>
            <Text style={styles.policyText}>
              The validity period starts when the eSIM connects to any supported network 
              in the covered region. Make sure to activate only when you're ready to use it.
            </Text>
            <View style={styles.policyFeatures}>
              <View style={styles.policyFeature}>
                <Ionicons name="checkmark-circle" size={16} color="#4F46E5" />
                <Text style={styles.policyFeatureText}>Instant activation</Text>
              </View>
              <View style={styles.policyFeature}>
                <Ionicons name="checkmark-circle" size={16} color="#4F46E5" />
                <Text style={styles.policyFeatureText}>Multi-country coverage</Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      </View>
    );
  };

  const [isPromoInputFocused, setIsPromoInputFocused] = useState(false);

  const handleBuyPress = () => {
    navigation.navigate('Checkout', {
      package: {
        ...packageData,
        data: packageData.data === 'Unlimited' || packageData.unlimited ? 'Unlimited' : packageData.data,
        duration: typeof packageData.duration === 'object' ? 
          packageData.duration.name || packageData.duration.toString() : 
          packageData.duration.toString().replace(' days', ''),
        price: discountedPrice || originalPrice,
        coverage: packageData.provider === 'esimgo' 
          ? packageData.coverage?.length || 0
          : packageData.provider === 'airalo'
            ? packageData.coverage?.length || 0
            : packageData.locationNetworkList?.length || 0,
        locationNetworkList: packageData.locationNetworkList,
        countryNetworks: packageData.networks
      },
      region: region,
      isRegional: true,
      promoDetails: verifiedPromoCode && discountedPrice !== null ? {
        code: verifiedPromoCode,
        originalPrice: originalPrice,
        discountAmount: originalPrice - discountedPrice
      } : null
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#F9FAFB', '#EFF6FF', '#FEF3C7']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {renderHeader()}
      
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 20, 40) }]}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="on-drag"
      >
        <TopRegion />
        <DataPriceSection />
        <ValiditySection />
        <PromoCodeSection />
        <InfoSection />
        
        {/* Extra padding for bottom */}
        <View style={{ height: 170 }} />
      </ScrollView>
      
      {/* Modern floating bottom container */}
      <View style={[styles.bottomContainer, { backgroundColor: 'transparent' }]}>
        <View style={[styles.bottomGradient, { paddingBottom: Math.max(insets.bottom + 88, Platform.OS === 'ios' ? 115 : 92) }]}>
          
          <TouchableOpacity onPress={handleBuyPress}>
            <LinearGradient
              colors={['#FF6B00', '#FF8533']}
              style={styles.buyButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.buyButtonContent}>
                <View style={styles.buyButtonLeft}>
                  <View style={styles.buyButtonIconContainer}>
                    <Ionicons name="cart" size={24} color="#FFFFFF" />
                  </View>
                  <View>
                    <Text style={styles.buyButtonLabel}>Total Price</Text>
                    <Text style={styles.buyButtonPrice}>
                      {formatPrice(discountedPrice || originalPrice || 0)}
                    </Text>
                  </View>
                </View>
                <View style={styles.buyButtonRight}>
                  <Text style={styles.buyButtonText}>Buy Now</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
    backgroundColor: '#FFFFFF',
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  
  // Header styles
  headerContainer: {
    position: 'relative',
    zIndex: 10,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  headerBlur: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerButton: {
    width: 44,
    height: 44,
  },
  headerButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  
  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  
  // Top Region Section
  topFlagContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  flagWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  flagGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    padding: 3,
  },
  flagInnerWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 57,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  regionIconContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flagsGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flagPreview: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  moreFlagsPreview: {
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreFlagsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  topRegionName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    marginBottom: 4,
  },
  packageName: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  // Data & Price Section
  dataPriceContainer: {
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  cardGradient: {
    padding: 24,
  },
  dataPrice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dataSection: {
    flex: 1,
    alignItems: 'center',
  },
  priceSection: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 80,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 20,
  },
  iconContainer: {
    marginBottom: 12,
  },
  iconGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    fontWeight: '500',
  },
  dataAmount: {
    fontSize: 23,
    fontWeight: '800',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    textAlign: 'center',
    marginTop: Platform.OS === 'ios' ? 3 : 9,
  },
  priceContainer: {
    alignItems: 'center',
  },
  priceAmount: {
    fontSize: Platform.OS === 'ios' ? 26 : 32,
    fontWeight: '800',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  priceAmountIQD: {
    fontSize: Platform.OS === 'ios' ? 18 : 22, // Smaller font for IQD
    letterSpacing: -0.5, // Tighter spacing for IQD to match data formatting
    marginTop: Platform.OS === 'ios' ? -2 : -4, // Move up to align with data baseline
  },
  dataAmountIQD: {
    fontSize: Platform.OS === 'ios' ? 18 : 22, // Match price font size for IQD
    letterSpacing: -0.5, // Tighter spacing for IQD to match price formatting
    marginTop: Platform.OS === 'ios' ? -2 : -4, // Move up to align with price baseline
  },
  originalPrice: {
    fontSize: 18,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  discountBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  
  // Validity Section
  validitySection: {
    marginBottom: 20,
  },
  validityCard: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  validityIconContainer: {
    marginRight: 16,
  },
  validityContent: {
    flex: 1,
  },
  validityLabel: {
    fontSize: 14,
    color: '#92400E',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    fontWeight: '500',
    marginBottom: 4,
  },
  validityDuration: {
    fontSize: 24,
    fontWeight: '700',
    color: '#92400E',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    marginBottom: 2,
  },
  validityNote: {
    fontSize: 12,
    color: '#B45309',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  // Promo Section
  promoSection: {
    marginBottom: 20,
  },
  promoCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  promoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 10,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  promoInputContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 4,
    marginBottom: 16,
    borderColor: '#FF6B00',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    paddingVertical: 16,
    fontWeight: '600',
  },
  charCounter: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  redeemButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  redeemButtonDisabled: {
    opacity: 0.5,
  },
  redeemButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  redeemText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  successText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  
  // Info Section
  infoSection: {
    marginBottom: 20,
  },
  infoSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  infoGrid: {
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  infoCardPressed: {
    transform: [{ scale: 0.98 }],
  },
  infoCardButton: {
    backgroundColor: '#FAFAFA',
  },
  infoCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  networkPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  networkCount: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
  },
  viewAllButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  viewAllText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  topUpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topUpAvailable: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
    marginRight: 6,
  },
  
  // Policy Card
  policyCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  policyGradient: {
    padding: 20,
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  policyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4F46E5',
    marginLeft: 12,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  policyText: {
    fontSize: 14,
    color: '#6366F1',
    lineHeight: 20,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  policyFeatures: {
    // gap: 8, // Replace with marginBottom for better compatibility
  },
  policyFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  policyFeatureText: {
    fontSize: 14,
    color: '#4F46E5',
    marginLeft: 8,
    fontWeight: '500',
  },
  
  // Bottom Container
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  bottomGradient: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  buyButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  buyButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  buyButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buyButtonIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  buyButtonLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  buyButtonPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  buyButtonRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buyButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
});

export default RegionalPackageDetailsScreen;