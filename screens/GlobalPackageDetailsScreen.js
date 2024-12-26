import React, { useState } from 'react';
import { 
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import NetworkModalGlobal from '../components/NetworkModalGlobal';

const { width } = Dimensions.get('window');

const GlobalPackageDetailsScreen = () => {
  const [networkModalVisible, setNetworkModalVisible] = useState(false);
  const route = useRoute();
  const navigation = useNavigation();
  const params = route.params;
  const packageData = params.package;
  const globalPackageName = params.globalPackageName;

  const getCountryCount = () => {
    const pkgName = packageData?.name?.toLowerCase() || '';
    if (pkgName.includes('139')) return 139;
    if (pkgName.includes('138')) return 138;
    if (pkgName.includes('106')) return 106;
    if (pkgName.includes('120+')) return 120;
    return packageData.locationNetworkList?.length || 
           packageData.coverage?.length || 
           packageData.regionCountries?.length || 120;
  };

  const getNetworkCount = () => {
    if (packageData.provider === 'esimgo') {
      return packageData.networks?.reduce((total, country) => total + (country.networks?.length || 1), 0) || 0;
    } else if (packageData.provider === 'airalo') {
      return packageData.networks?.length || 0;
    } else {
      const networksByLocation = {};
      const validLocations = new Set((packageData.regionCountries || []).map(code => {
        return getCountryName(code);
      }));
      
      (packageData.networks || []).forEach(network => {
        const locationName = getCountryName(network?.location || '');
        if (validLocations.has(locationName)) {
          if (!networksByLocation[locationName]) {
            networksByLocation[locationName] = new Set();
          }
          networksByLocation[locationName].add(network?.name || 'Network Operator');
        }
      });

      let totalNetworks = 0;
      Object.entries(networksByLocation).forEach(([location, networks]) => {
        totalNetworks += networks.size;
      });

      return totalNetworks;
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Global Package</Text>
      <View style={styles.headerIcon}>
        <Ionicons name="globe-outline" size={24} color="#FFFFFF" />
      </View>
    </View>
  );

  const TopGlobal = () => {
    const countryCount = getCountryCount();

    return (
      <View style={styles.topFlagContainer}>
        <View style={styles.flagWrapper}>
          <View style={styles.flagInnerWrapper}>
            <Ionicons name="globe-outline" size={40} color="#FF6B6B" />
          </View>
        </View>
        <Text style={styles.topRegionName}>Global</Text>
        <Text style={styles.coverageText}>
          Coverage in {countryCount} countries
        </Text>
      </View>
    );
  };

const VoiceSmsSection = () => {
  // Only render if package has voice or SMS
  if (!packageData.voice_minutes && !packageData.sms_count) return null;

  return (
    <View style={styles.voiceSmsSection}>
      {packageData.voice_minutes !== undefined && (
        <View style={styles.voiceSmsItem}>
          <View style={styles.voiceSmsIconContainer}>
            <Ionicons name="call-outline" size={24} color="#FF6B6B" />
          </View>
          <View>
            <Text style={styles.voiceSmsLabel}>Voice</Text>
            <Text style={styles.voiceSmsValue}>{packageData.voice_minutes} Minutes</Text>
          </View>
        </View>
      )}
      
      {packageData.sms_count !== undefined && (
        <View style={styles.voiceSmsItem}>
          <View style={styles.voiceSmsIconContainer}>
            <Ionicons name="chatbubble-outline" size={24} color="#FF6B6B" />
          </View>
          <View>
            <Text style={styles.voiceSmsLabel}>SMS</Text>
            <Text style={styles.voiceSmsValue}>{packageData.sms_count} Messages</Text>
          </View>
        </View>
      )}
    </View>
  );
};

  const DataPriceSection = () => (
    <View style={styles.dataPrice}>
      <View style={styles.dataSection}>
        <Text style={styles.sectionLabel}>Data</Text>
        <Text style={styles.dataAmount}>
          {packageData.data === 'Unlimited' || packageData.unlimited ? 'Unlimited' : `${packageData.data}GB`}
        </Text>
      </View>
      <View style={styles.priceSection}>
        <Text style={styles.sectionLabel}>Price</Text>
        <Text style={styles.priceAmount}>${packageData.price.toFixed(2)}</Text>
      </View>
    </View>
  );

  const ValiditySection = () => (
    <View style={styles.validitySection}>
      <View style={styles.validityInner}>
        <View style={styles.validityIconContainer}>
          <Ionicons name="time-outline" size={24} color="#FF6B6B" />
        </View>
        <Text style={styles.validityDuration}>
          Valid for {packageData.duration.toString().replace(' days', '')} days
        </Text>
      </View>
    </View>
  );

  const PromoCodeSection = () => (
    <View style={styles.promoSection}>
      <Text style={styles.sectionTitle}>Apply code</Text>
      <View style={styles.promoContainer}>
        <Text style={styles.promoPlaceholder}>Enter referral or promo code</Text>
        <TouchableOpacity style={styles.redeemButton}>
          <Text style={styles.redeemText}>Redeem</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const InfoSection = () => (
  <View style={styles.infoSection}>
    <Text style={styles.sectionTitle}>MORE INFO</Text>
    
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <Ionicons name="cellular-outline" size={20} color="#888" />
        <Text style={styles.infoLabel}>Networks</Text>
      </View>
      <TouchableOpacity 
        style={styles.viewAllButton}
        onPress={() => setNetworkModalVisible(true)}
      >
        <Text style={styles.viewAllText}>View all</Text>
      </TouchableOpacity>
    </View>

    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <Ionicons name="card-outline" size={20} color="#888" />
        <Text style={styles.infoLabel}>Plan Type</Text>
      </View>
      <Text style={styles.infoValue}>
        {packageData.voice_minutes || packageData.sms_count ? 
          'Global Data + Voice + SMS' : 
          'Global Data'}
      </Text>
    </View>

      <View style={styles.infoRow}>
        <View style={styles.infoLeft}>
          <Ionicons name="reload-circle-outline" size={20} color="#888" />
          <Text style={styles.infoLabel}>Top Up</Text>
        </View>
        <Text style={styles.infoValue}>Available</Text>
      </View>

      <View style={styles.policySection}>
        <View style={styles.infoLeft}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#888" />
          <Text style={styles.infoLabel}>Activation Policy</Text>
        </View>
        <Text style={styles.policyText}>
          The validity period starts when the SIM connects to any supported networks in the covered countries.
        </Text>
      </View>
    </View>
  );

  return (
  <SafeAreaView style={styles.container}>
    {renderHeader()}
    <ScrollView 
      style={styles.scrollView} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollViewContent}
    >
      <TopGlobal />
      <DataPriceSection />
      <VoiceSmsSection />
      <ValiditySection />
      <PromoCodeSection />
      <InfoSection />
    </ScrollView>
      
      <View style={styles.bottomContainer}>
        <Text style={styles.disclaimer}>
          Before completing this order, please confirm your device is eSIM compatible and network-unlocked
          <Text style={styles.learnMore}> Learn more</Text>
        </Text>
				<TouchableOpacity 
		  onPress={() => {
			navigation.navigate('Checkout', {
			  package: {
				...packageData,
				data: packageData.data === 'Unlimited' || packageData.unlimited ? 'Unlimited' : packageData.data,
				duration: packageData.duration.toString().replace(' days', ''),
				price: packageData.price,
				coverage: getCountryCount(),
				// Add voice and SMS information if they exist
				voice_minutes: packageData.voice_minutes || undefined,
				sms_count: packageData.sms_count || undefined
			  },
			  isGlobal: true,
			  globalPackageName: globalPackageName
			});
		  }}
		  activeOpacity={0.8}
		>
		  <LinearGradient
			colors={['#2ECC71', '#27AE60']}
			start={{ x: 0, y: 0 }}
			end={{ x: 1, y: 1 }}
			style={styles.buyButton}
		  >
			<Text style={styles.buyButtonText}>
			  ${packageData.price.toFixed(2)} • Buy Now
			</Text>
			<View style={styles.buyButtonDot} />
		  </LinearGradient>
		</TouchableOpacity>
      </View>

      <NetworkModalGlobal
        visible={networkModalVisible}
        onClose={() => setNetworkModalVisible(false)}
        packageData={packageData}
        globalPackageName={globalPackageName}
      />
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1E1E1E',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  topFlagContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  flagWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  flagInnerWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  topRegionName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
  },
  coverageText: {
    fontSize: 16,
    color: '#888',
    marginTop: 4,
    fontFamily: 'Quicksand',
  },
  dataPrice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  dataSection: {
    flex: 1,
  },
  priceSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  sectionLabel: {
    fontSize: 16,
    color: '#888',
    marginBottom: 8,
    fontFamily: 'Quicksand',
  },
  dataAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
  },
  priceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
  },
  validitySection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  validityInner: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
    width: '100%',
  },
  validityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  validityDuration: {
    fontSize: 20,
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
    fontWeight: 'bold',
  },
  promoSection: {
    marginBottom: 24,
  },
  promoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  promoPlaceholder: {
    fontSize: 16,
    color: '#888',
    fontFamily: 'Quicksand',
  },
  redeemButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  redeemText: {
    fontSize: 14,
    color: '#FF6B6B',
    fontFamily: 'Quicksand',
  },
  infoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    fontFamily: 'Quicksand',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
    fontFamily: 'Quicksand',
  },
  infoValue: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
  },
  viewAllButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  viewAllText: {
    fontSize: 14,
    color: '#FF6B6B',
    fontFamily: 'Quicksand',
  },
  policySection: {
    marginTop: 16,
  },
  policyText: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    fontFamily: 'Quicksand',
    lineHeight: 20,
  },
  bottomContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 85 : 75,
    backgroundColor: '#1E1E1E',
    borderTopWidth: 1,
    borderTopColor: '#333',
    marginBottom: Platform.OS === 'ios' ? 20 : 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  disclaimer: {
    fontSize: 12,
    color: '#888',
    marginBottom: 16,
    fontFamily: 'Quicksand',
    textAlign: 'center',
  },
  learnMore: {
    color: '#FF6B6B',
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 25,
    marginBottom: Platform.OS === 'ios' ? 6 : 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  buyButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  buyButtonDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginLeft: 8,
  },
   voiceSmsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
  },
  voiceSmsItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  voiceSmsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  voiceSmsLabel: {
    fontSize: 14,
    color: '#888',
    fontFamily: 'Quicksand',
    marginBottom: 4,
  },
  voiceSmsValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
  },
});

export default GlobalPackageDetailsScreen;