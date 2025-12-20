import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, StatusBar } from 'react-native';
import LottieView from 'lottie-react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

const NoESimState = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F8F9FA', '#FFFFFF']}
        style={styles.gradient}
      />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.animationContainer}>
          <LottieView
            source={require('../assets/animations/simcard.json')}
            autoPlay
            loop
            style={styles.animation}
          />
        </View>
        
        <Text style={styles.title}>No eSIMs Found</Text>
        <Text style={styles.description}>
          Start your journey with global connectivity. Purchase your first eSIM and stay connected in 200+ countries.
        </Text>
        
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <View style={styles.featureIconContainer}>
              <Ionicons name="globe-outline" size={24} color="#FF6B00" />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Global Coverage</Text>
              <Text style={styles.featureDescription}>Connect in 200+ countries</Text>
            </View>
          </View>
          
          <View style={styles.featureItem}>
            <View style={styles.featureIconContainer}>
              <Ionicons name="flash-outline" size={24} color="#FF6B00" />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Instant Activation</Text>
              <Text style={styles.featureDescription}>Get connected in minutes</Text>
            </View>
          </View>
          
          <View style={styles.featureItem}>
            <View style={styles.featureIconContainer}>
              <Ionicons name="wallet-outline" size={24} color="#FF6B00" />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Flexible Plans</Text>
              <Text style={styles.featureDescription}>Pay only for what you need</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[
        styles.bottomContainer,
        Platform.OS === 'ios' && styles.bottomContainerIOS
      ]}>
        <TouchableOpacity
          style={styles.buttonWrapper}
          onPress={() => navigation.navigate('Shop')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#FF8C42', '#FF6B00']}
            style={styles.button}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>Browse eSIM Packages</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: Platform.OS === 'android' ? 24 : 34,
  },
  animationContainer: {
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 24,
  },
  animation: {
    width: 200,
    height: 200,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
    }),
  },
  description: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 0,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
    }),
  },
  featuresContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
    }),
  },
  featureDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
    }),
  },
  bottomContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'android' ? 24 : 16,
    backgroundColor: colors.background.primary,
  },
  bottomContainerIOS: {
    paddingBottom: 24,
  },
  buttonWrapper: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
    }),
  },
});

export default NoESimState;