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

const PrivacyScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 0) }]}>
      <View style={[styles.content, { height: WINDOW_HEIGHT - insets.top }]}>
        <View style={[styles.header, { paddingTop: 5 }]}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons 
              name="arrow-back" 
              size={24} 
              color="#333"
            />
          </TouchableOpacity>
          <Text style={styles.title}>Privacy Policy</Text>
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
              Asteralink LLC-FZ, operating as esimfly.net ("we" or "us") takes the privacy of your information seriously. This Privacy Policy applies to the esimfly.net website (the "Website") and governs data collection, processing, and usage in compliance with UAE Federal Decree Law No. 45 of 2021 regarding the Protection of Personal Data (PDPL) and applicable Dubai International Financial Centre (DIFC) data protection regulations. By using the Website, you consent to the data practices described in this statement.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Information Collected from All Visitors to our Website</Text>
            <Text style={styles.text}>
              We will obtain personal data about you when you visit us. When you visit us, we may monitor the use of this Website through the use of cookies and similar tracking devices. For example, we may monitor the number of times you visit our Website or which pages you go to. This information helps us to build a profile of our users. Some of this data will be aggregated or statistical, which means that we will not be able to identify you individually.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Personal Information that May be Collected</Text>
            <Text style={styles.text}>
              Asteralink LLC-FZ may collect and process:{'\n\n'}
              • Personally identifiable information, such as your email address and name, when you contact us.{'\n'}
              • Details contained in the relevant document that you key in when you use our Services. These details may include your name, phone number, email, your address, and details about your payments ("Personal Information").{'\n'}
              • Information about your computer hardware and software when you use our Website. The information can include your IP address, browser type, domain names, access times, and referring website addresses. This information is used for the operation of the Services, to maintain quality of the Services, and to provide general statistics regarding use of the Website.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Use of Personal Information</Text>
            <Text style={styles.text}>
              Asteralink LLC-FZ uses the collected information:{'\n\n'}
              • To operate the Website and deliver the Services.{'\n'}
              • To process, and where necessary, respond to your application form for eSIM, enquiry, or request.{'\n'}
              • To gather customer feedback.{'\n'}
              • To inform or update you of other products or services available from us and our affiliates, where you have consented to be contacted for such purposes.{'\n'}
              • To monitor, improve, and administer the Website and Services.{'\n'}
              • To update you on changes to the Website and Services.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Non-disclosure</Text>
            <Text style={styles.text}>
              Asteralink LLC-FZ does not sell, rent, lease, or release your Personal Information to third parties. We may, from time to time, contact you on behalf of external business partners about a particular offering that may be of interest to you. In those cases, your unique Personal Information is not transferred to the third party without your explicit consent. In addition, we may share data with trusted partners to help us perform statistical analysis, send you email, or provide customer support. All such third parties are prohibited from using your personal information except to provide these services to us, and they are required to maintain the confidentiality of your Personal Information.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Disclosure of Personal Information</Text>
            <Text style={styles.text}>
              Asteralink LLC-FZ will disclose or share your Personal Information, without notice, only if required to do so by law or in the good faith belief that such action is necessary to:{'\n\n'}
              • Comply with any legal requirements or comply with legal process served on us or the Website.{'\n'}
              • Protect and defend the rights or property of Asteralink LLC-FZ.{'\n'}
              • Act under exigent circumstances to protect the personal safety of users of the Website, or the general public.{'\n'}
              • In the event that we sell or buy any business or assets, we may disclose your personal data to the prospective seller or buyer of such business or assets.{'\n'}
              • If the Website or substantially all of its assets are acquired by a third party, personal data held by it about its customers will be one of the transferred assets.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Use of Cookies</Text>
            <Text style={styles.text}>
              The Website uses "cookies" to help you personalize your online experience. A cookie is a text file that is placed on your hard drive by a web page server. Cookies cannot be used to run programs or deliver viruses to your computer. Cookies are uniquely assigned to you, and can only be read by a web server in the domain that issued the cookie to you.{'\n\n'}
              Cookies on the Website may be used to ensure a smooth user experience, perform analytics, and for showing relevant advertisements. Please note that third parties (such as analytics software) may also use cookies, over which we have no control. These cookies are likely to be analytical/performance cookies or targeting cookies. The Website uses Google Analytics. Please refer to http://www.google.com/policies/privacy/partners to find out more about how Google uses data when you use our website and how to control the information sent to Google.{'\n\n'}
              Most Web browsers automatically accept cookies, but you can usually modify your browser setting to decline cookies if you prefer. If you choose to decline cookies, you may not be able to access all or parts of our Website or to fully experience the interactive features of our services or websites you visit.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Security of Your Personal Information</Text>
            <Text style={styles.text}>
              We strive to maintain the safety of your Personal Information. Any payment transactions will be encrypted using SSL technology. Unfortunately, no internet-based service is completely secure. Although we will do our best to protect your personal data, we cannot guarantee the security of your data transmitted to our site; any transmission is at your own risk. Once we have received your information, we will use strict procedures and security features to try to prevent unauthorised access.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Access to, Updating, and Non-Use of Your Personal Information</Text>
            <Text style={styles.text}>
              Under applicable data protection laws, you have the right to request access to and correction of your personal data held by us. If you would like to access or correct your personal information, please send an email to support@esimfly.net. We may charge a reasonable fee for processing your data access request.{'\n\n'}
              We want to ensure that your Personal Information is accurate and up to date. If any of the information that you have provided to us changes, for example if you change your email address, name, or contact number, please let us know the correct details by sending an email to support@esimfly.net. You may ask us, or we may ask you, to correct information you or we think is inaccurate, and you may also ask us to remove information which is inaccurate.{'\n\n'}
              You have the right to request us to cease using your personal data for direct marketing purposes. You can give us notice of your intention to halt the collection, use, processing, or disclosure of your Personal Information at any time by contacting us at support@esimfly.net.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Links to Other Websites</Text>
            <Text style={styles.text}>
              Our Website may contain links to other websites. This Privacy Policy only applies to this website so when you link to other websites you should read their own privacy policies.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Changes to This Statement</Text>
            <Text style={styles.text}>
              Asteralink LLC-FZ will occasionally update this Privacy Policy to reflect customer feedback and changes in our services. We encourage you to periodically review this Privacy Policy to be informed of how we are protecting your information.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <Text style={styles.text}>
              Asteralink LLC-FZ welcomes your comments regarding this Privacy Policy. For any privacy-related matters or if you believe that the Website has not adhered to this Privacy Policy, please contact our Data Protection Officer at:{'\n\n'}
              Email: support@esimfly.net{'\n\n'}
              Address: Asteralink LLC-FZ{'\n'}
              Meydan Grandstand, 6th floor, Meydan Road{'\n'}
              Nad Al Sheba, Dubai, U.A.E.
            </Text>
          </View>
        </ScrollView>
      </View>
    </View>
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
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.background.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
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

export default PrivacyScreen;