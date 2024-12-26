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

const NetworkModalGlobal = ({ visible, onClose, packageData, globalPackageName }) => {
  const [activeTab, setActiveTab] = useState('coverage');

  const getCountryCount = () => {
    const pkgName = packageData?.name?.toLowerCase() || '';
    if (pkgName.includes('139')) return 139;
    if (pkgName.includes('138')) return 138;
    if (pkgName.includes('106')) return 106;
    if (pkgName.includes('120+')) return 120;
    return 120;
  };

  const renderNetworkItem = (network) => {
    return (
      <View style={styles.networkItem}>
        <Ionicons name={network.icon || "cellular-outline"} size={20} color="#FF6B6B" style={styles.networkIcon} />
        <View style={styles.networkItemContent}>
          <Text style={styles.networkName}>
            {network.type === 'speed' ? `${network.value} Network` : network.value}
          </Text>
          {network.type === 'coverage' && (
            <Text style={styles.networkLocation}>Global Coverage</Text>
          )}
          {network.speeds && network.speeds.length > 0 && (
            <Text style={styles.networkSpeed}>
              {Array.isArray(network.speeds) ? network.speeds.join(', ') : network.speeds}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderGlobalCoverage = () => {
    const countryCount = getCountryCount();
    
    return (
      <View style={styles.globalCoverageContainer}>
        <View style={styles.coverageHeader}>
          <View style={styles.coverageIcon}>
            <Ionicons name="globe-outline" size={24} color="#FF6B6B" />
          </View>
          <Text style={styles.coverageTitle}>Global Coverage</Text>
        </View>
        
        <View style={styles.coverageStats}>
          <View style={styles.statItem}>
            <Ionicons name="globe-outline" size={20} color="#FF6B6B" />
            <Text style={styles.statValue}>{countryCount}</Text>
            <Text style={styles.statLabel}>Countries</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="cellular-outline" size={20} color="#FF6B6B" />
            <Text style={styles.statValue}>
              {packageData?.speed || '4G/LTE'}
            </Text>
            <Text style={styles.statLabel}>Network Type</Text>
          </View>
        </View>

        <View style={styles.coverageDescription}>
          <Text style={styles.descriptionText}>
            This package provides coverage across {countryCount} countries worldwide with {packageData?.speed || '4G/LTE'} connectivity where available.
          </Text>
        </View>
      </View>
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

          <ScrollView style={styles.networkList}>
            {activeTab === 'networks' ? (
              <>
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
                    <Text style={styles.networkLocation}>{getCountryCount()} Countries</Text>
                  </View>
                </View>
              </>
            ) : (
              renderGlobalCoverage()
            )}
          </ScrollView>

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
  // Copy existing styles from NetworkModal and add new ones
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
  globalCoverageContainer: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
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
  coverageStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#333',
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
    paddingTop: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#888',
    fontFamily: 'Quicksand',
    lineHeight: 20,
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

export default NetworkModalGlobal;