import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Modal,
  FlatList,
  Dimensions,
  Platform,
  LayoutChangeEvent,
  RefreshControl,
  Alert // Add this import
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../api/AuthContext';
import { FlagIcon as CountryFlagIcon, countries } from '../utils/countryData';
import { regions } from '../utils/regions';
import esimApi from '../api/esimApi';
import NoeSIMState from '../components/NoeSIMState';
import axios from 'axios';
import { colors } from '../theme/colors';



interface ESim {
  id: number;
  plan_name: string;
  status: string;
  status_key: string;
  data_left: number | 'Unlimited';
  data_left_formatted: string;
  data_left_percentage: number;
  total_volume: string;
  time_left: string;
  activated_before: string;
  iccid: string;
  flag_url: string;
  short_url: string;
  country: string;
  package_code: string;
  unlimited: boolean;
  assigned_user: string | null;
}

interface AddOnPlan {
  id: string;
  name: string;
  data: number;
  duration: string;
  durationUnit: string;
  price: string;
  packageCode: string;
}

interface CurrentPackage {
  activateTime: string | null;
  status: string;
  packageName: string;
  remainingData: number;
  totalData: number;
  daysLeft: number;
  totalDuration: number;
  durationUnit: string;
  dataUsagePercentage: number;
  expiredTime: string;
}

interface LoadingState {
  visible: boolean;
  message: string;
  progress?: string;
}
  
interface AiraloAddOnPlan {
  id: string;
  name: string;
  data: number;
  data_formatted: string;
  duration: number; 
  duration_formatted: string;
  price: number;
  packageCode: string;
  is_unlimited: boolean;
}
  

const API_URL = 'https://esimfly.net/pages/esimplan/get_my_esims.php';
const CARD_MARGIN = 16;

const getCountryCode = (countryName: string): string => {
  const lowercaseName = countryName.toLowerCase();
  
  // First check if it's a region
  const region = regions.find(r => 
    lowercaseName.includes(r.name.toLowerCase())
  );
  
  if (region) {
    return region.id;
  }

  // If not a region, check for country
  const country = countries.find(c => 
    c.name.toLowerCase() === lowercaseName
  );
  
  return country?.id || '';
};

// Create a new combined FlagIcon component
export const FlagIcon = ({ countryCode, size = 40 }) => {
  if (!countryCode) {
    return (
      <View style={{
        width: size,
        height: size,
        backgroundColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: size / 2,
        overflow: 'hidden'
      }}>
        <Text style={{ fontSize: size / 2, color: '#fff' }}>?</Text>
      </View>
    );
  }

  // Check if it's a region
  const region = regions.find(r => r.id === countryCode);
  if (region) {
    const RegionComponent = region.image;
    return (
      <View style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        backgroundColor: 'white',
        padding: 1
      }}>
        <RegionComponent />
      </View>
    );
  }

  // If not a region, use the original CountryFlagIcon
  return <CountryFlagIcon countryCode={countryCode} size={size} />;
};


// Update the getStatusColor function
const getStatusColor = (status: string) => {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '');
  
  switch (normalizedStatus) {
    case 'active':
    case 'inuse':
      return '#4CAF50';  // Green for active
    case 'expired':
      return colors.slate[400];  // Theme slate for expired
    case 'inactive':
    case 'cancelled':
    case 'notactive':
      return colors.slate[400];  // Theme slate for inactive
    case 'new':
    case 'got_resource':
      return '#2196F3';  // Theme blue for new
    default:
      return colors.slate[400];
  }
};

	
const isSingleUsePackage = (packageName?: string): boolean => {
  return Boolean(packageName?.toLowerCase().includes('single use'));
};

// For getStatusText function, we can also improve it to handle special cases
const getStatusText = (status: string) => {
  // Special case for "In Use" to preserve its format
  if (status.toLowerCase() === 'in use') {
    return 'In Use';
  }
  
  // For "Not Active" case
  if (status.toLowerCase() === 'not active') {
    return 'Not Active';
  }

  return status.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const DataTypeButton = ({ 
  icon, 
  label, 
  isActive, 
  dotColor 
}: { 
  icon: keyof typeof Ionicons.glyphMap; 
  label: string; 
  isActive: boolean;
  dotColor: string;
}) => (
  <TouchableOpacity 
    style={[
      styles.dataTypeButton,
      isActive && styles.activeDataTypeButton
    ]}
  >
    <View style={styles.dataTypeContent}>
      <View style={[
        styles.dataDot, 
        { backgroundColor: isActive ? '#4CAF50' : colors.text.secondary }
      ]} />
      <Text style={[
        styles.dataTypeText,
        isActive ? styles.activeDataTypeText : styles.inactiveDataTypeText
      ]}>
        {label}
      </Text>
    </View>
  </TouchableOpacity>
);




const MyESimsScreen = () => {
  const [loading, setLoading] = useState(true);
  const [esimData, setEsimData] = useState<ESim[]>([]);
  const [selectedEsim, setSelectedEsim] = useState<ESim | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'5days' | '10days' | '15days'>('5days');
  const [showAllEsims, setShowAllEsims] = useState(false);
  const [sliderWidth, setSliderWidth] = useState(Dimensions.get('window').width);
  const [currentPage, setCurrentPage] = useState(0);
  const [visibleEsims, setVisibleEsims] = useState<ESim[]>([]);
  const navigation = useNavigation();
  const { userToken } = useContext(AuthContext);
  const horizontalScrollRef = useRef<ScrollView>(null);
 const [addOnPlans, setAddOnPlans] = useState<AddOnPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [selectedPlanData, setSelectedPlanData] = useState<AddOnPlan | null>(null);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setSliderWidth(width);
  };
	
const [loadingState, setLoadingState] = useState<LoadingState>({
  visible: false,
  message: ''
});
	
const isActiveStatus = (status: string): boolean => {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '');
  return ['active', 'inuse'].includes(normalizedStatus);
};
	
	

  // Add refresh state
  const [refreshing, setRefreshing] = useState(false);
  const isMounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchEsimData = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      if (!userToken) {
        setError('Authentication required');
        return;
      }

      console.log('Fetching eSIM data...');
      const response = await axios.get(API_URL, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
      });

      console.log('eSIM data response:', response.data);

      if (response.data.success && isMounted.current) {
        const esims = response.data.esims;
        setEsimData(esims);
        if (esims.length > 0) {
          const initialVisibleEsims = esims.slice(0, 5);
          setVisibleEsims(initialVisibleEsims);
          setSelectedEsim(initialVisibleEsims[0]);
        } else {
          setVisibleEsims([]);
          setSelectedEsim(null);
        }
        setError(null);
      } else {
        setError(response.data.message || 'Failed to fetch eSIM data');
      }
    } catch (err: any) {
      console.error('API call failed:', err.response?.data);
      if (isMounted.current) {
        setError(err.response?.status === 401 
          ? 'Session expired. Please login again.'
          : 'Unable to connect to server. Please try again later.'
        );
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };
	
 // Add useFocusEffect to refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('MyESims screen focused, refreshing data...');
      fetchEsimData(false);

      // Optional: Set up periodic refresh while screen is focused
      const refreshInterval = setInterval(() => {
        if (isMounted.current) {
          console.log('Performing periodic refresh...');
          fetchEsimData(false);
        }
      }, 30000); // Refresh every 30 seconds

      return () => {
        clearInterval(refreshInterval);
      };
    }, [userToken])
  );
	
// Inside MyESimsScreen component
const formatPackageName = useCallback((name: string, esim?: ESim) => {
  if (!name) return '';
  
  // Debug logging
  console.log('Formatting name:', { name, plan_name: esim?.plan_name });

  // Check if it's a Europe regional package
  if (name.toLowerCase().includes('europe')) {
    // Look for number in plan name if name is incomplete
    const numMatch = (name + (esim?.plan_name || '')).match(/(\d+)\+?\s*(?:areas?|countries?)?/i);
    if (numMatch && numMatch[1]) {
      return `Europe ${numMatch[1]}+`;
    }
  }
  
  return name;
}, []);


const sortPlans = (plans: AddOnPlan[] | AiraloAddOnPlan[]) => {
  return plans.sort((a, b) => {
    // First sort by duration
    const durationA = typeof a.duration === 'string' ? parseInt(a.duration) : a.duration;
    const durationB = typeof b.duration === 'string' ? parseInt(b.duration) : b.duration;
    const durationDiff = durationA - durationB;
    
    // If durations are same, sort by data amount
    if (durationDiff === 0) {
      const dataA = typeof a.data === 'string' ? parseFloat(a.data) : a.data;
      const dataB = typeof b.data === 'string' ? parseFloat(b.data) : b.data;
      return dataA - dataB;
    }
    
    return durationDiff;
  });
};
	
	
const fetchAddOnPlans = useCallback(async (iccid: string) => {
  if (loadingPlans || !iccid) return;

  try {
    setLoadingPlans(true);
    
    // Check for Airalo packages by pattern
    const packageCode = selectedEsim?.package_code || '';
    const airaloPatterns = /(sabkha|adanet|porto|boricua)-.*|airalo_.*/;
    const isAiralo = airaloPatterns.test(packageCode);
    const isEsimProvider2 = packageCode.match(/^esim_.*_V2$/);
    
    console.log('Provider detection:', {
      packageCode,
      isAiralo,
      isEsimProvider2,
      matched: airaloPatterns.test(packageCode)
    });

    // If it's Provider 2, we don't fetch add-on plans
    if (isEsimProvider2) {
      console.log('Provider 2 eSIM detected - no top-up available');
      setAddOnPlans([]);
      setLoadingPlans(false);
      return;
    }

    // For Airalo or other providers, fetch plans with provider specified
    const response = await esimApi.fetchAddOnPlans(
      iccid, 
      isAiralo ? 'airalo' : undefined
    );
    
    if (response.success && response.data?.plans) {
      // Convert Airalo plans to common format if needed
      const normalizedPlans = response.data.plans
        .filter(plan => !plan.name.includes('Single Use')) // Filter out Single Use plans
        .map(plan => {
          // For Airalo plans
          if (isAiralo) {
            return {
              id: plan.id,
              name: plan.name,
              data: plan.data,
              data_formatted: plan.data_formatted || `${plan.data}GB`,
              duration: plan.duration.toString(),
              durationUnit: 'Day',
              price: plan.price.toString(),
              packageCode: `airalo_${plan.packageCode}`,
              is_unlimited: plan.is_unlimited,
              region: plan.region
            };
          }
          // For other providers
          return {
            ...plan,
            duration: plan.duration?.toString(),
            durationUnit: 'Day',
            price: plan.price?.toString()
          };
        });

      const sortedPlans = sortPlans(normalizedPlans);
      setAddOnPlans(sortedPlans);
      if (!selectedPlanData && sortedPlans.length > 0) {
        setSelectedPlanData(sortedPlans[0]);
      }
    } else {
      console.warn('Add-on plans API returned success: false:', response);
      setAddOnPlans([]);
    }
  } catch (error) {
    console.error('Error fetching add-on plans:', error);
    setAddOnPlans([]);
  } finally {
    setLoadingPlans(false);
  }
}, [loadingPlans, selectedPlanData, selectedEsim]);
	
useEffect(() => {
  // First check if current package is Single Use
  if (selectedEsim?.iccid && 
      isActiveStatus(selectedEsim.status) && 
      !isSingleUsePackage(selectedEsim.plan_name)) {
    fetchAddOnPlans(selectedEsim.iccid);
  } else {
    // Clear add-on plans if it's a Single Use package
    setAddOnPlans([]);
    setSelectedPlanData(null);
  }
}, [selectedEsim?.iccid]);
	
type ESIMStatus = 
  | 'ACTIVE'
  | 'GOT_RESOURCE'
  | 'RELEASED'
  | 'INACTIVE'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'NEW';

interface ESIMStateInfo {
  canTopUp: boolean;
  message: string;
  action?: {
    label: string;
    handler: () => void;
  };
}

// Update the status check function to provide more detailed state information
const getESIMStateInfo = (
  esimStatus: string,
  currentPackage: CurrentPackage | null,
  navigation: any,
  iccid?: string
): ESIMStateInfo => {
  // First check if we have a current package and it's in use
  if (currentPackage?.status === 'IN_USE') {
    return {
      canTopUp: true,
      message: 'eSIM is active and ready for top-up'
    };
  }

  const normalizedStatus = esimStatus.toUpperCase();
  
  switch (normalizedStatus) {
    case 'IN_USE':
    case 'ACTIVE':
      return {
        canTopUp: true,
        message: 'eSIM is active and ready for top-up'
      };
      
    case 'GOT_RESOURCE':
      if (currentPackage?.activateTime) {
        return {
          canTopUp: true,
          message: 'eSIM is active and ready for top-up'
        };
      }
      return {
        canTopUp: false,
        message: 'This eSIM needs to be activated before it can be topped up.',
        action: {
          label: 'View Activation Instructions',
          handler: () => {
            if (iccid) {
              navigation.navigate('Instructions', { iccid });
            }
          }
        }
      };
      
    case 'RELEASED':
      return {
        canTopUp: false,
        message: 'This eSIM needs to be activated. Please scan the QR code or follow the installation instructions.',
        action: {
  label: 'View Installation Guide',
  handler: () => {
    if (iccid) {
      navigation.navigate('Shop', {
        screen: 'Instructions',
        params: {
          iccid: iccid
        }
      });
    }
  }
}
      };
      
    case 'EXPIRED':
      return {
        canTopUp: false,
        message: 'This eSIM has expired. Please purchase a new plan.'
      };
      
    case 'CANCELLED':
      return {
        canTopUp: false,
        message: 'This eSIM has been cancelled and cannot be topped up.'
      };
      
    default:
      return {
        canTopUp: false,
        message: `This eSIM is in ${status} status and cannot be topped up.`
      };
  }
};

const getProviderFromPackageCode = (packageCode: string) => {
  // Normalize the package code
  const normalizedCode = packageCode.toLowerCase();
  
  // Check for Airalo patterns
  if (normalizedCode.startsWith('sabkha-') || 
      normalizedCode.startsWith('airalo_')) {
    return 'airalo';
  }
  
  // Check for Provider 2
  if (normalizedCode.match(/^esim_.*_v2$/)) {
    return 'provider2';
  }
  
  return 'provider1';
};

// Update the handlePlanPurchase function
const handlePlanPurchase = async () => {
  if (!selectedEsim?.iccid || !selectedPlanData) return;

  try {
    // We don't need initial loading state here
    // Show confirmation dialog directly
    Alert.alert(
      'Confirm Top-up',
      `Are you sure you want to purchase ${
        selectedPlanData.is_unlimited ? 'Unlimited' : 
        selectedPlanData.data_formatted ? 
        selectedPlanData.data_formatted.replace(/\.00|\.0/g, '').replace(/\s+/g, '') :
        `${Math.round(selectedPlanData.data)}GB`
      } for ${selectedPlanData.duration} days?\n\nPrice: $${selectedPlanData.price}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Purchase',
          onPress: async () => {
            try {
              setLoadingState({
                visible: true,
                message: 'Processing top-up...',
                progress: 'This may take a few moments'
              });

              // Get the package code from the plan's ID
              const response = await esimApi.processTopUp({
                iccid: selectedEsim.iccid,
                packageCode: selectedPlanData.id,
                currentStatus: selectedEsim.status,
                packageStatus: selectedEsim.status_key || 'active'
              });

              setLoadingState({ visible: false, message: '' });

              if (response.success) {
                Alert.alert(
                  'Top-up Successful',
                  'Your eSIM has been successfully topped up.',
                  [{ 
                    text: 'OK',
                    onPress: async () => {
                      await fetchEsimData(false);
                    }
                  }]
                );
                return;
              }

              // On error, verify the status
              const verificationResponse = await esimApi.fetchEsimDetails(selectedEsim.iccid);
              if (verificationResponse.success && 
                  verificationResponse.data?.status?.toLowerCase() === 'active') {
                Alert.alert(
                  'Top-up Status',
                  'Your top-up request has been received. The data balance will be updated shortly.',
                  [{ 
                    text: 'OK',
                    onPress: async () => {
                      await fetchEsimData(false);
                    }
                  }]
                );
                return;
              }

              Alert.alert(
                'Top-up Failed',
                response.message || 'Failed to process top-up. Please try again.'
              );

            } catch (error) {
              console.error('Top-up error:', error);
              setLoadingState({ visible: false, message: '' });
              
              try {
                const verificationResponse = await esimApi.fetchEsimDetails(selectedEsim.iccid);
                if (verificationResponse.success && 
                    verificationResponse.data?.status?.toLowerCase() === 'active') {
                  Alert.alert(
                    'Top-up Status',
                    'Your top-up request has been received. Please check your data balance in a few minutes.',
                    [{ 
                      text: 'OK',
                      onPress: async () => {
                        await fetchEsimData(false);
                      }
                    }]
                  );
                  return;
                }
              } catch (verificationError) {
                console.error('Verification error:', verificationError);
              }
              
              Alert.alert(
                'Error',
                'An error occurred while processing the top-up. Please try again later.'
              );
            }
          }
        }
      ]
    );
  } catch (error) {
    setLoadingState({ visible: false, message: '' });
    Alert.alert(
      'Error',
      'Could not process top-up request. Please try again or contact support.'
    );
  }
};

// Add pull-to-refresh functionality
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchEsimData(false);
  };

  const handleModalSelection = (selectedItem: ESim) => {
    const selectedIndex = esimData.findIndex(esim => esim.id === selectedItem.id);
    let startIndex = Math.max(0, selectedIndex - 2);
    let endIndex = Math.min(startIndex + 5, esimData.length);
    
    if (endIndex - startIndex < 5 && startIndex > 0) {
      startIndex = Math.max(0, endIndex - 5);
    }
    
    const newVisibleEsims = esimData.slice(startIndex, endIndex);
    const newCurrentIndex = newVisibleEsims.findIndex(esim => esim.id === selectedItem.id);
    
    setVisibleEsims(newVisibleEsims);
    setSelectedEsim(selectedItem);
    setCurrentPage(newCurrentIndex);
    setShowAllEsims(false);

    requestAnimationFrame(() => {
      horizontalScrollRef.current?.scrollTo({
        x: newCurrentIndex * sliderWidth,
        animated: false
      });
    });
  };

  useEffect(() => {
    fetchEsimData();
  }, [userToken]);

  // Update the progress circle rendering:
const renderProgressCircle = () => {
  if (!selectedEsim) return null;

  const size = 220;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  
  const isNA = selectedEsim.data_left === 'N/A' || selectedEsim.data_left_formatted === 'N/A';
  const progress = isNA ? 1 : (selectedEsim.data_left_percentage / 100);
  const strokeDashoffset = circumference * (1 - progress);

  // Using slate colors from our theme for N/A state
  const circleColor = isNA ? colors.slate[400] : '#2196F3';

  return (
    <View style={styles.progressContainer}>
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.background.tertiary}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={circleColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${center} ${center})`}
          strokeLinecap="round"
        />
      </Svg>
      <View style={styles.progressContent}>
        <Text 
          style={[
            styles.dataAmount,
            isNA && styles.naDataAmount
          ]} 
          numberOfLines={1} 
          adjustsFontSizeToFit
        >
          {selectedEsim.data_left_formatted}
        </Text>
        <Text style={[
          styles.dataTotal,
          isNA && styles.naDataTotal
        ]} numberOfLines={1}>
          {selectedEsim.unlimited ? 'Unlimited Data' : `Left of ${selectedEsim.total_volume}`}
        </Text>
      </View>
    </View>
  );
};


const TopUpLoadingModal = ({ visible, message, progress }: LoadingState) => (
  <Modal
    transparent
    visible={visible}
    animationType="fade"
  >
    <View style={styles.modalOverlay}>
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loadingMessage}>{message || 'Processing...'}</Text>
          {progress && (
            <Text style={styles.loadingProgress}>{progress}</Text>
          )}
        </View>
      </View>
    </View>
  </Modal>
);

const formatTimeLeft = (timeString: string): string => {
  if (!timeString || timeString === 'N/A') return 'N/A';

  // Handle "Expired" case
  if (timeString.toLowerCase() === 'expired') return 'Expired';

  // Extract numbers and units using regex
  const matches = timeString.match(/(\d+)\s*(day|month|hour|minute|min|hr|d|m|h)s?/gi);
  if (!matches) return timeString;

  const formatUnit = (value: number, unit: string): string => {
    // Normalize unit
    const normalizedUnit = unit.toLowerCase();
    if (normalizedUnit.startsWith('month')) return `${value} ${value === 1 ? 'month' : 'months'}`;
    if (normalizedUnit.startsWith('day') || normalizedUnit === 'd') return `${value} ${value === 1 ? 'day' : 'days'}`;
    if (normalizedUnit.startsWith('hour') || normalizedUnit === 'hr') return `${value} ${value === 1 ? 'hour' : 'hours'}`;
    if (normalizedUnit.startsWith('min')) return `${value} ${value === 1 ? 'minute' : 'minutes'}`;
    return `${value} ${unit}`;
  };

  // Format each time component
  const formattedParts = matches.map(match => {
    const [_, value, unit] = match.match(/(\d+)\s*([a-zA-Z]+)/i) || [];
    return formatUnit(parseInt(value), unit);
  });

  return formattedParts.join(' ');
};

 const renderSlider = () => {
  return (
    <View style={styles.sliderContainer} onLayout={handleLayout}>
      <ScrollView
        ref={horizontalScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={sliderWidth}
        snapToAlignment="center"
        contentContainerStyle={styles.sliderContent}
        onScroll={(event) => {
          const offsetX = event.nativeEvent.contentOffset.x;
          const newPage = Math.round(offsetX / sliderWidth);
          if (newPage !== currentPage && newPage >= 0 && newPage < visibleEsims.length) {
            setCurrentPage(newPage);
            setSelectedEsim(visibleEsims[newPage]);
          }
        }}
        scrollEventThrottle={16}
      >
        {visibleEsims.map((esim, index) => (
  <View 
    key={esim.id}
    style={[styles.cardWrapper, { width: sliderWidth }]}
  >
    <TouchableOpacity
      style={[
        styles.esimCard,
        selectedEsim?.id === esim.id && styles.selectedEsimCard
      ]}
      onPress={() => {
        setSelectedEsim(esim);
        setCurrentPage(index);
      }}
    >
      <View style={styles.countryInfo}>
        <View style={styles.leftContent}>
          <View style={[
            styles.chipIconContainer,
            selectedEsim?.id === esim.id && styles.selectedChipContainer
          ]}>
            <Ionicons 
              name="hardware-chip-outline" 
              size={20} 
              color={selectedEsim?.id === esim.id ? colors.stone[50] : '#2196F3'}
              style={styles.chipIcon}
            />
          </View>
          <Text style={styles.countryName}>
            {formatPackageName(esim.country || esim.plan_name, esim)}
          </Text>
        </View>
        <View style={styles.flagContainer}>
          <FlagIcon 
            countryCode={getCountryCode(esim.country)} 
            size={40}
          />
        </View>
      </View>
      <View style={styles.statusContainer}>
        <View style={[
          styles.statusDot,
          { backgroundColor: getStatusColor(esim.status) }
        ]} />
        <View style={styles.statusRow}>
          <Text style={[
            styles.statusText,
            { color: getStatusColor(esim.status) }
          ]}>
            {getStatusText(esim.status)}
          </Text>
          {esim.time_left !== 'N/A' && (
            <View style={styles.timeContainer}>
              <Ionicons 
                name="time-outline" 
                size={14} 
                color="#888888"
              />
              <Text style={styles.timeText}>
                {formatTimeLeft(esim.time_left)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  </View>
))}
      </ScrollView>

      <View style={styles.pagination}>
        {visibleEsims.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              currentPage === index && styles.paginationDotActive
            ]}
          />
        ))}
      </View>
    </View>
  );
};

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loadingText}>Loading your eSIMs...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchEsimData}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedEsim || esimData.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>My eSIMs</Text>
          <View style={{ width: 24 }} />
        </View>
        <NoeSIMState />
      </SafeAreaView>
    );
  }

  return (
  <SafeAreaView style={styles.container}>
    <TopUpLoadingModal 
      visible={loadingState.visible}
      message={loadingState.message}
      progress={loadingState.progress}
    />

    <View style={styles.header}>
  <TouchableOpacity 
    onPress={() => navigation.goBack()}
    style={[styles.headerIcon, { backgroundColor: colors.background.headerIcon }]}
  >
    <Ionicons 
      name="arrow-back" 
      size={24} 
      color={colors.icon.header}
    />
  </TouchableOpacity>
  <Text style={styles.title}>eSIM Details</Text>
  <TouchableOpacity 
    onPress={() => setShowAllEsims(true)}
    style={[styles.headerIcon, { backgroundColor: colors.background.headerIcon }]}
  >
    <Ionicons 
      name="ellipsis-vertical" 
      size={24} 
      color={colors.icon.header}
    />
  </TouchableOpacity>
</View>

    <ScrollView 
      style={styles.content}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#FF6B00"
          colors={['#FF6B00']}
          progressBackgroundColor="#1A1A1A"
        />
      }
    >
      {renderProgressCircle()}

      <View style={styles.dataTypes}>
        <DataTypeButton 
          icon="cellular" 
          label="Data" 
          isActive={true} 
          dotColor="#FF6B00"
        />
        <DataTypeButton 
          icon="call" 
          label="Minutes" 
          isActive={false} 
          dotColor="#4CAF50"
        />
        <DataTypeButton 
          icon="chatbubble" 
          label="SMS" 
          isActive={false} 
          dotColor="#2196F3"
        />
      </View>

      {renderSlider()}

     <TouchableOpacity 
  style={styles.instructionsButton}
  onPress={() => {
    navigation.navigate('Shop', {
      screen: 'Instructions',
      params: {
        iccid: selectedEsim?.iccid
      }
    });
  }}
>
       <Ionicons 
    name="download-outline" 
    size={20} 
    color={colors.icon.header} 
  />
  <Text style={styles.instructionsText}>View Instructions</Text>
  <Ionicons 
    name="chevron-forward" 
    size={20} 
    color={colors.icon.header} 
  />
</TouchableOpacity>

      <View style={styles.providerInfo}>
        <Ionicons name="cellular-outline" size={20} color="#BBBBBB" />
        <Text style={styles.providerText}>
          {`ICCID: ${selectedEsim?.iccid}`}
        </Text>
      </View>

      {/* Updated condition to include IN_USE status */}
{isActiveStatus(selectedEsim?.status || '') && (
  <View style={styles.topUpContainer}>
    {isSingleUsePackage(selectedEsim?.plan_name) ? (
      <Text style={styles.noPlansText}>
        This is a single-use eSIM and cannot be topped up
      </Text>
    ) : !selectedEsim?.package_code?.match(/^esim_.*_V2$/) ? (
      <>
        <Text style={styles.topUpTitle}>Buy Top-Up</Text>
        {loadingPlans ? (
          <ActivityIndicator color="#FF6B00" style={styles.loadingPlans} />
        ) : addOnPlans.length === 0 ? (
          <Text style={styles.noPlansText}>
            Top-up is not available for this eSIM provider
          </Text>
        ) : (
          <>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.topUpOptionsScroll}
            >
              {addOnPlans.map((plan) => (
                <TouchableOpacity 
                  key={plan.id}
                  style={[
                    styles.planButton, 
                    selectedPlanData?.id === plan.id && styles.selectedPlan
                  ]}
                  onPress={() => setSelectedPlanData(plan)}
                >
                  <Text style={styles.planData}>
                    {plan.is_unlimited ? 'Unlimited' : 
                     plan.data_formatted ? plan.data_formatted.replace(/\.00|\.0/g, '').replace(/\s+/g, '') :
                     `${Math.round(plan.data)}GB`}
                  </Text>
                  <Text style={[
                    styles.planDuration,
                    selectedPlanData?.id === plan.id && styles.selectedPlanText
                  ]}>
                    {plan.duration} {plan.durationUnit.toLowerCase()}s
                  </Text>
                  <Text style={[
                    styles.planPrice,
                    selectedPlanData?.id === plan.id && styles.selectedPlanText
                  ]}>
                    ${plan.price}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {selectedPlanData && (
              <TouchableOpacity 
                style={styles.checkoutButton}
                onPress={handlePlanPurchase}
              >
                <View style={styles.checkoutContent}>
                  <Ionicons name="cart-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.checkoutText}>
                    {selectedPlanData.is_unlimited ? 'Unlimited' :
                     selectedPlanData.data_formatted ? 
                     selectedPlanData.data_formatted.replace(/\.00|\.0/g, '').replace(/\s+/g, '') :
                     `${Math.round(selectedPlanData.data)}GB`} for {selectedPlanData.duration} {selectedPlanData.durationUnit.toLowerCase()}s
                  </Text>
                </View>
                <Text style={styles.checkoutPrice}>
                  ${selectedPlanData.price}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </>
    ) : (
      <Text style={styles.noPlansText}>
        Top-up is not available for this eSIM provider
      </Text>
    )}
  </View>
)}
    </ScrollView>

    <Modal
  visible={showAllEsims}
  animationType="slide"
  transparent={true}
  onRequestClose={() => setShowAllEsims(false)}
>
  <View style={styles.modalContainer}>
    <View style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <TouchableOpacity 
          onPress={() => setShowAllEsims(false)}
          style={[styles.headerIcon, { backgroundColor: colors.background.headerIcon }]}
        >
          <Ionicons 
            name="close" 
            size={24} 
            color={colors.icon.header}
          />
        </TouchableOpacity>
        <Text style={styles.modalTitle}>All eSIMs</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <FlatList
        data={esimData}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[
              styles.modalCard,
              selectedEsim?.id === item.id && styles.selectedModalCard
            ]}
            onPress={() => handleModalSelection(item)}
            activeOpacity={0.7}
          >
            <View style={styles.modalCardContent}>
              <View style={styles.countryInfo}>
                <View style={styles.leftContent}>
                  <View style={[
                    styles.chipIconContainer,
                    selectedEsim?.id === item.id && styles.selectedChipContainer
                  ]}>
                    <Ionicons 
                      name="hardware-chip-outline" 
                      size={20} 
                      color={selectedEsim?.id === item.id ? "#FFFFFF" : colors.icon.header}
                    />
                  </View>
                  <Text style={styles.countryName}>
                    {formatPackageName(item.country || item.plan_name, item)}
                  </Text>
                </View>
                <View style={styles.flagContainer}>
                  <FlagIcon 
                    countryCode={getCountryCode(item.country)} 
                    size={40}
                  />
                </View>
              </View>
              <View style={styles.statusContainer}>
                <View style={[
                  styles.statusDot,
                  { backgroundColor: getStatusColor(item.status) }
                ]} />
                <View style={styles.statusRow}>
                  <Text style={[
                    styles.statusText,
                    { color: getStatusColor(item.status) }
                  ]}>
                    {getStatusText(item.status)}
                  </Text>
                  {item.time_left !== 'N/A' && (
                    <View style={styles.timeContainer}>
                      <Ionicons 
                        name="time-outline" 
                        size={14} 
                        color={colors.text.secondary}
                      />
                      <Text style={styles.timeText}>
                        {formatTimeLeft(item.time_left)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.modalList}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.modalCardSeparator} />}
      />
    </View>
  </View>
</Modal>
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
    alignItems: 'center',
    justifyContent: 'space-between',
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 52,
  },
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    height: 220,
  },
  svg: {
    transform: [{ rotate: '-90deg' }],
  },
  progressContent: {
    position: 'absolute',
    alignItems: 'center',
    width: '70%',
  },
  dataAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  dataTotal: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  dataTypes: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 24,
  },
dataTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  dataTypeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
activeDataTypeButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)', // Green with 10% opacity
  },
  activeDataTypeText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  inactiveDataTypeText: {
    color: colors.text.secondary,
  },
  dataDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dataTypeText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  activeDataTypeText: {
    color: colors.text.primary,
  },
  sliderContainer: {
    marginBottom: 24,
  },
  sliderContent: {
    alignItems: 'center',
  },
  cardWrapper: {
    paddingHorizontal: CARD_MARGIN,
    justifyContent: 'center',
  },
  esimCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  selectedEsimCard: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.background.tertiary,
  },
  countryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chipIcon: {
    transform: [{ rotate: '45deg' }],
  },
chipIconContainer: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)', // Light blue background
    borderRadius: 12,
    padding: 8,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.2)', // Slightly darker border
  },
  flagContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  countryName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timeText: {
    fontSize: 13,
    color: colors.text.secondary,
    marginLeft: 4,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    marginBottom: 24,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.background.light,
  },
  paginationDotActive: {
    backgroundColor: colors.text.primary,
  },
  instructionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  instructionsText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  providerText: {
    marginLeft: 12,
    fontSize: 16,
    color: colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  topUpContainer: {
    marginTop: 24,
    marginBottom: 32,
  },
  topUpTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
    paddingHorizontal: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  planButton: {
    width: 120,
    padding: 16,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  selectedPlan: {
    backgroundColor: colors.background.tertiary,
    borderColor: colors.primary.DEFAULT,
  },
  planData: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  planDuration: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  planPrice: {
    fontSize: 16,
    color: colors.text.secondary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  selectedPlanText: {
    color: colors.text.primary,
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: 24,
    marginTop: 24,
    marginHorizontal: 16,
  },
  checkoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.stone[50],
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  checkoutPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.stone[50],
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
 modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  modalList: {
    padding: 16,
  },
  modalCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
    overflow: 'hidden',
  },
  selectedModalCard: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.background.tertiary,
  },
  modalCardContent: {
    padding: 16,
  },
  modalCardSeparator: {
    height: 12,
  },
selectedChipContainer: {
    backgroundColor: '#2196F3', // Solid blue when selected
    borderColor: '#2196F3',
  },
  chipIconContainer: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    padding: 8,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timeText: {
    fontSize: 13,
    color: colors.text.secondary,
    marginLeft: 4,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: colors.text.primary,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  errorText: {
    color: colors.text.primary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  retryButton: {
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: colors.stone[50],
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  noPlansText: {
    color: colors.text.secondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingMessage: {
    color: colors.text.primary,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  loadingProgress: {
    color: colors.text.secondary,
    fontSize: 14,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
 naDataAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.slate[400],
    marginBottom: 4,
    textAlign: 'center',
  },
  naDataTotal: {
    fontSize: 12,
    color: colors.slate[500],
    textAlign: 'center',
  },
});

export default MyESimsScreen;