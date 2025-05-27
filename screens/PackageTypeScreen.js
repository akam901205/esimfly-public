import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import LottieView from 'lottie-react-native';
import { colors } from '../theme/colors';
import { newApi } from '../api/api';

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
      
      // Fetch packages from the new API
      const response = await newApi.get('/user/esims/packages', {
        params: { 
          country: country,
          type: 'country',
          limit: 100 
        }
      }).catch(error => {
        console.error('[DEBUG] Package fetch error:', error);
        return { data: { data: { packages: [] } } };
      });

      console.log('[DEBUG] API Response:', response.data);

      const allPackages = response.data?.data?.packages || [];

      console.log('[DEBUG] Total packages received:', allPackages.length);

      console.log(`[DEBUG] Total packages before filtering: ${allPackages.length}`);

      // Packages are already filtered by country from the API, so we just need to check for unlimited
      const filteredPackages = allPackages;
      
      console.log('[DEBUG] Sample packages:', allPackages.slice(0, 3).map(pkg => ({
        name: pkg.name,
        isUnlimited: pkg.isUnlimited,
        provider: pkg.provider,
        data: pkg.data
      })));

      console.log(`[DEBUG] Filtered packages: ${filteredPackages.length}`);

      const unlimitedExists = filteredPackages.some(pkg => {
        const isUnlimited = pkg.isUnlimited === true ||
          (pkg.name && pkg.name.toLowerCase().includes('unlimited'));

        if (isUnlimited) {
          console.log('[DEBUG] Found unlimited package:', {
            name: pkg.name,
            provider: pkg.provider,
            isUnlimited: pkg.isUnlimited
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