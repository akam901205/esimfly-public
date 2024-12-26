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

const ITEMS_PER_PAGE = 15;

const NetworkModalGlobal = ({ visible, onClose, packageData, globalPackageName }) => {
  const [activeTab, setActiveTab] = useState('coverage');
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [displayedItems, setDisplayedItems] = useState(ITEMS_PER_PAGE);

  const getCountryName = useCallback((code) => {
    if (!code) return code;
    const foundCountry = countries.find(c => c.id === code.toLowerCase().trim());
    return foundCountry ? foundCountry.name : code;
  }, []);

  const processCountries = useMemo(() => {
    let countriesList = [];
    
    if (packageData.provider === 'esimgo') {
      const networksByCountry = new Map();
      
      (packageData.networks || []).forEach(countryNetwork => {
        if (countryNetwork?.networks && Array.isArray(countryNetwork.networks)) {
          const countryName = countryNetwork.country_name;
          const countryIso = countryNetwork.country_iso;
          
          if (!networksByCountry.has(countryIso)) {
            networksByCountry.set(countryIso, []);
          }
          
          countryNetwork.networks.forEach(network => {
            networksByCountry.get(countryIso).push({
              operatorName: network.name || 'Network Operator',
              networkType: network.type || packageData.speed || '4G'
            });
          });
        }
      });

      countriesList = (packageData.coverage || []).map(country => {
        const countryIso = country?.iso || '';
        const networks = networksByCountry.get(countryIso) || [{
          operatorName: 'Default Network',
          networkType: packageData.speed || '4G'
        }];

        return {
          locationName: getCountryName(countryIso),
          countryCode: countryIso?.toLowerCase(),
          operatorList: networks
        };
      });

    } else if (packageData.provider === 'airalo') {
      const uniqueCountries = new Set();
      (packageData.networks || []).forEach(network => {
        if (network?.country && !uniqueCountries.has(network.country)) {
          uniqueCountries.add(network.country);
          const networksList = (packageData.networks || [])
            .filter(n => n.country === network.country)
            .map(n => ({
              operatorName: n?.name || 'Network Operator',
              networkType: n?.types?.[0] || '4G'
            }));
          
          countriesList.push({
            locationName: getCountryName(network.country),
            countryCode: network.country.toLowerCase(),
            operatorList: networksList
          });
        }
      });
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
      
      Object.entries(networksByLocation).forEach(([locationName, networks]) => {
        const countryCode = packageData.regionCountries.find(code => 
          getCountryName(code) === locationName
        );
        
        if (networks.size > 0) {
          const operatorList = Array.from(networks).map(networkName => ({
            operatorName: networkName,
            networkType: packageData.speed || '4G'
          }));

          countriesList.push({
            locationName,
            countryCode: (countryCode || '').toLowerCase(),
            operatorList
          });
        }
      });

      packageData.regionCountries.forEach(countryCode => {
        const locationName = getCountryName(countryCode);
        if (!networksByLocation[locationName]) {
          countriesList.push({
            locationName,
            countryCode: countryCode.toLowerCase(),
            operatorList: []
          });
        }
      });
    }

    return countriesList.sort((a, b) => 
      (a.locationName || '').localeCompare(b.locationName || '')
    );
  }, [packageData, getCountryName]);

  const renderNetworkItem = useCallback(({ item: network }) => {
    return (
      <View style={styles.networkItem}>
        <Ionicons name={network.icon || "cellular-outline"} size={20} color="#FF6B6B" style={styles.networkIcon} />
        <View style={styles.networkItemContent}>
          <Text style={styles.networkName}>
            {network.type === 'speed' ? `${network.value} Network` : network.value}
          </Text>
          {network.location && (
            <Text style={styles.networkLocation}>{network.location}</Text>
          )}
          {network.speeds && (
            <Text style={styles.networkSpeed}>
              {Array.isArray(network.speeds) ? network.speeds.join(', ') : network.speeds}
            </Text>
          )}
        </View>
      </View>
    );
  }, []);

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
          <Text style={styles.networkTypeText}>
            {country?.operatorList?.some(op => op?.networkType?.includes('5G')) ? '5G' : '4G'}
          </Text>
        </View>
        
        {isSelected && country?.operatorList && (
          <View style={styles.operatorList}>
            {country.operatorList.map((operator, index) => (
              <View key={index} style={styles.operatorItem}>
                <Ionicons name="cellular-outline" size={16} color="#FF6B6B" />
                <Text style={styles.operatorName}>{operator?.operatorName}</Text>
                <Text style={styles.operatorSpeed}>{operator?.networkType}</Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  }, [selectedCountry]);

  const handleLoadMore = () => {
    setDisplayedItems(prev => prev + ITEMS_PER_PAGE);
  };

  const renderNetworksTab = useMemo(() => {
    const totalOperators = processCountries.reduce((sum, country) => 
      sum + (country?.operatorList?.length || 0), 0
    );

    return (
      <View>
        <View style={styles.networkItem}>
          <Ionicons name="speedometer-outline" size={20} color="#FF6B6B" style={styles.networkIcon} />
          <View style={styles.networkItemContent}>
            <Text style={styles.networkName}>Network Speed</Text>
            <Text style={styles.networkSpeed}>{packageData?.speed || '4G/LTE'}</Text>
          </View>
        </View>
        <View style={styles.networkItem}>
          <Ionicons name="globe-outline" size={20} color="#FF6B6B" style={styles.networkIcon} />
          <View style={styles.networkItemContent}>
            <Text style={styles.networkName}>Global Coverage</Text>
            <Text style={styles.networkLocation}>
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
            <View style={styles.iconContainer}>
              <Ionicons name="cellular-outline" size={24} color="#FF6B6B" />
            </View>
            <Text style={styles.modalTitle}>Networks & Coverage</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
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
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    fontFamily: 'Quicksand',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderRadius: 12,
    backgroundColor: '#2A2A2A',
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#FF6B6B',
  },
  tabText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
  },
  activeTabText: {
    fontWeight: 'bold',
  },
  networkList: {
    marginBottom: 20,
  },
  networkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
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
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
    fontWeight: '500',
  },
  networkLocation: {
    fontSize: 14,
    color: '#888',
    fontFamily: 'Quicksand',
    marginTop: 2,
  },
  networkSpeed: {
    fontSize: 14,
    color: '#FF6B6B',
    fontFamily: 'Quicksand',
    marginTop: 2,
  },
  countryNetworkGroup: {
    marginBottom: 20,
  },
  countryNetworkTitle: {
    fontSize: 18,
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
    fontWeight: 'bold',
    marginBottom: 8,
    paddingLeft: 4,
  },
  countryItem: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  selectedCountryItem: {
    borderColor: '#FF6B6B',
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
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
    fontWeight: 'bold',
  },
  operatorCount: {
    fontSize: 14,
    color: '#888',
    fontFamily: 'Quicksand',
    marginTop: 2,
  },
  networkTypeText: {
    fontSize: 14,
    color: '#FF6B6B',
    fontFamily: 'Quicksand',
  },
  operatorList: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 12,
  },
  operatorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  operatorName: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
    marginLeft: 8,
    flex: 1,
  },
  operatorSpeed: {
    fontSize: 14,
    color: '#FF6B6B',
    fontFamily: 'Quicksand',
  },
  gotItButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 25,
    padding: 16,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: Platform.OS === 'ios' ? 10 : 0,
  },
  gotItText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
  },
  noNetworkText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    fontFamily: 'Quicksand',
    marginTop: 20,
  },
});

export default NetworkModalGlobal;