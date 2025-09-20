import React, { useState, useContext, useEffect, useRef } from 'react';
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
  KeyboardAvoidingView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path, Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStripe } from '@stripe/stripe-react-native';
import { AuthContext } from '../api/AuthContext';
import { FlagIcon, countries } from '../utils/countryData';
import { regions } from '../utils/regions';
import esimApi from '../api/esimApi';
import { EventEmitter } from '../utils/EventEmitter';
import { colors } from '../theme/colors';
import { useToast } from '../components/ToastNotification';
import { formatBalance, SupportedCurrency } from '../utils/currencyUtils';
import { useCurrencyConversion } from '../hooks/useCurrencyConversion';

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
  const [paymentMethod, setPaymentMethod] = useState(null);
  const auth = useContext(AuthContext);
  const [verifiedPromoDetails, setVerifiedPromoDetails] = useState(route.params.promoDetails);
  const { userCurrency, formatPrice, formatActualBalance, convertPrice, loading: currencyLoading } = useCurrencyConversion();
  
  // Refs for auto-scroll
  const scrollViewRef = useRef(null);
  const termsRef = useRef(null);

  const { package: packageData, isTopup, esimId, esimDetails } = route.params;
  const isGlobalPackage = route.params.isGlobal;
  const isRegionalPackage = !!route.params.region;

  useEffect(() => {
    fetchUserBalance();
  }, []);

  // Automatically set payment method based on user currency
  useEffect(() => {
    if (userCurrency === 'IQD' && paymentMethod !== 'fib') {
      // Default to FIB for Iraqi users (local bank payment)
      setPaymentMethod('fib');
    } else if (userCurrency !== 'USD' && userCurrency !== 'IQD' && paymentMethod !== 'balance') {
      // Default to balance for other non-USD currencies
      setPaymentMethod('balance');
    }
  }, [userCurrency]);

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
    return formatActualBalance(balance.balance, balance.currency || 'USD');
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

  // Helper function to calculate final price after discount
  const getFinalPrice = () => {
    return verifiedPromoDetails ?
      packageData.price - verifiedPromoDetails.discountAmount :
      packageData.price;
  };

  // Helper function to check if balance is insufficient
  const isBalanceInsufficient = () => {
    return balance && getFinalPrice() > balance.balance;
  };

  const handlePaymentMethodSelect = (method) => {
    setPaymentMethod(method);
    
    // Auto-scroll to terms section after selecting payment method
    setTimeout(() => {
      if (scrollViewRef.current) {
        // Different approaches for iOS and Android for better compatibility
        if (Platform.OS === 'ios') {
          // For iOS, use a calculated position that accounts for safe area
          scrollViewRef.current.scrollTo({ 
            y: 580, 
            animated: true 
          });
        } else {
          // For Android, scroll closer to the end
          scrollViewRef.current.scrollTo({ 
            y: 650, 
            animated: true 
          });
        }
      }
    }, 400); // Slightly longer delay for iOS animations
  };

  const handlePurchase = async () => {
    if (!paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }
    
    if (!isAgreed) {
      toast.error('Please agree to the terms and conditions to continue');
      return;
    }

    setIsLoading(true);

    try {
      if (paymentMethod === 'card') {
        // Create payment intent for card payment
        const finalPrice = getFinalPrice();
        const convertedPrice = convertPrice ? convertPrice(finalPrice) : finalPrice;
        
        const paymentResponse = await esimApi.createCheckoutSession({
          items: [{
            id: packageData.package_code || packageData.packageCode || packageData.id,
            name: packageData.name,
            price: convertedPrice, // Use converted price
            originalPrice: packageData.price, // Keep original for reference
            currency: userCurrency,
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
          appearance: {
            colors: {
              primary: '#FF6B00',
              background: '#ffffff',
              componentBackground: '#ffffff',
              componentBorder: '#e0e6eb',
              componentDivider: '#e0e6eb',
              primaryText: '#30313d',
              secondaryText: '#30313d',
              componentText: '#30313d',
              placeholderText: '#73757b',
              icon: '#000000', // Black icons for edit/close buttons
            },
          },
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
            toast.error('Payment canceled');
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

      } else if (paymentMethod === 'fib') {
        // Create FIB payment session
        const finalPrice = getFinalPrice();
        const convertedPrice = convertPrice ? convertPrice(finalPrice) : finalPrice;
        
        const fibResponse = await esimApi.createFIBSession({
          items: [{
            id: packageData.package_code || packageData.packageCode || packageData.id,
            name: packageData.name,
            price: convertedPrice, // IQD price
            quantity: 1,
            data_amount: packageData.data,
            duration: packageData.duration,
            flag_url: packageData.flag_url || getFlagUrl(),
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
          // Add topup parameters at root level (like Stripe)
          ...(isTopup && {
            isTopup: true,
            esimId: esimId,
            provider: packageData.metadata?.provider || packageData.provider || esimDetails?.provider || 'auto'
          })
        });

        if (!fibResponse.success || !fibResponse.data) {
          // If FIB is not available, show error and suggest balance payment
          Alert.alert(
            'FIB Payment Unavailable',
            'FIB payment is currently not available. Would you like to use your wallet balance instead?',
            [
              {
                text: 'Cancel',
                style: 'cancel'
              },
              {
                text: 'Use Balance',
                onPress: () => {
                  setPaymentMethod('balance');
                  // Retry with balance payment
                  handlePurchase();
                }
              }
            ]
          );
          return;
        }

        // Navigate to FIB payment screen with payment details
        navigation.navigate('FIBPayment', {
          paymentId: fibResponse.data.paymentId,
          orderReference: fibResponse.data.orderReference,
          amount: convertedPrice,
          currency: 'IQD',
          qrCode: fibResponse.data.qrCode,
          personalAppLink: fibResponse.data.personalAppLink,
          businessAppLink: fibResponse.data.businessAppLink,
          corporateAppLink: fibResponse.data.corporateAppLink,
          readableCode: fibResponse.data.readableCode,
          expiresAt: fibResponse.data.expiresAt,
          packageName: packageData.name
        });

      } else {
        // Process balance payment
        let orderResponse;
        
        if (isTopup) {
          // For topups, use the topup API with currency support
          const finalPrice = getFinalPrice();
          const convertedPrice = convertPrice ? convertPrice(finalPrice) : finalPrice;
          
          orderResponse = await esimApi.processTopUpNew(esimId, packageData.id, {
            price: finalPrice, // USD price for security validation
            displayPrice: convertedPrice, // User currency price
            currency: userCurrency, // User's currency preference
            paymentMethod: 'balance'
          });
        } else {
          // For new eSIMs, use the regular order API
          const finalPrice = getFinalPrice();
          const convertedPrice = convertPrice ? convertPrice(finalPrice) : finalPrice;
          
          console.log('Currency Debug:', {
            originalPrice: packageData.price,
            finalPrice,
            convertedPrice,
            userCurrency,
            convertPrice: !!convertPrice
          });
          
          const orderRequest = {
            packageCode: packageData.package_code || packageData.packageCode || packageData.id,
            packageName: packageData.originalName || packageData.name,
            price: finalPrice, // USD price after discount for security validation
            displayPrice: convertedPrice, // Converted price for display/storage
            currency: userCurrency,
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

            // Don't update other screens' balance - let them refresh on their own
            // EventEmitter.dispatch('BALANCE_UPDATED', {
            //   balance: responseData.newBalance,
            //   currency: responseData.currency || 'USD'
            // });

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
        `You need to add ${formatPrice(orderResponse.data.needToLoad || 0)} to complete this purchase.`,
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
      {/* Background gradient */}
      <LinearGradient
        colors={['#F9FAFB', '#EFF6FF', '#FEF3C7']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Header */}
      <View style={[styles.headerContainer, { height: Math.max(insets.top + 60, 60) }]}>
        {/* Fixed header background with blur effect */}
        <View style={styles.headerBackground}>
          {Platform.OS === 'ios' && (
            <BlurView intensity={80} tint="light" style={styles.headerBlur} />
          )}
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
          
          <Text style={styles.headerTitle}>Checkout</Text>
          
          <View style={styles.headerButton} />
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Order Summary */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="shopping-cart" size={24} color="#FF6B00" />
              <Text style={styles.sectionTitle}>Order Summary</Text>
            </View>
            
            <LinearGradient
              colors={['#FFFFFF', '#FAFAFA']}
              style={styles.summaryCard}
            >
              <View style={styles.packageHeader}>
                <View style={styles.flagWrapper}>
                  <LinearGradient
                    colors={['#FF6B00', '#FF8533']}
                    style={styles.flagGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.flagInner}>
                      <LocationIcon />
                    </View>
                  </LinearGradient>
                </View>
                
                <View style={styles.packageDetails}>
                  <Text style={styles.locationName}>
                    {isGlobalPackage ? 'Worldwide eSIM' : 
                     isRegionalPackage ? `${route.params.region} Package` : 
                     route.params.country}
                  </Text>
                  <View style={styles.packageSpecsContainer}>
                    <View style={styles.specBadge}>
                      <MaterialCommunityIcons name="database" size={14} color="#4F46E5" />
                      <Text style={styles.specText}>
                        {packageData.data === 'Unlimited' || packageData.unlimited ? 
                          'Unlimited' : packageData.data_formatted || `${packageData.data}GB`}
                      </Text>
                    </View>
                    <View style={styles.specBadge}>
                      <Ionicons name="time-outline" size={14} color="#10B981" />
                      <Text style={styles.specText}>{formatDuration(packageData.duration)}</Text>
                    </View>
                    {packageData.voice_minutes && (
                      <View style={styles.specBadge}>
                        <Ionicons name="call-outline" size={14} color="#F59E0B" />
                        <Text style={styles.specText}>{packageData.voice_minutes}min</Text>
                      </View>
                    )}
                  </View>
                  {(isGlobalPackage || isRegionalPackage) && (
                    <View style={styles.coverageContainer}>
                      <Ionicons name="globe-outline" size={14} color="#6B7280" />
                      <Text style={styles.coverageText}>
                        {getCoverageCount()} countries coverage
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              
              <View style={styles.priceContainer}>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Subtotal</Text>
                  <Text style={styles.priceValue}>{formatPrice(packageData.price)}</Text>
                </View>
                {verifiedPromoDetails && (
                  <View style={styles.priceRow}>
                    <Text style={styles.discountLabel}>Discount</Text>
                    <Text style={styles.discountValue}>-{formatPrice(verifiedPromoDetails.discountAmount)}</Text>
                  </View>
                )}
                <View style={styles.totalDivider} />
                <View style={styles.priceRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>
                    {formatPrice(getFinalPrice())}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Payment Method */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="payment" size={24} color="#FF6B00" />
              <Text style={styles.sectionTitle}>Payment Method</Text>
            </View>
            
            {/* Only show Stripe payment for USD users */}
            {userCurrency === 'USD' && (
              <TouchableOpacity 
                style={[
                  styles.paymentMethodCard,
                  paymentMethod === 'card' && styles.selectedPaymentMethod
                ]}
                onPress={() => handlePaymentMethodSelect('card')}
                activeOpacity={0.7}
              >
              <View style={styles.paymentMethodContent}>
                <View style={[
                  styles.paymentIconContainer,
                  paymentMethod === 'card' && styles.selectedPaymentIcon
                ]}>
                  <Ionicons 
                    name="card" 
                    size={24} 
                    color={paymentMethod === 'card' ? '#FF6B00' : '#6B7280'} 
                  />
                </View>
                <View style={styles.paymentMethodInfo}>
                  <Text style={[
                    styles.paymentMethodTitle,
                    paymentMethod === 'card' && styles.selectedPaymentTitle
                  ]}>Credit/Debit Card</Text>
                  <Text style={styles.paymentMethodSubtitle}>
                    Secure payment with Stripe
                  </Text>
                  <View style={styles.cardLogos}>
                    <View style={[styles.cardLogoBadge, { backgroundColor: '#000000' }]}>
                      <Ionicons name="logo-apple" size={16} color="#FFFFFF" />
                    </View>
                    <View style={[styles.cardLogoBadge, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' }]}>
                      <Svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <Path 
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" 
                          fill="#4285F4"
                        />
                        <Path 
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" 
                          fill="#34A853"
                        />
                        <Path 
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" 
                          fill="#FBBC05"
                        />
                        <Path 
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" 
                          fill="#EA4335"
                        />
                      </Svg>
                    </View>
                    <View style={[styles.cardLogoBadge, { backgroundColor: '#1A1F71', paddingHorizontal: 6 }]}>
                      <Text style={[styles.cardLogoBadgeText, { color: '#FFFFFF', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }]}>VISA</Text>
                    </View>
                    <View style={[styles.cardLogoBadge, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 6 }]}>
                      <Svg width="24" height="16" viewBox="0 0 32 20" fill="none">
                        <Circle cx="12" cy="10" r="7" fill="#EA001B" />
                        <Circle cx="20" cy="10" r="7" fill="#FFA200" fillOpacity="0.8" />
                      </Svg>
                    </View>
                  </View>
                </View>
                <View style={[
                  styles.radioButton,
                  paymentMethod === 'card' && styles.radioButtonActive
                ]}>
                  {paymentMethod === 'card' && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </View>
            </TouchableOpacity>
            )}

            {/* FIB Payment - only for IQD users */}
            {userCurrency === 'IQD' && (
              <TouchableOpacity 
                style={[
                  styles.paymentMethodCard,
                  paymentMethod === 'fib' && styles.selectedPaymentMethod
                ]}
                onPress={() => handlePaymentMethodSelect('fib')}
                activeOpacity={0.7}
              >
                <View style={styles.paymentMethodContent}>
                  <View style={[
                    styles.paymentIconContainer,
                    paymentMethod === 'fib' && styles.selectedPaymentIcon
                  ]}>
                    <Ionicons 
                      name="card" 
                      size={24} 
                      color={paymentMethod === 'fib' ? '#FF6B00' : '#6B7280'} 
                    />
                  </View>
                  <View style={styles.paymentMethodInfo}>
                    <Text style={[
                      styles.paymentMethodTitle,
                      paymentMethod === 'fib' && styles.selectedPaymentTitle
                    ]}>FIB Payment</Text>
                    <Text style={styles.paymentMethodSubtitle}>
                      Pay with First Iraqi Bank
                    </Text>
                    <View style={styles.fibLogos}>
                      <View style={[styles.fibLogoBadge]}>
                        <Text style={styles.fibLogoText}>FIB</Text>
                      </View>
                      <Text style={styles.fibCurrency}>IQD Only</Text>
                    </View>
                  </View>
                  <View style={[
                    styles.radioButton,
                    paymentMethod === 'fib' && styles.radioButtonActive
                  ]}>
                    {paymentMethod === 'fib' && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={[
                styles.paymentMethodCard,
                paymentMethod === 'balance' && styles.selectedPaymentMethod
              ]}
              onPress={() => handlePaymentMethodSelect('balance')}
              activeOpacity={0.7}
            >
              <View style={styles.paymentMethodContent}>
                <View style={[
                  styles.paymentIconContainer,
                  paymentMethod === 'balance' && styles.selectedPaymentIcon
                ]}>
                  <Ionicons 
                    name="wallet" 
                    size={24} 
                    color={paymentMethod === 'balance' ? '#FF6B00' : '#6B7280'} 
                  />
                </View>
                <View style={styles.paymentMethodInfo}>
                  <Text style={[
                    styles.paymentMethodTitle,
                    paymentMethod === 'balance' && styles.selectedPaymentTitle
                  ]}>Wallet Balance</Text>
                  <Text style={styles.paymentMethodSubtitle}>
                    Available: {getFormattedBalance()}
                  </Text>
                  {isBalanceInsufficient() && (
                    <Text style={styles.insufficientBalance}>
                      Insufficient balance
                    </Text>
                  )}
                </View>
                <View style={[
                  styles.radioButton,
                  paymentMethod === 'balance' && styles.radioButtonActive
                ]}>
                  {paymentMethod === 'balance' && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Terms Agreement */}
          <View ref={termsRef} style={styles.termsSection}>
            <TouchableOpacity 
              style={styles.termsContainer}
              onPress={() => setIsAgreed(!isAgreed)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.checkbox,
                isAgreed && styles.checkboxActive
              ]}>
                {isAgreed && (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                )}
              </View>
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text 
                  style={styles.termsLink}
                  onPress={(e) => {
                    e.stopPropagation();
                    navigation.navigate('Terms');
                  }}
                >
                  Terms & Conditions
                </Text>
                {' '}and{' '}
                <Text 
                  style={styles.termsLink}
                  onPress={(e) => {
                    e.stopPropagation();
                    navigation.navigate('Privacy');
                  }}
                >
                  Privacy Policy
                </Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Security Features */}
          <View style={styles.securitySection}>
            <View style={styles.securityFeature}>
              <Ionicons name="shield-checkmark" size={Platform.OS === 'ios' ? 16 : 20} color="#10B981" />
              <Text style={styles.securityText}>Secure Payment</Text>
            </View>
            <View style={styles.securityFeature}>
              <Ionicons name="lock-closed" size={Platform.OS === 'ios' ? 16 : 20} color="#10B981" />
              <Text style={styles.securityText}>SSL Encrypted</Text>
            </View>
            <View style={styles.securityFeature}>
              <MaterialIcons name="verified" size={Platform.OS === 'ios' ? 16 : 20} color="#10B981" />
              <Text style={styles.securityText}>PCI Compliant</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating Pay Button */}
      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity 
          onPress={handlePurchase}
          disabled={!paymentMethod || !isAgreed || isLoading || (paymentMethod === 'balance' && isBalanceInsufficient())}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={paymentMethod && isAgreed && !(paymentMethod === 'balance' && isBalanceInsufficient())
              ? ['#FF6B00', '#FF8533']
              : ['#E5E7EB', '#D1D5DB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.payButton}
          >
            <View style={styles.payButtonContent}>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <View style={styles.payButtonLeft}>
                    <View style={styles.payButtonIconContainer}>
                      <MaterialIcons name="payment" size={24} color="#FFFFFF" />
                    </View>
                    <View>
                      <Text style={styles.payButtonLabel}>Total Amount</Text>
                      <Text style={styles.payButtonPrice}>
                        {formatPrice(getFinalPrice())}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.payButtonRight}>
                    <Text style={styles.payButtonText}>
                      {isTopup ? 'Top Up Now' : 'Complete Purchase'}
                    </Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                  </View>
                </>
              )}
            </View>
          </LinearGradient>
        </TouchableOpacity>
        
        <Text style={styles.bottomSecurityNote}>
          <Ionicons name="lock-closed" size={12} color="#6B7280" />
          {' '}Your payment is protected by bank-level security
        </Text>
      </View>
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
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  
  // Content
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingTop: 30,
    paddingBottom: 230,
  },
  
  // Section styles
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
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
  
  // Summary Card
  summaryCard: {
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  flagWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginRight: 16,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  flagGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 2,
  },
  flagInner: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  packageDetails: {
    flex: 1,
  },
  locationName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  packageSpecsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  specBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 6,
  },
  specText: {
    fontSize: 12,
    color: '#4B5563',
    marginLeft: 4,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  coverageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  coverageText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  // Price container
  priceContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  priceValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  discountLabel: {
    fontSize: 14,
    color: '#059669',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  discountValue: {
    fontSize: 16,
    color: '#059669',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  totalDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  totalValue: {
    fontSize: 24,
    color: '#FF6B00',
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  
  // Payment Method
  paymentMethodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#F3F4F6',
  },
  selectedPaymentMethod: {
    borderColor: '#FF6B00',
    backgroundColor: '#FFF7ED',
  },
  paymentMethodContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  paymentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  selectedPaymentIcon: {
    backgroundColor: '#FFEDD5',
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  selectedPaymentTitle: {
    color: '#FF6B00',
  },
  paymentMethodSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  insufficientBalance: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  cardLogos: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  cardLogoBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  cardLogoBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonActive: {
    borderColor: '#FF6B00',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF6B00',
  },
  
  // Terms section
  termsSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginRight: 12,
    marginTop: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#FF6B00',
    borderColor: '#FF6B00',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  termsLink: {
    color: '#FF6B00',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  
  // Security section
  securitySection: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  securityFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Platform.OS === 'ios' ? 6 : 10,
  },
  securityText: {
    fontSize: Platform.OS === 'ios' ? 11 : 12,
    color: '#6B7280',
    marginLeft: Platform.OS === 'ios' ? 3 : 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  // Bottom container
  bottomContainer: {
    position: 'absolute',
    bottom: 52,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 20,
    paddingTop: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
  },
  payButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  payButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Platform.OS === 'ios' ? 16 : 18,
    paddingHorizontal: Platform.OS === 'ios' ? 20 : 24,
  },
  payButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  payButtonIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  payButtonLabel: {
    fontSize: Platform.OS === 'ios' ? 11 : 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  payButtonPrice: {
    fontSize: Platform.OS === 'ios' ? 18 : 20,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  payButtonRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  payButtonText: {
    fontSize: Platform.OS === 'ios' ? 13 : 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: Platform.OS === 'ios' ? 6 : 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  bottomSecurityNote: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  // FIB Payment styles
  fibLogos: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  fibLogoBadge: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  fibLogoText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  fibCurrency: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '600',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});

export default CheckoutScreenV2;
