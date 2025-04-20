import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import LottieView from 'lottie-react-native';
import { colors } from '../theme/colors';

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

      const firstPlans = processFirstProviderPlans(firstResponse.data?.plans);
      const secondPlans = processSecondProviderPlans(secondResponse.data?.plans);
      const thirdPlans = processThirdProviderPlans(thirdResponse.data?.plans);

      console.log('[DEBUG] EsimAccess Plans Count:', firstPlans.length);
      console.log('[DEBUG] EsimGo Plans Count:', secondPlans.length);
      console.log('[DEBUG] Airalo Plans Count:', thirdPlans.length);

      allPackages = [...firstPlans, ...secondPlans, ...thirdPlans];

      console.log(`[DEBUG] Total packages before filtering: ${allPackages.length}`);

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
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{country}</Text>
          <View style={styles.headerIcon}>
            <Ionicons name="location-outline" size={24} color={colors.text.primary} />
          </View>
        </View>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={colors.stone[800]} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{country}</Text>
        <View style={styles.headerIcon}>
          <Ionicons name="location-outline" size={24} color={colors.text.primary} />
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
			style={[styles.button, styles.unlimitedButton, { marginTop: 16 }]}
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
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.headerIcon,
	borderColor: colors.border.header,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
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
  backgroundColor: colors.slate[600],
  paddingVertical: 15,
  paddingHorizontal: 30,
  borderRadius: 25,
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
});

export default PackageTypeScreen;