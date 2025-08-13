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
import NetworkModalGlobal from '../components/NetworkModalGlobal';
import { colors } from '../theme/colors';
import esimApi from '../api/esimApi';
import { newApi } from '../api/api';
import { getNetworks, formatLocationNetworkList } from '../utils/PackageFilters';
import { countries } from '../utils/countryData';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const GlobalPackageDetailsScreen = () => {
  const insets = useSafeAreaInsets();
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
  const globalPackageName = params.globalPackageName;
  
  useEffect(() => {
    setOriginalPrice(packageData.price);
  }, [packageData.price]);


  const getCountryCount = () => {
    const pkgName = packageData?.name?.toLowerCase() || '';
    if (pkgName.includes('139')) return 139;
    if (pkgName.includes('138')) return 138;
    if (pkgName.includes('106')) return 106;
    if (pkgName.includes('120+')) return 120;
    return packageData.locationNetworkList?.length || 
           packageData.coverage?.length || 
           packageData.regionCountries?.length || 120;
  };

  const getNetworkCount = () => {
    if (packageData.provider === 'esimgo') {
      return packageData.networks?.reduce((total, country) => total + (country.networks?.length || 1), 0) || 0;
    } else if (packageData.provider === 'airalo') {
      return packageData.networks?.length || 0;
    } else {
      const networksByLocation = {};
      const validLocations = new Set((packageData.regionCountries || []).map(code => {
        return getCountryName(code);
      }));
      
      (packageData.networks || []).forEach(network => {
        const locationName = getCountryName(network?.location || '');
        if (validLocations.has(locationName)) {
          if (!networksByLocation[locationName]) {
            networksByLocation[locationName] = new Set();
          }
          networksByLocation[locationName].add(network?.name || 'Network Operator');
        }
      });

      let totalNetworks = 0;
      Object.entries(networksByLocation).forEach(([location, networks]) => {
        totalNetworks += networks.size;
      });

      return totalNetworks;
    }
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
          Global
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

  const TopGlobal = () => {
    const countryCount = getCountryCount();

    return (
      <View style={styles.topFlagContainer}>
        <View style={styles.flagWrapper}>
          <View style={styles.flagOuter}>
            <LinearGradient
              colors={['#FFFFFF', '#F9FAFB']}
              style={styles.flagInnerWrapper}
            >
              <View style={styles.globeIconContainer}>
                {/* Orbit rings */}
                <View style={[styles.orbitRing, styles.orbitRing1]} />
                <View style={[styles.orbitRing, styles.orbitRing2]} />
                
                {/* Center globe */}
                <LinearGradient
                  colors={['#FF6B00', '#FF8533']}
                  style={styles.globeCenter}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="globe-outline" size={44} color="#FFFFFF" />
                </LinearGradient>
                
                {/* Connection dots */}
                <View style={[styles.connectionDot, styles.dotTop]} />
                <View style={[styles.connectionDot, styles.dotRight]} />
                <View style={[styles.connectionDot, styles.dotBottom]} />
                <View style={[styles.connectionDot, styles.dotLeft]} />
              </View>
            </LinearGradient>
          </View>
        </View>
        <Text style={styles.topCountryName}>Worldwide eSIM</Text>
        <Text style={styles.packageName}>{countryCount} Countries • Instant Activation</Text>
      </View>
    );
  };


  const VoiceSmsSection = () => {
    if (!packageData.voice_minutes && !packageData.sms_count) return null;

    return (
      <View style={styles.voiceSmsContainer}>
        <LinearGradient
          colors={['#EFF6FF', '#E0E7FF']}
          style={styles.voiceSmsCard}
        >
          <View style={styles.voiceSmsHeader}>
            <MaterialCommunityIcons name="plus-network" size={24} color="#4F46E5" />
            <Text style={styles.voiceSmsTitle}>Additional Features</Text>
          </View>
          
          <View style={styles.voiceSmsItems}>
            {packageData.voice_minutes !== undefined && (
              <View style={styles.voiceSmsItem}>
                <View style={[styles.voiceSmsIconContainer, { backgroundColor: '#10B98115' }]}>
                  <Ionicons name="call" size={20} color="#10B981" />
                </View>
                <View style={styles.voiceSmsContent}>
                  <Text style={styles.voiceSmsLabel}>Voice Calls</Text>
                  <Text style={styles.voiceSmsValue}>{packageData.voice_minutes} Minutes</Text>
                </View>
              </View>
            )}
            
            {packageData.sms_count !== undefined && (
              <View style={styles.voiceSmsItem}>
                <View style={[styles.voiceSmsIconContainer, { backgroundColor: '#F5910B15' }]}>
                  <Ionicons name="chatbubble" size={20} color="#F59E0B" />
                </View>
                <View style={styles.voiceSmsContent}>
                  <Text style={styles.voiceSmsLabel}>SMS Messages</Text>
                  <Text style={styles.voiceSmsValue}>{packageData.sms_count} Messages</Text>
                </View>
              </View>
            )}
          </View>
        </LinearGradient>
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
            {packageData.duration.toString().replace(' days', '')} Days
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
            icon={<Ionicons name="globe" size={24} color="#4F46E5" />}
            iconColor="#4F46E5"
            label="Coverage"
            value={
              <View style={styles.networkPreview}>
                <Text style={styles.networkCount}>
                  {getCountryCount()} Countries
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
            value={packageData.voice_minutes || packageData.sms_count ? 'Data + Voice + SMS' : 'Data Only eSIM'}
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
              in the covered countries. Make sure to activate only when you're ready to use it.
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
        data: packageData.data === 'Unlimited' || packageData.unlimited ? 'Unlimited' : packageData.data,
        duration: packageData.duration.toString().replace(' days', ''),
        price: discountedPrice || originalPrice,
        coverage: getCountryCount(),
        voice_minutes: packageData.voice_minutes || undefined,
        sms_count: packageData.sms_count || undefined
      },
      isGlobal: true,
      globalPackageName: globalPackageName,
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
        <TopGlobal />
        <DataPriceSection />
        <VoiceSmsSection />
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

      <NetworkModalGlobal
        visible={networkModalVisible}
        onClose={() => setNetworkModalVisible(false)}
        packageData={packageData}
        globalPackageName={globalPackageName}
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
  
  // Top Global Section
  topFlagContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  flagWrapper: {
    width: 140,
    height: 140,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flagOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    padding: 2,
  },
  flagInnerWrapper: {
    flex: 1,
    borderRadius: 68,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  globeIconContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbitRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 100,
  },
  orbitRing1: {
    width: 100,
    height: 100,
    borderStyle: 'dashed',
  },
  orbitRing2: {
    width: 120,
    height: 120,
    borderColor: '#F3F4F6',
    transform: [{ rotate: '45deg' }],
  },
  globeCenter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  connectionDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B00',
  },
  dotTop: {
    top: 10,
    left: '50%',
    marginLeft: -4,
  },
  dotRight: {
    right: 10,
    top: '50%',
    marginTop: -4,
  },
  dotBottom: {
    bottom: 10,
    left: '50%',
    marginLeft: -4,
  },
  dotLeft: {
    left: 10,
    top: '50%',
    marginTop: -4,
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
  
  // Voice SMS Section
  voiceSmsContainer: {
    marginBottom: 20,
  },
  voiceSmsCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  voiceSmsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  voiceSmsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 10,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  voiceSmsItems: {
    // gap: 12, // Replace with marginBottom for better compatibility
  },
  voiceSmsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  voiceSmsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  voiceSmsContent: {
    flex: 1,
  },
  voiceSmsLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    marginBottom: 2,
  },
  voiceSmsValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
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

export default GlobalPackageDetailsScreen;