import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import esimApi from '../api/esimApi';
import { Ionicons } from '@expo/vector-icons';

const AddOnPlansScreen = ({ route }) => {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [currentPackage, setCurrentPackage] = useState(null);
  const [orderingPlan, setOrderingPlan] = useState(false);
  const navigation = useNavigation();
  const { iccid } = route.params;

  const loadAddOnPlans = useCallback(async () => {
    try {
      setLoading(true);
      const response = await esimApi.fetchAddOnPlans(iccid);
      
      if (response.success && response.data) {
        setPlans(response.data.plans || []);
        setCurrentPackage(response.data.currentPackage);
      } else {
        Alert.alert('Error', response.message || 'Failed to load add-on plans');
      }
    } catch (error) {
      console.error('Error loading add-on plans:', error);
      Alert.alert('Error', 'Failed to load add-on plans');
    } finally {
      setLoading(false);
    }
  }, [iccid]);

  const handleOrderPlan = useCallback(async (plan) => {
    try {
      setOrderingPlan(true);
      
      const response = await esimApi.orderAddOnPlan({
        iccid,
        packageCode: plan.packageCode,
        packageName: plan.name,
        price: parseFloat(plan.price)
      });

      if (response.success) {
        Alert.alert('Success', 'Add-on plan ordered successfully');
        await loadAddOnPlans(); // Refresh plans
      } else {
        if (response.data?.needToLoad) {
          Alert.alert(
            'Insufficient Balance',
            `You need to add $${response.data.needToLoad} to your balance to purchase this plan.`,
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Add Funds',
                onPress: () => navigation.navigate('Profile', { screen: 'Deposit' })
              }
            ]
          );
        } else {
          Alert.alert('Error', response.message || 'Failed to order add-on plan');
        }
      }
    } catch (error) {
      console.error('Error ordering add-on plan:', error);
      Alert.alert('Error', 'Failed to order add-on plan');
    } finally {
      setOrderingPlan(false);
    }
  }, [iccid, navigation, loadAddOnPlans]);

  useEffect(() => {
    loadAddOnPlans();
  }, [loadAddOnPlans]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-900">
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-900">
      {/* Current Package */}
      {currentPackage && (
        <View className="p-4 m-4 bg-gray-800 rounded-lg">
          <Text className="text-lg font-bold text-white mb-2">Current Package</Text>
          <Text className="text-white">{currentPackage.name}</Text>
          <Text className="text-gray-400">
            {currentPackage.data}GB • {currentPackage.duration} {currentPackage.durationUnit}
          </Text>
        </View>
      )}

      {/* Available Plans */}
      <Text className="text-lg font-bold text-white px-4 mt-4 mb-2">
        Available Add-on Plans
      </Text>
      
      <View className="flex-1 px-4">
        {plans.map((plan) => (
          <TouchableOpacity
            key={plan.id}
            className="flex-row items-center justify-between p-4 mb-4 bg-gray-800 rounded-lg"
            onPress={() => {
              Alert.alert(
                'Confirm Purchase',
                `Do you want to purchase the ${plan.name} add-on plan for $${plan.price}?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Purchase', onPress: () => handleOrderPlan(plan) }
                ]
              );
            }}
            disabled={orderingPlan}
          >
            <View className="flex-1">
              <Text className="text-lg font-semibold text-white">{plan.name}</Text>
              <Text className="text-gray-400">
                {plan.data}GB • {plan.duration} {plan.durationUnit}
              </Text>
              {plan.region !== 'Global' && (
                <Text className="text-gray-400">{plan.region}</Text>
              )}
            </View>
            <View className="flex-row items-center">
              <Text className="text-lg font-bold text-white mr-2">
                ${plan.price}
              </Text>
              <Ionicons name="chevron-forward" size={24} color="#888" />
            </View>
          </TouchableOpacity>
        ))}

        {plans.length === 0 && (
          <Text className="text-center text-gray-400 mt-4">
            No add-on plans available at this time
          </Text>
        )}
      </View>
    </View>
  );
};

export default AddOnPlansScreen;