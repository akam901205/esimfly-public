import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  FlatList,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { FlagIcon, countries } from '../utils/countryData';
import { colors } from '../theme/colors';
import { getNetworks, formatLocationNetworkList } from '../utils/PackageFilters';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ITEMS_PER_PAGE = 15;

const NetworkModalGlobal = ({ visible, onClose, packageData, globalPackageName }) => {
  const [activeTab, setActiveTab] = useState('coverage');
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [displayedItems, setDisplayedItems] = useState(ITEMS_PER_PAGE);
  
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (visible) {
      slideAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: screenHeight,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const getCountryName = useCallback((code) => {
    if (!code) return code;
    const foundCountry = countries.find(c => c.id === code.toLowerCase().trim());
    return foundCountry ? foundCountry.name : code;
  }, []);

  // Helper function to get country code
  const getCountryCode = useCallback((countryName) => {
    if (!countryName) return '';
    
    const country = countries.find(c => 
      c.name.toLowerCase() === countryName.toLowerCase()
    );
    
    if (country) return country.id.toLowerCase();
    
    const countryMappings = {
      'united states': 'us',
      'united kingdom': 'gb',
      'south korea': 'kr',
      'north macedonia': 'mk',
      'czech republic': 'cz',
      'bosnia and herzegovina': 'ba',
      'trinidad and tobago': 'tt',
      'antigua and barbuda': 'ag',
      'saint kitts and nevis': 'kn',
      'saint vincent and the grenadines': 'vc',
      'democratic republic of the congo': 'cd',
      'central african republic': 'cf'
    };
    
    const normalized = countryName.toLowerCase();
    return countryMappings[normalized] || countryName.substring(0, 2).toLowerCase();
  }, []);

  const processCountries = useMemo(() => {
    // Check if we have processed data
    if (packageData.processedLocationNetworkList) {
      return packageData.processedLocationNetworkList;
    }
    
    // Otherwise, process the data
    const provider = packageData.provider || (globalPackageName?.toLowerCase().includes('discover') ? 'airalo' : 
                                             globalPackageName?.toLowerCase().includes('106') ? 'esimgo' : 'esimaccess');
    
    const packageWithProvider = {
      ...packageData,
      provider
    };
    
    let locationNetworkList = formatLocationNetworkList(packageWithProvider);
    
    // If we have coverages data from the API, use it
    if (packageData.coverages && Array.isArray(packageData.coverages) && packageData.coverages.length > 0) {
      // Create country name map from regionCountries if available
      const countryNameMap = new Map();
      if (packageData.regionCountries && Array.isArray(packageData.regionCountries)) {
        packageData.regionCountries.forEach(country => {
          if (country.code) {
            countryNameMap.set(country.code.toLowerCase(), country.name);
            countryNameMap.set(country.code.toUpperCase(), country.name);
          }
        });
      }
      
      return packageData.coverages.map(coverage => {
        // Try to get the proper country name
        let countryName = coverage.name;
        const countryCode = coverage.code || coverage.name;
        
        // If coverage.name is a country code, map it to the full name
        if (countryName && countryName.length <= 3 && countryNameMap.size > 0) {
          const mappedName = countryNameMap.get(countryName) || countryNameMap.get(countryName.toUpperCase()) || countryNameMap.get(countryName.toLowerCase());
          if (mappedName) {
            countryName = mappedName;
          }
        }
        
        return {
          locationName: countryName,
          countryCode: countryCode?.toLowerCase() || getCountryCode(countryName),
          operatorList: coverage.networks && coverage.networks.length > 0 
            ? coverage.networks.map(network => ({
                operatorName: network.name || 'Network',
                networkType: network.type || packageData.speed || '4G'
              }))
            : [{
                operatorName: 'Multiple networks available',
                networkType: packageData.speed || '4G'
              }]
        };
      });
    }
    
    // If we have regionCountries, use it to fix country names
    if (packageData.regionCountries && Array.isArray(packageData.regionCountries) && packageData.regionCountries.length > 0) {
      // Create a map of country codes to names
      const countryNameMap = new Map();
      packageData.regionCountries.forEach(country => {
        if (country.code) {
          countryNameMap.set(country.code.toLowerCase(), country.name);
          countryNameMap.set(country.code.toUpperCase(), country.name); // Also map uppercase
          // Also map by name in case locationName is already a name
          countryNameMap.set(country.name.toLowerCase(), country.name);
        }
      });
      
      console.log('[DEBUG] Sample locationNetworkList before name mapping:', locationNetworkList.slice(0, 3));
      console.log('[DEBUG] Country name map sample:', Array.from(countryNameMap.entries()).slice(0, 5));
      
      // Update the location names
      locationNetworkList = locationNetworkList.map(item => {
        let countryName = item.locationName;
        
        // Try multiple approaches to find the country name
        const possibleKeys = [
          item.locationName,
          item.locationName?.toLowerCase(),
          item.locationName?.toUpperCase(),
          item.countryCode,
          item.countryCode?.toLowerCase(),
          item.countryCode?.toUpperCase()
        ].filter(Boolean);
        
        for (const key of possibleKeys) {
          if (countryNameMap.has(key)) {
            countryName = countryNameMap.get(key);
            console.log(`[DEBUG] Mapped ${item.locationName} -> ${countryName}`);
            break;
          }
        }
        
        return {
          ...item,
          locationName: countryName
        };
      });
      
      console.log('[DEBUG] Sample locationNetworkList after name mapping:', locationNetworkList.slice(0, 3));
    }
    
    return locationNetworkList;
  }, [packageData, globalPackageName, getCountryCode]);

  const handleLoadMore = () => {
    setDisplayedItems(prev => prev + ITEMS_PER_PAGE);
  };
  
  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const renderCountryItem = useCallback(({ item: country }) => {
    const isSelected = selectedCountry?.locationName === country?.locationName;
    
    return (
      <TouchableOpacity 
        style={[styles.countryItem, isSelected && styles.selectedCountryItem]}
        onPress={() => setSelectedCountry(isSelected ? null : country)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={isSelected ? ['#FFF7ED', '#FEF3C7'] : ['#FFFFFF', '#F9FAFB']}
          style={styles.countryGradient}
        >
          <View style={styles.countryItemContent}>
            <View style={styles.countryFlag}>
              <FlagIcon 
                countryCode={country?.countryCode}
                size={36}
              />
            </View>
            <View style={styles.countryItemInfo}>
              <Text style={styles.countryName}>{country?.locationName}</Text>
              <View style={styles.operatorBadge}>
                <Ionicons name="wifi" size={14} color="#6B7280" />
                <Text style={styles.operatorCount}>
                  {country?.operatorList?.length || 0} networks
                </Text>
              </View>
            </View>
            <View style={[styles.networkTypeBadge, country?.operatorList?.some(op => op?.networkType?.includes('5G')) && styles.badge5G]}>
              <Ionicons name="speedometer" size={16} color={country?.operatorList?.some(op => op?.networkType?.includes('5G')) ? '#3B82F6' : '#FF6B00'} />
              <Text style={[styles.networkTypeText, country?.operatorList?.some(op => op?.networkType?.includes('5G')) && styles.text5G]}>
                {country?.operatorList?.some(op => op?.networkType?.includes('5G')) ? '5G' : '4G'}
              </Text>
            </View>
          </View>
          
          {isSelected && country?.operatorList && (
            <View style={styles.operatorList}>
              {country.operatorList.map((operator, idx) => (
                <View key={idx} style={styles.operatorItem}>
                  <LinearGradient
                    colors={['#FF6B00', '#FF8533']}
                    style={styles.operatorIcon}
                  >
                    <Ionicons name="cellular" size={12} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={styles.operatorName}>{operator?.operatorName}</Text>
                  <View style={styles.operatorSpeedBadge}>
                    <Text style={styles.operatorSpeed}>
                      {operator?.networkType}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }, [selectedCountry]);

  const renderNetworksTab = useMemo(() => {
    const totalOperators = processCountries.reduce((sum, country) => 
      sum + (country?.operatorList?.length || 0), 0
    );

    return (
      <View style={styles.networksTabContent}>
        <LinearGradient
          colors={['#EFF6FF', '#DBEAFE']}
          style={styles.networkStatCard}
        >
          <View style={styles.networkStatIcon}>
            <Ionicons name="speedometer" size={28} color="#3B82F6" />
          </View>
          <View style={styles.networkStatContent}>
            <Text style={styles.networkStatLabel}>Network Speed</Text>
            <Text style={styles.networkStatValue}>
              {packageData?.speed || '5G/LTE'}
            </Text>
          </View>
        </LinearGradient>
        
        <LinearGradient
          colors={['#F0FDF4', '#D1FAE5']}
          style={styles.networkStatCard}
        >
          <View style={styles.networkStatIcon}>
            <Ionicons name="globe" size={28} color="#10B981" />
          </View>
          <View style={styles.networkStatContent}>
            <Text style={styles.networkStatLabel}>Global Coverage</Text>
            <Text style={styles.networkStatValue}>
              {processCountries.length} Countries
            </Text>
            <Text style={styles.networkStatSubtext}>
              {totalOperators} Total Networks
            </Text>
          </View>
        </LinearGradient>
      </View>
    );
  }, [packageData?.speed, processCountries]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View 
        style={[
          styles.modalOverlay,
          {
            opacity: fadeAnim,
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={handleClose}
        />
        
        <Animated.View 
          style={[
            styles.modalContainer,
            {
              transform: [
                { translateY: slideAnim }
              ],
            }
          ]}
        >
          <LinearGradient
            colors={['#FFFFFF', '#FAFAFA']}
            style={styles.modalContent}
          >
            {/* Drag Indicator */}
            <View style={styles.dragIndicator} />
            
            {/* Header */}
            <View style={styles.modalHeader}>
              <LinearGradient
                colors={['#FF6B00', '#FF8533']}
                style={styles.headerIconContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="earth" size={28} color="#FFFFFF" />
              </LinearGradient>
              
              <View style={styles.headerTextContainer}>
                <Text style={styles.modalTitle}>Global Coverage</Text>
                <Text style={styles.modalSubtitle}>
                  {processCountries.length} countries worldwide
                </Text>
              </View>
              
              <TouchableOpacity 
                onPress={handleClose} 
                style={styles.closeButton}
                activeOpacity={0.7}
              >
                <BlurView intensity={100} tint="light" style={styles.closeButtonBlur}>
                  <Ionicons name="close" size={22} color="#374151" />
                </BlurView>
              </TouchableOpacity>
            </View>

            {/* Tab Switcher */}
            <View style={styles.tabContainer}>
              <LinearGradient
                colors={['#F3F4F6', '#E5E7EB']}
                style={styles.tabBackground}
              >
                <TouchableOpacity 
                  style={[styles.tab, activeTab === 'coverage' && styles.activeTab]}
                  onPress={() => setActiveTab('coverage')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, activeTab === 'coverage' && styles.activeTabText]}>
                    Coverage
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tab, activeTab === 'networks' && styles.activeTab]}
                  onPress={() => setActiveTab('networks')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, activeTab === 'networks' && styles.activeTabText]}>
                    Networks
                  </Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>

            {/* Content */}
            {activeTab === 'coverage' ? (
              <FlatList
                data={processCountries.slice(0, displayedItems)}
                renderItem={renderCountryItem}
                keyExtractor={(item, index) => `${item?.countryCode}-${index}`}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                initialNumToRender={ITEMS_PER_PAGE}
                maxToRenderPerBatch={ITEMS_PER_PAGE}
                windowSize={5}
                style={styles.contentList}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              />
            ) : (
              <ScrollView 
                style={styles.contentList}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              >
                {renderNetworksTab}
              </ScrollView>
            )}

            {/* Bottom Action */}
            <View style={styles.bottomContainer}>
              <TouchableOpacity 
                style={styles.gotItButton}
                onPress={handleClose}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[colors.stone[800], colors.stone[700]]}
                  style={styles.gotItButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.gotItText}>Got it</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: '100%',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '100%',
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  dragIndicator: {
    width: 48,
    height: 5,
    backgroundColor: '#D1D5DB',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    marginTop: 2,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  closeButtonBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tabBackground: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tabText: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FF6B00',
    fontWeight: '700',
  },
  contentList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listContent: {
    paddingBottom: 20,
  },
  // Country item styles
  countryItem: {
    marginBottom: 12,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  selectedCountryItem: {
    shadowColor: '#FF6B00',
    shadowOpacity: 0.2,
    elevation: 6,
  },
  countryGradient: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  countryItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  countryFlag: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  countryItemInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 17,
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    fontWeight: '700',
    marginBottom: 4,
  },
  operatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  operatorCount: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    fontWeight: '500',
  },
  networkTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  badge5G: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  networkTypeText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    fontWeight: '700',
    color: '#C2410C',
  },
  text5G: {
    color: '#2563EB',
  },
  operatorList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
  },
  operatorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  operatorIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  operatorName: {
    fontSize: 14,
    color: '#374151',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    flex: 1,
    fontWeight: '500',
  },
  operatorSpeedBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  operatorSpeed: {
    fontSize: 12,
    color: '#C2410C',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  // Networks tab styles
  networksTabContent: {
    paddingTop: 10,
    gap: 16,
  },
  networkStatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  networkStatIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  networkStatContent: {
    flex: 1,
  },
  networkStatLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    marginBottom: 4,
  },
  networkStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  networkStatSubtext: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    marginTop: 2,
  },
  // Bottom container
  bottomContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  gotItButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.stone[800],
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  gotItButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  gotItText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    letterSpacing: 0.3,
  },
});

export default NetworkModalGlobal;