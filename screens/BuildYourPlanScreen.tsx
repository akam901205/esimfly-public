import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCurrencyConversion } from '../hooks/useCurrencyConversion';

const { width: screenWidth } = Dimensions.get('window');

interface SpeedOption {
  id: string;
  packageCode: string;
  dailyData: string;
  dataGB: number;
  fup: string;
  basePriceUSD: number;
  icon: string;
  color: string;
  description: string;
}

const BuildYourPlanScreen = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation();
  const params = route.params as any;
  const { formatPrice } = useCurrencyConversion();

  const country = params?.country;

  const [selectedSpeed, setSelectedSpeed] = useState<SpeedOption | null>(null);
  const [days, setDays] = useState<number>(7);
  const [daysInput, setDaysInput] = useState<string>('7');
  const [isDaysInputFocused, setIsDaysInputFocused] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [showNetworkInfo, setShowNetworkInfo] = useState(false);
  const [networks, setNetworks] = useState<NetworkInfo[]>([]);
  const [loadingNetworks, setLoadingNetworks] = useState(false);
  const [breakoutIp, setBreakoutIp] = useState<string>('');

  // Fetch daily plans when component loads
  useEffect(() => {
    const fetchDailyPlans = async () => {
      try {
        setLoadingPlans(true);
        const response = await fetch(
          `https://esimfly.net/api/destination?search=${encodeURIComponent(country?.name || '')}&type=all`
        );
        const data = await response.json();

        console.log('Fetched plans from web API:', data.plans?.length || 0);

        if (data.plans && data.plans.length > 0) {
          setAvailablePlans(data.plans);
        }
      } catch (error) {
        console.error('Error fetching daily plans:', error);
        Alert.alert('Error', 'Could not load customizable plans');
      } finally {
        setLoadingPlans(false);
      }
    };

    if (country?.name) {
      fetchDailyPlans();
    }
  }, [country?.name]);

  // Extract speed options from available plans
  const speedOptions = useMemo((): SpeedOption[] => {
    const options: SpeedOption[] = [];
    const seenSpeeds = new Set<string>();

    availablePlans.forEach((plan: any) => {
      const isEsimAccess = plan.provider === 'esimaccess';
      const dailyMatch = plan.name?.match(/(\d+(?:\.\d+)?)\s*GB\/Day/i);
      const isDailyDuration = plan.duration === 1;

      if (isEsimAccess && dailyMatch && isDailyDuration) {
        const dailyData = `${dailyMatch[1]}GB`;
        const dailyDataNum = parseFloat(dailyMatch[1]);

        if (seenSpeeds.has(dailyData)) return;
        seenSpeeds.add(dailyData);

        let fup = 'Full speed all day';
        const fupMatch = plan.name.match(/FUP(\d+(?:\.\d+)?)(Mbps|Kbps)/i);
        if (fupMatch) {
          fup = `After ${dailyData}: ${fupMatch[1]} ${fupMatch[2]}`;
        }

        // Store breakout IP from plan (if this is the first plan, set it globally)
        if (plan.breakout_ip && !breakoutIp) {
          setBreakoutIp(plan.breakout_ip);
        }

        let color, description, icon;
        if (dailyDataNum >= 10) {
          color = '#9333ea';
          description = 'Maximum speed';
          icon = '🚀';
        } else if (dailyDataNum >= 5) {
          color = '#4f46e5';
          description = 'Perfect for travelers';
          icon = '⭐';
        } else if (dailyDataNum >= 3) {
          color = '#0d9488';
          description = 'Social media & maps';
          icon = '🔥';
        } else if (dailyDataNum >= 2) {
          color = '#2563eb';
          description = 'Balanced everyday';
          icon = '⚡';
        } else {
          color = '#059669';
          description = 'Budget-friendly';
          icon = '💚';
        }

        options.push({
          id: `custom_${dailyData.toLowerCase()}`,
          packageCode: plan.id || '',
          dailyData,
          dataGB: dailyDataNum,
          fup,
          basePriceUSD: plan.price / plan.duration,
          icon,
          color,
          description,
        });
      }
    });

    return options.sort((a, b) => a.dataGB - b.dataGB);
  }, [availablePlans]);

  // Auto-select 2GB as recommended
  useEffect(() => {
    if (speedOptions.length > 0 && !selectedSpeed) {
      const defaultSpeed = speedOptions.find(opt => opt.dailyData === '2GB') || speedOptions[0];
      setSelectedSpeed(defaultSpeed);
    }
  }, [speedOptions]);

  // Fetch networks and breakout IP when speed changes
  useEffect(() => {
    const fetchNetworkInfo = async () => {
      if (!selectedSpeed?.packageCode || !country?.code) return;

      setLoadingNetworks(true);
      try {
        // Fetch networks from web API with country_code filter
        const url = `https://esimfly.net/api/plans/${encodeURIComponent(selectedSpeed.packageCode)}/networks?country_code=${encodeURIComponent(country.code)}`;
        console.log('Fetching networks:', url);

        const response = await fetch(url);
        const data = await response.json();

        console.log('Networks response:', data);

        if (data.success && data.networks) {
          // Filter networks for this specific country only
          const countryNetworks = data.networks.filter((n: any) =>
            !n.country_code || n.country_code === country.code
          );
          setNetworks(countryNetworks);
        }

        // Get breakout IP from the plan data
        const planData = availablePlans.find(p => p.id === selectedSpeed.packageCode);
        if (planData?.breakout_ip) {
          setBreakoutIp(planData.breakout_ip);
        }
      } catch (error) {
        console.error('Error fetching network info:', error);
      } finally {
        setLoadingNetworks(false);
      }
    };

    fetchNetworkInfo();
  }, [selectedSpeed?.packageCode, country?.code]);

  const totalPrice = useMemo(() => {
    if (!selectedSpeed) return 0;
    return selectedSpeed.basePriceUSD * days;
  }, [selectedSpeed, days]);

  const quickDays = [3, 7, 14, 30];

  // Handle days input change
  const handleDaysInputChange = (text: string) => {
    setDaysInput(text);
    const numValue = parseInt(text);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 365) {
      setDays(numValue);
    }
  };

  const handleDaysInputBlur = () => {
    setIsDaysInputFocused(false);
    const numValue = parseInt(daysInput);
    if (isNaN(numValue) || numValue < 1) {
      setDays(1);
      setDaysInput('1');
    } else if (numValue > 365) {
      setDays(365);
      setDaysInput('365');
    } else {
      setDays(numValue);
      setDaysInput(numValue.toString());
    }
  };

  const handleIncrementDays = () => {
    const newDays = Math.min(days + 1, 365);
    setDays(newDays);
    setDaysInput(newDays.toString());
  };

  const handleDecrementDays = () => {
    const newDays = Math.max(days - 1, 1);
    setDays(newDays);
    setDaysInput(newDays.toString());
  };

  const handleQuickDaySelect = (quickDay: number) => {
    setDays(quickDay);
    setDaysInput(quickDay.toString());
  };

  const handleCheckout = () => {
    if (!selectedSpeed) {
      Alert.alert('Error', 'Please select a speed option');
      return;
    }

    console.log('Navigating to checkout with:', {
      selectedSpeed,
      days,
      totalPrice,
      country
    });

    // Create package object matching the format CheckoutScreen expects
    const customPackage = {
      id: selectedSpeed.packageCode,
      packageCode: selectedSpeed.packageCode,
      package_code: selectedSpeed.packageCode,
      name: `${country?.name || 'Custom'} ${selectedSpeed.dailyData}/day × ${days} days`,
      originalName: `${country?.name || 'Custom'} ${selectedSpeed.dailyData}/day × ${days} days`,
      price: totalPrice,
      data: selectedSpeed.dataGB * days,
      data_amount: selectedSpeed.dataGB * days,
      duration: days,
      provider: 'esimaccess',
      region: country?.name,
      location: country?.name,
      country_code: country?.code,
      speed: '4G/5G',
      operator: 'Multiple carriers',
      flagUrl: null,
      unlimited: false,
      isCustomized: true,
      customDays: days,
      dailyData: selectedSpeed.dailyData,
      fup: selectedSpeed.fup,
      // CRITICAL: Add customData for API price validation
      customData: {
        isCustomizable: true,
        periodNum: days,
        dailyData: selectedSpeed.dailyData,
        basePrice: selectedSpeed.basePriceUSD
      }
    };

    console.log('Custom package object:', customPackage);

    navigation.navigate('Checkout', {
      package: customPackage,
      country: country?.name || country,
      isTopup: false,
      isGlobal: false,
      region: null,
      fromBuildPlan: true,
    });
  };

  // Loading state
  if (loadingPlans) {
    return (
      <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 0) }]}>
        <LinearGradient colors={['#F8F9FA', '#F3F4F6']} style={styles.backgroundGradient} />

        <View style={[styles.header, { paddingTop: 5 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Build Your Plan</Text>
          <View style={styles.headerIcon}>
            <Ionicons name="construct-outline" size={24} color="#374151" />
          </View>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loadingText}>Loading customizable plans...</Text>
        </View>
      </View>
    );
  }

  // Empty state
  if (speedOptions.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 0) }]}>
        <LinearGradient colors={['#F8F9FA', '#F3F4F6']} style={styles.backgroundGradient} />

        <View style={[styles.header, { paddingTop: 5 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Build Your Plan</Text>
          <View style={styles.headerIcon}>
            <Ionicons name="construct-outline" size={24} color="#374151" />
          </View>
        </View>

        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="package-variant-closed" size={80} color="#D1D5DB" />
          <Text style={styles.emptyText}>No Customizable Plans</Text>
          <Text style={styles.emptySubtext}>Please check other plan options</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 0) }]}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient colors={['#F8F9FA', '#F3F4F6']} style={styles.backgroundGradient} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: 5 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Build Your Plan</Text>
          {country && <Text style={styles.headerSubtitle}>{country.name}</Text>}
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="construct-outline" size={24} color="#374151" />
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Step 1: Choose Daily Speed */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>1</Text>
            </View>
            <Text style={styles.sectionTitle}>Choose Your Daily Speed</Text>
          </View>

          <View style={styles.speedGrid}>
            {speedOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                onPress={() => setSelectedSpeed(option)}
                style={[
                  styles.speedCard,
                  selectedSpeed?.id === option.id && styles.speedCardSelected,
                ]}
                activeOpacity={0.7}
              >
                {option.dailyData === '2GB' && (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedText}>Recommended</Text>
                  </View>
                )}

                {selectedSpeed?.id === option.id && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark-circle" size={24} color="#FF6B00" />
                  </View>
                )}

                <Text style={styles.speedIcon}>{option.icon}</Text>
                <Text style={styles.speedData}>{option.dailyData}</Text>
                <Text style={styles.speedLabel}>per day</Text>
                <Text style={styles.speedPrice}>{formatPrice(option.basePriceUSD)}/day</Text>
                <Text style={styles.speedDescription}>{option.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Step 2: Select Duration */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>2</Text>
            </View>
            <Text style={styles.sectionTitle}>Select Trip Duration</Text>
          </View>

          {/* Quick selection buttons */}
          <View style={styles.quickDaysRow}>
            {quickDays.map((quickDay) => (
              <TouchableOpacity
                key={quickDay}
                onPress={() => handleQuickDaySelect(quickDay)}
                style={[
                  styles.quickDayButton,
                  days === quickDay && styles.quickDayButtonActive,
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.quickDayText, days === quickDay && styles.quickDayTextActive]}>
                  {quickDay}
                </Text>
                <Text style={[styles.quickDayLabel, days === quickDay && styles.quickDayLabelActive]}>
                  {quickDay === 1 ? 'Day' : 'Days'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom duration card */}
          <View style={styles.durationCard}>
            <Text style={styles.durationCardTitle}>Custom Duration</Text>

            <View style={styles.daysSelector}>
              <TouchableOpacity
                onPress={handleDecrementDays}
                style={[styles.dayButton, days <= 1 && styles.dayButtonDisabled]}
                disabled={days <= 1}
              >
                <Ionicons name="remove-circle" size={32} color={days <= 1 ? '#D1D5DB' : '#FF6B00'} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dayValueContainer}
                onPress={() => setIsDaysInputFocused(true)}
                activeOpacity={0.7}
              >
                <TextInput
                  style={styles.dayValueNumber}
                  value={daysInput}
                  onChangeText={handleDaysInputChange}
                  onFocus={() => setIsDaysInputFocused(true)}
                  onBlur={handleDaysInputBlur}
                  keyboardType="number-pad"
                  maxLength={3}
                  selectTextOnFocus
                  textAlign="center"
                />
                <Text style={styles.dayValueText}>{days === 1 ? 'Day' : 'Days'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleIncrementDays}
                style={[styles.dayButton, days >= 365 && styles.dayButtonDisabled]}
                disabled={days >= 365}
              >
                <Ionicons name="add-circle" size={32} color={days >= 365 ? '#D1D5DB' : '#FF6B00'} />
              </TouchableOpacity>
            </View>

            <Text style={styles.durationNote}>Tap the number to enter any value (1-365 days)</Text>
          </View>
        </View>

        {/* Network Coverage Info */}
        <View style={styles.section}>
          <TouchableOpacity
            onPress={() => setShowNetworkInfo(!showNetworkInfo)}
            style={styles.networkHeader}
            activeOpacity={0.7}
          >
            <View style={styles.networkHeaderLeft}>
              <View style={styles.networkIconContainer}>
                <MaterialCommunityIcons name="wifi" size={24} color="#FF6B00" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.networkTitle}>Network Coverage</Text>
                <Text style={styles.networkSubtitle}>
                  {loadingNetworks
                    ? 'Loading...'
                    : `4G/5G • ${networks.length} ${networks.length === 1 ? 'Network' : 'Networks'}`}
                </Text>
              </View>
            </View>
            <Ionicons
              name={showNetworkInfo ? 'chevron-up' : 'chevron-down'}
              size={24}
              color="#9CA3AF"
            />
          </TouchableOpacity>

          {showNetworkInfo && (
            <View style={styles.networkInfoCard}>
              {loadingNetworks ? (
                <ActivityIndicator size="small" color="#FF6B00" />
              ) : networks.length > 0 ? (
                networks.map((network, idx) => (
                  <View key={idx} style={styles.networkItem}>
                    <View style={styles.networkDot} />
                    <Text style={styles.networkName}>{network.name}</Text>
                    <Text style={styles.networkType}>• {network.type}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.networkInfoText}>Network information will be available after purchase</Text>
              )}
            </View>
          )}
        </View>

        {/* Important Information Card */}
        {selectedSpeed && (
          <View style={styles.section}>
            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="information-circle" size={20} color="#FF6B00" />
                </View>
                <Text style={styles.infoHeaderText}>Important Information</Text>
              </View>

              <View style={styles.infoItem}>
                <View style={styles.infoItemHeader}>
                  <View style={styles.infoIconCircle}>
                    <Ionicons name="refresh" size={16} color="#FF6B00" />
                  </View>
                  <Text style={styles.infoLabel}>Cycle Start</Text>
                </View>
                <Text style={styles.infoText}>
                  Day 1 begins at the first connection; next cycles reset approximately every 24 hours
                  (aligned with carrier local midnight).
                </Text>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoItem}>
                <View style={styles.infoItemHeader}>
                  <View style={styles.infoIconCircle}>
                    <Ionicons name="flash" size={16} color="#FF6B00" />
                  </View>
                  <Text style={styles.infoLabel}>Fair Use Policy</Text>
                </View>
                <Text style={styles.infoText}>
                  {selectedSpeed.fup}. Speeds may be moderated to ensure fair network usage for all customers.
                </Text>
              </View>

              {breakoutIp && (
                <>
                  <View style={styles.infoDivider} />
                  <View style={styles.infoItem}>
                    <View style={styles.infoItemHeader}>
                      <View style={styles.infoIconCircle}>
                        <Ionicons name="globe-outline" size={16} color="#FF6B00" />
                      </View>
                      <Text style={styles.infoLabel}>Breakout IP Location</Text>
                    </View>
                    <Text style={styles.infoText}>
                      Your IP address will appear to be from {breakoutIp}.
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {/* Price Summary Card */}
        <View style={styles.section}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Daily Rate</Text>
              <Text style={styles.summaryValue}>
                {selectedSpeed ? formatPrice(selectedSpeed.basePriceUSD) : '-'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Duration</Text>
              <Text style={styles.summaryValue}>{days} {days === 1 ? 'day' : 'days'}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotalLabel}>Total Price</Text>
              <Text style={styles.summaryTotalValue}>{formatPrice(totalPrice)}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity onPress={handleCheckout} style={styles.checkoutButton} activeOpacity={0.8}>
          <LinearGradient
            colors={['#FF6B00', '#FF8C42']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.checkoutGradient}
          >
            <Text style={styles.checkoutText}>Continue to Checkout</Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'transparent',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    fontFamily: 'Quicksand-Bold',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  speedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  speedCard: {
    width: (screenWidth - 44) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  speedCardSelected: {
    borderColor: '#FF6B00',
    backgroundColor: '#FFF7ED',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -8,
    backgroundColor: '#FF6B00',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  speedIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  speedData: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  speedLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  speedPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B00',
    marginBottom: 4,
  },
  speedDescription: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  quickDaysRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  quickDayButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickDayButtonActive: {
    backgroundColor: '#FF6B00',
    borderColor: '#FF6B00',
  },
  quickDayText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  quickDayTextActive: {
    color: 'white',
  },
  quickDayLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  quickDayLabelActive: {
    color: 'white',
  },
  durationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  durationCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  daysSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dayButton: {
    padding: 8,
  },
  dayButtonDisabled: {
    opacity: 0.3,
  },
  dayValueContainer: {
    marginHorizontal: 32,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF6B00',
    minWidth: 100,
  },
  dayValueNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FF6B00',
    minWidth: 60,
    padding: 0,
    margin: 0,
  },
  dayValueText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  durationNote: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  summaryTotalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF6B00',
  },
  bottomBar: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingTop: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  checkoutButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  checkoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  checkoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  networkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  networkHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  networkIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  networkTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  networkSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  networkInfoCard: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  networkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  networkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  networkName: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
    flex: 1,
  },
  networkType: {
    fontSize: 12,
    color: '#6B7280',
  },
  networkInfoText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  infoHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  infoItem: {
    marginBottom: 0,
  },
  infoItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  infoText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
    marginLeft: 38,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 16,
  },
});

export default BuildYourPlanScreen;
