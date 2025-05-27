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
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FlagIcon, countries } from '../utils/countryData';
import NetworkModal from '../components/NetworkModalSingelCountry';
import esimApi from '../api/esimApi';
import { colors } from '../theme/colors';


const PackageDetailsScreen = () => {
  const [networkModalVisible, setNetworkModalVisible] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [verifiedPromoCode, setVerifiedPromoCode] = useState(''); // Add this state
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [discountedPrice, setDiscountedPrice] = useState(null);
  const [originalPrice, setOriginalPrice] = useState(null);
  
  const route = useRoute();
  const navigation = useNavigation();
  const params = route.params;
  const packageData = params.package;
  const country = params.country;
  
  // Debug logging
  console.log('[DEBUG] PackageDetailsScreen - Full package data:', JSON.stringify(packageData, null, 2));

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
  <View style={styles.header}>
    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
      <Ionicons 
        name="arrow-back" 
        size={24} 
        color={colors.icon.header}  // Using new icon color
      />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>Package Details</Text>
    <View style={styles.headerIcon}>
      <Ionicons 
        name="information-circle-outline" 
        size={24} 
        color={colors.icon.header}  // Using new icon color
      />
    </View>
  </View>
);

  const TopFlag = () => (
    <View style={styles.topFlagContainer}>
      <View style={styles.flagWrapper}>
        <View style={styles.flagInnerWrapper}>
          <FlagIcon countryCode={countryCode} size={70} />
        </View>
      </View>
      <Text style={styles.topCountryName}>{country}</Text>
    </View>
  );

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
          color={colors.stone[600]} 
        />
      </View>
      <Text style={styles.validityDuration}>
        Valid for {packageData.duration.toString().replace(' days', '')} days
      </Text>
    </View>
  </View>
);

  const WorksInSection = () => (
    <View style={styles.worksInSection}>
      <Text style={styles.sectionTitle}>Works in</Text>
      <View style={styles.countryContainer}>
        <FlagIcon countryCode={countryCode} size={24} />
        <Text style={styles.countryName}>{country}</Text>
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
            { color: colors.text.primary } // Changed from #FFFFFF to use theme color
          ]}
          placeholder="Enter referral or promo code"
          placeholderTextColor={colors.text.secondary}
          value={localPromoCode}
          onChangeText={(text) => {
            // Only allow alphanumeric characters
            const cleanText = text.replace(/[^A-Za-z0-9]/g, '');
            setLocalPromoCode(cleanText.slice(0, 6)); // Limit to 6 characters
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
          <Text style={styles.infoLabel}>Network</Text>
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
        <Text style={styles.infoValue}>Data Only</Text>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoLeft}>
          <Ionicons name="reload-circle-outline" size={20} color="#888" />
          <Text style={styles.infoLabel}>Top Up</Text>
        </View>
        <Text style={styles.infoValue}>{isProvider2 ? 'Not Available' : 'Available'}</Text>
      </View>

      <View style={styles.policySection}>
        <View style={styles.infoLeft}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#888" />
          <Text style={styles.infoLabel}>Activation Policy</Text>
        </View>
        <Text style={styles.policyText}>
          The validity period starts when the SIM connects to any supported networks.
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <TopFlag />
        <DataPriceSection />
        <ValiditySection />
        <WorksInSection />
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
    price: discountedPrice || originalPrice
  },
  country: country,
  promoDetails: promoCode && discountedPrice !== null ? {  // Modified this condition
    code: promoCode.trim().toUpperCase(),  // Use actual promo code
    originalPrice: originalPrice,
    discountAmount: originalPrice - discountedPrice
  } : null  // Send null if no valid promo code
});
}}
>
  <LinearGradient
    colors={['#2ECC71', '#27AE60']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.buyButton}
  >
    <Text style={styles.buyButtonText}>
      ${(discountedPrice || originalPrice)?.toFixed(2)} • Buy Now
    </Text>
    <View style={styles.buyButtonDot} />
  </LinearGradient>
</TouchableOpacity>
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
    fontSize: 24,
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
    marginVertical: 20,
  },
  flagWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  flagInnerWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.background.primary,
    padding: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  topCountryName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  dataPrice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 8,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  countryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  countryName: {
    fontSize: 18,
    color: colors.text.primary,
    marginLeft: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
  redeemButtonDisabled: {
    backgroundColor: colors.background.tertiary,
    opacity: 0.7,
  },
  redeemText: {
    fontSize: 14,
    color: colors.text.redeemText,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    fontWeight: '600',
  },
  infoSection: {
    marginTop: 24,
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
    flex: 1,
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
    paddingBottom: Platform.OS === 'ios' ? 90 : 70,
    backgroundColor: colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  disclaimer: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    textAlign: 'center',
    lineHeight: 16,
  },
  learnMore: {
    color: colors.stone[800],
    fontWeight: '600',
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 25,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  buyButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.stone[50],
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  originalPrice: {
    fontSize: 16,
    color: colors.text.secondary,
    textDecorationLine: 'line-through',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
});

export default PackageDetailsScreen;