import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Platform } from 'react-native';
import LottieView from 'lottie-react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const NoESimState = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          Platform.OS === 'ios' && styles.scrollContentIOS
        ]}
        showsVerticalScrollIndicator={false}
      >
        <LottieView
          source={require('../assets/animations/simcard.json')}
          autoPlay
          loop
          style={styles.animation}
        />
        <Text style={styles.title}>No eSIMs Found</Text>
        <Text style={styles.description}>
          Looks like you haven't purchased any eSIMs yet. Get started with our global coverage and stay connected wherever you go.
        </Text>
        
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <View style={styles.featureIconContainer}>
              <Ionicons name="globe-outline" size={24} color="#FF6B00" />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Global Coverage</Text>
              <Text style={styles.featureDescription}>Connect in 190+ countries</Text>
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
          style={styles.button}
          onPress={() => navigation.navigate('Shop')}
        >
          <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Purchase eSIM</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: Platform.OS === 'android' ? 24 : 34,
  },
  scrollContentIOS: {
    paddingBottom: 34,
  },
  animation: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  featuresContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderRadius: 12,
    padding: 16,
    gap: 16,
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
    color: '#FFFFFF',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666666',
  },
  bottomContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'android' ? 84 : 44, // Default for Android
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: '#222222',
  },
  bottomContainerIOS: {
    paddingBottom: 59, // iOS specific padding
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B00',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default NoESimState;