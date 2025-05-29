import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

const TAB_BAR_HEIGHT = 84;
const WINDOW_HEIGHT = Dimensions.get('window').height;

const TermsScreen = () => {
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
            <Ionicons 
              name="arrow-back" 
              size={24} 
              color={colors.icon.header}
            />
          </TouchableOpacity>
          <Text style={styles.title}>Terms of Service</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView 
          style={styles.scrollContent}
          contentContainerStyle={[
            styles.scrollContentContainer,
            { paddingBottom: TAB_BAR_HEIGHT + insets.bottom }
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Last updated: April 20, 2025
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Introduction</Text>
            <Text style={styles.text}>
              By accessing or using services provided by Asteralink LLC-FZ ("Company", "we", "our", or "us") through esimfly.net, you agree to comply with and be bound by these Terms of Service ("Terms"). These Terms govern your access to and use of our services, website, and any other software or services offered by Asteralink LLC-FZ.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Company Information</Text>
            <Text style={styles.text}>
              Asteralink LLC-FZ is a company registered in Dubai, United Arab Emirates (License No. 2425583.01) with its registered office at Meydan Grandstand, 6th floor, Meydan Road, Nad Al Sheba, Dubai, U.A.E. We operate under the domain esimfly.net.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Definitions and Framework</Text>
            <Text style={styles.text}>
              The "Service" refers to any products, services, content, features, technologies, or functions, and all related websites, applications and services offered to you by Asteralink LLC-FZ through esimfly.net.{'\n\n'}
              These Terms, including the provisions regarding personal data protection referenced herein (collectively, the "Agreement"), set forth the terms and conditions that apply to your use of our Service. "Customer", "You" and "your" mean the user of the Service, and "Asteralink LLC-FZ", "we", "our", and "us" include our affiliates and subsidiaries involved in providing the Service to you.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>User Obligations</Text>
            <Text style={styles.text}>
              You agree to use our services in accordance with these Terms and all applicable laws and regulations. You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account.{'\n\n'}
              When using our eSIM services, you are responsible for ensuring your device is compatible with eSIM technology before making a purchase. As noted in our Refund Policy, we do not offer refunds for cases in which customers are unaware of their phone's eSIM compatibility.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Intellectual Property</Text>
            <Text style={styles.text}>
              All content, features, and functionality of our services, including but not limited to text, graphics, logos, button icons, images, audio clips, digital downloads, data compilations, and software, are the exclusive property of Asteralink LLC-FZ or its licensors and are protected by UAE and international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Modifications to Terms</Text>
            <Text style={styles.text}>
              We reserve the right to modify these Terms at any time. We will notify you of any changes by posting the new Terms on esimfly.net. Your continued use of the Service following the posting of modified Terms means that you accept and agree to the changes.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Limitation of Liability</Text>
            <Text style={styles.text}>
              To the maximum extent permitted by applicable law, Asteralink LLC-FZ shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your access to or use of or inability to access or use the services.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Delivery and eSIM Usage</Text>
            <Text style={styles.text}>
              When you purchase an eSIM package from us, you will receive an activation QR code via email. It is your responsibility to ensure the email address provided is correct. As stated in our Refund Policy, non-delivery due to email issues may be eligible for a refund, subject to verification.{'\n\n'}
              Data allowances, speeds, and coverage are subject to the terms and conditions of our network providers in each destination. Service availability and quality may vary by location and are subject to change without notice.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Termination</Text>
            <Text style={styles.text}>
              We may terminate or suspend your access to our services immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach these Terms. Upon termination, your right to use our services will immediately cease.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Governing Law</Text>
            <Text style={styles.text}>
              These Terms shall be governed by and construed in accordance with the laws of the United Arab Emirates. Any disputes arising under or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts of Dubai, UAE.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Severability</Text>
            <Text style={styles.text}>
              If any provision of these Terms is found to be unenforceable or invalid under any applicable law, such unenforceability or invalidity shall not render these Terms unenforceable or invalid as a whole, and such provisions shall be deleted without affecting the remaining provisions herein.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Us</Text>
            <Text style={styles.text}>
              If you have any questions about these Terms, please contact us at:{'\n\n'}
              Email: support@esimfly.net{'\n\n'}
              Address: Asteralink LLC-FZ{'\n'}
              Meydan Grandstand, 6th floor, Meydan Road{'\n'}
              Nad Al Sheba, Dubai, U.A.E.
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
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.background.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.headerIcon,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.header,
  },
  placeholder: {
    width: 40, // Same width as backButton for symmetry
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
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
    borderBottomColor: colors.border.light,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 10,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  text: {
    fontSize: 16,
    color: colors.text.secondary,
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  footerNote: {
    fontSize: 12,
    color: colors.text.tertiary,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
});

export default TermsScreen;