//curent packagedetialsscreen

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
    // Provider 3 (Airalo)
    if (packageData.packageCode?.startsWith('airalo_')) {
      const networks = [];
      if (packageData.speed) {
        networks.push({
          type: 'speed',
          value: packageData.speed,
          icon: 'speedometer-outline'
        });
      }
      // Add network information from coverages
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
      console.log('Processed networks for provider 3:', networks);
      return networks;
    }
    
    if (packageData.id?.startsWith('esim_')) {
      const networks = [];
      
      // Process speed information
      if (packageData.speed) {
        let speeds;
        if (typeof packageData.speed === 'string') {
          speeds = packageData.speed.split(',').map(s => s.trim());
        } else if (Array.isArray(packageData.speed)) {
          speeds = packageData.speed;
        }

        if (speeds && speeds.length > 0) {
          // Get highest speed
          const speedHierarchy = ['5G', '4G', '3G', '2G'];
          let highestSpeed = speeds.reduce((highest, current) => {
            const currentIndex = speedHierarchy.indexOf(current.toUpperCase());
            const highestIndex = speedHierarchy.indexOf(highest?.toUpperCase() || '');
            return currentIndex !== -1 && (currentIndex < highestIndex || highestIndex === -1) 
              ? current 
              : highest;
          }, null);

          if (highestSpeed) {
            networks.push({
              type: 'speed',
              value: highestSpeed.toUpperCase(),
              icon: 'speedometer-outline'
            });
          }
        }
      }

      // Process networks information for Provider 2
      if (packageData.networks && Array.isArray(packageData.networks)) {
        packageData.networks.forEach(countryNetwork => {
          // Check if networks is nested inside country object
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
          }
          // Handle direct network objects
          else if (countryNetwork.name) {
            networks.push({
              type: 'network',
              value: countryNetwork.name,
              icon: 'wifi-outline',
              speeds: countryNetwork.type ? countryNetwork.type.split(',').map(s => s.trim()) : []
            });
          }
        });
      }
      
      return networks;
    }
    
    // Provider 1 (ESIMaccess)
    const networks = [];
    
    // Process speed information
    if (packageData.speed) {
      let speeds = packageData.speed.split(/[,\/]/).map(s => s.trim().toUpperCase());
      
      // Get highest speed
      const speedHierarchy = ['5G', '4G', '3G', '2G'];
      let highestSpeed = speeds.reduce((highest, current) => {
        const currentIndex = speedHierarchy.indexOf(current);
        const highestIndex = speedHierarchy.indexOf(highest || '');
        return currentIndex !== -1 && (currentIndex < highestIndex || highestIndex === -1) 
          ? current 
          : highest;
      }, null);

      if (highestSpeed) {
        networks.push({
          type: 'speed',
          value: highestSpeed,
          icon: 'speedometer-outline'
        });
      }
    }

    // Process networks information
    if (packageData.networks && packageData.networks.length > 0) {
      packageData.networks.forEach(network => {
        if (typeof network === 'object' && network.name) {
          const networkEntry = {
            type: 'network',
            value: network.name,
            icon: 'wifi-outline'
          };

          // Add network type if available
          if (network.type) {
            networkEntry.speeds = network.type.split(/[,\/]/)
              .map(t => t.trim().toUpperCase())
              .filter(t => t !== '');
          }

          networks.push(networkEntry);
        } else if (typeof network === 'string') {
          networks.push({
            type: 'network',
            value: network,
            icon: 'wifi-outline'
          });
        }
      });
    }

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
        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Package Details</Text>
      <View style={styles.headerIcon}>
        <Ionicons name="information-circle-outline" size={24} color="#FFFFFF" />
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
          <Ionicons name="time-outline" size={24} color="#FF6B6B" />
        </View>
        <Text style={styles.validityDuration}>Valid for {packageData.duration} days</Text>
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
  // Create local state here instead of using parent state
  const [localPromoCode, setLocalPromoCode] = useState('');
  const [localIsRedeeming, setLocalIsRedeeming] = useState(false);

  // Create local handle redemption
  const localHandleRedemption = async () => {
    if (!localPromoCode.trim()) {
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
            {color: '#FFFFFF'}
          ]}
          placeholder="Enter referral or promo code"
          placeholderTextColor="#888"
          value={localPromoCode}
          onChangeText={setLocalPromoCode}
          autoCapitalize="characters"
          maxLength={6}
          selectionColor="#FF6B6B"
        />
        <TouchableOpacity 
          style={[
            styles.redeemButton,
            !localPromoCode.trim() && styles.redeemButtonDisabled
          ]}
          onPress={localHandleRedemption}
          disabled={!localPromoCode.trim() || localIsRedeeming}
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
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1E1E1E',
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
    fontFamily: 'Quicksand',
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
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  flagInnerWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'white',
    padding: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  topCountryName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
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
    color: '#888',
    marginBottom: 8,
    fontFamily: 'Quicksand',
  },
  dataAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
  },
  priceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
  },
  validitySection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  validityInner: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: '#333',
  },
  validityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  validityDuration: {
    fontSize: 20,
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    fontWeight: 'bold',
  },
  worksInSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    fontFamily: 'Quicksand',
  },
  countryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  countryName: {
    fontSize: 18,
    color: '#FFFFFF',
    marginLeft: 12,
    fontFamily: 'Quicksand',
  },
  promoSection: {
    marginBottom: 24,
  },
  promoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  promoPlaceholder: {
    fontSize: 16,
    color: '#888',
    fontFamily: 'Quicksand',
  },
  redeemButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  redeemText: {
    fontSize: 14,
    color: '#FF6B6B',
    fontFamily: 'Quicksand',
  },
  infoSection: {
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
    fontFamily: 'Quicksand',
  },
  infoValue: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
  },
  viewAllButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  viewAllText: {
    fontSize: 14,
    color: '#FF6B6B',
    fontFamily: 'Quicksand',
  },
  policySection: {
    marginTop: 16,
  },
  policyText: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    fontFamily: 'Quicksand',
    lineHeight: 20,
  },
  bottomContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 90 : 70,
    backgroundColor: '#1E1E1E',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  disclaimer: {
    fontSize: 12,
    color: '#888',
    marginBottom: 16,
    fontFamily: 'Quicksand',
    textAlign: 'center',
  },
  learnMore: {
    color: '#FF6B6B',
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 25,
    marginBottom: 6,
  },
  buyButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
  },
  buyButtonDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginLeft: 8,
  },
promoInput: {
  flex: 1,
  fontSize: 16,
  color: '#FFFFFF', // Changed from black to white
  fontFamily: 'Quicksand',
  padding: 0,
  marginRight: 12,
  height: 40, // Added fixed height for better touch target
},
redeemButton: {
  backgroundColor: 'rgba(255, 107, 107, 0.1)',
  paddingVertical: 8,
  paddingHorizontal: 16,
  borderRadius: 8,
},
redeemButtonDisabled: {
  backgroundColor: 'rgba(136, 136, 136, 0.1)',
},
  originalPrice: {
    fontSize: 16,
    color: '#888',
    textDecorationLine: 'line-through',
    marginTop: 4,
    fontFamily: 'Quicksand',
  },
});

export default PackageDetailsScreen;