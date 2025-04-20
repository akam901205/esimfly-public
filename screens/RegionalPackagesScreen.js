import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { regions } from '../utils/regions';
import NetworkModal from '../components/NetworkModal';
import { colors } from '../theme/colors';
import {
  isUnlimitedPackage,
  normalizeDuration,
  filterPackagesByRegion,
  groupSimilarPackages,
  processProviderNetworks,
  getHighestSpeed,
  getNetworks,
  formatLocationNetworkList,
  adjustDataDisplay
} from '../utils/PackageFilters';

const API_BASE_URL = 'https://esimfly.net/pages/esimplan';

const ICON_COLORS = {
  network: '#007AFF',
  speed: '#2563eb',
};

const RegionalPackagesScreen = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [networkModalVisible, setNetworkModalVisible] = useState(false);
  const [selectedNetworks, setSelectedNetworks] = useState([]);
  const [selectedLocationNetworks, setSelectedLocationNetworks] = useState([]);
  const route = useRoute();
  const navigation = useNavigation();
  const { region, packageType } = route.params;

  const handleNetworkPress = (packageData) => {
    const networks = getNetworks(packageData);
    const locationNetworks = formatLocationNetworkList(packageData);
    setSelectedNetworks(networks);
    setSelectedLocationNetworks(locationNetworks);
    setNetworkModalVisible(true);
  };

  const fetchPackages = useCallback(async () => {
    try {
      console.log(`[DEBUG] Fetching packages for region: ${region}, type: ${packageType}`);
      let allPackages = [];

      const getSearchTerm = (region) => {
        switch (region.toLowerCase()) {
          case 'europe': return 'europe';
          case 'gulf region': return 'gulf';
          case 'asia': return 'asia';
          case 'latin america': return 'latin america';
          case 'africa': return 'africa';
          case 'middle east and africa': return 'middleeastafrica';
          default: return region;
        }
      };

      let responses;
      if (region === 'Middle East and Africa') {
        const [meResponses, afResponses] = await Promise.all([
          Promise.all([
            axios.get(`${API_BASE_URL}/get_plans_esimaccess.php`, { 
              params: { search: 'middle east', limit: 100 } 
            }).catch(() => ({ data: { success: true, plans: [] } })),
            axios.get(`${API_BASE_URL}/get_plans_esimgo.php`, { 
              params: { search: 'middle east', limit: 100 } 
            }).catch(() => ({ data: { success: true, plans: [] } })),
            axios.get(`${API_BASE_URL}/get_plans_airalo.php`, { 
              params: { search: 'middle east', limit: 100 } 
            }).catch(() => ({ data: { success: true, plans: [] } }))
          ]),
          Promise.all([
            axios.get(`${API_BASE_URL}/get_plans_esimaccess.php`, { 
              params: { search: 'africa', limit: 100 } 
            }).catch(() => ({ data: { success: true, plans: [] } })),
            axios.get(`${API_BASE_URL}/get_plans_esimgo.php`, { 
              params: { search: 'africa', limit: 100 } 
            }).catch(() => ({ data: { success: true, plans: [] } })),
            axios.get(`${API_BASE_URL}/get_plans_airalo.php`, { 
              params: { search: 'africa', limit: 100 } 
            }).catch(() => ({ data: { success: true, plans: [] } }))
          ])
        ]);
        
        responses = {
          esimAccessResponse: {
            data: { plans: [...(meResponses[0].data?.plans || []), ...(afResponses[0].data?.plans || [])] }
          },
          esimGoResponse: {
            data: { plans: [...(meResponses[1].data?.plans || []), ...(afResponses[1].data?.plans || [])] }
          },
          airaloResponse: {
            data: { plans: [...(meResponses[2].data?.plans || []), ...(afResponses[2].data?.plans || [])] }
          }
        };
      } else {
        const searchTerm = getSearchTerm(region);
        const [esimAccessResponse, esimGoResponse, airaloResponse] = await Promise.all([
          axios.get(`${API_BASE_URL}/get_plans_esimaccess.php`, { 
            params: { search: searchTerm, limit: 100 } 
          }).catch(() => ({ data: { success: true, plans: [] } })),
          axios.get(`${API_BASE_URL}/get_plans_esimgo.php`, { 
            params: { search: searchTerm, limit: 100 } 
          }).catch(() => ({ data: { success: true, plans: [] } })),
          axios.get(`${API_BASE_URL}/get_plans_airalo.php`, { 
            params: { search: searchTerm, limit: 100 } 
          }).catch(() => ({ data: { success: true, plans: [] } }))
        ]);
        responses = { esimAccessResponse, esimGoResponse, airaloResponse };
      }

      // Process provider responses
      if (Array.isArray(responses.esimAccessResponse.data?.plans)) {
        const esimAccessPlans = responses.esimAccessResponse.data.plans.map(plan => ({
          ...plan,
          provider: 'esimaccess',
          unlimited: isUnlimitedPackage(plan),
          locationNetworkList: plan.locationNetworkList || [],
          networks: [],
          coverage: []
        }));
        allPackages = [...allPackages, ...esimAccessPlans];
      }

      if (Array.isArray(responses.esimGoResponse.data?.plans)) {
        const esimGoPlans = responses.esimGoResponse.data.plans.map(plan => ({
          ...plan,
          provider: 'esimgo',
          unlimited: isUnlimitedPackage(plan),
          networks: plan.networks || [],
          coverage: plan.coverage || [],
          speed: plan.speed || '4G',
          locationNetworkList: []
        }));
        allPackages = [...allPackages, ...esimGoPlans];
      }

      if (Array.isArray(responses.airaloResponse.data?.plans)) {
        const airaloPlans = responses.airaloResponse.data.plans.map(plan => ({
          ...plan,
          provider: 'airalo',
          unlimited: isUnlimitedPackage(plan),
          networks: plan.networks || [],
          coverage: plan.coverage || [],
          locationNetworkList: []
        }));
        allPackages = [...allPackages, ...airaloPlans];
      }

     const normalizedPackages = allPackages.map(pkg => ({
      ...pkg,
      duration: normalizeDuration(pkg.duration),
      data: pkg.unlimited ? 'Unlimited' : (parseFloat(pkg.data) || 0),
      price: parseFloat(pkg.price) || 0,
      region: (pkg.region || '').trim().toLowerCase(),
      provider: pkg.provider || 'unknown',
      networks: pkg.networks || [],
      coverage: pkg.coverage || [],
      locationNetworkList: pkg.locationNetworkList || []
    })).filter(pkg => pkg !== null);

    const filteredPackages = filterPackagesByRegion(normalizedPackages, region, packageType);
    // Pass region to groupSimilarPackages
    const groupedPackages = groupSimilarPackages(filteredPackages, region);
    setPackages(groupedPackages);

  } catch (err) {
    console.error('[DEBUG] Error fetching packages:', err);
    setError('Unable to load packages at this time. Please try again later.');
    setPackages([]);
  } finally {
    setLoading(false);
  }
}, [region, packageType]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        onPress={() => navigation.goBack()} 
        style={styles.headerIcon}
      >
        <Ionicons 
          name="arrow-back" 
          size={24} 
          color={colors.icon.header} 
        />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{region} Plans</Text>
      <View style={styles.headerIcon}>
        <Ionicons 
          name="globe-outline" 
          size={24} 
          color={colors.icon.header} 
        />
      </View>
    </View>
  );

const renderPackageItem = ({ item, index }) => {
    const RegionIcon = regions.find(r => r.name.toLowerCase() === region.toLowerCase())?.image;
    const highestSpeed = getHighestSpeed(item);
    const networkInfo = processProviderNetworks(item);
    const alternatives = item.alternatives || [];
    
    const displayData = item.data === 'Unlimited' || item.unlimited 
      ? 'Unlimited' 
      : `${adjustDataDisplay(item.data)} GB`;

    const navigateToDetails = () => {
      navigation.navigate('RegionalPackageDetails', {
        package: item,
        region: region
      });
    };

    return (
      <TouchableOpacity onPress={navigateToDetails} activeOpacity={0.9}>
        <View style={styles.packageItem}>
          <View style={styles.packageHeader}>
            <View style={styles.regionInfo}>
              {RegionIcon && <RegionIcon size={24} />}
              <Text style={styles.regionName}>{region}</Text>
            </View>
            {highestSpeed && (
              <View style={[styles.speedContainer, { backgroundColor: `${ICON_COLORS.speed}15` }]}>
                <Ionicons name="speedometer-outline" size={16} color={ICON_COLORS.speed} />
                <Text style={[styles.speedText, { color: ICON_COLORS.speed }]}>
                  {highestSpeed.toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.packageDetails}>
            <View>
              <Text style={styles.dataAmount}>{displayData}</Text>
              <Text style={styles.validityPeriod}>
                VALID FOR {item.duration} DAYS
              </Text>
              <TouchableOpacity
                onPress={() => handleNetworkPress(item)}
                style={styles.networkButton}
              >
                <View style={styles.networkContent}>
                  <Ionicons 
                    name="cellular-outline" 
                    size={16} 
                    color={ICON_COLORS.network}
                  />
                  <Text style={styles.networkButtonText}>
                    {networkInfo.countryCount} Countries
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.priceText}>
                ${parseFloat(item.price).toFixed(2)}
              </Text>
              <TouchableOpacity 
                onPress={navigateToDetails}
                style={styles.buyButton}
              >
                <Text style={styles.buyButtonText}>BUY NOW</Text>
              </TouchableOpacity>
            </View>
          </View>

          {alternatives.length > 0 && (
            <View style={styles.alternativesContainer}>
              {alternatives.map((pkg, i) => (
                <TouchableOpacity 
                  key={i}
                  style={styles.alternativeItem}
                  onPress={() => navigation.navigate('RegionalPackageDetails', {
                    package: pkg,
                    region: region
                  })}
                >
                  <View style={styles.alternativeContent}>
                    <View style={styles.alternativeLeft}>
                      <View style={styles.altProviderBadge}>
                        <Text style={styles.altProviderText}>
                          {pkg.id === item.id ? "Main Plan" : "Alternative Plan"}
                        </Text>
                      </View>
                      <View style={styles.altCoverageBadge}>
                        <Ionicons name="globe-outline" size={12} color={colors.text.secondary} />
                        <Text style={styles.altCoverageText}>
                          {processProviderNetworks(pkg).countryCount}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.alternativeRight}>
                      <Text style={styles.altPriceText}>
                        ${parseFloat(pkg.price).toFixed(2)}
                      </Text>
                      <View style={styles.compareContainer}>
                        <Text style={[
                          styles.compareText,
                          { color: pkg.price < item.price ? '#4CAF50' : '#FF6B6B' }
                        ]}>
                          {pkg.price < item.price 
                            ? `Save $${(item.price - pkg.price).toFixed(2)}`
                            : `+$${(pkg.price - item.price).toFixed(2)}`
                          }
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

 return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <FlatList
        data={packages}
        renderItem={renderPackageItem}
        keyExtractor={(item, index) => `${item.packageCode}-${index}`}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={() => (
          <View style={styles.emptyStateContainer}>
            {loading ? (
              <ActivityIndicator size="large" color="#2196f3" />
            ) : (
              <Text style={styles.noPackagesText}>
                No packages available for this selection.
              </Text>
            )}
          </View>
        )}
        ListFooterComponent={<View style={styles.listFooter} />}
      />
      
      <NetworkModal
        visible={networkModalVisible}
        onClose={() => setNetworkModalVisible(false)}
        networks={selectedNetworks}
        locationNetworkList={selectedLocationNetworks}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.headerIcon,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.header,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  listContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 80 : 60,
  },
  packageItem: {
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  regionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  regionName: {
    marginLeft: 8,
    fontSize: 18,
    color: colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  speedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  speedText: {
    marginLeft: 4,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  packageDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dataAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  validityPeriod: {
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    marginTop: 4,
  },
  networkButton: {
    marginTop: 8,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.stone[100],
    borderWidth: 1,
    borderColor: colors.stone[200],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.stone[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  networkButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.stone[600],
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    marginLeft: 4,
  },
  networkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceContainer: {
    alignItems: 'flex-end',
    minWidth: 120,
  },
  priceText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    marginBottom: 8,
  },
  buyButton: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#2196f3',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    ...Platform.select({
      ios: {
        shadowColor: '#15803d',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  buyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.stone[50],
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  alternativesContainer: {
    marginTop: 12,
    gap: 8,
  },
  alternativeItem: {
    borderRadius: 8,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  alternativeContent: {
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alternativeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  altProviderBadge: {
    backgroundColor: colors.background.tertiary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  altProviderText: {
    color: colors.text.primary,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  altCoverageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background.tertiary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  altCoverageText: {
    color: colors.text.secondary,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  alternativeRight: {
    alignItems: 'flex-end',
  },
  altPriceText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  compareText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    fontWeight: 'bold',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noPackagesText: {
    color: colors.text.secondary,
    fontSize: 16,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    marginTop: 20,
  },
  listFooter: {
    height: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    padding: 16,
  },
  errorText: {
    color: colors.text.secondary,
    fontSize: 16,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    marginBottom: 8,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.stone[800],
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.background.primary,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: 8,
  },
  badgeContainer: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.stone[800],
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: colors.background.primary,
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    fontWeight: 'bold',
  }
});

export default RegionalPackagesScreen;