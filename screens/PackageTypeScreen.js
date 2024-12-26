import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import LottieView from 'lottie-react-native';

const API_BASE_URL = 'https://esimfly.net/pages/esimplan';

const PackageTypeScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { country } = route.params;
  const [hasUnlimited, setHasUnlimited] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUnlimitedAvailability();
  }, []);

const checkUnlimitedAvailability = async () => {
  try {
    console.log(`[DEBUG] Checking plans for country: ${country}`);
    let allPackages = [];

    // Fetch all packages from different providers
    const [firstResponse, secondResponse, thirdResponse] = await Promise.all([
      axios.get(`${API_BASE_URL}/get_plans_esimaccess.php`, { 
        params: { search: country, limit: 100 } 
      }).catch(() => ({ data: { plans: [] } })),
      axios.get(`${API_BASE_URL}/get_plans_esimgo.php`, { 
        params: { search: country, limit: 100 } 
      }).catch(() => ({ data: { plans: [] } })),
      axios.get(`${API_BASE_URL}/get_plans_airalo.php`, { 
        params: { search: country, limit: 100 } 
      }).catch(() => ({ data: { plans: [] } }))
    ]);

    // Debug log for esimgo response
    console.log('[DEBUG] EsimGo Raw Response:', secondResponse.data);

    const processFirstProviderPlans = (plans) => {
      return (plans || []).map(plan => ({
        ...plan,
        provider: 'esimaccess',
        unlimited: plan.unlimited || false
      }));
    };

    const processSecondProviderPlans = (plans) => {
      return (plans || []).map(plan => {
        // Debug log for each esimgo plan
        console.log('[DEBUG] Processing EsimGo Plan:', plan);
        
        return {
          ...plan,
          provider: 'esimgo',
          name: plan.name || '',
          region: plan.region || '',
          unlimited: plan.is_unlimited === 1 || plan.is_unlimited === true,
          is_unlimited: plan.is_unlimited
        };
      });
    };

    const processThirdProviderPlans = (plans) => {
      return (plans || []).map(plan => ({
        ...plan,
        provider: 'airalo',
        unlimited: plan.unlimited || false
      }));
    };

    // Process and combine all plans
    const firstPlans = processFirstProviderPlans(firstResponse.data?.plans);
    const secondPlans = processSecondProviderPlans(secondResponse.data?.plans);
    const thirdPlans = processThirdProviderPlans(thirdResponse.data?.plans);

    // Debug log for processed plans from each provider
    console.log('[DEBUG] EsimAccess Plans Count:', firstPlans.length);
    console.log('[DEBUG] EsimGo Plans Count:', secondPlans.length);
    console.log('[DEBUG] Airalo Plans Count:', thirdPlans.length);

    allPackages = [...firstPlans, ...secondPlans, ...thirdPlans];

    console.log(`[DEBUG] Total packages before filtering: ${allPackages.length}`);

    // Filter packages
    const filteredPackages = allPackages.filter(pkg => {
      if (!pkg) return false;
      const searchCountry = country.toLowerCase();
      const pkgRegion = (pkg.region || '').toLowerCase();
      const pkgName = (pkg.name || '').toLowerCase();

      const matches = pkgRegion.includes(searchCountry) || 
                     pkgName.includes(searchCountry);
      
      if (matches) {
        console.log('[DEBUG] Matched package:', {
          name: pkg.name,
          region: pkg.region,
          unlimited: pkg.unlimited,
          is_unlimited: pkg.is_unlimited,
          provider: pkg.provider
        });
      }
      
      return matches;
    });

    console.log(`[DEBUG] Filtered packages: ${filteredPackages.length}`);

    // Check for unlimited packages
    const unlimitedExists = filteredPackages.some(pkg => {
      const isUnlimited = 
        pkg.unlimited || 
        pkg.is_unlimited === 1 || 
        pkg.is_unlimited === true ||
        (pkg.name && pkg.name.toLowerCase().includes('unlimited'));

      if (isUnlimited) {
        console.log('[DEBUG] Found unlimited package:', {
          name: pkg.name,
          provider: pkg.provider,
          unlimited: pkg.unlimited,
          is_unlimited: pkg.is_unlimited
        });
      }

      return isUnlimited;
    });

    console.log(`[DEBUG] Has unlimited packages: ${unlimitedExists}`);
    setHasUnlimited(unlimitedExists);
    setLoading(false);

  } catch (error) {
    console.error('[DEBUG] Error checking unlimited availability:', error);
    setLoading(false);
  }
};

  const navigateToPackages = (type) => {
    navigation.navigate('CountryPackages', { country, packageType: type });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{country}</Text>
          <View style={styles.headerIcon}>
            <Ionicons name="location-outline" size={24} color="#FFFFFF" />
          </View>
        </View>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#FF6B6B" />
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
        <Text style={styles.headerTitle}>{country}</Text>
        <View style={styles.headerIcon}>
          <Ionicons name="location-outline" size={24} color="#FFFFFF" />
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
    fontSize: 24,
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
});

export default PackageTypeScreen;