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
import NetworkModalGlobal from '../components/NetworkModalGlobal';
import { colors } from '../theme/colors';
import esimApi from '../api/esimApi';

const { width } = Dimensions.get('window');

const GlobalPackageDetailsScreen = () => {
  const [networkModalVisible, setNetworkModalVisible] = useState(false);
  const route = useRoute();
  const navigation = useNavigation();
  const params = route.params;
  const packageData = params.package;
  const globalPackageName = params.globalPackageName;
	const [promoCode, setPromoCode] = useState('');
const [verifiedPromoCode, setVerifiedPromoCode] = useState('');
const [isRedeeming, setIsRedeeming] = useState(false);
const [discountedPrice, setDiscountedPrice] = useState(null);
const [originalPrice, setOriginalPrice] = useState(null);
	
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
      <Text style={styles.headerTitle}>Global Package</Text>
      <View style={styles.headerIcon}>
        <Ionicons 
          name="cash-outline" 
          size={24} 
          color={colors.icon.header} 
        />
      </View>
    </View>
  );

   const TopGlobal = () => {
    const countryCount = getCountryCount();

    return (
      <View style={styles.topFlagContainer}>
        <LinearGradient
          colors={[colors.background.secondary, colors.background.tertiary]}
          style={styles.flagGradient}
        >
          <View style={styles.flagWrapper}>
            <Ionicons 
              name="globe-outline" 
              size={40} 
              color="#007AFF" // Updated to bright blue
            />
          </View>
        </LinearGradient>
        <Text style={[styles.topRegionName, { color: colors.slate[600] }]}>Global</Text>
        <Text style={styles.coverageText}>
          Coverage in {countryCount} countries
        </Text>
      </View>
    );
  };


  const VoiceSmsSection = () => {
    if (!packageData.voice_minutes && !packageData.sms_count) return null;

    return (
      <View style={styles.voiceSmsSection}>
        {packageData.voice_minutes !== undefined && (
          <View style={styles.voiceSmsItem}>
            <View style={styles.voiceSmsIconContainer}>
              <Ionicons 
                name="call-outline" 
                size={24} 
                color={colors.icon.active} 
              />
            </View>
            <View>
              <Text style={styles.voiceSmsLabel}>Voice</Text>
              <Text style={styles.voiceSmsValue}>{packageData.voice_minutes} Minutes</Text>
            </View>
          </View>
        )}
        
        {packageData.sms_count !== undefined && (
          <View style={styles.voiceSmsItem}>
            <View style={styles.voiceSmsIconContainer}>
              <Ionicons 
                name="chatbubble-outline" 
                size={24} 
                color={colors.icon.active} 
              />
            </View>
            <View>
              <Text style={styles.voiceSmsLabel}>SMS</Text>
              <Text style={styles.voiceSmsValue}>{packageData.sms_count} Messages</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const DataPriceSection = () => (
  <View style={styles.dataPrice}>
    <View style={styles.dataSection}>
      <Text style={styles.sectionLabel}>Data</Text>
      <Text style={styles.dataAmount}>
        {packageData.data === 'Unlimited' || packageData.unlimited ? 'Unlimited' : `${packageData.data}GB`}
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
          color={colors.stone[600]} 
        />
      </View>
      <Text style={styles.validityDuration}>
        Valid for {packageData.duration.toString().replace(' days', '')} days
      </Text>
    </View>
  </View>
);


  const PromoCodeSection = () => {
  const [localPromoCode, setLocalPromoCode] = useState('');
  const [localIsRedeeming, setLocalIsRedeeming] = useState(false);

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
      <View style={styles.promoContainer}>
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
      </View>
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
        onPress={() => setNetworkModalVisible(true)}
      >
        <Text style={styles.viewAllText}>View all</Text>
      </TouchableOpacity>
    </View>

    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <Ionicons name="card-outline" size={20} color="#888" />
        <Text style={styles.infoLabel}>Plan Type</Text>
      </View>
      <Text style={styles.infoValue}>
        {packageData.voice_minutes || packageData.sms_count ? 
          'Global Data + Voice + SMS' : 
          'Global Data'}
      </Text>
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
          The validity period starts when the SIM connects to any supported networks in the covered countries.
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
        <TopGlobal />
        <DataPriceSection />
        <VoiceSmsSection />
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
                duration: packageData.duration.toString().replace(' days', ''),
                price: discountedPrice || packageData.price,
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
              ${(discountedPrice || packageData.price).toFixed(2)} • Buy Now
            </Text>
            <View style={styles.buyButtonDot} />
          </LinearGradient>
        </TouchableOpacity>
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
  flagInnerWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  topRegionName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    color: colors.slate[600], // Keeping the original slate color
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
    alignItems: 'center',
    paddingVertical: 20,
  },
  validityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  validityDuration: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    textAlign: 'center',
  },
  voiceSmsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  voiceSmsItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  voiceSmsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  voiceSmsLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    marginBottom: 4,
  },
  voiceSmsValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  promoSection: {
    marginBottom: 24,
    paddingHorizontal: 16,
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
    paddingHorizontal: 16,
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
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  buyButtonDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.stone[50],
    marginLeft: 8,
  },
});

export default GlobalPackageDetailsScreen;