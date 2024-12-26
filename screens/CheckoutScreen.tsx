import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../api/AuthContext';
import { FlagIcon, countries } from '../utils/countryData';
import { regions } from '../utils/regions';
import esimApi from '../api/esimApi';
import { Modal } from 'react-native';
import { EventEmitter } from '../utils/EventEmitter';

const TAB_BAR_HEIGHT = 84;
const WINDOW_HEIGHT = Dimensions.get('window').height;

const CheckoutScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
  const [balance, setBalance] = useState(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const auth = useContext(AuthContext);
 const [termsModalVisible, setTermsModalVisible] = useState(false);
	const [verifiedPromoDetails, setVerifiedPromoDetails] = useState(route.params.promoDetails);


  
  const { package: packageData } = route.params;
  const isGlobalPackage = route.params.isGlobal;
  const isRegionalPackage = !!route.params.region;

  const formatDuration = (duration: any) => {
    if (!duration) return '0 days';
    // If duration is an object (from regional packages)
    if (typeof duration === 'object' && duration.name) {
      return duration.name.toString().replace(' days', '') + ' days';
    }
    // Remove extra "days" if it exists and add it back once
    return duration.toString().replace(' days', '') + ' days';
  };

 const getCoverageCount = () => {
  if (!packageData.coverage) {
    // Fallback to other coverage data sources
    if (packageData.locationNetworkList?.length) {
      return packageData.locationNetworkList.length;
    }
    if (packageData.countryNetworks?.length) {
      return packageData.countryNetworks.length;
    }
    if (packageData.networks?.length) {
      return packageData.networks.length;
    }
    return 0;
  }
  
  // Handle numeric coverage
  if (typeof packageData.coverage === 'number') {
    return packageData.coverage;
  }
  
  // Handle array coverage
  if (Array.isArray(packageData.coverage)) {
    return packageData.coverage.length;
  }
  
  // Handle object coverage
  if (typeof packageData.coverage === 'object') {
    if (packageData.coverage.countries) {
      return packageData.coverage.countries.length;
    }
    return Object.keys(packageData.coverage).length;
  }
  
  return 0;
};

  const countryCode = React.useMemo(() => {
    if (isGlobalPackage || isRegionalPackage) return null;
    return countries.find(c => 
      c.name.toLowerCase() === route.params.country.toLowerCase()
    )?.id || '';
  }, [route.params]);

  const regionInfo = React.useMemo(() => {
    if (!isRegionalPackage) return null;
    return regions.find(r => 
      r.name.toLowerCase() === route.params.region.toLowerCase()
    );
  }, [route.params]);

  useEffect(() => {
    fetchUserBalance();
  }, []);

  const fetchUserBalance = async () => {
    try {
      const response = await esimApi.fetchBalance();
      if (response.success && response.data) {
        setBalance(response.data);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const getFormattedBalance = () => {
    if (isLoadingBalance) return 'Loading...';
    if (!balance?.balance) return '$0.00';
    return `$${Number(balance.balance).toFixed(2)}`;
  };

const handlePurchase = async () => {
  if (!isAgreed) {
    Alert.alert('Terms & Conditions', 'Please agree to the terms and conditions to continue');
    return;
  }

  setIsLoading(true);
  try {
    // Get flagUrl based on package type
    const getFlagUrl = () => {
      if (isGlobalPackage) return '/img/flags/GLOBAL.png';
      if (isRegionalPackage) {
        if (regionInfo?.id) {
          return `/img/flags/region/${regionInfo.id.toLowerCase()}.png`;
        }
        return '/img/flags/UNKNOWN.png';
      }
      return countryCode ? `/img/flags/${countryCode.toLowerCase()}.png` : '/img/flags/UNKNOWN.png';
    };

    // Build promoDetails only if we have valid data
    let promoDetails = null;
    if (verifiedPromoDetails && verifiedPromoDetails.code) {
      promoDetails = {
        code: verifiedPromoDetails.code.trim(),
        originalPrice: verifiedPromoDetails.originalPrice,
        discountAmount: verifiedPromoDetails.discountAmount
      };
    }

    console.log('Constructing order with promo details:', promoDetails);

    const orderRequest = {
      packageCode: packageData.package_code || packageData.packageCode || packageData.id,
      packageName: packageData.originalName || packageData.name,
      price: packageData.price,
      data: packageData.data,
      duration: packageData.duration,
      region: packageData.region || packageData.location,
      operator: packageData.operator,
      provider: packageData.provider,
      flagUrl: getFlagUrl(),
      quantity: 1
    };

    // Only add promoDetails if we have valid data
    if (promoDetails && promoDetails.code) {
      orderRequest.promoDetails = promoDetails;
      console.log('Adding promo details to order:', promoDetails);
    }

    console.log('Sending final order request:', orderRequest);
    const orderResponse = await esimApi.orderEsim(orderRequest);
    console.log('Order response received:', orderResponse);

    if (orderResponse.success && orderResponse.data) {
      // Update local balance state
      if (orderResponse.data.newBalance !== undefined) {
        setBalance({ 
          balance: orderResponse.data.newBalance,
          currency: orderResponse.data.currency || 'USD'
        });

        // Dispatch balance update event for real-time updates
        EventEmitter.dispatch('BALANCE_UPDATED', {
          balance: orderResponse.data.newBalance,
          currency: orderResponse.data.currency || 'USD'
        });

        // Dispatch eSIM update event
        EventEmitter.dispatch('ESIM_ADDED', {
          countryName: packageData.region || packageData.location,
          data: packageData.data,
          duration: packageData.duration
        });
      }

      // Prepare eSIM data
      let esimData = {
        qrCodeUrl: orderResponse.data.qrCodeUrl,
        directAppleInstallUrl: orderResponse.data.directAppleInstallUrl,
        packageName: orderResponse.data.packageName,
        iccid: '',
        ac: '',
        processing: orderResponse.data.processing,
        finalPrice: orderResponse.data.finalPrice || orderResponse.data.price,
        discountAmount: orderResponse.data.discountAmount || 0
      };

      // If we have esims array data, use it
      if (orderResponse.data.esims?.[0]) {
        const firstEsim = orderResponse.data.esims[0];
        esimData = {
          ...esimData,
          qrCodeUrl: firstEsim.qrCodeUrl || esimData.qrCodeUrl,
          directAppleInstallUrl: firstEsim.directAppleInstallationUrl || 
                                firstEsim.appleInstallUrl || 
                                esimData.directAppleInstallUrl,
          iccid: firstEsim.iccid || '',
          ac: firstEsim.smdpAddress && firstEsim.matchingId
            ? `LPA:1$${firstEsim.smdpAddress}$${firstEsim.matchingId}`
            : ''
        };
      }

      // Navigate to Instructions screen
      navigation.navigate('Instructions', {
        ...esimData,
        isProcessing: orderResponse.data.processing,
        esimId: orderResponse.data.esimId,
        orderReference: orderResponse.data.orderReference,
        promoApplied: promoDetails ? true : false
      });
    } else {
      handleOrderError(orderResponse);
    }
  } catch (error) {
    console.error('Purchase error:', error);
    Alert.alert(
      'Error',
      'An unexpected error occurred. Please try again.'
    );
  } finally {
    setIsLoading(false);
  }
};

// Add this helper function to handle order errors
const handleOrderError = (orderResponse) => {
  if (orderResponse.data?.errorCode === 'INSUFFICIENT_BALANCE') {
    Alert.alert(
      'Insufficient Balance',
      `You need to add $${orderResponse.data.needToLoad?.toFixed(2)} to complete this purchase.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Add Funds',
          onPress: () => navigation.navigate('AddFunds', {
            requiredAmount: orderResponse.data.needToLoad
          })
        }
      ]
    );
  } else {
    Alert.alert(
      'Purchase Failed',
      orderResponse.message || 'Failed to process purchase. Please try again.'
    );
  }
};
	
const TermsModal = () => (
  <Modal
    visible={termsModalVisible}
    animationType="slide"
    transparent={true}
    onRequestClose={() => setTermsModalVisible(false)}
  >
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        <ScrollView style={styles.modalScroll}>
          <Text style={styles.modalTitle}>Key Terms & Conditions</Text>
          
          <Text style={styles.modalSubtitle}>By purchasing this eSIM:</Text>
          
          <Text style={styles.modalText}>
            • The service begins when you first connect to a network{'\n'}
            • Purchased data/validity cannot be refunded once activated{'\n'}
            • Package is non-transferable{'\n'}
            • Service may vary by network availability{'\n'}
            • Speed/coverage depends on local network conditions{'\n'}
            • Fair usage policy applies{'\n'}
            • Auto-renewal is not enabled by default{'\n'}
            • Top-up availability varies by package type
          </Text>

          <TouchableOpacity 
            style={styles.viewFullTerms}
            onPress={() => {
              setTermsModalVisible(false);
              navigation.navigate('Terms');
            }}
          >
            <Text style={styles.viewFullTermsText}>View Full Terms</Text>
          </TouchableOpacity>
        </ScrollView>
        
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => setTermsModalVisible(false)}
        >
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

  const LocationIcon = () => {
    if (isGlobalPackage) {
      return <Ionicons name="globe-outline" size={24} color="#FF6B6B" />;
    }
    if (isRegionalPackage && regionInfo?.image) {
      const RegionIcon = regionInfo.image;
      return <RegionIcon width={40} height={40} />;
    }
    if (!isRegionalPackage && countryCode) {
      return <FlagIcon countryCode={countryCode} size={40} />;
    }
    return <Ionicons name="globe-outline" size={24} color="#FF6B6B" />;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.content, { height: WINDOW_HEIGHT - insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="cart-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.packageInfo}>
              <View style={styles.flagContainer}>
                <View style={[
                  styles.flagInnerWrapper,
                  (isGlobalPackage || isRegionalPackage) && styles.globalFlagWrapper
                ]}>
                  <LocationIcon />
                </View>
              </View>
             <View style={styles.packageDetails}>
			  <Text style={styles.locationName}>
				{isGlobalPackage ? 'Global' : 
				 isRegionalPackage ? route.params.region : 
				 route.params.country}
			  </Text>
			  <Text style={styles.packageSpecs}>
				{packageData.data === 'Unlimited' || packageData.unlimited ? 
				  'Unlimited' : `${packageData.data}GB`} • {formatDuration(packageData.duration)}
				{packageData.voice_minutes ? ` • ${packageData.voice_minutes} Minutes` : ''}
				{packageData.sms_count ? ` • ${packageData.sms_count} SMS` : ''}
			  </Text>
			  {(isGlobalPackage || isRegionalPackage) && (
				<Text style={styles.coverageText}>
				  Coverage in {getCoverageCount()} countries
				</Text>
			  )}
			</View>
            </View>
            <View style={styles.priceBreakdown}>
              <View style={[styles.priceRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>
                  ${packageData.price.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Payment Method</Text>
          <TouchableOpacity style={styles.paymentMethodCard}>
            <View style={styles.balanceMethod}>
              <View style={styles.methodLeft}>
                <Ionicons name="wallet-outline" size={24} color="#FFFFFF" />
                <View style={styles.methodInfo}>
                  <Text style={styles.methodTitle}>Balance</Text>
                  <Text style={styles.balanceAmount}>{getFormattedBalance()}</Text>
                </View>
              </View>
              <View style={styles.radioButton}>
                <View style={styles.radioInner} />
              </View>
            </View>
          </TouchableOpacity>

          <View style={{ height: 150 }} />
        </ScrollView>

        <View style={[styles.bottomContainer, { 
          paddingBottom: insets.bottom + TAB_BAR_HEIGHT 
        }]}>
         <TouchableOpacity 
  style={styles.termsContainer}
>
  <TouchableOpacity 
    style={styles.checkbox}
    onPress={() => setIsAgreed(!isAgreed)}
  >
    {isAgreed && <Ionicons name="checkmark" size={16} color="#FF6B6B" />}
  </TouchableOpacity>
  <Text style={styles.termsText}>
    I agree to the{' '}
    <Text 
      style={styles.termsLink}
      onPress={() => setTermsModalVisible(true)}
    >
      Terms & Conditions
    </Text>
  </Text>
</TouchableOpacity>

{/* Add the modal */}
<TermsModal />
          
          <TouchableOpacity 
            onPress={handlePurchase}
            disabled={!isAgreed || isLoading}
            style={styles.payButtonContainer}
          >
            <LinearGradient
              colors={isAgreed ? ['#2ECC71', '#27AE60'] : ['#333', '#222']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.payButton}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.payButtonText}>
                  Pay ${packageData.price.toFixed(2)}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
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
  },
  scrollContentContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    fontFamily: 'Quicksand',
  },
  summaryCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  packageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  flagContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  flagInnerWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    padding: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  globalFlagWrapper: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  packageDetails: {
    flex: 1,
  },
  locationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: 'Quicksand',
  },
  packageSpecs: {
    fontSize: 14,
    color: '#888',
    fontFamily: 'Quicksand',
  },
  coverageText: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    fontFamily: 'Quicksand',
  },
  priceBreakdown: {
    marginTop: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
  },
  paymentMethodCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B6B',
    padding: 16,
    marginBottom: 16,
  },
  balanceMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodInfo: {
    marginLeft: 12,
  },
  methodTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontFamily: 'Quicksand',
  },
  balanceAmount: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
    fontFamily: 'Quicksand',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF6B6B',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1E1E1E',
    borderTopWidth: 1,
    borderTopColor: '#333',
    padding: 16,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FF6B6B',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  termsText: {
    fontSize: 14,
    color: '#888',
    fontFamily: 'Quicksand',
  },
  termsLink: {
    color: '#FF6B6B',
  },
  payButtonContainer: {
    marginBottom: 6,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 25,
  },
  payButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10
  },
 modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#333',
  },
  modalScroll: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    fontFamily: 'Quicksand',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 12,
    fontFamily: 'Quicksand',
  },
  modalText: {
    fontSize: 14,
    color: '#BBBBBB',
    lineHeight: 24,
    fontFamily: 'Quicksand',
  },
  viewFullTerms: {
    marginTop: 20,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    alignItems: 'center',
  },
  viewFullTermsText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontFamily: 'Quicksand',
  },
  closeButton: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    padding: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontFamily: 'Quicksand',
    fontWeight: 'bold',
  },
});

export default CheckoutScreen;