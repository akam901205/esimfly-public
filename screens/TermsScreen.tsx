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
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Introduction</Text>
            <Text style={styles.text}>
              By using eSimfly's eSIM services, you gain access to mobile data and voice services in various countries. These services are provided by our partner networks under these Terms & Conditions. Services may be used in various devices including connected cars, laptops, tablets, or other authorized OEM devices.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Agreement</Text>
            <Text style={styles.text}>
              • Service is available exclusively through eSimfly sales channels{'\n'}
              • Your use of the service confirms acceptance of these terms{'\n'}
              • We may modify these terms at any time with notice on esimfly.net{'\n'}
              • Continued use after changes indicates acceptance{'\n'}
              • Service is sold exclusively on a prepaid basis
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Responsibilities</Text>
            <Text style={styles.text}>
              You must:{'\n\n'}
              • Use eSIM only in the intended device{'\n'}
              • Disclose your country of residence{'\n'}
              • Provide ID within 15 days of service start{'\n'}
              • Control access to your SIM{'\n'}
              • Use service for legitimate purposes only{'\n'}
              • Not interfere with network operations{'\n'}
              • Not use service for unlawful or abusive purposes{'\n'}
              • Pay all charges for services used
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Suspension</Text>
            <Text style={styles.text}>
              We may suspend service without notice if:{'\n\n'}
              • You fail to comply with terms{'\n'}
              • Required by government/authority{'\n'}
              • For repairs or maintenance{'\n'}
              • Suspected fraudulent use{'\n'}
              • SIM is lost/stolen{'\n'}
              • Interference with network{'\n'}
              • Non-compliance with laws{'\n'}
              • Extended period of non-use{'\n'}
              • Use in unauthorized device
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Charges and Payment</Text>
            <Text style={styles.text}>
              • Valid Tariff Plan required for service use{'\n'}
              • Service suspended when plan exhausted/expired{'\n'}
              • No cash refunds for remaining credit{'\n'}
              • Credits/allowances not transferable{'\n'}
              • All taxes and fees must be paid{'\n'}
              • Charges based on actual usage
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Liability Limitations</Text>
            <Text style={styles.text}>
              Our liability is limited to:{'\n\n'}
              • Amount charged for one month of service{'\n'}
              • No liability for indirect damages{'\n'}
              • No warranty on uninterrupted service{'\n'}
              • Not responsible for network outages{'\n'}
              • No liability for third-party content{'\n'}
              • You must protect against viruses
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <Text style={styles.text}>
              For further information or support, contact Customer Service at:{'\n\n'}
              support@esimfly.net
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Last updated: November 2024
            </Text>
            <Text style={styles.footerNote}>
              By using our services, you agree to these terms and conditions.
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