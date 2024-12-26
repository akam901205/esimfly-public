import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_BAR_HEIGHT = 84;
const WINDOW_HEIGHT = Dimensions.get('window').height;

const PrivacyScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.content, { height: WINDOW_HEIGHT - insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Privacy Policy</Text>
        </View>

        <ScrollView 
          style={styles.scrollContent}
          contentContainerStyle={[
            styles.scrollContentContainer,
            { paddingBottom: TAB_BAR_HEIGHT + insets.bottom }
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Introduction</Text>
            <Text style={styles.text}>
              eSimfly ("we" or "us") takes the privacy of your information seriously. This Privacy Policy applies to the esimfly.net website and mobile applications (the "Services") and governs data collection, processing, and usage in compliance with the Kişisel Verilerin Korunması Kanunu (No. 6698) of Turkey ("KVKK").
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Information We Collect</Text>
            <Text style={styles.text}>
              We collect:{'\n\n'}
              • Personally identifiable information (email, name) when you contact us{'\n'}
              • Details from your service usage including name, phone number, email, address, and payment details{'\n'}
              • Technical information such as IP address, browser type, domain names, access times{'\n'}
              • Usage patterns and statistics through cookies and similar tracking devices{'\n'}
              • Aggregated statistical data that doesn't identify you individually
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How We Use Your Information</Text>
            <Text style={styles.text}>
              We use your information to:{'\n\n'}
              • Operate and deliver our Services{'\n'}
              • Process your eSIM orders and applications{'\n'}
              • Respond to your inquiries and requests{'\n'}
              • Gather customer feedback{'\n'}
              • Inform you about our products and services (with consent){'\n'}
              • Monitor and improve our Services{'\n'}
              • Provide usage statistics and analysis{'\n'}
              • Update you about service changes
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Non-disclosure & Data Sharing</Text>
            <Text style={styles.text}>
              We do not sell, rent, lease, or release your Personal Information to third parties. We may:{'\n\n'}
              • Contact you on behalf of business partners (without transferring your data){'\n'}
              • Share data with trusted partners for analysis and support{'\n'}
              • Disclose information if required by law{'\n'}
              • Share data in case of business sale or acquisition
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cookies & Tracking</Text>
            <Text style={styles.text}>
              We use cookies to:{'\n\n'}
              • Enhance user experience{'\n'}
              • Perform analytics{'\n'}
              • Show relevant advertisements{'\n\n'}
              Third parties may also use cookies for analytics and performance tracking. We use Google Analytics for website analysis.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Security</Text>
            <Text style={styles.text}>
              We implement appropriate security measures including:{'\n\n'}
              • SSL encryption for payments{'\n'}
              • Strict data access procedures{'\n'}
              • Security features to prevent unauthorized access{'\n\n'}
              While we strive for complete security, no internet-based service is 100% secure. Data transmission is at your own risk.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Rights</Text>
            <Text style={styles.text}>
              Under KVKK Article 28, you have the right to:{'\n\n'}
              • Request a copy of your data{'\n'}
              • Correct inaccurate information{'\n'}
              • Request data deletion{'\n'}
              • Object to data processing{'\n'}
              • Withdraw consent{'\n'}
              • Opt-out of data collection{'\n'}
              • Update your personal information
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Us</Text>
            <Text style={styles.text}>
              For privacy-related inquiries or to exercise your rights, contact us at:{'\n\n'}
              support@esimfly.net
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Last updated: November 2024
            </Text>
            <Text style={styles.footerNote}>
              This policy is regularly updated to reflect changes in our practices and services.
            </Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#1E1E1E',
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingTop: 20,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  text: {
    fontSize: 16,
    color: '#CCCCCC',
    lineHeight: 24,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 8,
  },
  footerNote: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
});

export default PrivacyScreen;