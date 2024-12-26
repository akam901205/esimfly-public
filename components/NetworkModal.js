import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FlagIcon } from '../utils/countryData';

const NetworkModal = ({ visible, onClose, networks = [], locationNetworkList = [] }) => {
  const [activeTab, setActiveTab] = useState('coverage');

  // Filter out Sint Eustatius And Saba from the locationNetworkList
  const filteredLocationNetworkList = locationNetworkList.filter(
    country => country.locationName !== 'Sint Eustatius And Saba'
  );

  const getNetworkStats = () => {
    const operators = networks.filter(n => n.type !== 'speed');
    const speed = networks.find(n => n.type === 'speed')?.value || '4G/LTE';
    return { operators, speed };
  };

  const renderNetworksTab = () => {
    const { operators, speed } = getNetworkStats();

    return (
      <ScrollView style={styles.networkList}>
        <View style={styles.coverageCard}>
          <View style={styles.coverageHeader}>
            <View style={styles.coverageIcon}>
              <Ionicons name="cellular-outline" size={24} color="#FF6B6B" />
            </View>
            <Text style={styles.coverageTitle}>Network Coverage</Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Ionicons name="cellular-outline" size={20} color="#FF6B6B" />
              <Text style={styles.statValue}>
                {operators.length}
              </Text>
              <Text style={styles.statLabel}>Operators</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="speedometer-outline" size={20} color="#FF6B6B" />
              <Text style={styles.statValue}>
                {speed}
              </Text>
              <Text style={styles.statLabel}>Network Type</Text>
            </View>
          </View>

          <Text style={styles.coverageDescription}>
            This package provides coverage with {operators.length} operators 
            with {speed} connectivity where available.
          </Text>
        </View>

        {operators.map((network, index) => (
          <View key={index} style={styles.networkItem}>
            <Ionicons name="cellular-outline" size={20} color="#FF6B6B" style={styles.networkIcon} />
            <View style={styles.networkContent}>
              <Text style={styles.networkName}>{network.value}</Text>
              {network.speeds && (
                <Text style={styles.networkSpeed}>
                  {Array.isArray(network.speeds) ? network.speeds.join(', ') : network.speeds}
                </Text>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  const renderCountryItem = (country) => {
    const isSelected = selectedCountry?.locationName === country.locationName;
    
    return (
      <TouchableOpacity 
        style={[styles.countryItem, isSelected && styles.selectedCountryItem]}
        onPress={() => setSelectedCountry(isSelected ? null : country)}
      >
        <View style={styles.countryItemContent}>
          <View style={styles.countryFlag}>
            <FlagIcon 
              countryCode={country.countryCode}
              size={24}
            />
          </View>
          <View style={styles.countryItemInfo}>
            <Text style={styles.countryName}>{country.locationName}</Text>
            <Text style={styles.operatorCount}>
              {country.operatorList.length} {country.operatorList.length === 1 ? 'operator' : 'operators'}
            </Text>
          </View>
          <Text style={styles.networkTypeText}>
            {country.operatorList.some(op => op.networkType.includes('5G')) ? '5G' : '4G'}
          </Text>
        </View>
        
        {isSelected && (
          <View style={styles.operatorList}>
            {country.operatorList.map((operator, index) => (
              <View key={index} style={styles.operatorItem}>
                <Ionicons name="cellular-outline" size={16} color="#FF6B6B" />
                <Text style={styles.operatorName}>{operator.operatorName}</Text>
                <Text style={styles.operatorSpeed}>{operator.networkType}</Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const [selectedCountry, setSelectedCountry] = useState(null);

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

          {activeTab === 'networks' ? renderNetworksTab() : (
            <ScrollView style={styles.networkList}>
              {filteredLocationNetworkList?.map((country, index) => (
                <View key={index}>{renderCountryItem(country)}</View>
              ))}
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
  coverageCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  coverageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  coverageIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  coverageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#333',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#888',
    fontFamily: 'Quicksand',
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#333',
  },
  coverageDescription: {
    fontSize: 14,
    color: '#888',
    fontFamily: 'Quicksand',
    lineHeight: 20,
  },
  networkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  networkIcon: {
    marginRight: 12,
  },
  networkContent: {
    flex: 1,
  },
  networkName: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
    fontWeight: '500',
  },
  networkSpeed: {
    fontSize: 14,
    color: '#FF6B6B',
    fontFamily: 'Quicksand',
    marginTop: 4,
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
});

export default NetworkModal;