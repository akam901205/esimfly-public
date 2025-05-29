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
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { AuthContext } from '../../api/AuthContext';
import esimApi from '../../api/esimApi';
import { newApi } from '../../api/api';
import { ModalState, AddOnPlan } from '../../types/esim.types';
import { getStatusColor } from '../../constants/esim.constants';

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
  const [topUpPlans, setTopUpPlans] = useState<AddOnPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<AddOnPlan | null>(null);

  useEffect(() => {
    if (modalState.isVisible && modalState.esim) {
      console.log('Modal opened, fetching plans...');
      fetchTopUpPlans();
    } else if (!modalState.isVisible) {
      console.log('Modal closed, resetting plans...');
      setTopUpPlans([]);
      setSelectedPlan(null);
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
            provider: plan.provider || ''
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
      <View style={[styles.sliderContainer, { backgroundColor: themeColors.surface }]}>
        <View style={styles.sliderHeader}>
          <Text style={[styles.sliderTitle, { color: themeColors.text }]}>
            Selected Plan Details
          </Text>
          <TouchableOpacity onPress={() => setSelectedPlan(null)}>
            <Ionicons name="close-circle" size={24} color={themeColors.textSecondary} />
          </TouchableOpacity>
        </View>
        <View style={styles.selectedPlanInfo}>
          <Text style={[styles.selectedPlanName, { color: themeColors.text }]}>
            {selectedPlan.name}
          </Text>
          <View style={styles.planDetailsRow}>
            <View style={styles.planDetailItem}>
              <Text style={[styles.planDetailLabel, { color: themeColors.textSecondary }]}>
                Data
              </Text>
              <Text style={[styles.planDetailValue, { color: themeColors.text }]}>
                {selectedPlan.is_unlimited ? 'Unlimited' : 
                  selectedPlan.data_formatted || `${selectedPlan.data} GB`}
              </Text>
            </View>
            <View style={styles.planDetailItem}>
              <Text style={[styles.planDetailLabel, { color: themeColors.textSecondary }]}>
                Duration
              </Text>
              <Text style={[styles.planDetailValue, { color: themeColors.text }]}>
                {selectedPlan.duration_formatted || `${selectedPlan.duration} Days`}
              </Text>
            </View>
            <View style={styles.planDetailItem}>
              <Text style={[styles.planDetailLabel, { color: themeColors.textSecondary }]}>
                Price
              </Text>
              <Text style={[styles.planDetailValue, { color: themeColors.primary }]}>
                ${typeof selectedPlan.price === 'number' ? selectedPlan.price.toFixed(2) : parseFloat(selectedPlan.price).toFixed(2)}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={[styles.topUpButton, { backgroundColor: themeColors.primary }]}
            onPress={() => onTopUpSelect(selectedPlan)}
          >
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
            backgroundColor: themeColors.surface,
            borderColor: isSelected ? themeColors.primary : themeColors.border,
            borderWidth: isSelected ? 2 : 1
          }
        ]}
        onPress={() => setSelectedPlan(plan)}
        activeOpacity={0.7}
      >
        <View style={styles.planCardContent}>
          <Text style={[styles.planName, { color: themeColors.text }]}>
            {plan.name}
          </Text>
          <View style={styles.planDetails}>
            <View style={styles.planData}>
              <Ionicons name="cellular" size={16} color={themeColors.textSecondary} />
              <Text style={[styles.planDataText, { color: themeColors.textSecondary }]}>
                {plan.is_unlimited ? 'Unlimited' : plan.data_formatted || `${plan.data} GB`}
              </Text>
            </View>
            <View style={styles.planData}>
              <Ionicons name="calendar-outline" size={16} color={themeColors.textSecondary} />
              <Text style={[styles.planDataText, { color: themeColors.textSecondary }]}>
                {plan.duration_formatted || `${plan.duration} Days`}
              </Text>
            </View>
          </View>
          <Text style={[styles.planPrice, { color: themeColors.primary }]}>
            ${typeof plan.price === 'number' ? plan.price.toFixed(2) : parseFloat(plan.price).toFixed(2)}
          </Text>
          {isSelected && (
            <View style={[styles.selectedIndicator, { backgroundColor: themeColors.primary }]} />
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
        <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>
              Top-Up Plans
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={themeColors.text} />
            </TouchableOpacity>
          </View>
          
          {modalState.esim && (
            <View style={[styles.esimInfoCard, { backgroundColor: themeColors.surface }]}>
              <Text style={[styles.esimInfoTitle, { color: themeColors.text }]}>
                {modalState.esim.plan_name}
              </Text>
              <View style={styles.esimInfoRow}>
                <View style={styles.esimInfoItem}>
                  <Text style={[styles.esimInfoLabel, { color: themeColors.textSecondary }]}>
                    Status
                  </Text>
                  <View style={styles.statusContainer}>
                    <View 
                      style={[
                        styles.statusDot, 
                        { backgroundColor: getStatusColor(modalState.esim.status) }
                      ]} 
                    />
                    <Text style={[styles.statusText, { color: themeColors.text }]}>
                      {modalState.esim.status}
                    </Text>
                  </View>
                </View>
                <View style={styles.esimInfoItem}>
                  <Text style={[styles.esimInfoLabel, { color: themeColors.textSecondary }]}>
                    Data Left
                  </Text>
                  <Text style={[styles.esimInfoValue, { color: themeColors.text }]}>
                    {modalState.esim.data_left_formatted}
                  </Text>
                </View>
              </View>
            </View>
          )}

          <ScrollView 
            style={styles.plansContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={themeColors.primary}
              />
            }
          >
            {loadingPlans ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={themeColors.primary} />
                <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
                  Loading available plans...
                </Text>
              </View>
            ) : topUpPlans.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="alert-circle-outline" size={48} color={themeColors.textSecondary} />
                <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
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
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    height: '80%',
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  esimInfoCard: {
    margin: 20,
    padding: 15,
    borderRadius: 12,
  },
  esimInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
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
  },
  esimInfoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  plansContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  planCard: {
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    position: 'relative',
  },
  planCardContent: {
    position: 'relative',
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  planDetails: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  planData: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  planDataText: {
    marginLeft: 4,
    fontSize: 13,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '700',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sliderTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  selectedPlanInfo: {
    marginTop: 10,
  },
  selectedPlanName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  planDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  planDetailItem: {
    flex: 1,
    alignItems: 'center',
  },
  planDetailLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  planDetailValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  topUpButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  topUpButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});