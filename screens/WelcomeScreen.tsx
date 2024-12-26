import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions, 
  Linking, 
  ActivityIndicator,
  Platform,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../AppNavigator';
import { checkESIMSupport } from '../utils/esimUtils';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';

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
          <ActivityIndicator size="large" color="#FF6347" />
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
          { color: supportsEsim ? '#4CAF50' : '#FF6347' }
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
            <Ionicons name="phone-portrait-outline" size={20} color="#888888" />
            <Text style={styles.deviceInfoText}>
              Device Type: {Platform.OS === 'ios' ? 'iOS' : 'Android'}
            </Text>
          </View>
          <View style={styles.deviceInfoRow}>
            <Ionicons name="hardware-chip-outline" size={20} color="#888888" />
            <Text style={styles.deviceInfoText}>
              eSIM Support: {supportsEsim ? 'Available' : 'Not Detected'}
            </Text>
          </View>
        </View>

        {!supportsEsim && (
          <View style={styles.alternativesContainer}>
            <Text style={styles.alternativesTitle}>What you can do:</Text>
            
            <View style={styles.infoCard}>
              <Ionicons name="people-outline" size={24} color="#FF6347" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoTitle}>Family Share</Text>
                <Text style={styles.infoDescription}>
                  Get an eSIM for a family member who has a compatible device
                </Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <Ionicons name="calendar-outline" size={24} color="#FF6347" />
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
          style={[
            styles.supportedDevicesButton,
            !supportsEsim ? styles.supportedDevicesButtonFailed : styles.supportedDevicesButtonSuccess
          ]} 
          onPress={handleSupportedDevicesClick}
        >
          <Text style={styles.supportedDevicesText}>
            View Supported Devices List
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#FF6347" />
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
          { backgroundColor: supportsEsim ? '#4CAF50' : '#FF6347' }
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
    backgroundColor: '#1E1E1E',
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
  },
  skipText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 10,
    fontSize: 16,
  },
  // SUCCESS ICON SIZE - Adjust these values to change the success icon size
  animationContainer: {
    width: 300,  // Increase/decrease this value for larger/smaller success icon
    height: 300, // Increase/decrease this value for larger/smaller success icon
    marginBottom: 20,
  },
  // FAILED ICON SIZE - Adjust these values to change the failed icon size
  smallerAnimation: {
    width: 120,  // Increase/decrease this value for larger/smaller failed icon
    height: 120, // Increase/decrease this value for larger/smaller failed icon
  },
  lottieAnimation: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 20,
  },
  deviceInfoBox: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 10,
  },
  deviceInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  deviceInfoText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 12,
  },
  alternativesContainer: {
    width: '100%',
    marginTop: 20,
  },
  alternativesTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoDescription: {
    color: '#888888',
    fontSize: 14,
    lineHeight: 20,
  },
  // SUPPORTED DEVICES BUTTON - Styling for the view supported devices button
  supportedDevicesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    width: '100%',
    marginTop: 30, // Added spacing from the info cards
  },
  supportedDevicesText: {
    color: '#FF6347',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  bottomSpacer: {
    height: 100, // Ensures content doesn't overlap with bottom button
  },
  button: {
    width: width - 40,
    height: 60,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 40,
    left: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
});