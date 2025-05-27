import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FlagIcon, countries } from '../utils/countryData';
import { colors } from '../theme/colors';
import { getNetworks, formatLocationNetworkList } from '../utils/PackageFilters';

const ITEMS_PER_PAGE = 15;

const ICON_COLORS = {
  cellular: '#32CD32',
  speed: '#32CD32',
  closeButton: '#FF3B30',
};

const NetworkModalGlobal = ({ visible, onClose, packageData, globalPackageName }) => {
  const [activeTab, setActiveTab] = useState('coverage');
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [displayedItems, setDisplayedItems] = useState(ITEMS_PER_PAGE);

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

  const renderCountryItem = useCallback(({ item: country }) => {
    const isSelected = selectedCountry?.locationName === country?.locationName;
    
    return (
      <TouchableOpacity 
        style={[styles.countryItem, isSelected && styles.selectedCountryItem]}
        onPress={() => setSelectedCountry(isSelected ? null : country)}
      >
        <View style={styles.countryItemContent}>
          <View style={styles.countryFlag}>
            <FlagIcon 
              countryCode={country?.countryCode}
              size={24}
            />
          </View>
          <View style={styles.countryItemInfo}>
            <Text style={styles.countryName}>{country?.locationName}</Text>
            <Text style={styles.operatorCount}>
              {country?.operatorList?.length || 0} {(country?.operatorList?.length || 0) === 1 ? 'operator' : 'operators'}
            </Text>
          </View>
          <Text style={[styles.networkTypeText, { color: ICON_COLORS.cellular }]}>
            {country?.operatorList?.some(op => op?.networkType?.includes('5G')) ? '5G' : '4G'}
          </Text>
        </View>
        
        {isSelected && country?.operatorList && (
          <View style={styles.operatorList}>
            {country.operatorList.map((operator, index) => (
              <View key={index} style={styles.operatorItem}>
                <Ionicons name="cellular-outline" size={16} color={ICON_COLORS.cellular} />
                <Text style={styles.operatorName}>{operator?.operatorName}</Text>
                <Text style={[styles.operatorSpeed, { color: ICON_COLORS.cellular }]}>
                  {operator?.networkType}
                </Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  }, [selectedCountry]);

  const renderNetworksTab = useMemo(() => {
    const totalOperators = processCountries.reduce((sum, country) => 
      sum + (country?.operatorList?.length || 0), 0
    );

    return (
      <View>
        <View style={styles.networkItem}>
          <Ionicons name="speedometer-outline" size={20} color={ICON_COLORS.cellular} style={styles.networkIcon} />
          <View style={styles.networkItemContent}>
            <Text style={styles.networkName}>Network Speed</Text>
            <Text style={[styles.networkSpeed, { color: ICON_COLORS.cellular }]}>
              {packageData?.speed || '4G/LTE'}
            </Text>
          </View>
        </View>
        <View style={styles.networkItem}>
          <Ionicons name="globe-outline" size={20} color={ICON_COLORS.cellular} style={styles.networkIcon} />
          <View style={styles.networkItemContent}>
            <Text style={styles.networkName}>Global Coverage</Text>
            <Text style={[styles.networkLocation, { color: ICON_COLORS.cellular }]}>
              {processCountries.length} Countries, {totalOperators} Networks
            </Text>
          </View>
        </View>
      </View>
    );
  }, [packageData?.speed, processCountries]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={[styles.iconContainer, { backgroundColor: `${ICON_COLORS.cellular}15` }]}>
              <Ionicons name="cellular-outline" size={24} color={ICON_COLORS.cellular} />
            </View>
            <Text style={styles.modalTitle}>Networks & Coverage</Text>
            <TouchableOpacity 
              onPress={onClose} 
              style={[styles.closeButton, { backgroundColor: `${ICON_COLORS.closeButton}15` }]}
            >
              <Ionicons name="close" size={24} color={ICON_COLORS.closeButton} />
            </TouchableOpacity>
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'coverage' && styles.activeTab]}
              onPress={() => setActiveTab('coverage')}
            >
              <Text style={[styles.tabText, activeTab === 'coverage' && styles.activeTabText]}>
                Coverage
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'networks' && styles.activeTab]}
              onPress={() => setActiveTab('networks')}
            >
              <Text style={[styles.tabText, activeTab === 'networks' && styles.activeTabText]}>
                Networks
              </Text>
            </TouchableOpacity>
          </View>

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
              style={styles.networkList}
            />
          ) : (
            <ScrollView style={styles.networkList}>
              {renderNetworksTab}
            </ScrollView>
          )}

          <TouchableOpacity 
            style={styles.gotItButton}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.gotItText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: '50%',
    maxHeight: '90%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 0,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    flex: 1,
    fontFamily: 'Quicksand',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderRadius: 12,
    backgroundColor: colors.background.tertiary,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: colors.stone[800],
  },
  tabText: {
    fontSize: 16,
    color: colors.text.primary,
    fontFamily: 'Quicksand',
  },
  activeTabText: {
    color: colors.background.primary,
    fontWeight: 'bold',
  },
  networkList: {
    marginBottom: 20,
  },
  networkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  networkIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  networkItemContent: {
    flex: 1,
  },
  networkName: {
    fontSize: 16,
    color: colors.text.primary,
    fontFamily: 'Quicksand',
    fontWeight: '500',
  },
  networkLocation: {
    fontSize: 14,
    fontFamily: 'Quicksand',
    marginTop: 2,
  },
  networkSpeed: {
    fontSize: 14,
    fontFamily: 'Quicksand',
    marginTop: 2,
  },
  countryItem: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  selectedCountryItem: {
    borderColor: ICON_COLORS.cellular,
  },
  countryItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryFlag: {
    marginRight: 12,
  },
  countryItemInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 16,
    color: colors.text.primary,
    fontFamily: 'Quicksand',
    fontWeight: 'bold',
  },
  operatorCount: {
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: 'Quicksand',
    marginTop: 2,
  },
  networkTypeText: {
    fontSize: 14,
    fontFamily: 'Quicksand',
  },
  operatorList: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    paddingTop: 12,
  },
 operatorItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
    },
    operatorName: {
      fontSize: 14,
      color: colors.text.primary,
      fontFamily: 'Quicksand',
      marginLeft: 8,
      flex: 1,
    },
    operatorSpeed: {
      fontSize: 14,
      fontFamily: 'Quicksand',
    },
  gotItButton: {
    backgroundColor: colors.stone[800],
    borderRadius: 25,
    padding: 16,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: Platform.OS === 'ios' ? 10 : 0,
  },
  gotItText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.background.primary,
    fontFamily: 'Quicksand',
  },
    noNetworkText: {
      fontSize: 16,
      color: colors.text.secondary,
      textAlign: 'center',
      fontFamily: 'Quicksand',
      marginTop: 20,
    },
  });

export default NetworkModalGlobal;