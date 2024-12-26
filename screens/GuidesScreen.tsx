import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const guides = [
  {
    id: '1',
    title: 'How to activate your eSIM',
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
  content: GuideContent[];
}

const GuidesScreen = () => {
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const getIconName = (id) => {
    const icons = {
      '1': 'phone-portrait-outline',
      '2': 'infinite-outline',
      '3': 'build-outline',
      '4': 'hardware-chip-outline',
      '5': 'airplane-outline',
      '6': 'analytics-outline',
      '7': 'shield-checkmark-outline',
      '8': 'flash-outline',
      '9': 'lock-closed-outline',
      '10': 'cube-outline',
      '11': 'help-circle-outline',
      '12': 'globe-outline',
      '13': 'bulb-outline'
    };
    return icons[id] || 'document-text-outline';
  };

  const renderGuideItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.guideItem}
      onPress={() => {
        setSelectedGuide(item);
        setModalVisible(true);
      }}
    >
      <View style={styles.guideItemContent}>
        <Ionicons name={getIconName(item.id)} size={24} color="#888" style={styles.icon} />
        <Text style={styles.guideTitle}>{item.title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#888" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>eSIM Guide</Text>
        <Text style={styles.subtitle}>Everything you need to know</Text>
      </View>

      <FlatList
        data={guides}
        renderItem={renderGuideItem}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.listContainer,
          { paddingBottom: 74 }
        ]}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedGuide?.title}
              </Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
            >
              {selectedGuide?.content.map((section, index) => (
                <View key={index} style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    {section.subtitle}
                  </Text>
                  {section.steps.map((step, stepIndex) => (
                    <View key={stepIndex} style={styles.stepContainer}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.stepText}>
                        {step}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
  },
  listContainer: {
    padding: 15,
  },
  guideItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  guideItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 10,
  },
  guideTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  closeButton: {
    padding: 5,
  },
  modalScrollView: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 10,
  },
  bullet: {
    color: '#888',
    marginRight: 10,
    fontSize: 16,
  },
  stepText: {
    color: '#FFFFFF',
    fontSize: 16,
    flex: 1,
  },
});

export default GuidesScreen;