import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
 
  FlatList, 
  TouchableOpacity, 
  Modal, 
  ScrollView,
  Platform,
  Animated,
  Dimensions,
  StatusBar,
  TextInput
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';

const { width, height } = Dimensions.get('window');

const guides = [
  {
    id: '1',
    title: 'How to activate your eSIM',
    description: 'Step-by-step activation guide',
    color: '#4F46E5',
    content: [
      {
        subtitle: 'Before you begin',
        steps: [
          'Check if your device is eSIM compatible',
          'Ensure you have a stable WiFi connection',
          'Download our eSIM app',
          'Purchase an appropriate package for your needs',
          'Keep your activation email ready'
        ]
      },
      {
        subtitle: 'Activation steps',
        steps: [
          'Open your Settings app',
          'Navigate to Mobile Data/Cellular',
          'Tap "Add eSIM" or "Add Cellular Plan"',
          'Choose "Use QR Code" or enter the activation code manually',
          'Follow the on-screen instructions to complete setup',
          'Label your eSIM (e.g., "Travel eSIM" or "Data Plan")'
        ]
      },
      {
        subtitle: 'Post-activation checks',
        steps: [
          'Verify mobile data is working by opening a website',
          'For Global+ plans: Test making a call to verify voice service',
          'Save your eSIM details and activation code securely',
          'Configure your default line for calls and data'
        ]
      }
    ]
  },
  {
    id: '2',
    title: 'Understanding our packages',
    description: 'Features and selection tips',
    color: '#10B981',
    content: [
      {
        subtitle: 'Unlimited Package Features',
        steps: [
          'True unlimited data with no speed caps',
          'Available for multiple regions',
          'No contract required',
          'Valid for 30 days from activation',
          'Easy renewal process',
          'Multiple device support'
        ]
      },
      {
        subtitle: 'Global+ Package Features',
        steps: [
          'Unlimited data across supported regions',
          'Voice calling capability',
          'SMS functionality',
          'Dedicated phone number',
          'International calling support',
          'Premium customer support'
        ]
      },
      {
        subtitle: 'Package Selection Tips',
        steps: [
          'Consider your travel duration',
          'Check coverage in your destination',
          'Assess your need for voice/SMS',
          'Review data usage requirements',
          'Compare regional vs global coverage'
        ]
      }
    ]
  },
  {
    id: '3',
    title: 'Troubleshooting guide',
    description: 'Fix common issues',
    color: '#F59E0B',
    content: [
      {
        subtitle: 'Connection issues',
        steps: [
          'Toggle Airplane mode on/off',
          'Ensure eSIM is properly activated',
          'Check if data roaming is enabled',
          'Verify APN settings are correct',
          'Try manual carrier selection'
        ]
      },
      {
        subtitle: 'Global+ specific issues',
        steps: [
          'Check if voice/SMS services are activated',
          'Verify international calling is enabled',
          'Ensure proper phone number configuration',
          'Test emergency calling functionality'
        ]
      },
      {
        subtitle: 'When to contact support',
        steps: [
          'Activation failures',
          'Persistent connection issues',
          'Billing queries',
          'Package changes or upgrades',
          'Coverage verification'
        ]
      }
    ]
  },
  {
    id: '4',
    title: 'Device compatibility',
    description: 'Supported devices & settings',
    color: '#8B5CF6',
    content: [
      {
        subtitle: 'Compatible devices',
        steps: [
          'iPhone XS or newer',
          'Samsung Galaxy S20 or newer',
          'Google Pixel 3 or newer',
          'iPad Pro (2018) or newer',
          'Other eSIM capable devices'
        ]
      },
      {
        subtitle: 'Device-specific settings',
        steps: [
          'iPhone: Settings > Cellular > Add eSIM',
          'Samsung: Settings > Connections > SIM Manager',
          'Google Pixel: Settings > Network & Internet > SIMs',
          'Enable dual SIM functionality if needed'
        ]
      }
    ]
  },
  {
    id: '5',
    title: 'Travel tips',
    description: 'Before and during your trip',
    color: '#06B6D4',
    content: [
      {
        subtitle: 'Before your trip',
        steps: [
          'Activate and test eSIM before departure',
          'Download offline maps',
          'Save emergency contact numbers',
          'Configure auto-renewal if needed',
          'Document support contact information'
        ]
      },
      {
        subtitle: 'During travel',
        steps: [
          'Monitor data usage in settings',
          'Keep WiFi as backup option',
          'Use airplane mode to conserve battery',
          'Know how to switch between SIMs',
          'Save local emergency numbers'
        ]
      }
    ]
  },
  {
    id: '6',
    title: 'Data management',
    description: 'Monitor and save data',
    color: '#EF4444',
    content: [
      {
        subtitle: 'Monitoring usage',
        steps: [
          'Check data usage in phone settings',
          'Monitor through our eSIM app',
          'Set data usage alerts',
          'Track high-consumption apps',
          'Understanding data reset dates'
        ]
      },
      {
        subtitle: 'Data saving tips',
        steps: [
          'Use offline maps and content',
          'Disable auto-updates over cellular',
          'Compress photos and videos',
          'Use data saver mode',
          'Configure app background data'
        ]
      }
    ]
  },
  {
    id: '7',
    title: 'Security guidelines',
    description: 'Keep your eSIM secure',
    color: '#059669',
    content: [
      {
        subtitle: 'eSIM security',
        steps: [
          'Keep activation codes private',
          'Use device PIN protection',
          'Enable find my device feature',
          'Regular security updates',
          'Backup eSIM details securely'
        ]
      },
      {
        subtitle: 'Privacy settings',
        steps: [
          'Configure location services',
          'Review app permissions',
          'Set up VPN if needed',
          'Manage sharing settings',
          'Enable encryption features'
        ]
      }
    ]
  },
 {
    id: '8',
    title: 'Understanding eSIM Technology',
    description: 'How electronic SIMs work',
    color: '#7C3AED',
    content: [
      {
        subtitle: 'What is eSIM?',
        steps: [
          'Electronic SIM card embedded in your device',
          'Can store multiple carrier profiles',
          'No physical SIM card needed',
          'Instantly activate new plans',
          'Environmentally friendly solution'
        ]
      },
      {
        subtitle: 'Technical Benefits',
        steps: [
          'Switch carriers without changing physical SIMs',
          'Store up to 8-10 eSIM profiles (device dependent)',
          'Use dual SIM functionality (physical + eSIM)',
          'Remote activation capability',
          'Enhanced security through encryption'
        ]
      },
      {
        subtitle: 'How eSIM Works',
        steps: [
          'Embedded secure element in device chipset',
          'Digital profiles downloaded over internet',
          'Carrier profiles stored securely',
          'Automatic network registration',
          'Profile management through device settings'
        ]
      }
    ]
  },
  {
    id: '9',
    title: 'Enhanced Security Guide',
    description: 'Advanced protection tips',
    color: '#DC2626',
    content: [
      {
        subtitle: 'eSIM Security Features',
        steps: [
          'End-to-end encryption for profile download',
          'Secure element protection',
          'Remote profile management',
          'Anti-cloning protection',
          'Secure authentication protocols'
        ]
      },
      {
        subtitle: 'Privacy Protection',
        steps: [
          'Control app permissions strictly',
          'Use secure WiFi for initial activation',
          'Enable two-factor authentication',
          'Regular security updates installation',
          'Monitor connected devices'
        ]
      },
      {
        subtitle: 'Data Protection',
        steps: [
          'Enable device encryption',
          'Use strong PIN/password protection',
          'Regular backup of eSIM details',
          'Secure storage of activation codes',
          'Privacy-focused app settings'
        ]
      },
      {
        subtitle: 'Travel Security',
        steps: [
          'Use VPN in public networks',
          'Enable find my device feature',
          'Backup important documents',
          'Set up emergency contacts',
          'Document IMEI and eSIM details'
        ]
      }
    ]
  },
  {
    id: '10',
    title: 'Package Details',
    description: 'All about our offerings',
    color: '#0891B2',
    content: [
      {
        subtitle: 'Unlimited Package',
        steps: [
          'Truly unlimited data with no caps',
          'High-speed 4G/5G where available',
          'No throttling after usage threshold',
          'Valid for 30 days from activation',
          'Available in 100+ countries',
          'Multiple device compatibility'
        ]
      },
      {
        subtitle: 'Global+ Features',
        steps: [
          'Unlimited data across regions',
          'Local phone number included',
          'Unlimited incoming calls',
          'Outgoing call credits included',
          'SMS capability worldwide',
          'Premium support access'
        ]
      },
      {
        subtitle: 'Regional Offerings',
        steps: [
          'Europe-specific packages',
          'Asia-Pacific coverage',
          'Americas regional plans',
          'Middle East packages',
          'Africa coverage options',
          'Cross-regional compatibility'
        ]
      }
    ]
  },
  {
    id: '11',
    title: 'Frequently Asked Questions',
    description: 'Common queries answered',
    color: '#EA580C',
    content: [
      {
        subtitle: 'General Questions',
        steps: [
          'Q: Can I use eSIM and physical SIM together?\nA: Yes, most eSIM devices support dual SIM functionality',
          'Q: How long does activation take?\nA: Usually within 5-10 minutes with good internet connection',
          'Q: Can I share my eSIM?\nA: No, eSIM profiles are device-specific and cannot be shared',
          'Q: What happens if I change phones?\nA: You\'ll need to reactivate your eSIM on the new device',
          'Q: Does eSIM work offline?\nA: Once activated, yes, but initial setup requires internet'
        ]
      },
      {
        subtitle: 'Package Questions',
        steps: [
          'Q: Can I extend my package?\nA: Yes, through the app before expiration',
          'Q: How do I check remaining data?\nA: Through device settings or our app',
          'Q: Can I switch packages?\nA: Yes, after current package expires',
          'Q: Is 5G included?\nA: Yes, where available in supported regions',
          'Q: What happens when package expires?\nA: Service stops until renewal'
        ]
      },
      {
        subtitle: 'Technical Questions',
        steps: [
          'Q: Why won\'t my eSIM activate?\nA: Check device compatibility and internet connection',
          'Q: How many eSIMs can I have?\nA: Depends on device, typically 8-10 profiles',
          'Q: Will eSIM work if phone is reset?\nA: Yes, but may need reactivation',
          'Q: Can I backup my eSIM?\nA: Save activation codes, but profiles can\'t be backed up',
          'Q: Does eSIM drain battery?\nA: No more than a physical SIM'
        ]
      }
    ]
  },
  {
    id: '12',
    title: 'Coverage & Network',
    description: 'Network information',
    color: '#6366F1',
    content: [
      {
        subtitle: 'Network Technology',
        steps: [
          'Automatic network selection',
          'Support for 4G/LTE networks',
          '5G capability where available',
          'Seamless network switching',
          'Multiple carrier partnerships'
        ]
      },
      {
        subtitle: 'Coverage Areas',
        steps: [
          'Major cities and urban areas',
          'Rural coverage availability',
          'Airport and transport hubs',
          'Tourist destinations',
          'International roaming zones'
        ]
      },
      {
        subtitle: 'Speed Information',
        steps: [
          'Average 4G speeds: 20-100 Mbps',
          '5G speeds where available',
          'Factors affecting speed',
          'Peak hours impact',
          'Location-based variations'
        ]
      }
    ]
  },
  {
    id: '13',
    title: 'Usage Tips & Best Practices',
    description: 'Get the most from your eSIM',
    color: '#16A34A',
    content: [
      {
        subtitle: 'Daily Usage',
        steps: [
          'Monitor data consumption regularly',
          'Use WiFi when available',
          'Configure auto-network selection',
          'Keep device software updated',
          'Manage app background data'
        ]
      },
      {
        subtitle: 'Troubleshooting Tips',
        steps: [
          'Regular network settings reset',
          'Clear cache periodically',
          'Update carrier settings',
          'Monitor signal strength',
          'Battery optimization settings'
        ]
      },
      {
        subtitle: 'Power User Tips',
        steps: [
          'Configure APN settings manually if needed',
          'Use data compression in browsers',
          'Set up usage alerts',
          'Schedule auto-updates wisely',
          'Monitor app data usage patterns'
        ]
      }
    ]
  }
];

interface GuideContent {
  subtitle: string;
  steps: string[];
}

interface Guide {
  id: string;
  title: string;
  description: string;
  color: string;
  content: GuideContent[];
}

const GuidesScreen = () => {
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const insets = useSafeAreaInsets();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const searchFocusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (modalVisible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [modalVisible]);

  const getIconName = (id: string) => {
    const icons: { [key: string]: keyof typeof Ionicons.glyphMap } = {
      '1': 'phone-portrait-outline',
      '2': 'cube-outline',
      '3': 'build-outline',
      '4': 'hardware-chip-outline',
      '5': 'airplane-outline',
      '6': 'analytics-outline',
      '7': 'shield-checkmark-outline',
      '8': 'flash-outline',
      '9': 'lock-closed-outline',
      '10': 'pricetags-outline',
      '11': 'help-circle-outline',
      '12': 'globe-outline',
      '13': 'bulb-outline'
    };
    return icons[id] || 'document-text-outline';
  };

  const filteredGuides = guides.filter(guide => 
    guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    guide.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderGuideItem = ({ item, index }: { item: Guide; index: number }) => {
    return (
      <TouchableOpacity 
        style={styles.guideItem}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelectedGuide(item);
          setModalVisible(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.guideGradient}>
          <View style={styles.iconContainer}>
            <Ionicons name={getIconName(item.id)} size={26} color={item.color} />
          </View>
          <View style={styles.guideContent}>
            <Text style={styles.guideTitle}>{item.title}</Text>
            <Text style={styles.guideDescription}>{item.description}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
        </View>
      </TouchableOpacity>
    );
  };

  const handleSearchFocus = () => {
    Animated.timing(searchFocusAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleSearchBlur = () => {
    Animated.timing(searchFocusAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 0) }]}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={[colors.background.primary, colors.background.secondary]}
        style={styles.backgroundGradient}
      />

      <Animated.View style={[styles.header, { opacity: fadeAnim, paddingTop: 5 }]}>
        <Text style={styles.title}>eSIM Guide</Text>
        <Text style={styles.subtitle}>Everything you need to know</Text>
        
        <Animated.View 
          style={[
            styles.searchContainer,
            {
              borderColor: searchFocusAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['#E5E7EB', '#4F46E5'],
              }),
            }
          ]}
        >
          <Ionicons name="search" size={20} color={colors.text.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search guides..."
            placeholderTextColor={colors.text.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          )}
        </Animated.View>
      </Animated.View>

      <FlatList
        data={filteredGuides}
        renderItem={renderGuideItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={48} color={colors.text.secondary} />
            <Text style={styles.emptyText}>No guides found</Text>
            <Text style={styles.emptySubtext}>Try a different search term</Text>
          </View>
        }
      />

      <Modal
        animationType="none"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackground}
            activeOpacity={1}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setModalVisible(false);
            }}
          />
          
          <Animated.View 
            style={[
              styles.modalContainer,
              {
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim }
                ]
              }
            ]}
          >
            <View style={styles.modalHandle} />
            
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconContainer, { borderColor: selectedGuide?.color, borderWidth: 1 }]}>
                <Ionicons 
                  name={getIconName(selectedGuide?.id || '')} 
                  size={28} 
                  color={selectedGuide?.color} 
                />
              </View>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle}>{selectedGuide?.title}</Text>
                <Text style={styles.modalSubtitle}>{selectedGuide?.description}</Text>
              </View>
              <TouchableOpacity 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setModalVisible(false);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalContent}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
              bounces={true}
            >
              {selectedGuide?.content.map((section, index) => (
                <View key={index} style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={[styles.sectionNumber, { backgroundColor: selectedGuide?.color + '20' }]}>
                      <Text style={[styles.sectionNumberText, { color: selectedGuide?.color }]}>
                        {index + 1}
                      </Text>
                    </View>
                    <Text style={styles.sectionTitle}>{section.subtitle}</Text>
                  </View>
                  
                  {section.steps.map((step, stepIndex) => (
                    <View key={stepIndex} style={styles.stepContainer}>
                      <View style={[styles.stepDot, { backgroundColor: selectedGuide?.color + '40' }]} />
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                </View>
              ))}
              <View style={{ height: 40 }} />
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 20,
    fontFamily: 'Quicksand-Medium',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: colors.text.primary,
    fontFamily: 'Quicksand-Regular',
  },
  clearButton: {
    padding: 4,
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  guideItem: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  guideGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  guideContent: {
    flex: 1,
  },
  guideTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
    fontFamily: 'Quicksand-SemiBold',
  },
  guideDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: 'Quicksand-Regular',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
    fontFamily: 'Quicksand-SemiBold',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 8,
    fontFamily: 'Quicksand-Regular',
  },
  modalOverlay: {
    flex: 1,
  },
  modalBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: colors.border.light,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 2,
    fontFamily: 'Quicksand-Bold',
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: 'Quicksand-Regular',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionNumberText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
    fontFamily: 'Quicksand-SemiBold',
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingLeft: 40,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    marginRight: 12,
  },
  stepText: {
    fontSize: 15,
    color: colors.text.primary,
    lineHeight: 22,
    flex: 1,
    fontFamily: 'Quicksand-Regular',
  },
});

export default GuidesScreen;