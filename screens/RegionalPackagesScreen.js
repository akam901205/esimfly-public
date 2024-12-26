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
const packageColors = [['#2A2A2A', '#1E1E1E']];

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
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{region} Plans</Text>
      <View style={styles.headerIcon}>
        <Ionicons name="globe-outline" size={24} color="#FFFFFF" />
      </View>
    </View>
  );

 const renderPackageItem = ({ item, index }) => {
    const regionInfo = regions.find(r => r.name.toLowerCase() === region.toLowerCase());
    const RegionIcon = regionInfo ? regionInfo.image : null;
    const gradientColors = packageColors[index % packageColors.length];
    
    const displayData = item.data === 'Unlimited' || item.unlimited 
      ? 'Unlimited' 
      : `${adjustDataDisplay(item.data)} GB`;

    const networkInfo = processProviderNetworks(item);
    const highestSpeed = getHighestSpeed(item);
    const alternatives = item.alternatives || [];

    const navigateToDetails = () => {
      navigation.navigate('RegionalPackageDetails', {
        package: item,
        region: region
      });
    };

    return (
      <TouchableOpacity 
        onPress={navigateToDetails}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.packageItem}
        >
          <View style={styles.packageHeader}>
            <View style={styles.regionInfo}>
              {RegionIcon && <RegionIcon size={24} />}
              <Text style={styles.regionName}>{region}</Text>
            </View>
            {highestSpeed && (
              <View style={styles.speedContainer}>
                <Ionicons name="speedometer-outline" size={16} color="#FF6B6B" />
                <Text style={styles.speedText}>
                  {highestSpeed.toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.packageDetails}>
            <View>
              <Text style={styles.dataAmount}>{displayData}</Text>
              <Text style={styles.validityPeriod}>VALID FOR {item.duration}</Text>
              <TouchableOpacity
                onPress={() => handleNetworkPress(item)}
                style={[styles.buttonContainer, styles.countryButtonContainer]}
              >
                <LinearGradient
                  colors={[gradientColors[1], gradientColors[0]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.button, styles.countryButton]}
                >
                  <View style={styles.buttonContent}>
                    <Ionicons name="globe-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.buttonText}>
                      {networkInfo.countryCount} Countries
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.priceText}>${parseFloat(item.price).toFixed(2)}</Text>
              <TouchableOpacity onPress={navigateToDetails}>
                <LinearGradient
                  colors={[gradientColors[1], gradientColors[0]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.button, styles.buyButton]}
                >
                  <Text style={styles.buttonText}>BUY NOW</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

         {alternatives.length > 0 && (
		  <View style={styles.alternativesContainer}>
			{alternatives.map((pkg, i) => {
                const pkgNetworkInfo = processProviderNetworks(pkg);
                return (
                  <TouchableOpacity 
                    key={i}
                    style={styles.alternativeItem}
                    onPress={() => navigation.navigate('RegionalPackageDetails', {
                      package: pkg,
                      region: region
                    })}
                  >
                    <LinearGradient
                      colors={packageColors[(index + i + 1) % packageColors.length]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.alternativeGradient}
                    >
                      <View style={styles.alternativeContent}>
                        <View style={styles.alternativeLeft}>
                          <View style={styles.altProviderBadge}>
                            <Text style={styles.altProviderText}>
                              {pkg.id === item.id ? "Main Plan" : "Alternative Plan"}
                            </Text>
                          </View>
                          <View style={styles.altCoverageBadge}>
                            <Ionicons name="globe-outline" size={12} color="#BBBBBB" />
                            <Text style={styles.altCoverageText}>{pkgNetworkInfo.countryCount}</Text>
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
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </LinearGradient>
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
          <Text style={styles.noPackagesText}>No packages available for this selection.</Text>
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
    backgroundColor: '#121212',
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
  listContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 90 : 70,
  },
  packageItem: {
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
  },
  viewAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signalIcon: {
    marginRight: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: '#FF6B6B',
    fontFamily: 'Quicksand',
  },
  packageDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dataAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
  },
  validityPeriod: {
    fontSize: 14,
    color: '#BBBBBB',
    fontFamily: 'Quicksand',
    marginTop: 4,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF6B6B',
    fontFamily: 'Quicksand',
    marginBottom: 8,
  },
  buyButton: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    elevation: 3,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  buyButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
    padding: 16,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'Quicksand',
  },
 speedContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(255, 107, 107, 0.1)',
  borderRadius: 12,
  paddingHorizontal: 8,
  paddingVertical: 4,
},
speedText: {
  marginLeft: 4,
  fontSize: 12,
  color: '#FF6B6B',
  fontFamily: 'Quicksand',
},
networkContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 4,
},
networkText: {
  color: '#BBBBBB',
  fontSize: 12,
  fontFamily: 'Quicksand',
  marginLeft: 4,
},
  noPackagesText: {
    color: '#BBBBBB',
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'Quicksand',
    marginTop: 20,
  },
  listFooter: {
    height: 20,
  },
networkStatsContainer: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    color: '#BBBBBB',
    fontSize: 12,
    fontFamily: 'Quicksand',
    marginLeft: 4,
  },
  alternativesContainer: {
    marginTop: 12,
    gap: 8,
  },
  alternativeItem: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  alternativeGradient: {
    padding: 12,
  },
  alternativeContent: {
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  altProviderText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Quicksand',
  },
  altCoverageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  altCoverageText: {
    color: '#BBBBBB',
    fontSize: 12,
    fontFamily: 'Quicksand',
  },
  alternativeRight: {
    alignItems: 'flex-end',
  },
  altPriceText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Quicksand',
  },
  compareContainer: {
    marginTop: 4,
  },
  compareText: {
    fontSize: 12,
    fontFamily: 'Quicksand',
    fontWeight: 'bold',
  },
buttonContainer: {
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    elevation: 3,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    marginLeft: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
});

export default RegionalPackagesScreen;