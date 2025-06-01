import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { newApi } from '../api/api';

const RegionalPackageTypeScreen = () => {
  const [hasUnlimited, setHasUnlimited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigation = useNavigation();
  const route = useRoute();
  const { region } = route.params;

  const getSearchTerm = (region) => {
    switch (region.toLowerCase()) {
      case 'europe': return 'europe';
      case 'gulf region': return 'gulf';
      case 'asia': return 'asia';
      case 'latin america': return 'latin america';
      case 'africa': return 'africa';
      default: return region;
    }
  };

  const checkUnlimitedAvailability = useCallback(async () => {
    try {
      console.log(`[DEBUG] Checking availability for region: ${region}`);
      
      // Use the new API to fetch packages based on region
      const response = await newApi.get('/user/esims/packages', {
        params: { 
          region: region,
          type: 'regional',
          limit: 100 
        }
      }).catch(error => {
        console.error('[DEBUG] Package fetch error:', error);
        return { data: { data: { packages: [] } } };
      });

      const allPackages = response.data?.data?.packages || [];
      
      console.log(`[DEBUG] Found ${allPackages.length} packages for region ${region}`);

      // Check if any packages are unlimited
      const unlimitedExists = allPackages.some(pkg => {
        return pkg.isUnlimited === true || 
               (pkg.name && pkg.name.toLowerCase().includes('unlimited'));
      });

      console.log(`[DEBUG] Has unlimited packages: ${unlimitedExists}`);
      setHasUnlimited(unlimitedExists);
    } catch (error) {
      console.error('[DEBUG] Error checking unlimited availability:', error);
      setError('Failed to fetch package information. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [region]);

  useEffect(() => {
    if (!region) {
      console.error('[DEBUG] Region is undefined');
      setError('Region information is missing');
      setLoading(false);
      return;
    }
    checkUnlimitedAvailability();
  }, [checkUnlimitedAvailability, region]);

  const navigateToPackages = useCallback((type) => {
    navigation.navigate('RegionalPackages', { region, packageType: type });
  }, [navigation, region]);

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
        <Ionicons name="arrow-back" size={24} color="#374151" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{region}</Text>
      <View style={styles.headerIcon}>
        <Ionicons name="map-outline" size={24} color="#374151" />
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#F8F9FA', '#F3F4F6']}
          style={styles.backgroundGradient}
        />
        {renderHeader()}
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#FF6B00" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#F8F9FA', '#F3F4F6']}
          style={styles.backgroundGradient}
        />
        {renderHeader()}
        <View style={styles.content}>
          <LottieView source={require('../assets/Animation - datapacke.json')} autoPlay loop style={styles.lottieAnimation} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={checkUnlimitedAvailability}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#F8F9FA', '#F3F4F6']}
        style={styles.backgroundGradient}
      />
      {renderHeader()}
      <View style={styles.content}>
        <LottieView 
          source={require('../assets/Animation - datapacke.json')} 
          autoPlay 
          loop 
          style={styles.lottieAnimation} 
        />
        
        <TouchableOpacity
          style={styles.buttonCard}
          onPress={() => navigateToPackages('regular')}
          activeOpacity={0.7}
        >
          <View style={styles.buttonContent}>
            <View style={styles.buttonIconContainer}>
              <Ionicons name="cellular" size={24} color="#FF6B00" />
            </View>
            <View style={styles.buttonTextContainer}>
              <Text style={styles.buttonTitle}>Regular Data</Text>
              <Text style={styles.buttonSubtitle}>Choose from available packages</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </View>
        </TouchableOpacity>
        
        {hasUnlimited && (
          <TouchableOpacity
            style={[styles.buttonCard, { marginTop: 16 }]}
            onPress={() => navigateToPackages('unlimited')}
            activeOpacity={0.7}
          >
            <View style={styles.buttonContent}>
              <View style={styles.buttonIconContainer}>
                <Ionicons name="infinite" size={24} color="#FF6B00" />
              </View>
              <View style={styles.buttonTextContainer}>
                <Text style={styles.buttonTitle}>Unlimited Data</Text>
                <Text style={styles.buttonSubtitle}>No limits, maximum freedom</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
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
    padding: 16,
    backgroundColor: 'transparent',
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    borderBottomWidth: 0,
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  lottieAnimation: {
    width: 200,
    height: 200,
    marginBottom: 40,
  },
  buttonCard: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  buttonIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FF6B0010',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonTitle: {
    color: '#1F2937',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  buttonSubtitle: {
    color: '#6B7280',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  errorText: {
    color: colors.text.secondary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  retryButton: {
    backgroundColor: '#FF6B00',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    shadowColor: '#FF6B00',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
});

export default RegionalPackageTypeScreen;