import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
  Platform,
  StatusBar,
  Alert,
  Linking,
  Animated
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'react-native';
import { colors } from '../theme/colors';
import { formatBalance } from '../utils/currencyUtils';
import { newApi } from '../api/api';

const { width, height } = Dimensions.get('window');

const FIBPaymentScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  
  const {
    paymentId,
    orderReference,
    amount,
    currency,
    qrCode,
    personalAppLink,
    businessAppLink,
    corporateAppLink,
    readableCode,
    expiresAt,
    packageName
  } = route.params as any;

  const [timeLeft, setTimeLeft] = useState(0);
  const [isPaid, setIsPaid] = useState(false);
  const [isTopup, setIsTopup] = useState(false);
  
  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Start pulse animation for QR code
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ]).start(() => pulse());
    };
    pulse();

    // Calculate time left and poll payment status
    if (expiresAt) {
      const expiryTime = new Date(expiresAt).getTime();
      
      const updateTimer = () => {
        const now = new Date().getTime();
        const remaining = Math.max(0, Math.floor((expiryTime - now) / 1000));
        setTimeLeft(remaining);
        
        if (remaining <= 0) {
          handlePaymentExpired();
        }
      };
      
      // Check payment status every 3 seconds
      let timer: NodeJS.Timeout;
      let statusTimer: NodeJS.Timeout;
      
      const checkPaymentStatus = async () => {
        try {
          const response = await newApi.get(`/orders/status/${orderReference}`);
          const orderData = response.data?.data;
          
          if (orderData && (orderData.status === 'completed' || orderData.payment_status === 'succeeded') && !isPaid) {
            setIsPaid(true);
            
            // Clear timers immediately to stop polling
            clearInterval(timer);
            clearInterval(statusTimer);
            
            // Navigate to Instructions after showing success
            setTimeout(() => {
              navigation.navigate('Instructions', {
                qrCodeUrl: orderData.qrCodeUrl,
                directAppleInstallUrl: orderData.directAppleInstallUrl,
                packageName: packageName,
                iccid: orderData.iccid || '',
                esimId: orderData.esimId,
                orderReference: orderReference
              });
            }, 3000);
          }
        } catch (error) {
          // Continue polling silently on errors
        }
      };
      
      updateTimer();
      timer = setInterval(updateTimer, 1000);
      statusTimer = setInterval(checkPaymentStatus, 3000);
      
      return () => {
        clearInterval(timer);
        clearInterval(statusTimer);
      };
    }
  }, []);




  const handlePaymentExpired = () => {
    Alert.alert(
      'Payment Expired',
      'Your FIB payment session has expired. Please try again.',
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  const openFIBApp = async (appType: 'personal' | 'business' | 'corporate') => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Always use App Store links like the B2B app (deep links don't work reliably)
      let appStoreUrl = '';
      
      switch (appType) {
        case 'personal':
          appStoreUrl = Platform.OS === 'ios' 
            ? 'https://apps.apple.com/us/app/first-iraqi-bank/id1545549339'
            : 'https://play.google.com/store/apps/details?id=com.firstiraqibank.personal';
          break;
        case 'business':
          appStoreUrl = Platform.OS === 'ios' 
            ? 'https://apps.apple.com/us/app/first-iraqi-bank-for-business/id1548261487'
            : 'https://play.google.com/store/apps/details?id=com.firstiraqibank.business';
          break;
        case 'corporate':
          appStoreUrl = Platform.OS === 'ios' 
            ? 'https://apps.apple.com/us/app/first-iraqi-bank-for-corporate/id1575329166'
            : 'https://play.google.com/store/apps/details?id=com.firstiraqibank.corporate';
          break;
      }
      
      await Linking.openURL(appStoreUrl);
    } catch (error) {
      Alert.alert('Error', 'Could not open app store. Please try scanning the QR code instead.');
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const copyPaymentId = async () => {
    try {
      await Clipboard.setStringAsync(readableCode || paymentId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Alert.alert('Copied', 'Payment ID copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy payment ID');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={['#F0F9FF', '#DBEAFE', '#FEF3C7']}
        style={styles.gradient}
      />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity 
          style={styles.headerIcon}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>FIB Payment</Text>
        <View style={[styles.headerIcon, { backgroundColor: 'transparent', borderWidth: 0 }]} />
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView 
          style={styles.content}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 100) }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Payment Status */}
          {isPaid ? (
            <View style={styles.successCard}>
              <View style={styles.successIconContainer}>
                <Ionicons name="checkmark-circle" size={64} color="#10B981" />
              </View>
              <Text style={styles.successTitle}>Payment Successful!</Text>
              <Text style={styles.successSubtitle}>
                {isTopup ? 'Your eSIM has been topped up successfully!' : 'Processing your eSIM order...'}
              </Text>
            </View>
          ) : (
            <>
              {/* Timer */}
              <View style={styles.timerCard}>
                <View style={styles.timerContent}>
                  <Ionicons name="time-outline" size={24} color="#F59E0B" />
                  <View style={styles.timerText}>
                    <Text style={styles.timerLabel}>Time Remaining</Text>
                    <Text style={styles.timerValue}>{formatTime(timeLeft)}</Text>
                  </View>
                </View>
              </View>

              {/* Order Summary */}
              <View style={styles.summaryCard}>
                <Text style={styles.sectionTitle}>Order Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Package</Text>
                  <Text style={styles.summaryValue}>{packageName}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Amount</Text>
                  <Text style={styles.summaryValue}>{formatBalance(amount, currency)}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.summaryRow}
                  onPress={copyPaymentId}
                  activeOpacity={0.7}
                >
                  <Text style={styles.summaryLabel}>Payment ID</Text>
                  <View style={styles.paymentIdContainer}>
                    <Text style={styles.summaryCode}>{readableCode}</Text>
                    <Ionicons name="copy-outline" size={16} color="#1E40AF" />
                  </View>
                </TouchableOpacity>
              </View>

              {/* QR Code Section */}
              <View style={styles.qrSection}>
                <Text style={styles.sectionTitle}>Scan QR Code</Text>
                <Text style={styles.qrInstructions}>
                  Scan with your FIB mobile app or tap the buttons below to open the app directly
                </Text>
                
                <View style={styles.qrContainer}>
                  <View style={styles.qrWrapper}>
                    {qrCode ? (
                      <Image 
                        source={{ uri: qrCode }}
                        style={styles.qrCodeImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.qrPlaceholder}>
                        <Ionicons name="qr-code-outline" size={80} color="#1E40AF" />
                        <Text style={styles.qrPlaceholderText}>Loading QR Code...</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>


              {/* FIB App Buttons */}
              <View style={styles.appLinksSection}>
                <Text style={styles.sectionTitle}>Choose Your FIB App</Text>
                
                <TouchableOpacity
                  style={styles.fibAppButton}
                  onPress={() => openFIBApp('personal')}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#1E40AF', '#3B82F6']}
                    style={styles.fibButtonGradient}
                  >
                    <Ionicons name="person-outline" size={24} color="#FFFFFF" />
                    <Text style={styles.fibButtonText}>Personal Banking</Text>
                    <Ionicons name="open-outline" size={20} color="#FFFFFF" />
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.fibAppButton}
                  onPress={() => openFIBApp('business')}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#059669', '#10B981']}
                    style={styles.fibButtonGradient}
                  >
                    <Ionicons name="business-outline" size={24} color="#FFFFFF" />
                    <Text style={styles.fibButtonText}>Business Banking</Text>
                    <Ionicons name="open-outline" size={20} color="#FFFFFF" />
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.fibAppButton}
                  onPress={() => openFIBApp('corporate')}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#7C3AED', '#8B5CF6']}
                    style={styles.fibButtonGradient}
                  >
                    <Ionicons name="business" size={24} color="#FFFFFF" />
                    <Text style={styles.fibButtonText}>Corporate Banking</Text>
                    <Ionicons name="open-outline" size={20} color="#FFFFFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Instructions */}
              <View style={styles.instructionsCard}>
                <View style={styles.instructionHeader}>
                  <Ionicons name="information-circle" size={24} color="#3B82F6" />
                  <Text style={styles.instructionTitle}>Payment Instructions</Text>
                </View>
                <View style={styles.instructionList}>
                  <View style={styles.instructionItem}>
                    <Text style={styles.stepNumber}>1</Text>
                    <Text style={styles.stepText}>Open your FIB mobile app</Text>
                  </View>
                  <View style={styles.instructionItem}>
                    <Text style={styles.stepNumber}>2</Text>
                    <Text style={styles.stepText}>Scan the QR code or tap "Open App" button</Text>
                  </View>
                  <View style={styles.instructionItem}>
                    <Text style={styles.stepNumber}>3</Text>
                    <Text style={styles.stepText}>Complete the payment in FIB app</Text>
                  </View>
                  <View style={styles.instructionItem}>
                    <Text style={styles.stepNumber}>4</Text>
                    <Text style={styles.stepText}>Your eSIM will be generated automatically</Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </Animated.View>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    fontFamily: 'Quicksand-Bold',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  
  // Timer Card
  timerCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  timerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerText: {
    marginLeft: 12,
  },
  timerLabel: {
    fontSize: 14,
    color: '#92400E',
    fontFamily: 'Quicksand-Medium',
  },
  timerValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F59E0B',
    fontFamily: 'Quicksand-Bold',
  },

  // Summary Card
  summaryCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
    fontFamily: 'Quicksand-SemiBold',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: 'Quicksand-Regular',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    fontFamily: 'Quicksand-SemiBold',
  },
  summaryCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    fontFamily: 'Quicksand-SemiBold',
  },
  paymentIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  

  // Payment Link Section
  qrSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  qrInstructions: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    fontFamily: 'Quicksand-Regular',
  },
  linkContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  linkWrapper: {
    alignItems: 'center',
  },
  linkTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E40AF',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: 'Quicksand-Bold',
  },
  linkSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    fontFamily: 'Quicksand-Regular',
  },

  // App Links
  appLinksSection: {
    marginBottom: 32,
  },
  fibAppButton: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  fibButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
  },
  fibButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    marginLeft: 12,
    fontFamily: 'Quicksand-SemiBold',
  },

  // Instructions
  instructionsCard: {
    backgroundColor: '#EBF8FF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginLeft: 8,
    fontFamily: 'Quicksand-SemiBold',
  },
  instructionList: {
    gap: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
    fontFamily: 'Quicksand-SemiBold',
  },
  stepText: {
    fontSize: 14,
    color: '#1E3A8A',
    lineHeight: 20,
    flex: 1,
    fontFamily: 'Quicksand-Regular',
  },

  // Success State
  successCard: {
    alignItems: 'center',
    padding: 40,
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 8,
    fontFamily: 'Quicksand-Bold',
  },
  successSubtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    fontFamily: 'Quicksand-Regular',
  },

  
  // QR Code styles
  qrContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  qrWrapper: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrCodeImage: {
    width: 200,
    height: 200,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  qrPlaceholderText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 8,
    fontFamily: 'Quicksand-Regular',
  },
});

export default FIBPaymentScreen;