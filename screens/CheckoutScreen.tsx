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
  Modal,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStripe } from '@stripe/stripe-react-native';
import { AuthContext } from '../api/AuthContext';
import { FlagIcon, countries } from '../utils/countryData';
import { regions } from '../utils/regions';
import esimApi from '../api/esimApi';
import { EventEmitter } from '../utils/EventEmitter';
import { colors } from '../theme/colors';
import { useToast } from '../components/ToastNotification';

const TAB_BAR_HEIGHT = 84;
const WINDOW_HEIGHT = Dimensions.get('window').height;

const CheckoutScreen = () => {
  const route = useRoute();
	const toast = useToast(); 
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [isLoading, setIsLoading] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
  const [balance, setBalance] = useState(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('balance');
  const [paymentSheetEnabled, setPaymentSheetEnabled] = useState(false);
  const auth = useContext(AuthContext);
  const [verifiedPromoDetails, setVerifiedPromoDetails] = useState(route.params.promoDetails);
	  const [isInitializingCard, setIsInitializingCard] = useState(false);


  const { package: packageData } = route.params;
  const isGlobalPackage = route.params.isGlobal;
  const isRegionalPackage = !!route.params.region;

  const formatDuration = (duration) => {
    if (!duration) return '0 days';
    if (typeof duration === 'object' && duration.name) {
      return duration.name.toString().replace(' days', '') + ' days';
    }
    return duration.toString().replace(' days', '') + ' days';
  };

  const getCoverageCount = () => {
    if (!packageData.coverage) {
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
    
    if (typeof packageData.coverage === 'number') {
      return packageData.coverage;
    }
    
    if (Array.isArray(packageData.coverage)) {
      return packageData.coverage.length;
    }
    
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

const initializePaymentSheet = async () => {
  try {
    console.log('Starting payment sheet initialization');
    const response = await esimApi.createPaymentIntent({
      amount: Math.round(packageData.price * 100),
      currency: 'usd',
      payment_method_types: ['card'],
      metadata: {
        package_id: packageData.package_code || packageData.packageCode || packageData.id,
        package_name: packageData.name
      }
    });

    console.log('Payment intent creation response:', response);

    const clientSecret = response?.data?.clientSecret;
    console.log('Client secret extracted:', clientSecret ? 'Present' : 'Missing');

    if (!clientSecret) {
      console.error('Response structure:', JSON.stringify(response, null, 2));
      throw new Error('Invalid client secret received');
    }

    // Configure payment sheet with Apple Pay and Google Pay
    const { error: initError } = await initPaymentSheet({
      paymentIntentClientSecret: clientSecret,
      merchantDisplayName: 'eSimFly',
      applePay: Platform.OS === 'ios' ? {
        merchantCountryCode: 'HK',
        merchantIdentifier: STRIPE_MERCHANT_ID,
        buttonType: 'buy'
      } : undefined,
      googlePay: Platform.OS === 'android' ? {
        merchantCountryCode: 'HK',
        testEnv: true,
        merchantName: 'eSimFly'
      } : undefined,
      allowsDelayedPaymentMethods: true,
      style: 'light',
      appearance: {
        colors: {
          primary: '#27AE60', // Matching your green button color
          background: '#FFFFFF',
          componentBackground: '#F5F5F5',
          componentBorder: '#E5E5E5',
          componentDivider: '#E5E5E5',
          primaryText: '#1E1E1E',
          secondaryText: '#666666',
          componentText: '#1E1E1E',
          placeholderText: '#999999'
        },
        shapes: {
          borderRadius: 12,
        },
        primaryButton: {
          colors: {
            background: '#27AE60',
            text: '#FFFFFF'
          }
        }
      },
      defaultBillingDetails: {
        email: auth.userEmail,
        address: {
          country: 'hk'
        }
      }
    });

    if (initError) {
      console.error('Payment sheet initialization error:', initError);
      throw new Error(initError.message);
    }

    console.log('Payment sheet initialized successfully');
    setPaymentSheetEnabled(true);
  } catch (error) {
    console.error('Payment sheet initialization failed:', error);
    Alert.alert('Error', error.message || 'Failed to initialize payment. Please try again.');
  }
};

  useEffect(() => {
    fetchUserBalance();
    if (packageData.price > 0) {
      initializePaymentSheet();
    }
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
    toast.error('Please agree to the terms and conditions to continue');
    return;
  }

  setIsLoading(true);
  let paymentIntentId = null;

  try {
    // Step 1: Create payment intent for card payments
    if (paymentMethod === 'card') {
      console.log('Creating payment intent for card payment', {
        amount: Math.round(packageData.price * 100),
        packageName: packageData.name
      });

      const paymentIntentResponse = await esimApi.createPaymentIntent({
        amount: Math.round(packageData.price * 100),
        currency: 'usd',
        metadata: {
          package_id: packageData.package_code || packageData.packageCode || packageData.id,
          package_name: packageData.name
        },
        payment_method_types: ['card']
      });

      console.log('Payment intent creation response:', paymentIntentResponse);

      if (!paymentIntentResponse.success || !paymentIntentResponse.data?.id) {
        throw new Error(paymentIntentResponse.message || 'Payment initialization failed');
      }

      paymentIntentId = paymentIntentResponse.data.id;
      console.log('Payment intent created:', paymentIntentId);

      // Present the payment sheet
      console.log('Presenting payment sheet');
      const { error: presentError } = await presentPaymentSheet();
      
      // Handle cancellation specifically
      if (presentError?.code === 'Canceled') {
        console.log('User canceled the payment');
        toast.info('Payment canceled');
        // Cancel the payment intent since user canceled
        try {
          await esimApi.cancelPaymentIntent(paymentIntentId);
        } catch (cancelError) {
          console.error('Error canceling payment intent:', cancelError);
        }
        setIsLoading(false);
        return; // Exit early since this is a user-initiated cancellation
      } else if (presentError) {
        console.error('Payment sheet presentation error:', presentError);
        throw new Error(presentError.message || 'Payment failed');
      }

      // Confirm the payment
      console.log('Confirming payment:', paymentIntentId);
      const confirmResponse = await esimApi.confirmPayment(paymentIntentId);
      console.log('Payment confirmation response:', confirmResponse);

      if (!confirmResponse.success) {
        throw new Error(confirmResponse.message || 'Payment confirmation failed');
      }
    }

    // Step 2: Process the order
    console.log('Processing order');
    const getFlagUrl = () => {
      if (isGlobalPackage) return '/img/flags/GLOBAL.png';
      if (isRegionalPackage) {
        return regionInfo?.id ? 
          `/img/flags/region/${regionInfo.id.toLowerCase()}.png` : 
          '/img/flags/UNKNOWN.png';
      }
      return countryCode ? 
        `/img/flags/${countryCode.toLowerCase()}.png` : 
        '/img/flags/UNKNOWN.png';
    };

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
      quantity: 1,
      payment_method: paymentMethod,
      payment_intent_id: paymentIntentId,
      promoDetails: verifiedPromoDetails
    };

    console.log('Sending order request:', orderRequest);
    const orderResponse = await esimApi.orderEsim(orderRequest);
    console.log('Order response:', orderResponse);

    if (orderResponse.success && orderResponse.data) {
      // Update balance if available
      if (orderResponse.data.newBalance !== undefined) {
        setBalance({ 
          balance: orderResponse.data.newBalance,
          currency: orderResponse.data.currency || 'USD'
        });

        EventEmitter.dispatch('BALANCE_UPDATED', {
          balance: orderResponse.data.newBalance,
          currency: orderResponse.data.currency || 'USD'
        });

        EventEmitter.dispatch('ESIM_ADDED', {
          countryName: packageData.region || packageData.location,
          data: packageData.data,
          duration: packageData.duration
        });
      }

      // Prepare eSIM data for navigation
      const esimData = {
        qrCodeUrl: orderResponse.data.qrCodeUrl,
        directAppleInstallUrl: orderResponse.data.directAppleInstallUrl,
        packageName: orderResponse.data.packageName,
        iccid: '',
        ac: '',
        processing: orderResponse.data.processing,
        finalPrice: orderResponse.data.finalPrice || orderResponse.data.price,
        discountAmount: orderResponse.data.discountAmount || 0,
        ...(orderResponse.data.esims?.[0] && {
          qrCodeUrl: orderResponse.data.esims[0].qrCodeUrl || orderResponse.data.qrCodeUrl,
          directAppleInstallUrl: orderResponse.data.esims[0].directAppleInstallationUrl || 
                                orderResponse.data.esims[0].appleInstallUrl ||
                                orderResponse.data.directAppleInstallUrl,
          iccid: orderResponse.data.esims[0].iccid || '',
          ac: orderResponse.data.esims[0].smdpAddress && orderResponse.data.esims[0].matchingId
            ? `LPA:1$${orderResponse.data.esims[0].smdpAddress}$${orderResponse.data.esims[0].matchingId}`
            : ''
        })
      };

      toast.success('Purchase successful! Redirecting to installation...');

      // Navigate to instructions screen
      navigation.navigate('Instructions', {
        ...esimData,
        isProcessing: orderResponse.data.processing,
        esimId: orderResponse.data.esimId,
        orderReference: orderResponse.data.orderReference,
        promoApplied: verifiedPromoDetails ? true : false
      });
    } else {
      handleOrderError(orderResponse);
    }

  } catch (error) {
    console.error('Purchase error:', error);
    
    // Don't show error toast for cancellations
    if (error?.code !== 'Canceled') {
      toast.error(error.message || 'An unexpected error occurred. Please try again.');
    }
    
    // If payment was initiated but failed (not cancelled), try to cancel it
    if (paymentIntentId && error?.code !== 'Canceled') {
      try {
        console.log('Attempting to cancel payment intent:', paymentIntentId);
        await esimApi.cancelPaymentIntent(paymentIntentId);
      } catch (cancelError) {
        console.error('Error canceling payment intent:', cancelError);
      }
    }
  } finally {
    setIsLoading(false);
  }
};
	
const handleSuccessfulOrder = (orderResponse) => {
  // Update balance if available
  if (orderResponse.data.newBalance !== undefined) {
    setBalance({ 
      balance: orderResponse.data.newBalance,
      currency: orderResponse.data.currency || 'USD'
    });

    EventEmitter.dispatch('BALANCE_UPDATED', {
      balance: orderResponse.data.newBalance,
      currency: orderResponse.data.currency || 'USD'
    });
  }

  // Prepare eSIM data for navigation
  const esimData = {
    qrCodeUrl: orderResponse.data.qrCodeUrl,
    directAppleInstallUrl: orderResponse.data.directAppleInstallUrl,
    packageName: orderResponse.data.packageName,
    iccid: '',
    ac: '',
    processing: orderResponse.data.processing,
    finalPrice: orderResponse.data.finalPrice || orderResponse.data.price,
    discountAmount: orderResponse.data.discountAmount || 0,
    ...(orderResponse.data.esims?.[0] && {
      qrCodeUrl: orderResponse.data.esims[0].qrCodeUrl || esimData.qrCodeUrl,
      directAppleInstallUrl: orderResponse.data.esims[0].directAppleInstallationUrl || 
                            orderResponse.data.esims[0].appleInstallUrl,
      iccid: orderResponse.data.esims[0].iccid || '',
      ac: orderResponse.data.esims[0].smdpAddress && orderResponse.data.esims[0].matchingId
        ? `LPA:1$${orderResponse.data.esims[0].smdpAddress}$${orderResponse.data.esims[0].matchingId}`
        : ''
    })
  };

  // Navigate to instructions screen
  navigation.navigate('Instructions', {
    ...esimData,
    isProcessing: orderResponse.data.processing,
    esimId: orderResponse.data.esimId,
    orderReference: orderResponse.data.orderReference,
    promoApplied: verifiedPromoDetails ? true : false
  });
};

  const handleOrderError = (orderResponse) => {
    if (orderResponse.data?.errorCode === 'INSUFFICIENT_BALANCE') {
      Alert.alert(
        'Insufficient Balance',
        `You need to add $${orderResponse.data.needToLoad?.toFixed(2)} to complete this purchase.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Add Funds',
            onPress: () => navigation.navigate('Deposit', {
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

   const PaymentMethods = () => (
    <View>
      <TouchableOpacity 
        style={[
          styles.paymentMethodCard,
          paymentMethod === 'balance' && styles.selectedPaymentMethod
        ]}
        onPress={() => setPaymentMethod('balance')}
      >
        <View style={styles.balanceMethod}>
          <View style={styles.methodLeft}>
            <View style={styles.methodIconContainer}>
              <Ionicons name="wallet-outline" size={24} color={colors.text.primary} />
            </View>
            <View style={styles.methodInfo}>
              <Text style={styles.methodTitle}>Balance</Text>
              <Text style={styles.balanceAmount}>{getFormattedBalance()}</Text>
            </View>
          </View>
          <View style={styles.radioButton}>
            {paymentMethod === 'balance' && <View style={styles.radioInner} />}
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[
          styles.paymentMethodCard,
          paymentMethod === 'card' && styles.selectedPaymentMethod
        ]}
        onPress={async () => {
          setPaymentMethod('card');
          if (!paymentSheetEnabled) {
            setIsInitializingCard(true);
            await initializePaymentSheet();
            setIsInitializingCard(false);
          }
        }}
      >
        <View style={styles.balanceMethod}>
          <View style={styles.methodLeft}>
            <View style={styles.methodIconContainer}>
              <Ionicons name="card-outline" size={24} color={colors.text.primary} />
            </View>
            <View style={styles.methodInfo}>
              <Text style={styles.methodTitle}>Credit/Debit Card</Text>
              {isInitializingCard ? (
                <ActivityIndicator size="small" color={colors.text.secondary} style={{marginTop: 4}} />
              ) : (
                <Text style={styles.balanceAmount}>Pay with Stripe</Text>
              )}
            </View>
          </View>
          <View style={styles.radioButton}>
            {paymentMethod === 'card' && <View style={styles.radioInner} />}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.content, { height: WINDOW_HEIGHT - insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={[styles.headerIcon, { backgroundColor: colors.background.headerIcon }]}
          >
            <Ionicons name="arrow-back" size={24} color={colors.icon.header} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <TouchableOpacity style={[styles.headerIcon, { backgroundColor: colors.background.headerIcon }]}>
            <Ionicons name="cart-outline" size={24} color={colors.icon.header} />
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
          <PaymentMethods />

          <View style={{ height: 150 }} />
        </ScrollView>

        <View style={[styles.bottomContainer, { 
          paddingBottom: insets.bottom + TAB_BAR_HEIGHT 
        }]}>
          <TouchableOpacity 
            style={styles.termsContainer}
            onPress={() => setIsAgreed(!isAgreed)}
          >
            <View style={styles.checkbox}>
              {isAgreed && <Ionicons name="checkmark" size={16} color="#FF6B6B" />}
            </View>
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
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    fontFamily: 'Quicksand',
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContentContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 16,
    fontFamily: 'Quicksand',
  },
  summaryCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  packageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  flagContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  flagInnerWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.primary,
    padding: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  globalFlagWrapper: {
    backgroundColor: colors.background.tertiary,
  },
  packageDetails: {
    flex: 1,
  },
  locationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
    fontFamily: 'Quicksand',
  },
  packageSpecs: {
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: 'Quicksand',
  },
  coverageText: {
    fontSize: 12,
    color: colors.text.tertiary,
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
    borderTopColor: colors.border.light,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    fontFamily: 'Quicksand',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    fontFamily: 'Quicksand',
  },
  paymentMethodCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: 16,
    marginBottom: 16,
  },
  selectedPaymentMethod: {
    borderColor: colors.stone[600],
    borderWidth: 2,
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
    color: colors.text.primary,
    fontWeight: 'bold',
    fontFamily: 'Quicksand',
  },
  balanceAmount: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 2,
    fontFamily: 'Quicksand',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.stone[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.stone[600],
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
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
    borderColor: colors.stone[600],
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  termsText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: 'Quicksand',
  },
  termsLink: {
    color: colors.stone[600],
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
    color: colors.background.primary,
    fontFamily: 'Quicksand',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  modalScroll: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 16,
    fontFamily: 'Quicksand',
  },
  modalSubtitle: {
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: 12,
    fontFamily: 'Quicksand',
  },
  modalText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 24,
    fontFamily: 'Quicksand',
  },
  viewFullTerms: {
    marginTop: 20,
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
  },
  viewFullTermsText: {
    color: colors.stone[600],
    fontSize: 14,
    fontFamily: 'Quicksand',
  },
  closeButton: {
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    padding: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    color: colors.stone[600],
    fontSize: 16,
    fontFamily: 'Quicksand',
    fontWeight: 'bold',
  }
});

export default CheckoutScreen;