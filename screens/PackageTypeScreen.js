import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { newApi } from '../api/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PackageTypeScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { country } = route.params;
  const [hasUnlimited, setHasUnlimited] = useState(false);
  const [hasVoiceSms, setHasVoiceSms] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPackageAvailability();
  }, []);

  const checkPackageAvailability = async () => {
    try {
      
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


      const allPackages = response.data?.data?.packages || [];



      // Packages are already filtered by country from the API, so we just need to check for unlimited
      const filteredPackages = allPackages;


      const unlimitedExists = filteredPackages.some(pkg => {
        const isUnlimited = pkg.isUnlimited === true ||
          (pkg.name && pkg.name.toLowerCase().includes('unlimited'));

        return isUnlimited;
      });

      setHasUnlimited(unlimitedExists);
      
      // Check for voice/SMS packages
      const voiceSmsExists = filteredPackages.some(pkg => {
        const hasVoiceOrSms = (pkg.voiceMinutes && pkg.voiceMinutes > 0) ||
                              (pkg.smsCount && pkg.smsCount > 0);

        return hasVoiceOrSms;
      });
      
      setHasVoiceSms(voiceSmsExists);
      
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
      <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 0) }]}>
        <View style={[styles.header, { paddingTop: 5 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{country}</Text>
          <View style={styles.headerIcon}>
            <Ionicons name="location-outline" size={24} color="#374151" />
          </View>
        </View>
        <View style={[styles.content, { paddingBottom: Math.max(insets.bottom + 20, 20) }]}>
          <ActivityIndicator size="large" color="#FF6B00" />
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
      <View style={[styles.header, { paddingTop: 5 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{country}</Text>
        <View style={styles.headerIcon}>
          <Ionicons name="location-outline" size={24} color="#374151" />
        </View>
      </View>

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
        
        {hasVoiceSms && (
          <TouchableOpacity
            style={[styles.buttonCard, { marginTop: 16 }]}
            onPress={() => navigateToPackages('voice')}
            activeOpacity={0.7}
          >
            <View style={styles.buttonContent}>
              <View style={styles.buttonIconContainer}>
                <Ionicons name="call" size={24} color="#FF6B00" />
              </View>
              <View style={styles.buttonTextContainer}>
                <Text style={styles.buttonTitle}>Voice & SMS</Text>
                <Text style={styles.buttonSubtitle}>Plans with calling and texting</Text>
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
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
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
});

export default PackageTypeScreen;