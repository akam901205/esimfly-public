import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Dimensions,
  ActivityIndicator,
  Linking,
  Vibration,
  ToastAndroid,
  Share,
  Image
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import esimApi from '../api/esimApi';

const TAB_BAR_HEIGHT = 84;
const WINDOW_HEIGHT = Dimensions.get('window').height;

const DirectStep = ({ number, text, color = "#FF6B00" }) => (
  <View style={styles.directStepContainer}>
    <Text style={[styles.directStepNumber, { color }]}>{number}.</Text>
    <Text style={styles.directStepText}>{text}</Text>
  </View>
);

const Step = ({ number, text }) => (
  <View style={styles.stepContainer}>
    <Text style={styles.stepNumber}>{number}.</Text>
    <Text style={styles.stepText}>{text}</Text>
  </View>
);


const QRCodeDisplay = ({ esimDetails, params }) => {
  const [isLoading, setIsLoading] = useState(true);

  const getQRCodeUrl = () => {
    const isAiralo = esimDetails?.order_reference?.startsWith('AIR_') || 
                    esimDetails?.transaction_id?.startsWith('AIR_');
    
    return isAiralo ? 
      esimDetails?.qr_code_url || params?.qrCodeUrl :
      esimDetails?.short_url || params?.qrCodeUrl;
  };

  const qrCodeUrl = getQRCodeUrl();

  return (
    <View style={styles.qrOuterContainer}>
      <View style={styles.qrInnerContainer}>
        <Image
          source={{ uri: qrCodeUrl }}
          style={styles.qrImage}
          resizeMode="contain"
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          onError={(error) => {
            console.error('QR Code loading error:', error);
            setIsLoading(false);
            Alert.alert('Error', 'Failed to load QR code image');
          }}
        />
        {isLoading && (
          <ActivityIndicator 
            size="large" 
            color="#FF6B00" 
            style={styles.loader}
          />
        )}
      </View>
    </View>
  );
};



interface RouteParams {
  qrCodeUrl?: string;
  directAppleInstallUrl?: string;
  packageName?: string;
  isProcessing?: boolean;
  esimId?: number;
  orderReference?: string;
  ac?: string;
  iccid?: string;
}

const InstructionsScreen = () => {
  const [activeTab, setActiveTab] = useState('QR Code');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [esimDetails, setEsimDetails] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  
  const params = route.params as RouteParams;

  useEffect(() => {
  const initializeScreen = async () => {
    setLoading(true);
    try {
      if (params.iccid) {
        // Fetching from My eSIMs
        const response = await esimApi.fetchEsimDetails(params.iccid);
        if (response.success && response.data) {
          const details = response.data;
          setEsimDetails({
            ...details,
            short_url: details.short_url,
            apple_installation_url: details.apple_installation_url,
            package_name: details.package_name,
            ac: details.ac,
            iccid: details.iccid,
            status: details.status
          });
        } else {
          setError(response.message || 'Failed to fetch eSIM details');
        }
      } else {
        // Coming from checkout flow
        const activationInfo = parseActivationCode(params.ac, params.directAppleInstallUrl);
        setEsimDetails({
          short_url: params.qrCodeUrl,
          apple_installation_url: params.directAppleInstallUrl,
          package_name: params.packageName,
          ac: params.ac || 
              (params.directAppleInstallUrl && 
               `LPA:1$${activationInfo.smdpAddress}$${activationInfo.activationCode}`),
          status: params.isProcessing ? 'Processing' : 'Active'
        });
      }
    } catch (err) {
      console.error('Error in InstructionsScreen:', err);
      setError('An error occurred while loading eSIM details');
    } finally {
      setLoading(false);
    }
  };

  initializeScreen();
}, [params]);

  const handleShare = async () => {
  try {
    let shareContent = '';
    const isAiralo = esimDetails?.package_code?.includes('airalo') || 
                     esimDetails?.short_url?.includes('esims.cloud');

    switch (activeTab) {
      case 'QR Code':
        if (esimDetails?.short_url) {
          if (isAiralo && esimDetails?.sharing_access_code) {
            shareContent = `Here's your eSIM QR Code link: ${esimDetails.short_url}\nAccess Code: ${esimDetails.sharing_access_code}`;
          } else {
            shareContent = `Here's your eSIM QR Code link: ${esimDetails.short_url}`;
          }
        }
        break;

      case 'Direct':
        if (esimDetails?.apple_installation_url) {
          if (isAiralo && esimDetails?.sharing_access_code) {
            shareContent = `Here's your eSIM direct installation link: ${esimDetails.apple_installation_url}\nAccess Code: ${esimDetails.sharing_access_code}`;
          } else {
            shareContent = `Here's your eSIM direct installation link: ${esimDetails.apple_installation_url}`;
          }
        }
        break;

      case 'Manual':
        if (esimDetails?.ac) {
          if (isAiralo && esimDetails?.sharing_access_code) {
            shareContent = `Here's your eSIM activation code: ${esimDetails.ac}\nAccess Code: ${esimDetails.sharing_access_code}`;
          } else {
            shareContent = `Here's your eSIM activation code: ${esimDetails.ac}`;
          }
        }
        break;
    }

    if (!shareContent) {
      Alert.alert('Error', 'No content available to share');
      return;
    }

    await Share.share({
      message: shareContent
    });

  } catch (error) {
    Alert.alert(
      'Error',
      'An error occurred while sharing. Please try again.'
    );
    console.error('Error sharing:', error);
  }
};

  const parseActivationFromUrl = (url?: string) => {
    if (!url) return null;
    
    // Extract carddata from Apple installation URL
    const match = url.match(/carddata=([^&]+)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
    return null;
  };

const parseActivationCode = (ac?: string, appleUrl?: string) => {
  console.log('Parsing activation code:', { ac, appleUrl });
  
  // First try to parse from direct AC
  if (ac) {
    const parts = ac.split('$');
    if (parts.length === 3) {
      return {
        smdpAddress: parts[1],
        activationCode: parts[2]
      };
    }
  }

  // If no direct AC, try to parse from Apple URL
  if (appleUrl) {
    const cardDataMatch = appleUrl.match(/carddata=([^&]+)/);
    if (cardDataMatch) {
      const cardData = decodeURIComponent(cardDataMatch[1]);
      const parts = cardData.split('$');
      if (parts.length === 3) {
        return {
          smdpAddress: parts[1],
          activationCode: parts[2]
        };
      }
    }
  }

  return {
    smdpAddress: '',
    activationCode: ''
  };
};

const handleCopy = async (text: string) => {
  try {
    // Using Expo's Clipboard API
    await Clipboard.setStringAsync(text);
    Vibration.vibrate(100);
    
    if (Platform.OS === 'android') {
      ToastAndroid.show('Copied to clipboard', ToastAndroid.SHORT);
    } else {
      Alert.alert(
        'Copied!',
        'Successfully copied to clipboard',
        [{ text: 'OK', style: 'default' }],
        { cancelable: true }
      );
    }
  } catch (error) {
    console.error('Failed to copy:', error);
    Alert.alert('Error', 'Failed to copy to clipboard');
  }
};

 const renderQRCodeTab = () => (
    <ScrollView 
      style={styles.tabContent}
      contentContainerStyle={[
        styles.scrollContentContainer,
        { paddingBottom: TAB_BAR_HEIGHT + insets.bottom }
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.warningContainer}>
        <Ionicons name="warning" size={24} color="#FFB800" />
        <Text style={styles.warningText}>
          Most eSIMs can only be installed once.{'\n'}
          If you remove the eSIM from your device, you cannot install it again.
        </Text>
      </View>

      <View style={styles.qrWrapper}>
        <View style={styles.qrContainer}>
          <QRCodeDisplay esimDetails={esimDetails} params={params} />
        </View>
      </View>

      <Text style={styles.instruction}>
        Scan the QR code by printing out or displaying{'\n'}
        the code on another device to install your eSIM.
      </Text>

      <View style={styles.stepsContainer}>
        <Step 
          number={1} 
          text='Go to the Settings, tap "Connections", then tap "SIM card manager" on your device.'
        />
        <Step 
          number={2} 
          text='Tap "Add mobile plan", then tap "Scan carrier QR code".'
        />
        <Step 
          number={3} 
          text='Scan the QR code available on the eSimfly SIM app, then tap "Confirm".'
        />
      </View>
    </ScrollView>
  );

  const renderDirectTab = () => {
    const isAndroid = Platform.OS === 'android';
    const canDirectInstall = !isAndroid && esimDetails?.apple_installation_url;
  
    const handleInstall = async () => {
      if (!isAndroid && esimDetails?.apple_installation_url) {
        try {
          const supported = await Linking.canOpenURL(esimDetails.apple_installation_url);
          if (supported) {
            await Linking.openURL(esimDetails.apple_installation_url);
          } else {
            Alert.alert(
              'Error',
              'Unable to open installation URL. Please use the QR code method instead.'
            );
          }
        } catch (error) {
          console.error('Error opening URL:', error);
          Alert.alert(
            'Error',
            'Failed to open installation URL. Please use the QR code method instead.'
          );
        }
      }
    };

    return (
      <ScrollView 
        style={styles.tabContent}
        contentContainerStyle={[
          styles.scrollContentContainer,
          { paddingBottom: TAB_BAR_HEIGHT + insets.bottom }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {esimDetails?.status === 'Active' && (
          <View style={styles.successBanner}>
            <View style={styles.successIconContainer}>
              <Ionicons name="shield-checkmark" size={24} color="#fff" />
            </View>
            <Text style={styles.successText}>
              Your eSIM is now installed and ready for use. Enjoy!
            </Text>
          </View>
        )}

        {canDirectInstall ? (
          <View style={styles.directInstallContainer}>
            <Text style={styles.stepTitle}>Direct Installation</Text>
            <View style={styles.warningBox}>
              <Text style={styles.warningBoxText}>
                You can install this eSIM directly on your iOS device. Make sure you have a stable internet connection before proceeding.
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.installButton}
              onPress={handleInstall}
            >
              <View style={styles.installButtonContent}>
                <Ionicons name="download-outline" size={20} color="#FFFFFF" />
                <Text style={styles.installButtonText}>Install eSIM Now</Text>
              </View>
            </TouchableOpacity>

            <View style={[styles.directStepsContainer, { marginTop: 32 }]}>
              <DirectStep
                number={1}
                text='Tap "Install eSIM" above and follow the on-screen instructions.'
                color="#FF6B00"
              />
              <DirectStep
                number={2}
                text='Choose a label for your new sim plan.'
                color="#FF6B00"
              />
              <DirectStep
                number={3}
                text='Choose "Primary" for your default line, then tap "Continue".'
                color="#FF6B00"
              />
              <DirectStep
                number={4}
                text='Choose the "Primary" you want to use with iMessage and FaceTime for your Apple ID, then tap "Continue".'
                color="#FF6B00"
              />
              <DirectStep
                number={5}
                text='Choose your new sim plan for cellular/mobile data, then tap "Continue".'
                color="#FF6B00"
              />
            </View>
          </View>
        ) : isAndroid ? (
          <View style={styles.directInstallContainer}>
            <Text style={styles.stepTitle}>Android Installation</Text>
            <View style={styles.warningBox}>
              <Text style={styles.warningBoxText}>
                Note that the eSIM installation process must not be interrupted and make sure your device has a stable internet connection before installing.
              </Text>
            </View>

            <View style={styles.directStepsContainer}>
              <DirectStep
                number={1}
                text='Open your device "Settings", tap "Network & Internet" or "Connections".'
                color="#FF6B00"
              />
              <DirectStep
                number={2}
                text='Tap "SIM cards" or "SIM card manager", then tap "Add eSIM" or "+" icon.'
                color="#FF6B00"
              />
              <DirectStep
                number={3}
                text='Choose "Download a new eSIM" or "Add using QR code".'
                color="#FF6B00"
              />
              <DirectStep
                number={4}
                text='Scan the QR code from the QR Code tab.'
                color="#FF6B00"
              />
              <DirectStep
                number={5}
                text='Follow the on-screen instructions to complete the setup.'
                color="#FF6B00"
              />
            </View>
          </View>
        ) : (
          <View style={styles.directInstallContainer}>
            <Text style={styles.stepTitle}>iOS Installation</Text>
            <View style={styles.warningBox}>
              <Text style={styles.warningBoxText}>
                Direct installation is not available for this eSIM. Please use the QR code method instead.
              </Text>
            </View>

            <View style={styles.directStepsContainer}>
              <DirectStep
                number={1}
                text='Go to the QR Code tab to scan the installation code.'
                color="#FF6B00"
              />
              <DirectStep
                number={2}
                text='Follow the iOS setup instructions after scanning.'
                color="#FF6B00"
              />
            </View>
          </View>
        )}
      </ScrollView>
    );
  };
	
   const renderManualTab = () => {
  // Get activation details from all possible sources
  const activationData = parseActivationCode(
    esimDetails?.ac,
    esimDetails?.apple_installation_url || params.directAppleInstallUrl
  );

  // Generate LPA format
  const lpaFormat = activationData.smdpAddress && activationData.activationCode 
    ? `LPA:1$${activationData.smdpAddress}$${activationData.activationCode}`
    : null;

  return (
    <ScrollView 
      style={styles.tabContent}
      contentContainerStyle={[
        styles.scrollContentContainer,
        { paddingBottom: TAB_BAR_HEIGHT + insets.bottom }
      ]}
      showsVerticalScrollIndicator={false}
    >
      {isProcessing && renderStatusBanner()}
      
      <Text style={styles.stepTitle}>Step 01</Text>
      
      <View style={styles.warningBox}>
        <Text style={styles.warningBoxText}>
          Copy any of these formats to manually install your eSIM. Some devices may require a specific format.
          Make sure your device has a stable internet connection before installing.
        </Text>
      </View>

      <View style={styles.activationDetailsContainer}>
        {/* SM-DP+ Address Section */}
        <View style={styles.activationSection}>
          <Text style={styles.activationLabel}>SM-DP+ Address</Text>
          <View style={styles.activationCodeContainer}>
            <Text style={styles.activationCode}>
              {activationData.smdpAddress || 'Not available'}
            </Text>
            <TouchableOpacity 
              style={[
                styles.copyButtonContainer,
                !activationData.smdpAddress && styles.copyButtonDisabled
              ]}
              onPress={() => handleCopy(activationData.smdpAddress)}
              disabled={!activationData.smdpAddress}
            >
              <Ionicons 
                name="copy" 
                size={24} 
                color={activationData.smdpAddress ? "#FF6B00" : "#666666"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Activation Code Section */}
        <View style={styles.activationSection}>
          <Text style={styles.activationLabel}>Activation Code</Text>
          <View style={styles.activationCodeContainer}>
            <Text style={styles.activationCode}>
              {activationData.activationCode || 'Not available'}
            </Text>
            <TouchableOpacity 
              style={[
                styles.copyButtonContainer,
                !activationData.activationCode && styles.copyButtonDisabled
              ]}
              onPress={() => handleCopy(activationData.activationCode)}
              disabled={!activationData.activationCode}
            >
              <Ionicons 
                name="copy" 
                size={24} 
                color={activationData.activationCode ? "#FF6B00" : "#666666"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* LPA Format Section */}
        <View style={styles.activationSection}>
          <Text style={styles.activationLabel}>LPA Format</Text>
          <View style={styles.activationCodeContainer}>
            <Text style={styles.activationCode}>
              {lpaFormat || 'Not available'}
            </Text>
            <TouchableOpacity 
              style={[
                styles.copyButtonContainer,
                !lpaFormat && styles.copyButtonDisabled
              ]}
              onPress={() => handleCopy(lpaFormat)}
              disabled={!lpaFormat}
            >
              <Ionicons 
                name="copy" 
                size={24} 
                color={lpaFormat ? "#FF6B00" : "#666666"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.manualStepsContainer}>
        <DirectStep
          number={1}
          text='Go to "Settings", tap "Connections", then tap "SIM card manager" on your device.'
          color="#FF6B00"
        />
        <DirectStep
          number={2}
          text='Tap "Add mobile plan", then tap "Enter it manually".'
          color="#FF6B00"
        />
        <DirectStep
          number={3}
          text='Depending on your device, enter either the separate SM-DP+ Address & Activation Code, or use the combined LPA Format.'
          color="#FF6B00"
        />
        <DirectStep
          number={4}
          text='Tap "Connect" or "Verify", then tap "Confirm" to complete the installation.'
          color="#FF6B00"
        />
      </View>

        <Text style={styles.stepTitle}>Step 02</Text>

        <View style={styles.networkSettingsContainer}>
          <View style={styles.networkRow}>
            <View style={styles.networkItem}>
              <Text style={styles.networkLabel}>Network</Text>
              <View style={styles.networkValue}>
                <Text style={styles.networkText}>5G/4G</Text>
              </View>
            </View>
            <View style={styles.networkDivider} />
            <View style={styles.networkItem}>
              <Text style={styles.networkLabel}>APN</Text>
              <View style={styles.networkValue}>
                <Text style={styles.networkText}>wbdata</Text>
              </View>
            </View>
            <View style={styles.networkDivider} />
            <View style={styles.networkItem}>
              <Text style={styles.networkLabel}>Data Roaming</Text>
              <View style={styles.networkValue}>
                <Text style={styles.networkText}>On</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.manualStepsContainer}>
          <DirectStep
            number={1}
            text='Go to "SIM card manager", then turn on your eSIM by enabling the toggle, then tap "OK" on your device.'
            color="#FF6B00"
          />
        </View>
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loadingText}>Loading eSIM details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.content, { height: WINDOW_HEIGHT - insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Instructions</Text>
          <TouchableOpacity onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.tabBar}>
          {['QR Code', 'Direct', 'Manual'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && styles.activeTab
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText
              ]}>
                {tab}
              </Text>
              {activeTab === tab && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'QR Code' && renderQRCodeTab()}
        {activeTab === 'Direct' && renderDirectTab()}
        {activeTab === 'Manual' && renderManualTab()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#121212',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#121212',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    position: 'relative',
  },
  activeTab: {
    borderBottomColor: '#FF6B00',
  },
  tabText: {
    color: '#666666',
    fontSize: 14,
  },
  activeTabText: {
    color: '#FF6B00',
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 2,
    backgroundColor: '#FF6B00',
  },
  tabContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 16,
  },
  warningContainer: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
    gap: 12,
  },
  warningText: {
    color: '#FFFFFF',
    flex: 1,
    lineHeight: 20,
  },
qrWrapper: {
    padding: 24,
    backgroundColor: '#121212',
    borderRadius: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  qrContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  instruction: {
    color: '#999999',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  stepsContainer: {
    gap: 16,
  },
  stepContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  stepNumber: {
    color: '#FF6B00',
    fontWeight: '600',
  },
  stepText: {
    color: '#FFFFFF',
    flex: 1,
  },
  comingSoonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    color: '#FF6B00',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  directInstallContainer: {
    flex: 1,
  },
  stepTitle: {
    color: '#FF6B00',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  warningBox: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  warningBoxText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  directStepsContainer: {
    marginBottom: 32,
  },
  directStepContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  directStepNumber: {
    width: 20,
    fontSize: 14,
    fontWeight: '600',
  },
  directStepText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  successBanner: {
    backgroundColor: '#00875A',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  successIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  successText: {
    color: '#FFFFFF',
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
   installButton: {
    backgroundColor: '#FF6B00',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,        // Adjust space above button
    marginBottom: 32,    // Adjust space below button (increased from 24 to 32)
  },
  installButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  installButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  manualContainer: {
    padding: 16,
  },
  manualTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    padding: 16,
    borderRadius: 12,
  },
  copyButton: {
    padding: 8,
  },
activationDetailsContainer: {
    marginBottom: 24,
    gap: 16,
  },
  activationSection: {
    gap: 8,
  },
  activationLabel: {
    color: '#666666',
    fontSize: 14,
    fontFamily: 'Quicksand',
  },
  activationCodeContainer: {
    backgroundColor: '#121212',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  activationCode: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  copyButtonContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualStepsContainer: {
    marginBottom: 32,
  },
  networkSettingsContainer: {
    backgroundColor: '#121212',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  networkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  networkItem: {
    flex: 1,
    alignItems: 'center',
  },
  networkDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#333333',
    marginHorizontal: 8,
  },
  networkLabel: {
    color: '#666666',
    fontSize: 12,
    marginBottom: 8,
  },
  networkValue: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  networkText: {
    color: '#FFFFFF',
    fontSize: 12,
  },	
processingBanner: {
    backgroundColor: '#FF6B00',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    margin: 16,
    borderRadius: 8,
  },
  processingIconContainer: {
    marginRight: 12,
  },
  processingText: {
    color: '#FFFFFF',
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
    qrInnerContainer: {
      width: 200,
      height: 200,
      backgroundColor: '#FFFFFF',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 12,
      padding: 8, // Add padding around the QR code
    },
    qrImage: {
      width: '100%',
      height: '100%',
      backgroundColor: '#FFFFFF',
    },
    loader: {
      position: 'absolute',
    },
	
qrImageContainer: {
      width: 200,
      height: 200,
      backgroundColor: '#FFFFFF',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 12,
    },
    qrWrapper: {
      padding: 24,
      backgroundColor: '#121212',
      borderRadius: 16,
      marginBottom: 24,
      alignItems: 'center',
    },
    qrContainer: {
      overflow: 'hidden',
      borderRadius: 12,
    },
});

export default InstructionsScreen;