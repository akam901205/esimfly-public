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
  Alert,
  Image,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

// Contexts
import { AuthContext } from '../api/AuthContext';
import { colors } from '../theme/colors';

// Components
import { TopUpModal } from '../components/MyESims/TopUpModal';
import NoeSIMState from '../components/NoeSIMState';

// Hooks
import { useESimData } from '../hooks/useESimData';

// Utils and Types
import { ESim, ESimDetails, ModalState, AddOnPlan } from '../types/esim.types';
import { checkTopUpAvailability } from '../utils/esim.utils';
import { getStatusColor, getStatusText } from '../constants/esim.constants';

// API
import esimApi from '../api/esimApi';
import { newApi } from '../api/api';

const { width: screenWidth } = Dimensions.get('window');
const CARD_MARGIN = 16;

interface LoadingState {
  visible: boolean;
  message: string;
  progress?: string;
}

const DataTypeButton = ({ 
  icon, 
  label, 
  isActive, 
  color,
  value,
  onPress
}: { 
  icon: keyof typeof Ionicons.glyphMap; 
  label: string; 
  isActive: boolean;
  color: string;
  value?: string;
  onPress?: () => void;
}) => (
  <TouchableOpacity 
    style={[
      styles.dataTypeButton,
      isActive && styles.activeDataTypeButton
    ]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[
      styles.dataTypeIconContainer,
      isActive && { backgroundColor: `${color}10` }
    ]}>
      <Ionicons 
        name={icon} 
        size={20} 
        color={isActive ? color : '#9CA3AF'}
      />
    </View>
    <View style={styles.dataTypeInfo}>
      <Text style={[
        styles.dataTypeLabel,
        isActive && { color: color }
      ]}>
        {label}
      </Text>
      {value && (
        <Text style={[
          styles.dataTypeValue,
          isActive && { color: color }
        ]}>
          {value}
        </Text>
      )}
    </View>
  </TouchableOpacity>
);

const MyESimsScreen = () => {
  const navigation = useNavigation();
  const { userToken, logout } = useContext(AuthContext);
  
  // Use custom hook for eSIM data management
  const {
    esimData,
    visibleEsims,
    selectedEsim,
    loading,
    error,
    fetchEsimData,
    loadMoreEsims,
    selectEsim,
    updateVisibleEsims,
    refreshData,
    hasMoreEsims
  } = useESimData();

  // Local state
  const [showAllEsims, setShowAllEsims] = useState(false);
  const [sliderWidth, setSliderWidth] = useState(Dimensions.get('window').width);
  const [currentPage, setCurrentPage] = useState(0);
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState(false);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    visible: false,
    message: ''
  });
  const [topUpModal, setTopUpModal] = useState<ModalState>({
    isVisible: false,
    esim: null
  });
  
  const horizontalScrollRef = useRef<ScrollView>(null);
  const isMounted = useRef(true);

  // Effects
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (userToken && isMounted.current) {
        fetchEsimData();
      }
    }, [userToken, fetchEsimData])
  );

  // Set first 5 esims as visible when data loads
  useEffect(() => {
    if (esimData.length > 0) {
      const initialVisibleEsims = esimData.slice(0, 5);
      if (initialVisibleEsims.length > 0 && !selectedEsim) {
        selectEsim(initialVisibleEsims[0]);
      }
    }
  }, [esimData]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setSliderWidth(width);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
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
    
    // Update visible eSIMs first
    updateVisibleEsims(newVisibleEsims);
    
    // Then select the eSIM and update the page
    selectEsim(selectedItem);
    setCurrentPage(newCurrentIndex);
    setShowAllEsims(false);

    // Scroll to the selected item after a short delay to ensure the view is updated
    setTimeout(() => {
      horizontalScrollRef.current?.scrollTo({
        x: newCurrentIndex * sliderWidth,
        animated: true
      });
    }, 100);
  };

  const handleViewDetails = (esim: ESim) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Shop', {
      screen: 'Instructions',
      params: {
        iccid: esim.iccid,
        esimId: esim.id
      }
    });
  };

  const handleTopUp = async (esim: ESim) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const availability = checkTopUpAvailability(esim, navigation);
    
    if (!availability.canTopUp) {
      Alert.alert(
        'Top-Up Not Available',
        availability.message,
        availability.action ? [
          { text: 'Cancel', style: 'cancel' },
          { text: availability.action.label, onPress: availability.action.handler }
        ] : [{ text: 'OK' }]
      );
      return;
    }

    setTopUpModal({ isVisible: true, esim });
  };

  const handleTopUpSelect = async (plan: AddOnPlan) => {
    if (!topUpModal.esim) return;

    // Close the modal
    setTopUpModal({ isVisible: false, esim: null });

    // Detect provider based on the eSIM's package code
    let provider = 'auto';
    
    if (topUpModal.esim.package_code && topUpModal.esim.package_code.startsWith('airalo_')) {
      provider = 'airalo';
    } else if (topUpModal.esim.package_name && topUpModal.esim.package_name.toLowerCase().includes('discover')) {
      provider = 'airalo';
    }
    
    if (plan.id && plan.id.includes('-topup') && plan.packageCode && plan.packageCode.startsWith('airalo_')) {
      provider = 'airalo';
    }

    // Navigate to checkout with the topup package
    const packageData = {
      id: plan.id,
      name: plan.name,
      price: plan.price,
      data: plan.data,
      data_formatted: plan.data_formatted,
      duration: plan.duration,
      duration_formatted: plan.duration_formatted,
      is_unlimited: plan.is_unlimited,
      voice: plan.voice || 0,
      text: plan.text || 0,
      flag_url: plan.flag_url,
      provider: provider,
      package_code: plan.packageCode || plan.id,
      metadata: {
        is_topup: true,
        esim_id: topUpModal.esim.id,
        iccid: topUpModal.esim.iccid,
        provider: provider
      }
    };

    navigation.navigate('Shop', {
      screen: 'Checkout',
      params: {
        package: packageData,
        isTopup: true,
        esimId: topUpModal.esim.id,
        esimDetails: {
          id: topUpModal.esim.id,
          iccid: topUpModal.esim.iccid,
          plan_name: topUpModal.esim.plan_name,
          package_code: topUpModal.esim.package_code,
          provider: provider
        }
      }
    });
  };

  // Render functions
  const renderProgressCircle = () => {
    if (!selectedEsim) return null;

    const size = 220;
    const strokeWidth = 16;
    const radius = (size - strokeWidth) / 2;
    const center = size / 2;
    const circumference = 2 * Math.PI * radius;
    
    const isNA = selectedEsim.data_left === 'N/A' || selectedEsim.data_left_formatted === 'N/A';
    const progress = isNA ? 1 : (selectedEsim.data_left_percentage / 100);
    const strokeDashoffset = circumference * (1 - progress);

    const circleColor = isNA ? '#9CA3AF' : '#FF6B00';

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressCircleWrapper}>
          <Svg width={size} height={size} style={styles.svg}>
            {/* Outer decorative circle */}
            <Circle
              cx={center}
              cy={center}
              r={radius + 8}
              stroke="#F9FAFB"
              strokeWidth={2}
              fill="none"
            />
            {/* Background circle with gradient effect */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke="#F3F4F6"
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray="4 2"
              opacity={0.5}
            />
            {/* Progress circle */}
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
            {/* Inner decorative circle */}
            <Circle
              cx={center}
              cy={center}
              r={radius - strokeWidth / 2 - 8}
              stroke="#F9FAFB"
              strokeWidth={1}
              fill="none"
              opacity={0.5}
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
      </View>
    );
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
              selectEsim(visibleEsims[newPage]);
              // Animate the pagination indicator
              Animated.spring(slideAnimation, {
                toValue: newPage,
                useNativeDriver: true,
                tension: 50,
                friction: 8
              }).start();
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
                  selectEsim(esim);
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
                        color={selectedEsim?.id === esim.id ? '#FFFFFF' : '#6B7280'}
                        style={styles.chipIcon}
                      />
                    </View>
                    <Text style={styles.countryName}>
                      {esim.country}
                    </Text>
                  </View>
                  <View style={styles.flagContainer}>
                    {esim.flag_url && (
                      <Image 
                        source={{ uri: esim.flag_url.startsWith('http') ? esim.flag_url : `https://esimfly.net${esim.flag_url}` }} 
                        style={styles.flagImage}
                      />
                    )}
                  </View>
                </View>
                <View style={styles.statusTimeContainer}>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: esim.status === 'active' ? '#FF6B0010' : '#F3F4F6' }
                  ]}>
                    <View style={[
                      styles.statusDot,
                      { backgroundColor: esim.status === 'active' ? '#FF6B00' : getStatusColor(esim.status) }
                    ]} />
                    <Text style={[
                      styles.statusText,
                      { color: esim.status === 'active' ? '#FF6B00' : getStatusColor(esim.status) }
                    ]}>
                      {getStatusText(esim.status)}
                    </Text>
                  </View>
                  {esim.time_left !== 'N/A' && (
                    <View style={styles.timeContainer}>
                      <Ionicons 
                        name="time-outline" 
                        size={14} 
                        color="#888888"
                      />
                      <Text style={styles.timeText}>
                        {esim.time_left}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        <View style={styles.paginationWrapper}>
          <View style={styles.paginationContainer}>
            <View style={styles.paginationTrack} />
            <Animated.View
              style={[
                styles.paginationSlider,
                {
                  transform: [{
                    translateX: slideAnimation.interpolate({
                      inputRange: [0, visibleEsims.length - 1],
                      outputRange: [0, (visibleEsims.length - 1) * 30]
                    })
                  }]
                }
              ]}
            />
            {visibleEsims.map((_, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => {
                  setCurrentPage(index);
                  selectEsim(visibleEsims[index]);
                  horizontalScrollRef.current?.scrollTo({
                    x: index * sliderWidth,
                    animated: true
                  });
                  Animated.spring(slideAnimation, {
                    toValue: index,
                    useNativeDriver: true,
                    tension: 50,
                    friction: 8
                  }).start();
                }}
                style={styles.paginationDotTouchable}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.paginationDot,
                    currentPage === index && styles.paginationDotActive
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.paginationInfo}>
            <Text style={styles.paginationNumber}>
              {currentPage + 1}
            </Text>
            <Text style={styles.paginationSeparator}>/</Text>
            <Text style={styles.paginationTotal}>
              {visibleEsims.length}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Loading state
  if (loading && esimData.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#F8F9FA', '#F3F4F6']}
          style={styles.gradient}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loadingText}>Loading your eSIMs...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#F8F9FA', '#F3F4F6']}
          style={styles.gradient}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => fetchEsimData()}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Empty state
  if (!selectedEsim || esimData.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#000000" />
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
      <LinearGradient
        colors={['#F8F9FA', '#F3F4F6']}
        style={styles.gradient}
      />
      
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.headerIcon}
        >
          <Ionicons 
            name="arrow-back" 
            size={24} 
            color="#374151"
          />
        </TouchableOpacity>
        <Text style={styles.title}>eSIM Details</Text>
        <TouchableOpacity 
          onPress={() => setShowAllEsims(true)}
          style={styles.headerIcon}
        >
          <Ionicons 
            name="ellipsis-vertical" 
            size={24} 
            color="#374151"
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
            progressBackgroundColor="#FFFFFF"
          />
        }
      >
        {renderProgressCircle()}

        <View style={styles.dataTypes}>
          <DataTypeButton 
            icon="cellular" 
            label="Data" 
            isActive={true} 
            color="#FF6B00"
            onPress={() => {}}
          />
          <DataTypeButton 
            icon="call-outline" 
            label="Min" 
            isActive={false} 
            color="#10B981"
            onPress={() => {}}
          />
          <DataTypeButton 
            icon="chatbubble-outline" 
            label="SMS" 
            isActive={false} 
            color="#3B82F6"
            onPress={() => {}}
          />
        </View>

        {renderSlider()}

        <TouchableOpacity 
          style={styles.instructionsButton}
          onPress={() => handleViewDetails(selectedEsim)}
        >
          <View style={styles.instructionsLeft}>
            <View style={styles.instructionsIconContainer}>
              <Ionicons 
                name="document-text-outline" 
                size={20} 
                color="#FF6B00" 
              />
            </View>
            <Text style={styles.instructionsText}>View Instructions</Text>
          </View>
          <Ionicons 
            name="chevron-forward" 
            size={20} 
            color="#9CA3AF" 
          />
        </TouchableOpacity>

        <View style={styles.providerInfo}>
          <View style={styles.providerIconContainer}>
            <Ionicons name="card-outline" size={20} color="#6B7280" />
          </View>
          <View style={styles.providerTextContainer}>
            <Text style={styles.providerLabel}>ICCID</Text>
            <Text style={styles.providerText}>
              {selectedEsim?.iccid}
            </Text>
          </View>
        </View>

        {/* Top-up button section */}
        {selectedEsim && selectedEsim.status.toLowerCase() === 'active' && (
          <TouchableOpacity 
            style={styles.topUpButton}
            onPress={() => handleTopUp(selectedEsim)}
          >
            <Ionicons name="add-circle-outline" size={24} color="#FFFFFF" />
            <Text style={styles.topUpButtonText}>Buy Top-Up</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Modal for all eSIMs */}
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
                style={styles.headerIcon}
              >
                <Ionicons 
                  name="close" 
                  size={24} 
                  color="#374151"
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
                            color={selectedEsim?.id === item.id ? '#FFFFFF' : '#6B7280'}
                          />
                        </View>
                        <Text style={styles.countryName}>
                          {item.country}
                        </Text>
                      </View>
                      <View style={styles.flagContainer}>
                        {item.flag_url && (
                          <Image 
                            source={{ uri: item.flag_url.startsWith('http') ? item.flag_url : `https://esimfly.net${item.flag_url}` }} 
                            style={styles.flagImage}
                          />
                        )}
                      </View>
                    </View>
                    <View style={styles.modalStatusContainer}>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: item.status === 'active' ? '#FF6B0010' : '#F3F4F6' }
                      ]}>
                        <View style={[
                          styles.statusDot,
                          { backgroundColor: item.status === 'active' ? '#FF6B00' : getStatusColor(item.status) }
                        ]} />
                        <Text style={[
                          styles.statusText,
                          { color: item.status === 'active' ? '#FF6B00' : getStatusColor(item.status) }
                        ]}>
                          {getStatusText(item.status)}
                        </Text>
                      </View>
                      {item.time_left !== 'N/A' && (
                        <View style={styles.timeContainer}>
                          <Ionicons 
                            name="time-outline" 
                            size={14} 
                            color={colors.text.secondary}
                          />
                          <Text style={styles.timeText}>
                            {item.time_left}
                          </Text>
                        </View>
                      )}
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

      {/* Top-Up Modal */}
      <TopUpModal
        modalState={topUpModal}
        onClose={() => setTopUpModal({ isVisible: false, esim: null })}
        onTopUpSelect={handleTopUpSelect}
      />

      {/* Loading Modal */}
      <Modal
        visible={loadingState.visible}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.loadingModalContent}>
            <ActivityIndicator size="large" color="#FF6B00" />
            <Text style={styles.loadingMessage}>{loadingState.message}</Text>
            {loadingState.progress && (
              <Text style={styles.loadingProgress}>{loadingState.progress}</Text>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
    padding: 16,
    backgroundColor: 'transparent',
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
    paddingBottom: 100,
  },
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    height: 240,
  },
  progressCircleWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
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
    gap: 12,
    marginVertical: 24,
  },
  dataTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxWidth: 120,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  activeDataTypeButton: {
    borderWidth: 1.5,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  dataTypeIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dataTypeInfo: {
    flex: 1,
  },
  dataTypeLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  dataTypeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
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
    paddingBottom: 8,
  },
  esimCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  selectedEsimCard: {
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
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 8,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedChipContainer: {
    backgroundColor: '#FF6B00',
  },
  flagContainer: {
    width: 48,
    height: 32,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  flagImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  countryName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  statusTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
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
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  timeText: {
    fontSize: 13,
    color: colors.text.secondary,
    marginLeft: 4,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  paginationWrapper: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  paginationContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    height: 4,
    marginBottom: 12,
  },
  paginationTrack: {
    position: 'absolute',
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    width: 150,
  },
  paginationSlider: {
    position: 'absolute',
    width: 30,
    height: 4,
    backgroundColor: '#FF6B00',
    borderRadius: 2,
    shadowColor: '#FF6B00',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  paginationDotTouchable: {
    width: 30,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'transparent',
  },
  paginationDotActive: {
    backgroundColor: 'transparent',
  },
  paginationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paginationNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B00',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  paginationSeparator: {
    fontSize: 14,
    color: '#9CA3AF',
    marginHorizontal: 4,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  paginationTotal: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  instructionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  instructionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  instructionsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FF6B0010',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionsText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  providerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  providerLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    marginBottom: 2,
  },
  providerText: {
    fontSize: 14,
    color: colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    fontWeight: '500',
  },
  topUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#FF6B00',
    borderRadius: 24,
    marginTop: 24,
    marginBottom: 32,
    marginHorizontal: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  topUpButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  selectedModalCard: {
  },
  modalCardContent: {
    padding: 16,
  },
  modalStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalCardSeparator: {
    height: 12,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingModalContent: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    minWidth: 200,
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