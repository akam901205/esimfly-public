import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, Dimensions, 
  Linking, ActivityIndicator, Platform, ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../AppNavigator';
import { checkESIMSupport } from '../utils/esimUtils';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { colors } from '../theme/colors';

type WelcomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Welcome'>;

type Props = {
  navigation: WelcomeScreenNavigationProp;
};

const { width } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }: Props) {
  const [supportsEsim, setSupportsEsim] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    checkEsimSupport();
  }, []);

  const checkEsimSupport = async () => {
    try {
      setIsLoading(true);
      const hasEsim = await checkESIMSupport();
      setSupportsEsim(hasEsim);
    } catch (error) {
      console.error('Error checking eSIM support:', error);
      setSupportsEsim(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSupportedDevicesClick = () => {
    Linking.openURL('https://esimfly.net/pages/supported-devices.php');
  };

  const navigateToAuth = () => {
    navigation.navigate('Auth', { screen: 'Login' });
  };

  const renderDeviceSupport = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.stone[700]} />
          <Text style={styles.loadingText}>Checking eSIM compatibility...</Text>
        </View>
      );
    }

    return (
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.supportContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={[
          styles.animationContainer,
          !supportsEsim && styles.smallerAnimation
        ]}>
          <LottieView
            source={
              supportsEsim 
                ? require('../assets/animations/success.json')
                : require('../assets/animations/failed.json')
            }
            autoPlay
            loop={false}
            style={styles.lottieAnimation}
            onAnimationFinish={() => setAnimationComplete(true)}
          />
        </View>

        <Text style={[
          styles.title,
          { color: supportsEsim ? colors.stone[800] : colors.stone[700] }
        ]}>
          {supportsEsim 
            ? "Your device supports eSIM!" 
            : "Device not eSIM compatible"
          }
        </Text>

        <Text style={styles.subtitle}>
          {supportsEsim 
            ? "Great! You can use our eSIM services" 
            : "But don't worry, we have alternatives"
          }
        </Text>

        <View style={styles.deviceInfoBox}>
          <View style={styles.deviceInfoRow}>
            <Ionicons name="phone-portrait-outline" size={20} color={colors.stone[400]} />
            <Text style={styles.deviceInfoText}>
              Device Type: {Platform.OS === 'ios' ? 'iOS' : 'Android'}
            </Text>
          </View>
          <View style={styles.deviceInfoRow}>
            <Ionicons name="hardware-chip-outline" size={20} color={colors.stone[400]} />
            <Text style={styles.deviceInfoText}>
              eSIM Support: {supportsEsim ? 'Available' : 'Not Detected'}
            </Text>
          </View>
        </View>

        {!supportsEsim && (
          <View style={styles.alternativesContainer}>
            <Text style={styles.alternativesTitle}>What you can do:</Text>
            
            <View style={styles.infoCard}>
              <Ionicons name="people-outline" size={24} color={colors.stone[700]} />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoTitle}>Family Share</Text>
                <Text style={styles.infoDescription}>
                  Get an eSIM for a family member who has a compatible device
                </Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <Ionicons name="calendar-outline" size={24} color={colors.stone[700]} />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoTitle}>Future Device</Text>
                <Text style={styles.infoDescription}>
                  Consider getting an eSIM when you upgrade to a compatible device
                </Text>
              </View>
            </View>
          </View>
        )}

        <TouchableOpacity 
          style={styles.supportedDevicesButton}
          onPress={handleSupportedDevicesClick}
        >
          <Text style={styles.supportedDevicesText}>
            View Supported Devices List
          </Text>
          <Ionicons name="arrow-forward" size={20} color={colors.stone[700]} />
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.skipButton} onPress={navigateToAuth}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
      
      {renderDeviceSupport()}
      
      <TouchableOpacity 
        style={[
          styles.button,
          { 
            backgroundColor: supportsEsim ? colors.stone[800] : colors.stone[700],
            borderColor: supportsEsim ? colors.border.dark : colors.border.default,
          }
        ]}
        onPress={navigateToAuth}
      >
        <Text style={styles.buttonText}>
          {supportsEsim ? "Get Started with eSIM" : "Explore Options"}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContainer: {
    flex: 1,
    width: '100%',
  },
  supportContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  skipButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.background.secondary,
  },
  skipText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.text.secondary,
    marginTop: 10,
    fontSize: 16,
  },
  animationContainer: {
    width: 300,
    height: 300,
    marginBottom: 20,
  },
  smallerAnimation: {
    width: 120,
    height: 120,
  },
  lottieAnimation: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  deviceInfoBox: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  deviceInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  deviceInfoText: {
    color: colors.text.primary,
    fontSize: 14,
    marginLeft: 12,
  },
  alternativesContainer: {
    width: '100%',
    marginTop: 20,
  },
  alternativesTitle: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoDescription: {
    color: colors.text.secondary,
    fontSize: 14,
    lineHeight: 20,
  },
  supportedDevicesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    width: '100%',
    marginTop: 30,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  supportedDevicesText: {
    color: colors.stone[700],
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  button: {
    width: width - 40,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 40,
    left: 20,
    backgroundColor: colors.stone[800],
    borderWidth: 1,
    borderColor: colors.border.default,
    shadowColor: colors.stone[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: colors.stone[50],
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 100,
  },
});