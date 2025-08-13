import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import esimApi from '../api/esimApi';
import { EventEmitter } from '../utils/EventEmitter';

const OrderProcessingScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState(route.params?.isTopup ? 'Processing your top-up...' : 'Processing your payment...');
  const insets = useSafeAreaInsets();
  
  const { orderReference, packageName, isTopup } = route.params;

  useEffect(() => {
    checkOrderStatus();
  }, []);

  const checkOrderStatus = async () => {
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout
    
    const checkStatus = async () => {
      try {
        const response = await esimApi.checkOrderStatus(orderReference);
        
        if (response.success && response.data) {
          if (response.data.status === 'completed') {
            // Check if order is still being processed
            if (response.data.processing) {
              // Different message based on whether it's a topup or regular order
              const processingMessage = (response.data.isTopup || isTopup) 
                ? 'Payment successful! Processing your top-up...'
                : 'Payment successful! Generating your eSIM...';
              setMessage(processingMessage);
              
              // Continue polling
              attempts++;
              if (attempts >= maxAttempts) {
                setStatus('timeout');
                const timeoutMessage = (response.data.isTopup || isTopup)
                  ? 'Top-up processing is taking longer than expected'
                  : 'eSIM generation is taking longer than expected';
                setMessage(timeoutMessage);
                
                const alertMessage = (response.data.isTopup || isTopup)
                  ? 'Your payment was successful but the top-up is still being processed. Please check My eSIMs in a few minutes.'
                  : 'Your payment was successful but the eSIM is still being generated. Please check My eSIMs in a few minutes.';
                  
                Alert.alert(
                  'Processing Delayed',
                  alertMessage,
                  [
                    {
                      text: 'OK',
                      onPress: () => navigation.navigate('My eSims')
                    }
                  ]
                );
                return true;
              }
              // Continue checking
              setTimeout(checkStatus, 1000);
              return false;
            } else {
              // Order is ready
              setStatus('success');
              const successMessage = (response.data.isTopup || isTopup) 
                ? 'Top-up completed successfully!' 
                : 'Order completed successfully!';
              setMessage(successMessage);
              
              // Update balance if available
              if (response.data.newBalance !== undefined) {
                EventEmitter.dispatch('BALANCE_UPDATED', {
                  balance: response.data.newBalance,
                  currency: response.data.currency || 'USD'
                });
              }
              
              // Check if this is a topup order
              if (response.data.isTopup || route.params?.isTopup) {
                // For topup orders, navigate to My eSims tab
                setTimeout(() => {
                  navigation.navigate('My eSims');
                }, 1500);
              } else {
                // Navigate to instructions for regular orders
                setTimeout(() => {
                  navigation.replace('Instructions', {
                    qrCodeUrl: response.data.qrCodeUrl,
                    directAppleInstallUrl: response.data.directAppleInstallUrl,
                    packageName: response.data.packageName || packageName,
                    iccid: response.data.iccid || '',
                    ac: response.data.ac || '',
                    processing: false,
                    esimId: response.data.esimId,
                    orderReference: orderReference
                  });
                }, 1500);
              }
              
              return true;
            }
          } else if (response.data.status === 'failed') {
            setStatus('failed');
            const failedMessage = (response.data.isTopup || isTopup)
              ? 'Top-up processing failed'
              : 'Order processing failed';
            setMessage(failedMessage);
            
            const alertTitle = (response.data.isTopup || isTopup)
              ? 'Top-up Failed'
              : 'Order Failed';
            const alertMessage = (response.data.isTopup || isTopup)
              ? response.data.message || 'Your top-up could not be processed. Please contact support.'
              : response.data.message || 'Your order could not be processed. Please contact support.';
              
            Alert.alert(
              alertTitle,
              alertMessage,
              [
                {
                  text: 'OK',
                  onPress: () => navigation.navigate('Shop')
                }
              ]
            );
            return true;
          }
        }
        
        // Still processing
        attempts++;
        if (attempts >= maxAttempts) {
          setStatus('timeout');
          const timeoutMessage = (isTopup)
            ? 'Top-up is taking longer than expected'
            : 'Processing is taking longer than expected';
          setMessage(timeoutMessage);
          
          const alertMessage = (isTopup)
            ? 'Your top-up is still being processed. Please check My eSIMs in a few minutes.'
            : 'Your order is still being processed. Please check My eSIMs in a few minutes.';
            
          Alert.alert(
            'Processing Timeout',
            alertMessage,
            [
              {
                text: 'OK',
                onPress: () => navigation.navigate('My eSims')
              }
            ]
          );
          return true;
        }
        
        // Check again after 1 second
        setTimeout(checkStatus, 1000);
        return false;
        
      } catch (error) {
        console.error('Error checking order status:', error);
        setStatus('error');
        const errorMessage = (isTopup)
          ? 'Error checking top-up status'
          : 'Error checking order status';
        setMessage(errorMessage);
        
        const alertMessage = (isTopup)
          ? 'Failed to check top-up status. Please check your eSIMs.'
          : 'Failed to check order status. Please check your orders.';
          
        Alert.alert(
          'Error',
          alertMessage,
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('My eSims')
            }
          ]
        );
        return true;
      }
    };
    
    checkStatus();
  };

  const getIcon = () => {
    switch (status) {
      case 'processing':
        return <ActivityIndicator size="large" color={colors.primary.DEFAULT} />;
      case 'success':
        return <Ionicons name="checkmark-circle" size={80} color="#10B981" />;
      case 'failed':
      case 'error':
        return <Ionicons name="close-circle" size={80} color="#EF4444" />;
      case 'timeout':
        return <Ionicons name="time-outline" size={80} color="#F59E0B" />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.content, { paddingTop: Math.max(insets.top, 10) }]}>
        {getIcon()}
        <Text style={styles.message}>{message}</Text>
        {status === 'processing' && (
          <Text style={styles.subMessage}>
            Please wait while we process your order...
          </Text>
        )}
        <Text style={styles.orderReference}>
          Order: {orderReference}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 20,
    textAlign: 'center',
  },
  subMessage: {
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: 10,
    textAlign: 'center',
  },
  orderReference: {
    fontSize: 14,
    color: colors.text.tertiary,
    marginTop: 20,
  },
});

export default OrderProcessingScreen;