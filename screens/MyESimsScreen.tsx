import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  FlatList,
  Dimensions,
  RefreshControl,
  Alert,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

// Contexts
import { AuthContext } from '../api/AuthContext';
import { colors } from '../theme/colors';

// Components
import { ESimCard } from '../components/MyESims/ESimCard';
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

// Color mappings for easier access
const themeColors = {
  background: colors.background.primary,
  surface: colors.background.secondary,
  text: colors.text.primary,
  textSecondary: colors.text.secondary,
  primary: colors.primary.DEFAULT,
  border: colors.border.default,
  error: '#ef4444'  // red-500
};

interface LoadingState {
  visible: boolean;
  message: string;
  progress?: string;
}

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
    refreshData,
    hasMoreEsims
  } = useESimData();

  // Local state
  const [loadingState, setLoadingState] = useState<LoadingState>({
    visible: false,
    message: ''
  });
  const [topUpModal, setTopUpModal] = useState<ModalState>({
    isVisible: false,
    esim: null
  });
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef<FlatList>(null);
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

  useEffect(() => {
    const loadingTimeout = setTimeout(() => {
      if (loading && !userToken) {
        Alert.alert(
          'Authentication Required',
          'Please login to view your eSIMs',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    }, 5000);

    return () => clearTimeout(loadingTimeout);
  }, [loading, userToken, navigation]);

  // Handlers
  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const handleViewDetails = (esim: ESim) => {
    navigation.navigate('Shop', {
      screen: 'Instructions',
      params: {
        iccid: esim.iccid,
        esimId: esim.id
      }
    });
  };

  const handleViewInstructions = (esim: ESim) => {
    navigation.navigate('Shop', {
      screen: 'Instructions',
      params: {
        iccid: esim.iccid,
        esimId: esim.id
      }
    });
  };

  const handleTopUp = async (esim: ESim) => {
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
    
    // Check if the eSIM's original package code indicates Airalo
    if (topUpModal.esim.package_code && topUpModal.esim.package_code.startsWith('airalo_')) {
      provider = 'airalo';
    } else if (topUpModal.esim.package_name && topUpModal.esim.package_name.toLowerCase().includes('discover')) {
      provider = 'airalo';
    }
    
    // Also check the topup plan ID/code
    if (plan.id && plan.id.includes('-topup') && plan.packageCode && plan.packageCode.startsWith('airalo_')) {
      provider = 'airalo';
    }

    // Navigate to checkout with the topup package
    const packageData = {
      id: plan.id, // Use plan.id which includes the -topup suffix for Airalo
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
      package_code: plan.packageCode || plan.id, // Include package code
      // Add metadata to indicate this is a topup
      metadata: {
        is_topup: true,
        esim_id: topUpModal.esim.id,
        iccid: topUpModal.esim.iccid,
        provider: provider // Include provider in metadata
      }
    };

    // Navigate to checkout screen with the topup package
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
  const renderProgressRing = (percentage: number) => {
    const size = 100;
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <View style={styles.progressRingContainer}>
        <Svg width={size} height={size} style={styles.progressRing}>
          <Circle
            stroke={themeColors.border}
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
          />
          <Circle
            stroke={themeColors.primary}
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={styles.progressTextContainer}>
          <Text style={[styles.progressPercentage, { color: themeColors.text }]}>
            {Math.round(percentage)}%
          </Text>
          <Text style={[styles.progressLabel, { color: themeColors.textSecondary }]}>
            Used
          </Text>
        </View>
      </View>
    );
  };

  const renderSelectedEsimDetails = () => {
    if (!selectedEsim) return null;

    const dataPercentageUsed = selectedEsim.unlimited ? 0 : (100 - selectedEsim.data_left_percentage);

    return (
      <View style={[styles.selectedCard, { backgroundColor: themeColors.surface }]}>
        <View style={styles.selectedHeader}>
          <View style={styles.selectedInfo}>
            <Text style={[styles.selectedCountry, { color: themeColors.text }]}>
              {selectedEsim.country}
            </Text>
            <Text style={[styles.selectedPlan, { color: themeColors.textSecondary }]} numberOfLines={2}>
              {selectedEsim.plan_name}
            </Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(selectedEsim.status) + '20' }
            ]}>
              <View style={[
                styles.statusDot,
                { backgroundColor: getStatusColor(selectedEsim.status) }
              ]} />
              <Text style={[
                styles.statusText,
                { color: getStatusColor(selectedEsim.status) }
              ]}>
                {getStatusText(selectedEsim.status)}
              </Text>
            </View>
          </View>
          {renderProgressRing(dataPercentageUsed)}
        </View>

        <View style={styles.selectedStats}>
          <View style={styles.statItem}>
            <Ionicons name="cellular" size={20} color={themeColors.textSecondary} />
            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>
              Data
            </Text>
            <Text style={[styles.statValue, { color: themeColors.text }]}>
              {selectedEsim.unlimited ? 'Unlimited Data' : `Left of ${selectedEsim.total_volume}`}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="calendar-outline" size={20} color={themeColors.textSecondary} />
            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>
              Validity
            </Text>
            <Text style={[styles.statValue, { color: themeColors.text }]}>
              {selectedEsim.time_left}
            </Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: themeColors.primary }]}
            onPress={() => handleTopUp(selectedEsim)}
          >
            <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Top Up</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: themeColors.background }]}
            onPress={() => handleViewDetails(selectedEsim)}
          >
            <Ionicons name="information-circle-outline" size={20} color={themeColors.primary} />
            <Text style={[styles.actionButtonText, { color: themeColors.primary }]}>
              Details
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderESimItem = ({ item }: { item: ESim }) => (
    <ESimCard
      esim={item}
      isSelected={selectedEsim?.id === item.id}
      onPress={() => selectEsim(item)}
      onViewDetails={() => handleViewDetails(item)}
    />
  );

  // Loading state
  if (loading && esimData.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
          Loading your eSIMs...
        </Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: themeColors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={themeColors.error} />
        <Text style={[styles.errorText, { color: themeColors.error }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: themeColors.primary }]}
          onPress={() => fetchEsimData()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Empty state
  if (esimData.length === 0) {
    return <NoeSIMState onRefresh={fetchEsimData} />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={themeColors.primary}
          />
        }
      >
        {renderSelectedEsimDetails()}

        <View style={styles.listSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
              All eSIMs ({esimData.length})
            </Text>
            {hasMoreEsims && (
              <TouchableOpacity onPress={loadMoreEsims}>
                <Text style={[styles.viewAllText, { color: themeColors.primary }]}>
                  Load More
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            ref={flatListRef}
            data={visibleEsims}
            renderItem={renderESimItem}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </ScrollView>

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
        <View style={styles.loadingModal}>
          <View style={[styles.loadingModalContent, { backgroundColor: themeColors.surface }]}>
            <ActivityIndicator size="large" color={themeColors.primary} />
            <Text style={[styles.loadingModalText, { color: themeColors.text }]}>
              {loadingState.message}
            </Text>
            {loadingState.progress && (
              <Text style={[styles.loadingModalProgress, { color: themeColors.textSecondary }]}>
                {loadingState.progress}
              </Text>
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
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  selectedInfo: {
    flex: 1,
    marginRight: 20,
  },
  selectedCountry: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  selectedPlan: {
    fontSize: 14,
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressRingContainer: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  progressRing: {
    transform: [{ rotateZ: '0deg' }],
  },
  progressTextContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: '700',
  },
  progressLabel: {
    fontSize: 12,
  },
  selectedStats: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 20,
  },
  statLabel: {
    fontSize: 12,
    marginVertical: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  listSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingModalContent: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    minWidth: 200,
  },
  loadingModalText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingModalProgress: {
    marginTop: 8,
    fontSize: 14,
  },
});

export default MyESimsScreen;