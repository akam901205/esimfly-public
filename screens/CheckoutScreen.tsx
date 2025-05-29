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
import { useStripe } from '@stripe/stripe-react-native';
import { AuthContext } from '../api/AuthContext';
import { FlagIcon, countries } from '../utils/countryData';
import { regions } from '../utils/regions';
import esimApi from '../api/esimApi';
import { EventEmitter } from '../utils/EventEmitter';
import { colors } from '../theme/colors';
import { useToast } from '../components/ToastNotification';

const { width: screenWidth } = Dimensions.get('window');

const CheckoutScreenV2 = () => {
  const route = useRoute();
  const toast = useToast();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [isLoading, setIsLoading] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
  const [balance, setBalance] = useState(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('balance');
  const auth = useContext(AuthContext);
  const [verifiedPromoDetails, setVerifiedPromoDetails] = useState(route.params.promoDetails);

  const { package: packageData, isTopup, esimId, esimDetails } = route.params;
  const isGlobalPackage = route.params.isGlobal;
  const isRegionalPackage = !!route.params.region;

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

  const handlePurchase = async () => {
    if (!isAgreed) {
      toast.error('Please agree to the terms and conditions to continue');
      return;
    }

    setIsLoading(true);

    try {
      if (paymentMethod === 'card') {
        // Create payment intent for card payment
        const paymentResponse = await esimApi.createCheckoutSession({
          items: [{
            id: packageData.package_code || packageData.packageCode || packageData.id,
            name: packageData.name,
            price: packageData.price,
            quantity: 1,
            data_amount: packageData.data,
            duration: packageData.duration,
            flag_url: packageData.flag_url || getFlagUrl(),
            // Keep metadata in item for backward compatibility
            ...(isTopup && {
              metadata: {
                is_topup: true,
                esim_id: esimId,
                iccid: esimDetails?.iccid,
                provider: packageData.metadata?.provider || packageData.provider || esimDetails?.provider || 'auto'
              }
            })
          }],
          promoDetails: verifiedPromoDetails,
          // Pass top-up parameters at root level
          ...(isTopup && {
            isTopup: true,
            esimId: esimId,
            provider: packageData.metadata?.provider || packageData.provider || esimDetails?.provider || 'auto'
          })
        });

        if (!paymentResponse.success || !paymentResponse.data) {
          throw new Error(paymentResponse.message || 'Failed to create payment session');
        }

        const { paymentIntent, ephemeralKey, customer } = paymentResponse.data;

        // Initialize payment sheet
        const { error: initError } = await initPaymentSheet({
          merchantDisplayName: 'eSIMfly',
          paymentIntentClientSecret: paymentIntent,
          customerId: customer,
          customerEphemeralKeySecret: ephemeralKey,
          defaultBillingDetails: {
            email: auth.userEmail,
          },
          applePay: {
            merchantCountryCode: 'AE',
          },
          googlePay: {
            merchantCountryCode: 'AE',
            testEnv: false,
            currencyCode: 'USD',
          },
          style: 'automatic',
          returnURL: 'esimfly://payment-complete',
          // Enable save card for future use
          allowsDelayedPaymentMethods: true,
        });

        if (initError) {
          throw new Error(initError.message);
        }

        // Present payment sheet
        const { error: presentError } = await presentPaymentSheet();

        if (presentError) {
          if (presentError.code === 'Canceled') {
            toast.info('Payment canceled');
            return;
          }
          throw new Error(presentError.message);
        }

        // Payment successful - wait for webhook to process
        toast.success('Payment successful! Processing your order...');
        
        // Navigate to a processing screen or wait for confirmation
        setTimeout(() => {
          navigation.navigate('OrderProcessing', {
            orderReference: paymentResponse.data.orderReference,
            packageName: packageData.name
          });
        }, 1500);

      } else {
        // Process balance payment
        let orderResponse;
        
        if (isTopup) {
          // For topups, use the topup API
          orderResponse = await esimApi.processTopUpNew(esimId, packageData.id);
        } else {
          // For new eSIMs, use the regular order API
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
            payment_method: 'balance',
            promoDetails: verifiedPromoDetails
          };

          orderResponse = await esimApi.orderEsim(orderRequest);
        }

        if (orderResponse.success && orderResponse.data) {
          // For topups, the actual data is nested in data.data
          const responseData = isTopup ? (orderResponse.data.data || orderResponse.data) : orderResponse.data;
          
          console.log('Order response data:', {
            isTopup,
            orderResponse: orderResponse.data,
            responseData,
            orderReference: responseData.orderReference
          });
          
          // Update balance
          if (responseData.newBalance !== undefined) {
            setBalance({ 
              balance: responseData.newBalance,
              currency: responseData.currency || 'USD'
            });

            EventEmitter.dispatch('BALANCE_UPDATED', {
              balance: responseData.newBalance,
              currency: responseData.currency || 'USD'
            });

            if (!isTopup) {
              EventEmitter.dispatch('ESIM_ADDED', {
                countryName: packageData.region || packageData.location,
                data: packageData.data,
                duration: packageData.duration
              });
            }
          }

          toast.success(isTopup ? 'Top-up successful!' : 'Purchase successful!');

          if (isTopup) {
            // For topups, navigate to order processing screen first
            navigation.navigate('OrderProcessing', {
              orderReference: responseData.orderReference || `topup_${Date.now()}`,
              packageName: packageData.name,
              isTopup: true,
              navigateToMyEsims: true // Flag to indicate where to go after processing
            });
          } else {
            // For new purchases, navigate to instructions
            navigation.navigate('Instructions', {
              qrCodeUrl: orderResponse.data.qrCodeUrl,
              directAppleInstallUrl: orderResponse.data.directAppleInstallUrl,
              packageName: orderResponse.data.packageName,
              iccid: orderResponse.data.esims?.[0]?.iccid || '',
              ac: orderResponse.data.esims?.[0]?.ac || '',
              processing: orderResponse.data.processing,
              esimId: orderResponse.data.esimId,
              orderReference: orderResponse.data.orderReference
            });
          }
        } else {
          handleOrderError(orderResponse);
        }
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error(error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
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

  const getFlagUrl = () => {
    // For topups, use the flag from the package data
    if (isTopup && packageData.flag_url) {
      return packageData.flag_url;
    }
    
    if (isGlobalPackage) return '/img/flags/GLOBAL.png';
    if (isRegionalPackage && route.params.region) {
      const regionInfo = regions.find(r => 
        r.name.toLowerCase() === route.params.region.toLowerCase()
      );
      return regionInfo?.id ? 
        `/img/flags/region/${regionInfo.id.toLowerCase()}.png` : 
        '/img/flags/UNKNOWN.png';
    }
    if (route.params.country) {
      const countryCode = countries.find(c => 
        c.name.toLowerCase() === route.params.country.toLowerCase()
      )?.id || '';
      return countryCode ? 
        `/img/flags/${countryCode.toLowerCase()}.png` : 
        '/img/flags/UNKNOWN.png';
    }
    
    // Default fallback
    return packageData.flag_url || '/img/flags/UNKNOWN.png';
  };

  const LocationIcon = () => {
    // For topups, show a refresh icon
    if (isTopup) {
      return <Ionicons name="refresh-outline" size={24} color="#FF6B6B" />;
    }
    
    if (isGlobalPackage) {
      return <Ionicons name="globe-outline" size={24} color="#FF6B6B" />;
    }
    if (isRegionalPackage && route.params.region) {
      const regionInfo = regions.find(r => 
        r.name.toLowerCase() === route.params.region.toLowerCase()
      );
      if (regionInfo?.image) {
        const RegionIcon = regionInfo.image;
        return <RegionIcon width={40} height={40} />;
      }
    }
    if (route.params.country) {
      const countryCode = countries.find(c => 
        c.name.toLowerCase() === route.params.country.toLowerCase()
      )?.id || '';
      if (countryCode) {
        return <FlagIcon countryCode={countryCode} size={40} />;
      }
    }
    return <Ionicons name="globe-outline" size={24} color="#FF6B6B" />;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.headerIcon}
        >
          <Ionicons name="arrow-back" size={24} color={colors.icon.header} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.headerIcon} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.packageInfo}>
              <View style={styles.flagContainer}>
                <LocationIcon />
              </View>
              <View style={styles.packageDetails}>
                <Text style={styles.locationName}>
                  {isGlobalPackage ? 'Global' : 
                   isRegionalPackage ? route.params.region : 
                   route.params.country}
                </Text>
                <Text style={styles.packageSpecs}>
                  {packageData.data === 'Unlimited' || packageData.unlimited ? 
                    'Unlimited' : packageData.data_formatted || `${packageData.data}GB`} • {formatDuration(packageData.duration)}
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
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Total</Text>
              <Text style={styles.priceValue}>
                ${packageData.price.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          
          <TouchableOpacity 
            style={[
              styles.paymentMethodCard,
              paymentMethod === 'balance' && styles.selectedPaymentMethod
            ]}
            onPress={() => setPaymentMethod('balance')}
          >
            <Ionicons name="wallet-outline" size={24} color={colors.text.primary} />
            <View style={styles.paymentMethodInfo}>
              <Text style={styles.paymentMethodTitle}>Balance</Text>
              <Text style={styles.paymentMethodSubtitle}>{getFormattedBalance()}</Text>
            </View>
            <View style={styles.radioButton}>
              {paymentMethod === 'balance' && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.paymentMethodCard,
              paymentMethod === 'card' && styles.selectedPaymentMethod
            ]}
            onPress={() => setPaymentMethod('card')}
          >
            <Ionicons name="card-outline" size={24} color={colors.text.primary} />
            <View style={styles.paymentMethodInfo}>
              <Text style={styles.paymentMethodTitle}>Credit/Debit Card</Text>
              <Text style={styles.paymentMethodSubtitle}>Secure payment via Stripe</Text>
            </View>
            <View style={styles.radioButton}>
              {paymentMethod === 'card' && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        </View>

        {/* Terms Agreement */}
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
              onPress={() => navigation.navigate('Terms')}
            >
              Terms & Conditions
            </Text>
          </Text>
        </TouchableOpacity>

        {/* Pay Button */}
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

        {/* Security Note */}
        <View style={styles.securityNote}>
          <Ionicons name="shield-checkmark-outline" size={16} color="#6B7280" />
          <Text style={styles.securityNoteText}>
            Your payment information is secure and encrypted
          </Text>
        </View>
      </ScrollView>
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 40,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 16,
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
    marginBottom: 16,
  },
  flagContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  packageDetails: {
    flex: 1,
  },
  locationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  packageSpecs: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  coverageText: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 4,
  },
  priceContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    paddingTop: 16,
  },
  priceLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.border.light,
  },
  selectedPaymentMethod: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.light,
  },
  paymentMethodInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  paymentMethodSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 2,
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
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
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
  },
  termsLink: {
    color: colors.stone[600],
    textDecorationLine: 'underline',
  },
  payButtonContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
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
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  securityNoteText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
});

export default CheckoutScreenV2;
