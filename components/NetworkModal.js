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
import { colors } from '../theme/colors';

const ICON_COLORS = {
  cellular: '#32CD32',
  speed: '#32CD32',
  closeButton: '#FF3B30',
};

const NetworkModal = ({ visible, onClose, networks = [], locationNetworkList = [] }) => {
  const [activeTab, setActiveTab] = useState('coverage');
  const [selectedCountry, setSelectedCountry] = useState(null);

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
            <View style={[styles.coverageIcon, { backgroundColor: `${ICON_COLORS.cellular}15` }]}>
              <Ionicons name="cellular-outline" size={24} color={ICON_COLORS.cellular} />
            </View>
            <Text style={styles.coverageTitle}>Network Coverage</Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Ionicons name="cellular-outline" size={20} color={ICON_COLORS.cellular} />
              <Text style={[styles.statValue, { color: ICON_COLORS.cellular }]}>
                {operators.length}
              </Text>
              <Text style={styles.statLabel}>Operators</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="speedometer-outline" size={20} color={ICON_COLORS.speed} />
              <Text style={[styles.statValue, { color: ICON_COLORS.speed }]}>
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
            <Ionicons 
              name="cellular-outline" 
              size={20} 
              color={ICON_COLORS.cellular} 
              style={styles.networkIcon} 
            />
            <View style={styles.networkContent}>
              <Text style={styles.networkName}>{network.value}</Text>
              {network.speeds && (
                <Text style={[styles.networkSpeed, { color: ICON_COLORS.speed }]}>
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
          <Text style={[styles.networkTypeText, { color: ICON_COLORS.cellular }]}>
            {country.operatorList.some(op => op.networkType.includes('5G')) ? '5G' : '4G'}
          </Text>
        </View>
        
        {isSelected && (
          <View style={styles.operatorList}>
            {country.operatorList.map((operator, index) => (
              <View key={index} style={styles.operatorItem}>
                <Ionicons name="cellular-outline" size={16} color={ICON_COLORS.cellular} />
                <Text style={styles.operatorName}>{operator.operatorName}</Text>
                <Text style={[styles.operatorSpeed, { color: ICON_COLORS.speed }]}>
                  {operator.networkType}
                </Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

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
    backgroundColor: colors.background.headerIcon,
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
    backgroundColor: colors.background.headerIcon,
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
    color: colors.stone[50],
    fontWeight: 'bold',
  },
  networkList: {
    marginBottom: 20,
  },
  coverageCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border.light,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: colors.background.headerIcon,
  },
  coverageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    fontFamily: 'Quicksand',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border.light,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    fontFamily: 'Quicksand',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: 'Quicksand',
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: colors.border.light,
  },
  coverageDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: 'Quicksand',
    lineHeight: 20,
  },
  networkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  networkIcon: {
    marginRight: 12,
  },
  networkContent: {
    flex: 1,
  },
  networkName: {
    fontSize: 16,
    color: colors.text.primary,
    fontFamily: 'Quicksand',
    fontWeight: '500',
  },
  networkSpeed: {
    fontSize: 14,
    fontFamily: 'Quicksand',
    marginTop: 4,
    color: colors.text.secondary,
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
    borderColor: colors.stone[800],
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
    color: colors.text.secondary,
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
    color: colors.text.secondary,
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
});

export default NetworkModal;