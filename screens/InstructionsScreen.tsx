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
import { colors } from '../theme/colors';


interface QRCodeDisplayProps {
  esimDetails: any;
  params?: {
    qrCodeUrl?: string;
  };
}


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
    <Text style={[styles.stepNumber, { color: '#FF6B00' }]}>{number}.</Text>
    <Text style={styles.stepText}>{text}</Text>
  </View>
);


const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ esimDetails, params }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getQRCodeUrl = () => {
    // Check if coming from checkout flow
    if (params?.qrCodeUrl) {
      return params.qrCodeUrl;
    }

    // For provider 1 (qrsim.net URLs), use qr_code_url directly
    if (esimDetails?.qr_code_url?.includes('qrsim.net')) {
      return esimDetails.qr_code_url;
    }

    // Detect Airalo provider
    const isAiralo = esimDetails?.order_reference?.startsWith('AIR_') || 
                     esimDetails?.transaction_id?.startsWith('AIR_') ||
                     esimDetails?.qr_code_url?.includes('airalo.com');

    if (isAiralo) {
      return esimDetails?.qr_code_url;
    }

    // For other cases, try different URL fields in order of preference
    return esimDetails?.qr_code_url || 
           esimDetails?.formatted_short_url || 
           esimDetails?.short_url;
  };

  const handleError = (error: any) => {
    console.error('QR Code loading error:', {
      error,
      url: getQRCodeUrl(),
      provider: esimDetails?.qr_code_url?.includes('qrsim.net') ? 'Provider1' : 'Other'
    });
    setError('Failed to load QR code image');
    setIsLoading(false);
  };

  const qrCodeUrl = getQRCodeUrl();

  // Reset error state when URL changes
  useEffect(() => {
    setError(null);
    setIsLoading(true);
  }, [qrCodeUrl]);

  if (!qrCodeUrl) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>QR code URL not available</Text>
      </View>
    );
  }

  return (
    <View style={styles.qrOuterContainer}>
      <View style={styles.qrInnerContainer}>
        <Image
          source={{ 
            uri: qrCodeUrl,
            // Add cache busting for provider 1 URLs
            cache: qrCodeUrl.includes('qrsim.net') ? 'reload' : 'default'
          }}
          style={styles.qrImage}
          resizeMode="contain"
          onLoadStart={() => {
            setIsLoading(true);
            setError(null);
          }}
          onLoadEnd={() => setIsLoading(false)}
          onError={handleError}
        />
        {isLoading && (
          <ActivityIndicator 
            size="large" 
            color="#FF6B00" 
            style={styles.loader}
          />
        )}
        {error && (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
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
      if (params.iccid || params.esimId) {
        // Fetching from My eSIMs
        // Use esimId if available, otherwise fall back to iccid
        const identifier = params.esimId ? params.esimId.toString() : params.iccid;
        const response = await esimApi.fetchEsimDetails(identifier);
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
			color={activationData.smdpAddress ? "#4CAF50" : "#666666"}
		  />
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
			color={activationData.smdpAddress ? "#4CAF50" : "#666666"}
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
                color={activationData.activationCode ? "#4CAF50" : "#666666"}
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
                color={lpaFormat ? "#4CAF50" : "#666666"}
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
  <Text style={styles.title}>Instructions</Text>
  <TouchableOpacity 
    onPress={handleShare}
    style={styles.headerIcon}
  >
    <Ionicons 
      name="share-outline" 
      size={24} 
      color="#374151"
    />
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
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    fontFamily: 'Quicksand-Bold',
    flex: 1,
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    backgroundColor: colors.background.primary,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderBottomWidth: 2,
    borderBottomColor: colors.border.light,
    gap: 8,
  },
  activeTab: {
    borderBottomColor: '#333',
  },
  tabText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  activeTabText: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  activeIndicator: {
    display: 'none',
  },
  tabContent: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContentContainer: {
    padding: 16,
  },
  warningContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  warningText: {
    color: colors.text.primary,
    flex: 1,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  qrWrapper: {
    padding: 24,
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  qrOuterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrInnerContainer: {
    width: 200,
    height: 200,
    backgroundColor: colors.stone[50],
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    padding: 8,
  },
  qrImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.stone[50],
  },
  qrContainer: {
    overflow: 'hidden',
    borderRadius: 12,
  },
  instruction: {
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
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
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  stepText: {
    color: colors.text.primary,
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  directInstallContainer: {
    flex: 1,
  },
  stepTitle: {
    color: '#FF6B00',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  warningBox: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  warningBoxText: {
    color: colors.text.primary,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
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
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  directStepText: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  installButton: {
    backgroundColor: '#4CAF50', // Using the green color
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 32,
  },
  installButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  installButtonText: {
    color: colors.stone[50],
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  activationDetailsContainer: {
    marginBottom: 24,
    gap: 16,
  },
  activationSection: {
    gap: 8,
  },
  activationLabel: {
    color: colors.text.secondary,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  activationCodeContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  activationCode: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  copyButtonContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.1)', // Light green background
    justifyContent: 'center',
    alignItems: 'center',
  },
  copyButtonDisabled: {
    opacity: 0.5,
  },
  networkSettingsContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border.light,
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
    backgroundColor: colors.border.light,
    marginHorizontal: 8,
  },
  networkLabel: {
    color: colors.text.secondary,
    fontSize: 12,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  networkValue: {
    backgroundColor: colors.background.tertiary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  networkText: {
    color: colors.text.primary,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  successBanner: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  successIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${colors.primary.DEFAULT}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  successText: {
    color: colors.text.primary,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  loadingText: {
    color: colors.text.primary,
    marginTop: 16,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background.primary,
  },
  errorText: {
    color: colors.text.primary,
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  loader: {
    position: 'absolute',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: `${colors.background.primary}E6`,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  retryButton: {
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: colors.stone[50],
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
});

export default InstructionsScreen;