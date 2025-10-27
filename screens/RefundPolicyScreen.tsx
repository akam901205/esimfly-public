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

const RefundPolicyScreen = () => {
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
          <Text style={styles.title}>Refund Policy</Text>
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
              Last updated: June 30, 2025
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <Text style={styles.text}>
              At eSIMfly, we strive to provide high-quality digital eSIM services to customers worldwide. As we deal with digital products that can be instantly delivered and activated, our refund policy is designed to be fair while preventing potential abuse.
            </Text>
          </View>

          <View style={styles.highlightBox}>
            <Text style={styles.highlightTitle}>✓ Eligible for Refund:</Text>
            <Text style={styles.highlightText}>
              Unactivated eSIMs within 5 days of purchase, subject to the conditions listed below.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Refund Eligible Scenarios</Text>
            <Text style={styles.text}>
              We honor refund requests for the following specific reasons:
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.subsectionTitle}>Non-delivery of the Product</Text>
            <Text style={styles.text}>
              If you do not receive a delivery email from us due to an issue with the mail, you are eligible for a refund. Depending on the price of the product, esimfly.net may require you to first submit proof that you have submitted a report to the mail service describing the missing item.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.subsectionTitle}>Irreparable Defects</Text>
            <Text style={styles.text}>
              Although all our products are thoroughly tested before release, unexpected errors may occur. This reason should be submitted to our Support Team for approval of your refund request.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.subsectionTitle}>Product Not-as-Described</Text>
            <Text style={styles.text}>
              A request based on this reason is addressed on a case-by-case basis and is subject to our approval. To prevent this kind of claim from arising, every customer is encouraged to check all the related information described in the product detail before buying.
            </Text>
          </View>

          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>⚠️ Important Notice</Text>
            <Text style={styles.warningText}>
              Please note that we do not offer refunds for cases in which customers are unaware of their phone's eSIM compatibility. We highly recommend that customers consult their phone brand's website or reach out to us for professional consultation to confirm eSIM compatibility with their phone model before proceeding with their purchase.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Non-Refundable Cases</Text>
            <Text style={styles.text}>
              Refunds are NOT available in the following cases:{'\n\n'}
              • eSIM has been activated (scanned and installed on a device){'\n'}
              • Any data usage has been recorded on the eSIM{'\n'}
              • More than 5 days have passed since the purchase date{'\n'}
              • Device incompatibility (please check compatibility before purchasing){'\n'}
              • Change of travel plans or no longer needing the service{'\n\n'}
              As eSIMs are digital products that can be instantly delivered and activated, we maintain strict refund policies to prevent abuse and ensure sustainable operations.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Processing Fees</Text>
            <Text style={styles.text}>
              All refunds are subject to a processing fee of up to 5% of the original transaction amount. This fee covers non-refundable payment processing costs incurred during the initial purchase.{'\n\n'}
              The exact processing fee will be clearly communicated before the refund is processed, and the remaining amount will be credited back to your original payment method.
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Regional Differences</Text>
            <Text style={styles.infoText}>
              For customers in EU/UK/Australia: Full purchase amount will be refunded as required by law.{'\n\n'}
              For other regions: Where legally permitted, up to 10% may be deducted to cover non-recoverable payment processing fees and administrative costs.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Refund Timeline</Text>
            <Text style={styles.text}>
              Refunds are typically processed within 5-10 business days after approval. The exact time for funds to appear in your account depends on your bank or card issuer. In rare cases involving international payments or banking delays, processing may take up to 15 days.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Support</Text>
            <Text style={styles.text}>
              If you have any questions or need further assistance with refunds, please contact our Support Team at support@esimfly.net
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
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
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
  highlightBox: {
    marginHorizontal: 20,
    marginVertical: 15,
    padding: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  highlightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  highlightText: {
    fontSize: 14,
    color: '#388E3C',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  warningBox: {
    marginHorizontal: 20,
    marginVertical: 15,
    padding: 16,
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  warningText: {
    fontSize: 14,
    color: '#F57C00',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  infoBox: {
    marginHorizontal: 20,
    marginVertical: 15,
    padding: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0D47A1',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  infoText: {
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
});

export default RefundPolicyScreen;