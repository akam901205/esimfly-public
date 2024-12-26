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

const GlobalPackageTypeScreen = () => {
  const [hasUnlimited, setHasUnlimited] = useState(false);
  const [hasVoiceSMS, setHasVoiceSMS] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigation = useNavigation();
  const route = useRoute();
  const { globalPackageName } = route.params;

  console.log('[DEBUG] GlobalPackageTypeScreen received package:', globalPackageName);

  const getSearchTerm = (packageName) => {
    // Normalize search terms to match database naming
    const normalized = packageName.toLowerCase();
    if (normalized.includes('139')) {
      return 'Global139';
    } else if (normalized.includes('138')) {
      return 'Global138';
    } else if (normalized.includes('120+')) {
      return 'Global';
    } else if (normalized.includes('discover global')) {
      return 'Global';
    } else if (normalized.includes('106')) {
      return 'Global';
    }
    return 'Global';
  };

  const parseIncompleteJSON = (jsonString) => {
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      console.log('[DEBUG] Initial parse failed, attempting to fix JSON');
      const plansMatch = jsonString.match(/"plans":\s*(\[[\s\S]*?\])(?=,\s*"pagination")/);
      if (plansMatch && plansMatch[1]) {
        try {
          const plansArray = JSON.parse(plansMatch[1]);
          return { plans: plansArray };
        } catch (e) {
          console.error('[DEBUG] Failed to parse plans array:', e);
        }
      }
      throw new Error('Unable to parse JSON response');
    }
  };

  const checkPackageAvailability = useCallback(async () => {
    if (!globalPackageName) {
      console.error('[DEBUG] Package name is undefined');
      setError('Package information is missing');
      setLoading(false);
      return;
    }

    try {
      console.log(`[DEBUG] Checking availability for package: ${globalPackageName}`);
      let response;
      let isProvider2 = false;

      const searchTerm = getSearchTerm(globalPackageName);
      console.log(`[DEBUG] Using search term: ${searchTerm}`);

      // Determine which API to use
      if (globalPackageName.toLowerCase().includes('discover global')) {
        response = await axios.get(`${API_BASE_URL}/get_plans_airalo.php`, {
          params: { search: searchTerm, limit: 100 }
        });
        console.log('[DEBUG] Fetched data from third API');
      } else if (globalPackageName.toLowerCase().includes('106')) {
        response = await axios.get(`${API_BASE_URL}/get_plans_esimgo.php`, {
          params: { search: searchTerm, limit: 100 }
        });
        isProvider2 = true;
        console.log('[DEBUG] Fetched data from second API (Provider 2)');
      } else {
        response = await axios.get(`${API_BASE_URL}/get_plans_esimaccess.php`, {
          params: { search: searchTerm, limit: 100 }
        });
        console.log('[DEBUG] Fetched data from first API');
      }

      let parsedData = typeof response.data === 'string' ? parseIncompleteJSON(response.data) : response.data;
      const allPackages = parsedData.plans || [];

      console.log(`[DEBUG] Total packages: ${allPackages.length}`);

      let foundUnlimited = false;
      let foundVoiceSMS = false;

      allPackages.forEach(pkg => {
        if (!pkg) return;
        
        // Check for unlimited data
        const isUnlimited = 
          pkg.unlimited === true || 
          (typeof pkg.data === 'string' && pkg.data.toLowerCase().includes('unlimited')) ||
          (typeof pkg.data === 'number' && pkg.data > 1000);

        if (isUnlimited) {
          foundUnlimited = true;
          console.log(`[DEBUG] Found unlimited package: ${pkg.name}`);
        }

        // Check for voice and SMS capabilities
        if (pkg.voice_minutes !== undefined || pkg.sms_count !== undefined) {
          foundVoiceSMS = true;
          console.log(`[DEBUG] Found Voice+SMS package: ${pkg.name}`);
        }
      });

      setHasUnlimited(foundUnlimited);
      setHasVoiceSMS(foundVoiceSMS);
      console.log(`[DEBUG] Has unlimited: ${foundUnlimited}, Has Voice+SMS: ${foundVoiceSMS}`);
    } catch (error) {
      console.error('[DEBUG] Error checking package availability:', error);
      setError('Failed to fetch package information. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [globalPackageName]);

  useEffect(() => {
    checkPackageAvailability();
  }, [checkPackageAvailability]);

  const navigateToPackages = useCallback((type) => {
    console.log(`[DEBUG] Navigating to ${type} packages for ${globalPackageName}`);
    navigation.navigate('GlobalPackages', {
      packageType: type,
      globalPackageName: globalPackageName,
      packageId: route.params.packageId
    });
  }, [navigation, globalPackageName, route.params]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <LottieView
          source={require('../assets/Animation - datapacke.json')}
          autoPlay
          loop
          style={styles.lottieAnimation}
        />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={checkPackageAvailability}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{globalPackageName}</Text>
        <View style={styles.headerIcon}>
          <Ionicons name="globe-outline" size={24} color="#FFFFFF" />
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
        {hasVoiceSMS && (
          <TouchableOpacity
            style={[styles.button, styles.voiceSmsButton]}
            onPress={() => navigateToPackages('voice_sms')}
          >
            <Text style={styles.buttonText}>Data + Voice + SMS</Text>
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
  voiceSmsButton: {
    backgroundColor: '#FF8C42',
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
  },
});

export default GlobalPackageTypeScreen;