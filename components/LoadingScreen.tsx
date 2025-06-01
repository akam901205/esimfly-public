import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';

const LoadingScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.primary} />
      <LinearGradient
        colors={[colors.background.primary, colors.background.secondary]}
        style={styles.gradient}
      />
      
      <View style={styles.content}>
        {/* Logo Container */}
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>ESIMFLY</Text>
          </View>
        </View>

        {/* Loading Indicator */}
        <ActivityIndicator size="large" color="#4F46E5" style={styles.loader} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 40,
  },
  logo: {
    backgroundColor: '#ffffff',
    width: 200,
    height: 200,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#4F46E5',
    fontFamily: 'Quicksand-Bold',
  },
  logoSubtext: {
    fontSize: 20,
    fontWeight: '600',
    color: '#7C3AED',
    fontFamily: 'Quicksand-SemiBold',
    marginTop: -6,
  },
  loader: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    color: colors.text.secondary,
    fontFamily: 'Quicksand-Regular',
  },
});

export default LoadingScreen;