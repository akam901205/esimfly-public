import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { AuthContext } from '../../api/AuthContext';
import esimApi from '../../api/esimApi';
import { formatBalance, SupportedCurrency } from '../../utils/currencyUtils';
import { newApi } from '../../api/api';
import { ModalState, AddOnPlan } from '../../types/esim.types';
import { getStatusColor } from '../../constants/esim.constants';
import { useCurrencyConversion } from '../../hooks/useCurrencyConversion';

const { width: screenWidth } = Dimensions.get('window');

interface TopUpModalProps {
  modalState: ModalState;
  onClose: () => void;
  onTopUpSelect: (plan: AddOnPlan) => void;
}

// Color mappings for easier access
const themeColors = {
  background: colors.background.primary,
  surface: colors.background.secondary,
  text: colors.text.primary,
  textSecondary: colors.text.secondary,
  primary: colors.primary.DEFAULT,
  border: colors.border.default,
  error: '#ef4444'
};

export const TopUpModal: React.FC<TopUpModalProps> = ({ modalState, onClose, onTopUpSelect }) => {
  const { userEmail } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const [topUpPlans, setTopUpPlans] = useState<AddOnPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<AddOnPlan | null>(null);
  const [plansCurrency, setPlansCurrency] = useState<'USD' | 'IQD'>('USD');

  // Helper function to format price with correct currency
  const formatPriceWithCurrency = (price: number, currency: 'USD' | 'IQD' = plansCurrency) => {
    if (currency === 'IQD') {
      return `${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} IQD`;
    }
    return `$${price.toFixed(2)}`;
  };

  useEffect(() => {
    if (modalState.isVisible && modalState.esim) {
      console.log('Modal opened, fetching plans...');
      fetchTopUpPlans();
    } else if (!modalState.isVisible) {
      console.log('Modal closed, resetting plans...');
      setTopUpPlans([]);
      setSelectedPlan(null);
      setPlansCurrency('USD');
    }
  }, [modalState.isVisible, modalState.esim]);

  const fetchTopUpPlans = async () => {
    if (!modalState.esim?.id) {
      console.log('No eSIM ID available');
      return;
    }
    
    console.log('Fetching top-up plans for eSIM ID:', modalState.esim.id);
    setLoadingPlans(true);
    try {
      // Use the new API endpoint
      const response = await newApi.get(`/myesims/${modalState.esim.id}/topup-plans`);
      
      console.log('Top-up API response:', response.data);

      if (response.data?.success && response.data?.plans) {
        // Get currency from API response
        const apiCurrency = response.data.user_info?.currency || 'USD';
        setPlansCurrency(apiCurrency);
        console.log('Plans currency:', apiCurrency);

        const transformedPlans = response.data.plans.map(plan => {
          // Data is already in GB from the API
          let dataInGB = plan.data;
          let dataFormatted = plan.data_formatted;

          // If data_formatted is not provided, create it
          if (!dataFormatted) {
            dataFormatted = `${dataInGB} GB`;
          }

          return {
            id: plan.id || plan.packageCode,
            name: plan.name,
            data: dataInGB,
            data_formatted: dataFormatted,
            duration: plan.duration || 0,
            duration_formatted: plan.duration_formatted || `${plan.duration} Days`,
            price: parseFloat(plan.price) || 0,
            packageCode: plan.packageCode || plan.id,
            region: plan.region || '',
            is_unlimited: plan.is_unlimited || false,
            amount: plan.amount || 0,
            voice: plan.voice || 0,
            text: plan.text || 0,
            flag_url: plan.flag_url || '',
            speed: plan.speed || '',
            location: plan.location || '',
            operator: plan.operator || '',
            provider: plan.provider || '',
            currency: plan.currency || apiCurrency // Add currency to each plan
          };
        });

        const filteredPlans = transformedPlans
          .filter(plan => !plan.name.includes('Single Use'))
          .sort((a, b) => {
            const aValue = a.data || 0;
            const bValue = b.data || 0;
            return aValue - bValue;
          });

        console.log('Transformed plans:', filteredPlans);
        console.log('Setting top-up plans, length:', filteredPlans.length);
        setTopUpPlans(filteredPlans);
      } else {
        console.error('Failed to fetch plans:', response.data);
        Alert.alert('Error', response.data?.error || 'Failed to load top-up plans');
      }
    } catch (error) {
      console.error('Error fetching top-up plans:', error);
      Alert.alert('Error', 'Failed to load top-up plans');
    } finally {
      setLoadingPlans(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTopUpPlans();
  };

  const renderSlider = () => {
    if (!selectedPlan) return null;

    return (
      <View style={styles.sliderContainer}>
        <View style={styles.sliderHeader}>
          <View style={styles.sliderIconContainer}>
            <Ionicons name="checkmark-circle" size={24} color="#FF6B00" />
          </View>
          <Text style={styles.sliderTitle}>
            Selected Plan
          </Text>
          <TouchableOpacity 
            onPress={() => setSelectedPlan(null)}
            style={styles.sliderCloseButton}
          >
            <Ionicons name="close" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
        <View style={styles.selectedPlanInfo}>
          <Text style={styles.selectedPlanName}>
            {selectedPlan.name}
          </Text>
          <View style={styles.planDetailsGrid}>
            <View style={styles.planDetailCard}>
              <View style={styles.planDetailIcon}>
                <Ionicons name="cube-outline" size={16} color="#6B7280" />
              </View>
              <Text style={styles.planDetailLabel}>
                Data
              </Text>
              <Text style={styles.planDetailValue}>
                {selectedPlan.is_unlimited ? 'Unlimited' : 
                  selectedPlan.data_formatted || `${selectedPlan.data} GB`}
              </Text>
            </View>
            <View style={styles.planDetailCard}>
              <View style={styles.planDetailIcon}>
                <Ionicons name="time-outline" size={16} color="#6B7280" />
              </View>
              <Text style={styles.planDetailLabel}>
                Duration
              </Text>
              <Text style={styles.planDetailValue}>
                {selectedPlan.duration_formatted || `${selectedPlan.duration} Days`}
              </Text>
            </View>
            <View style={styles.planDetailCard}>
              <View style={styles.planDetailIcon}>
                <Ionicons name="pricetag-outline" size={16} color="#6B7280" />
              </View>
              <Text style={styles.planDetailLabel}>
                Price
              </Text>
              <Text style={[styles.planDetailValue, { color: '#FF6B00' }]}>
                {formatPriceWithCurrency(
                  typeof selectedPlan.price === 'number' ? selectedPlan.price :
                  (selectedPlan.price && !isNaN(parseFloat(selectedPlan.price))) ? parseFloat(selectedPlan.price) : 0
                )}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.topUpButton}
            onPress={() => onTopUpSelect(selectedPlan)}
          >
            <Ionicons name="add-circle-outline" size={24} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.topUpButtonText}>
              Proceed with Top-Up
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderPlanCard = (plan: AddOnPlan) => {
    const isSelected = selectedPlan?.id === plan.id;
    
    return (
      <TouchableOpacity
        key={plan.id}
        style={[
          styles.planCard,
          { 
            borderColor: isSelected ? '#FF6B00' : '#E5E7EB',
            borderWidth: isSelected ? 2 : 1
          }
        ]}
        onPress={() => setSelectedPlan(plan)}
        activeOpacity={0.7}
      >
        <View style={styles.planCardContent}>
          <View style={styles.planHeader}>
            <View style={styles.planIconContainer}>
              <Ionicons name="cellular" size={24} color="#FF6B00" />
            </View>
            <View style={styles.planInfo}>
              <Text style={styles.planName}>
                {plan.name}
              </Text>
              <View style={styles.planMeta}>
                <View style={styles.planMetaItem}>
                  <Ionicons name="cube-outline" size={14} color="#6B7280" />
                  <Text style={styles.planMetaText}>
                    {plan.is_unlimited ? 'Unlimited' : plan.data_formatted || `${plan.data} GB`}
                  </Text>
                </View>
                <View style={styles.planMetaDivider} />
                <View style={styles.planMetaItem}>
                  <Ionicons name="time-outline" size={14} color="#6B7280" />
                  <Text style={styles.planMetaText}>
                    {plan.duration_formatted || `${plan.duration} Days`}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.planPriceSection}>
              <Text style={styles.priceLabel}>Price</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.planPrice}>
                  {formatPriceWithCurrency(
                    typeof plan.price === 'number' ? plan.price :
                    (plan.price && !isNaN(parseFloat(plan.price))) ? parseFloat(plan.price) : 0
                  )}
                </Text>
              </View>
            </View>
          </View>
          {isSelected && (
            <View style={styles.selectedCheckmark}>
              <Ionicons name="checkmark-circle" size={20} color="#FF6B00" />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  console.log('Render - topUpPlans:', topUpPlans.length, 'loadingPlans:', loadingPlans);

  return (
    <Modal
      visible={modalState.isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.modalContent, { backgroundColor: themeColors.background, paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>
              Top-Up Plans
            </Text>
            <TouchableOpacity 
              onPress={onClose}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
          
          {modalState.esim && (
            <View style={styles.esimInfoCard}>
              <Text style={styles.esimInfoTitle}>
                {modalState.esim.plan_name}
              </Text>
              <View style={styles.esimInfoRow}>
                <View style={styles.esimInfoItem}>
                  <Text style={styles.esimInfoLabel}>
                    Status
                  </Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: modalState.esim.status === 'active' ? '#FF6B0010' : '#F3F4F6' }
                  ]}>
                    <View 
                      style={[
                        styles.statusDot, 
                        { backgroundColor: modalState.esim.status === 'active' ? '#FF6B00' : getStatusColor(modalState.esim.status) }
                      ]} 
                    />
                    <Text style={[
                      styles.statusText,
                      { color: modalState.esim.status === 'active' ? '#FF6B00' : getStatusColor(modalState.esim.status) }
                    ]}>
                      {modalState.esim.status}
                    </Text>
                  </View>
                </View>
                <View style={styles.esimInfoItem}>
                  <Text style={styles.esimInfoLabel}>
                    Data Left
                  </Text>
                  <Text style={styles.esimInfoValue}>
                    {modalState.esim.data_left_formatted}
                  </Text>
                </View>
              </View>
            </View>
          )}

          <ScrollView 
            style={styles.plansContainer}
            contentContainerStyle={styles.plansContentContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#FF6B00"
              />
            }
          >
            {loadingPlans ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF6B00" />
                <Text style={[styles.loadingText, { color: '#6B7280' }]}>
                  Loading available plans...
                </Text>
              </View>
            ) : topUpPlans.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
                <Text style={[styles.emptyText, { color: '#6B7280' }]}>
                  No top-up plans available for this eSIM
                </Text>
              </View>
            ) : (
              <>
                {console.log('Rendering plans, count:', topUpPlans.length)}
                {topUpPlans.map(renderPlanCard)}
              </>
            )}
          </ScrollView>

          {renderSlider()}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    height: '80%',
    backgroundColor: '#F8F9FA',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  esimInfoCard: {
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
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
  esimInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  esimInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  esimInfoItem: {
    flex: 1,
  },
  esimInfoLabel: {
    fontSize: 12,
    marginBottom: 4,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  esimInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  plansContainer: {
    flex: 1,
  },
  plansContentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  planCard: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  planCardContent: {
    padding: 16,
    position: 'relative',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FF6B0010',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  planMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  planMetaDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  planMetaText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  planPriceSection: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  currencySymbol: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B00',
    marginTop: 2,
    marginRight: 1,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B00',
  },
  selectedCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    textAlign: 'center',
  },
  sliderContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 15,
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sliderIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF6B0010',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sliderTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  sliderCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedPlanInfo: {
    marginTop: 0,
  },
  selectedPlanName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  planDetailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  planDetailCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  planDetailIcon: {
    marginBottom: 8,
  },
  planDetailLabel: {
    fontSize: 11,
    marginBottom: 4,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  planDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  topUpButton: {
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#FF6B00',
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});