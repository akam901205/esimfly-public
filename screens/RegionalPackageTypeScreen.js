import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import LottieView from 'lottie-react-native';

const API_BASE_URL = 'https://esimfly.net/pages/esimplan';

const RegionalPackageTypeScreen = () => {
  const [hasUnlimited, setHasUnlimited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigation = useNavigation();
  const route = useRoute();
  const { region } = route.params;

  console.log('[DEBUG] RegionalPackageTypeScreen received region:', region);

  useEffect(() => {
    if (!region) {
      console.error('[DEBUG] Region is undefined');
      setError('Region information is missing');
      setLoading(false);
      return;
    }
    checkUnlimitedAvailability();
  }, [region]);

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
      let allPackages = [];

      // Handle Middle East and Africa region specially
      if (region === 'Middle East and Africa') {
        const [meResponse, africaResponse] = await Promise.all([
          Promise.all([
            axios.get(`${API_BASE_URL}/get_plans_esimaccess.php`, { 
              params: { search: 'middle east', limit: 50 } 
            }).catch(() => ({ data: { plans: [] } })),
            axios.get(`${API_BASE_URL}/get_plans_esimgo.php`, { 
              params: { search: 'middle east', limit: 50 } 
            }).catch(() => ({ data: { plans: [] } })),
            axios.get(`${API_BASE_URL}/get_plans_airalo.php`, { 
              params: { search: 'middle east', limit: 50 } 
            }).catch(() => ({ data: { plans: [] } }))
          ]),
          Promise.all([
            axios.get(`${API_BASE_URL}/get_plans_esimaccess.php`, { 
              params: { search: 'africa', limit: 50 } 
            }).catch(() => ({ data: { plans: [] } })),
            axios.get(`${API_BASE_URL}/get_plans_esimgo.php`, { 
              params: { search: 'africa', limit: 50 } 
            }).catch(() => ({ data: { plans: [] } })),
            axios.get(`${API_BASE_URL}/get_plans_airalo.php`, { 
              params: { search: 'africa', limit: 50 } 
            }).catch(() => ({ data: { plans: [] } }))
          ])
        ]);

        // Combine all responses
        meResponse.forEach(response => {
          if (response.data?.plans) {
            allPackages = [...allPackages, ...response.data.plans];
          }
        });
        
        africaResponse.forEach(response => {
          if (response.data?.plans) {
            allPackages = [...allPackages, ...response.data.plans];
          }
        });
      } else {
        // Original code for other regions
        const searchTerm = getSearchTerm(region);
        console.log(`[DEBUG] Using search term: ${searchTerm}`);
        
        const [firstResponse, secondResponse, thirdResponse] = await Promise.all([
          axios.get(`${API_BASE_URL}/get_plans_esimaccess.php`, { 
            params: { search: searchTerm, limit: 50 } 
          }).catch(() => ({ data: { plans: [] } })),
          axios.get(`${API_BASE_URL}/get_plans_esimgo.php`, { 
            params: { search: searchTerm, limit: 50 } 
          }).catch(() => ({ data: { plans: [] } })),
          axios.get(`${API_BASE_URL}/get_plans_airalo.php`, { 
            params: { search: searchTerm, limit: 50 } 
          }).catch(() => ({ data: { plans: [] } }))
        ]);
        
        allPackages = [
          ...(firstResponse.data?.plans || []),
          ...(secondResponse.data?.plans || []),
          ...(thirdResponse.data?.plans || [])
        ];
      }

      console.log(`[DEBUG] Total packages before filtering: ${allPackages.length}`);

      // Filter packages
      const filteredPackages = allPackages.filter(pkg => {
        if (!pkg) return false;
        const pkgName = (pkg.name || '').toLowerCase();
        const pkgRegion = (pkg.region || '').toLowerCase();
        
        if (region === 'Middle East and Africa') {
          return pkgName.includes('middle east') || 
                 pkgName.includes('africa') ||
                 pkgRegion.includes('middle east') || 
                 pkgRegion.includes('africa') ||
                 pkgName.includes('mena');
        }

        switch (region.toLowerCase()) {
          case 'europe':
            return pkgRegion === 'europe' || pkgName.includes('europe');
          case 'asia':
            return pkgRegion === 'asia' || pkgName.includes('asia');
          case 'latin america':
            return pkgRegion === 'latin america' || 
                   pkgName.includes('latin america') ||
                   pkgRegion.includes('latam') || 
                   pkgName.includes('latam');
          case 'africa':
            return (pkgRegion.includes('africa') || pkgName.includes('africa')) &&
                   !['Central African Republic', 'South Africa'].some(country => 
                     pkgName.toLowerCase().includes(country.toLowerCase())
                   );
          default:
            return pkgRegion === region.toLowerCase() || 
                   pkgName.includes(region.toLowerCase());
        }
      });

      console.log(`[DEBUG] Total packages after filtering: ${filteredPackages.length}`);

      const unlimitedExists = filteredPackages.some(pkg => {
        if (!pkg) return false;
        const dataValue = pkg.data ? pkg.data.toString().toLowerCase() : '';
        return dataValue.includes('unlimited') || 
               dataValue === '0' || 
               parseFloat(dataValue) > 1000;
      });

      setHasUnlimited(unlimitedExists);
      console.log(`[DEBUG] Has unlimited: ${unlimitedExists}`);
    } catch (error) {
      console.error('[DEBUG] Error checking unlimited availability:', error);
      setError('Failed to fetch package information. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [region]);

  const navigateToPackages = useCallback((type) => {
    console.log(`[DEBUG] Navigating to ${type} packages for ${region}`);
    navigation.navigate('RegionalPackages', { region, packageType: type });
  }, [navigation, region]);

   if (loading) {
   return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.headerIcon}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{region}</Text>
        <View style={styles.headerIcon}>
          <Ionicons name="map-outline" size={24} color="#FFFFFF" />
        </View>
      </View>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{region}</Text>
          <View style={styles.headerIcon}>
            <Ionicons name="map-outline" size={24} color="#FFFFFF" />
          </View>
        </View>
        <View style={styles.content}>
          <LottieView
            source={require('../assets/Animation - datapacke.json')}
            autoPlay
            loop
            style={styles.lottieAnimation}
          />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={checkUnlimitedAvailability}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{region}</Text>
        <View style={styles.headerIcon}>
          <Ionicons name="map-outline" size={24} color="#FFFFFF" />
        </View>
      </View>

      <View style={styles.content}>
        <LottieView
          source={require('../assets/Animation - datapacke.json')}
          autoPlay
          loop
          style={styles.lottieAnimation}
        />
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigateToPackages('regular')}
        >
          <Text style={styles.buttonText}>Regular Data</Text>
        </TouchableOpacity>
        {hasUnlimited && (
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigateToPackages('unlimited')}
          >
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
    backgroundColor: '#1E1E1E',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
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
    backgroundColor: '#FF6B6B',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginVertical: 10,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Quicksand',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Quicksand',
  },
  retryButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Quicksand',
    fontWeight: 'bold',
  },
});

export default RegionalPackageTypeScreen;