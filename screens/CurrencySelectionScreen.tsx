import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Platform,
  StatusBar,
  Animated,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { AuthContext } from '../api/AuthContext';
import { newApi } from '../api/api';
import { formatBalance, SupportedCurrency } from '../utils/currencyUtils';
import { notificationManager } from '../components/NotificationManager';

const { width } = Dimensions.get('window');

interface Currency {
  code: SupportedCurrency;
  name: string;
  symbol: string;
  flag: string;
  description: string;
  exchangeRate?: number;
}

const CURRENCIES: Currency[] = [
  {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    flag: '🇺🇸',
    description: 'United States Dollar'
  },
  {
    code: 'IQD',
    name: 'Iraqi Dinar',
    symbol: 'IQD',
    flag: '🇮🇶',
    description: 'Iraqi Dinar'
  }
];

const CurrencySelectionScreen: React.FC = () => {
  const navigation = useNavigation();
  const auth = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  
  const [selectedCurrency, setSelectedCurrency] = useState<SupportedCurrency>('USD');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userBalances, setUserBalances] = useState<any[]>([]);
  const [exchangeRates, setExchangeRates] = useState<{[key: string]: number}>({});

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      // Fetch user data and balances
      const response = await newApi.get('/user');
      if (response.data) {
        setSelectedCurrency(response.data.currency || 'USD');
        setUserBalances(response.data.currencyBalances || []);
      }

      // Fetch current exchange rates
      const rateResponse = await newApi.get('/currency/live-rate');
      if (rateResponse.data?.success) {
        setExchangeRates({
          'USD_to_IQD': rateResponse.data.exchangeRate,
          'IQD_to_USD': 1 / rateResponse.data.exchangeRate
        });
      }
    } catch (error) {
      console.error('Error fetching currency data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCurrencyChange = async (newCurrency: SupportedCurrency) => {
    if (newCurrency === selectedCurrency) return;

    Alert.alert(
      'Change Currency',
      `Switch to ${newCurrency}? This will affect how prices are displayed throughout the app.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Change',
          style: 'default',
          onPress: async () => {
            setIsSaving(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            try {
              const response = await newApi.put('/user/currency', {
                currency: newCurrency
              });

              if (response.data?.success) {
                setSelectedCurrency(newCurrency);
                notificationManager.success(
                  'Currency Updated',
                  `Your currency preference has been set to ${newCurrency}`
                );
                
                // Update auth context or trigger refresh
                setTimeout(() => {
                  navigation.goBack();
                }, 1000);
              } else {
                throw new Error(response.data?.message || 'Failed to update currency');
              }
            } catch (error) {
              console.error('Error updating currency:', error);
              notificationManager.error(
                'Update Failed',
                'Failed to update currency preference. Please try again.'
              );
            } finally {
              setIsSaving(false);
            }
          }
        }
      ]
    );
  };

  const getCurrencyBalance = (currency: SupportedCurrency) => {
    const balance = userBalances.find(b => b.currency === currency);
    return balance?.balance || 0;
  };

  const CurrencyOption = ({ currency }: { currency: Currency }) => {
    const isSelected = selectedCurrency === currency.code;
    const balance = getCurrencyBalance(currency.code);
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={[
            styles.currencyOption,
            isSelected && styles.selectedCurrencyOption
          ]}
          onPress={() => handleCurrencyChange(currency.code)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
          disabled={isSaving}
        >
          <LinearGradient
            colors={isSelected ? ['#FF6B00', '#FF8533'] : ['#FFFFFF', '#F9FAFB']}
            style={styles.currencyGradient}
          >
            <View style={styles.currencyContent}>
              <View style={styles.currencyLeft}>
                <View style={[styles.currencyFlag, isSelected && styles.selectedFlag]}>
                  <Text style={styles.flagEmoji}>{currency.flag}</Text>
                </View>
                <View style={styles.currencyInfo}>
                  <Text style={[
                    styles.currencyName,
                    isSelected && styles.selectedCurrencyName
                  ]}>
                    {currency.name}
                  </Text>
                  <Text style={[
                    styles.currencyCode,
                    isSelected && styles.selectedCurrencyCode
                  ]}>
                    {currency.code} • {currency.description}
                  </Text>
                  <View style={styles.balanceContainer}>
                    <Ionicons 
                      name="wallet-outline" 
                      size={14} 
                      color={isSelected ? '#1F2937' : '#6B7280'} 
                    />
                    <Text style={[
                      styles.balanceText,
                      isSelected && styles.selectedBalanceText
                    ]}>
                      Balance: {formatBalance(balance, currency.code)}
                    </Text>
                  </View>
                  {currency.code === 'IQD' && exchangeRates.USD_to_IQD && (
                    <Text style={[
                      styles.exchangeRate,
                      isSelected && styles.selectedExchangeRate
                    ]}>
                      1 USD ≈ {Math.round(exchangeRates.USD_to_IQD).toLocaleString()} IQD
                    </Text>
                  )}
                </View>
              </View>
              
              <View style={[
                styles.radioButton,
                isSelected && styles.radioButtonActive
              ]}>
                {isSelected && (
                  <Animated.View style={styles.radioInner}>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  </Animated.View>
                )}
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 0) }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
          <Text style={styles.loadingText}>Loading currencies...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 0) }]}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={[colors.background.primary, colors.background.secondary]}
        style={styles.gradient}
      />
      
      <View style={[styles.header, { paddingTop: 5 }]}>
        <TouchableOpacity 
          style={styles.headerIcon}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Currency</Text>
        <View style={[styles.headerIcon, { backgroundColor: 'transparent', borderWidth: 0 }]} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="information-circle" size={24} color="#3B82F6" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Currency Preference</Text>
              <Text style={styles.infoText}>
                Choose your preferred currency for displaying prices and managing your balance. 
                You can have balances in multiple currencies.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Currencies</Text>
          {CURRENCIES.map((currency, index) => (
            <CurrencyOption 
              key={currency.code} 
              currency={currency}
            />
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.noteCard}>
            <View style={styles.noteHeader}>
              <Ionicons name="shield-checkmark" size={20} color="#10B981" />
              <Text style={styles.noteTitle}>Important Notes</Text>
            </View>
            <View style={styles.noteList}>
              <View style={styles.noteItem}>
                <Text style={styles.noteBullet}>•</Text>
                <Text style={styles.noteText}>
                  Credit/debit card payments are only available in USD
                </Text>
              </View>
              <View style={styles.noteItem}>
                <Text style={styles.noteBullet}>•</Text>
                <Text style={styles.noteText}>
                  You can top up your balance in either currency
                </Text>
              </View>
              <View style={styles.noteItem}>
                <Text style={styles.noteBullet}>•</Text>
                <Text style={styles.noteText}>
                  Exchange rates are updated in real-time
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {isSaving && (
        <View style={styles.savingOverlay}>
          <BlurView intensity={20} style={styles.savingBlur}>
            <View style={styles.savingContent}>
              <ActivityIndicator size="large" color="#FF6B00" />
              <Text style={styles.savingText}>Updating currency...</Text>
            </View>
          </BlurView>
        </View>
      )}
    </View>
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
    backgroundColor: colors.background.primary,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text.secondary,
    fontFamily: 'Quicksand-Medium',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
    fontFamily: 'Quicksand-SemiBold',
  },
  infoCard: {
    backgroundColor: '#EBF8FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
    fontFamily: 'Quicksand-SemiBold',
  },
  infoText: {
    fontSize: 14,
    color: '#1E3A8A',
    lineHeight: 20,
    fontFamily: 'Quicksand-Regular',
  },
  currencyOption: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  selectedCurrencyOption: {
    shadowColor: '#FF6B00',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  currencyGradient: {
    padding: 2,
  },
  currencyContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currencyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  currencyFlag: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  selectedFlag: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FF6B00',
  },
  flagEmoji: {
    fontSize: 28,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
    fontFamily: 'Quicksand-Bold',
  },
  selectedCurrencyName: {
    color: '#1F2937',
  },
  currencyCode: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
    fontFamily: 'Quicksand-Regular',
  },
  selectedCurrencyCode: {
    color: '#374151',
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  balanceText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 6,
    fontFamily: 'Quicksand-Medium',
  },
  selectedBalanceText: {
    color: '#1F2937',
  },
  exchangeRate: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'Quicksand-Regular',
  },
  selectedExchangeRate: {
    color: '#4B5563',
  },
  radioButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonActive: {
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
  },
  radioInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
    marginLeft: 8,
    fontFamily: 'Quicksand-SemiBold',
  },
  noteList: {
    gap: 8,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  noteBullet: {
    fontSize: 16,
    color: '#059669',
    marginRight: 8,
    marginTop: 2,
  },
  noteText: {
    fontSize: 14,
    color: '#047857',
    lineHeight: 20,
    flex: 1,
    fontFamily: 'Quicksand-Regular',
  },
  savingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  savingBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  savingContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  savingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    fontFamily: 'Quicksand-SemiBold',
  },
});

export default CurrencySelectionScreen;