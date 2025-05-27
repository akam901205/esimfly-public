import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import LottieView from 'lottie-react-native';
import { colors } from '../theme/colors';
import { newApi } from '../api/api';

const API_BASE_URL = 'https://esimfly.net/pages/esimplan';

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
        <Ionicons name="arrow-back" size={24} color={colors.icon.header} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{region}</Text>
      <View style={styles.headerIcon}>
        <Ionicons name="map-outline" size={24} color={colors.icon.header} />
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.content}>
          <ActivityIndicator size="large" color={colors.text.secondary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
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
      {renderHeader()}
      <View style={styles.content}>
        <LottieView source={require('../assets/Animation - datapacke.json')} autoPlay loop style={styles.lottieAnimation} />
        <TouchableOpacity style={styles.button} onPress={() => navigateToPackages('regular')}>
          <Text style={styles.buttonText}>Regular Data</Text>
        </TouchableOpacity>
        {hasUnlimited && (
          <TouchableOpacity style={[styles.button, styles.unlimitedButton]} onPress={() => navigateToPackages('unlimited')}>
            <Text style={styles.buttonText}>Unlimited Data</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    maxWidth: '70%',
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
    marginBottom: 20,
  },
  button: {
    backgroundColor: colors.slate[600],
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginVertical: 10,
    width: '80%',
    alignItems: 'center',
    shadowColor: colors.stone[900],
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  unlimitedButton: {
    backgroundColor: colors.slate[700],
  },
  buttonText: {
    color: colors.stone[50],
    fontSize: 18,
    fontWeight: 'bold',
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
    backgroundColor: colors.slate[600],
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    shadowColor: colors.stone[900],
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  retryButtonText: {
    color: colors.stone[50],
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
});

export default RegionalPackageTypeScreen;