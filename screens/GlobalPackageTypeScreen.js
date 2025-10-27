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
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { newApi } from '../api/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


const GlobalPackageTypeScreen = () => {
  const insets = useSafeAreaInsets();
  const [hasUnlimited, setHasUnlimited] = useState(false);
  const [hasVoiceSMS, setHasVoiceSMS] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigation = useNavigation();
  const route = useRoute();
  const { globalPackageName } = route.params;


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
	
const renderHeader = () => (
  <View style={[styles.header, { paddingTop: 5 }]}>
    <TouchableOpacity 
      onPress={() => navigation.goBack()} 
      style={styles.headerIcon}
    >
      <Ionicons 
        name="arrow-back" 
        size={24} 
        color="#374151" 
      />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>{globalPackageName}</Text>
    <View style={styles.headerIcon}>
      <Ionicons 
        name="globe-outline" 
        size={24} 
        color="#374151" 
      />
    </View>
  </View>
);

  const checkPackageAvailability = useCallback(async () => {
    if (!globalPackageName) {
      console.error('[DEBUG] Package name is undefined');
      setError('Package information is missing');
      setLoading(false);
      return;
    }

    try {
      
      // Use the new API to fetch global packages
      const response = await newApi.get('/user/esims/packages', {
        params: { 
          type: 'global',
          limit: 100 
        }
      }).catch(error => {
        console.error('[DEBUG] Package fetch error:', error);
        return { data: { data: { packages: [] } } };
      });

      const allPackages = response.data?.data?.packages || [];

      let foundUnlimited = false;
      let foundVoiceSMS = false;

      allPackages.forEach(pkg => {
        if (!pkg) return;
        
        // Check for unlimited data
        if (pkg.isUnlimited === true || 
            (pkg.name && pkg.name.toLowerCase().includes('unlimited'))) {
          foundUnlimited = true;
        }

        // Check for voice and SMS capabilities
        if ((pkg.voiceMinutes !== null && pkg.voiceMinutes !== undefined && pkg.voiceMinutes > 0) || 
            (pkg.smsCount !== null && pkg.smsCount !== undefined && pkg.smsCount > 0)) {
          foundVoiceSMS = true;
        }
      });

      setHasUnlimited(foundUnlimited);
      setHasVoiceSMS(foundVoiceSMS);
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
    navigation.navigate('GlobalPackages', {
      packageType: type,
      globalPackageName: globalPackageName,
      packageId: route.params.packageId
    });
  }, [navigation, globalPackageName, route.params]);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 0) }]}>
        <LinearGradient
          colors={['#F8F9FA', '#F3F4F6']}
          style={styles.backgroundGradient}
        />
        {renderHeader()}
        <View style={[styles.content, { paddingBottom: Math.max(insets.bottom + 20, 20) }]}>
          <ActivityIndicator size="large" color="#FF6B00" />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 0) }]}>
        <LinearGradient
          colors={['#F8F9FA', '#F3F4F6']}
          style={styles.backgroundGradient}
        />
        {renderHeader()}
        <View style={[styles.content, { paddingBottom: Math.max(insets.bottom + 20, 20) }]}>
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
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 0) }]}>
      <LinearGradient
        colors={['#F8F9FA', '#F3F4F6']}
        style={styles.backgroundGradient}
      />
      {renderHeader()}
      <View style={[styles.content, { paddingBottom: Math.max(insets.bottom + 20, 20) }]}>
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
        
        {hasVoiceSMS && (
          <TouchableOpacity
            style={[styles.buttonCard, { marginTop: 16 }]}
            onPress={() => navigateToPackages('voice_sms')}
            activeOpacity={0.7}
          >
            <View style={styles.buttonContent}>
              <View style={styles.buttonIconContainer}>
                <Ionicons name="call" size={24} color="#FF6B00" />
              </View>
              <View style={styles.buttonTextContainer}>
                <Text style={styles.buttonTitle}>Data + Voice + SMS</Text>
                <Text style={styles.buttonSubtitle}>Complete connectivity package</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
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
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'transparent',
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
    paddingHorizontal: 20,
    paddingTop: 20,
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

export default GlobalPackageTypeScreen;