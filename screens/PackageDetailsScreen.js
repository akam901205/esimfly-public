import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Platform,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FlagIcon, countries } from '../utils/countryData';
import NetworkModal from '../components/NetworkModalSingelCountry';
import esimApi from '../api/esimApi';
import { newApi } from '../api/api';
import { colors } from '../theme/colors';
import { BlurView } from 'expo-blur';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');


const PackageDetailsScreen = () => {
  const [networkModalVisible, setNetworkModalVisible] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [verifiedPromoCode, setVerifiedPromoCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [discountedPrice, setDiscountedPrice] = useState(null);
  const [originalPrice, setOriginalPrice] = useState(null);
  const [isPromoInputFocused, setIsPromoInputFocused] = useState(false);
  
  const route = useRoute();
  const navigation = useNavigation();
  const params = route.params;
  const packageData = params.package;
  const country = params.country;
  
  useEffect(() => {
    setOriginalPrice(packageData.price);
  }, [packageData.price]);

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

	
 const getNetworks = (packageData) => {
    console.log('[DEBUG] getNetworks packageData:', packageData);
    const networks = [];
    
    // Add speed information if available
    if (packageData.speed) {
      networks.push({
        type: 'speed',
        value: packageData.speed,
        icon: 'speedometer-outline'
      });
    }
    
    // Check different network data structures based on provider
    // Provider 3 (Airalo)
    if (packageData.provider === 'airalo' || packageData.packageCode?.startsWith('airalo_')) {
      // Use a Set to track unique networks
      const uniqueNetworkNames = new Set();
      
      // First check direct networks array (preferred source)
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
      
      // Only process coverages if we don't have networks yet
      if (networks.length === 0 && packageData.coverages && packageData.coverages.length > 0) {
        packageData.coverages.forEach(coverage => {
          if (coverage.networks && coverage.networks.length > 0) {
            coverage.networks.forEach(network => {
              const networkName = network.name || network;
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
        });
      }
      
      console.log('[DEBUG] Processed networks for airalo:', networks);
      return networks;
    }
    
    // Provider 2 (ESIMGo)
    if (packageData.provider === 'esimgo' || packageData.id?.startsWith('esim_')) {
      // Process networks information for ESIMGo
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
              speeds: network.type ? network.type.split(',').map(s => s.trim()) : []
            });
          }
        });
      }
      console.log('[DEBUG] Processed networks for esimgo:', networks);
      return networks;
    }
    
    // Provider 1 (ESIMaccess) or default
    if (packageData.provider === 'esimaccess' || !packageData.provider) {
      // Process networks information
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
              speeds: network.type ? network.type.split(/[,\/]/).map(t => t.trim().toUpperCase()).filter(t => t !== '') : []
            });
          }
        });
      }
      console.log('[DEBUG] Processed networks for esimaccess:', networks);
    }

    // If no networks found, return a default message
    if (networks.length === 0) {
      console.log('[DEBUG] No networks found, returning default message');
      // Return different messages based on provider
      let defaultMessage = 'Multiple operators available';
      
      if (packageData.provider === 'airalo') {
        defaultMessage = 'Coverage provided by local operators';
      } else if (packageData.provider === 'esimgo') {
        defaultMessage = 'Premium network coverage';
      } else if (packageData.provider === 'esimaccess') {
        defaultMessage = 'Wide network coverage';
      }
      
      return [{
        type: 'info',
        value: defaultMessage,
        icon: 'wifi-outline'
      }];
    }

    console.log('[DEBUG] Final networks:', networks);
    return networks;
  };

  const countryCode = useMemo(() => {
    return countries.find(c => c.name.toLowerCase() === country.toLowerCase())?.id || '';
  }, [country]);

  const isProvider2 = useMemo(() => {
    return packageData.id?.startsWith('esim_');
  }, [packageData.id]);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Fixed header background with blur effect */}
      <View style={styles.headerBackground}>
        <BlurView intensity={80} tint="light" style={styles.headerBlur} />
      </View>
      
      {/* Header content */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <LinearGradient
            colors={['#FFFFFF', '#F9FAFB']}
            style={styles.headerButtonGradient}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </LinearGradient>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>
          {country || 'Package Details'}
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

  const TopFlag = () => {
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
              <FlagIcon countryCode={countryCode} size={80} />
            </View>
          </LinearGradient>
        </View>
        <Text style={styles.topCountryName}>{country}</Text>
        <Text style={styles.packageName}>{packageData.name}</Text>
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
              <Text style={styles.dataAmount}>
                {packageData.data === 'Unlimited' || 
                 packageData.data === 'infinity' || 
                 packageData.data === '∞' || 
                 packageData.data === 'Infinity' ||
                 packageData.isUnlimited ? 'Unlimited' : `${packageData.data}GB`}
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
                  <Text style={styles.priceAmount}>
                    ${discountedPrice.toFixed(2)}
                  </Text>
                  <Text style={styles.originalPrice}>
                    ${originalPrice.toFixed(2)}
                  </Text>
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>
                      -{((originalPrice - discountedPrice) / originalPrice * 100).toFixed(0)}%
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.priceAmount}>
                  ${originalPrice?.toFixed(2)}
                </Text>
              )}
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  };

  const ValiditySection = () => {
    return (
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
              {packageData.duration.toString().replace(' days', '')} Days
            </Text>
            <Text style={styles.validityNote}>Activates on first use</Text>
          </View>
        </LinearGradient>
      </View>
    );
  };


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
            `Gift card applied!\nDiscount: $${discountAmount.toFixed(2)}`
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
            icon={<Ionicons name="cellular" size={24} color="#4F46E5" />}
            iconColor="#4F46E5"
            label="Networks"
            value={
              <View style={styles.networkPreview}>
                <Text style={styles.networkCount}>
                  {getNetworks(packageData).filter(n => n.type === 'network').length} Networks
                </Text>
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => setNetworkModalVisible(true)}
                >
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>
            }
            onPress={() => setNetworkModalVisible(true)}
            isButton
            index={0}
          />

          <InfoCard
            icon={<MaterialCommunityIcons name="sim" size={24} color="#10B981" />}
            iconColor="#10B981"
            label="Plan Type"
            value="Data Only eSIM"
            index={1}
          />

          <InfoCard
            icon={<MaterialIcons name="add-circle" size={24} color="#FF6B00" />}
            iconColor="#FF6B00"
            label="Top Up"
            value={
              <View style={styles.topUpContainer}>
                <Text style={[
                  styles.topUpStatus,
                  isProvider2 ? styles.topUpUnavailable : styles.topUpAvailable
                ]}>
                  {isProvider2 ? 'Not Available' : 'Available'}
                </Text>
                {!isProvider2 && (
                  <MaterialIcons name="check-circle" size={16} color="#10B981" />
                )}
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
              The validity period starts when the eSIM connects to any supported network. 
              Make sure to activate only when you're ready to use it.
            </Text>
            <View style={styles.policyFeatures}>
              <View style={styles.policyFeature}>
                <Ionicons name="checkmark-circle" size={16} color="#4F46E5" />
                <Text style={styles.policyFeatureText}>Instant activation</Text>
              </View>
              <View style={styles.policyFeature}>
                <Ionicons name="checkmark-circle" size={16} color="#4F46E5" />
                <Text style={styles.policyFeatureText}>No expiry before use</Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      </View>
    );
  };

  const handleBuyPress = () => {
    navigation.navigate('Checkout', {
      package: {
        ...packageData,
        price: discountedPrice || originalPrice
      },
      country: country,
      promoDetails: promoCode && discountedPrice !== null ? {
        code: promoCode.trim().toUpperCase(),
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
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="on-drag"
      >
        <TopFlag />
        <DataPriceSection />
        <ValiditySection />
        <PromoCodeSection />
        <InfoSection />
        
        {/* Extra padding for bottom */}
        <View style={{ height: 170 }} />
      </ScrollView>
      
      {/* Modern floating bottom container */}
      <View style={[styles.bottomContainer, { backgroundColor: 'transparent' }]}>
        <View style={styles.bottomGradient}>
          
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
                      ${(discountedPrice || originalPrice)?.toFixed(2)}
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
        onClose={() => setNetworkModalVisible(false)}
        networks={getNetworks(packageData)}
        speed={packageData.speed}
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
    height: Platform.OS === 'ios' ? 60 : 60,
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
    paddingTop: Platform.OS === 'ios' ? 10 : 10,
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
  
  // Top Flag Section
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
  topCountryName: {
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
  topUpStatus: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 6,
  },
  topUpAvailable: {
    color: '#10B981',
  },
  topUpUnavailable: {
    color: '#9CA3AF',
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
    paddingBottom: Platform.OS === 'ios' ? 115 : 80, // Adjusted padding for tab bar
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

export default PackageDetailsScreen;