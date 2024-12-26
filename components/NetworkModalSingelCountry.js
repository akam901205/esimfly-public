import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const NetworkModal = ({ visible, onClose, networks = [] }) => {
  // Group networks by type (speed and operators)
  const groupedNetworks = networks.reduce((acc, network) => {
    if (network.type === 'speed') {
      acc.speed = network.value;
    } else {
      if (!acc.operators) acc.operators = [];
      acc.operators.push(network);
    }
    return acc;
  }, {});

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
            <Text style={styles.modalTitle}>Supported Networks</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

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
                    {groupedNetworks.operators?.length || 0}
                  </Text>
                  <Text style={styles.statLabel}>Operators</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Ionicons name="speedometer-outline" size={20} color="#FF6B6B" />
                  <Text style={styles.statValue}>
                    {groupedNetworks.speed || '4G/LTE'}
                  </Text>
                  <Text style={styles.statLabel}>Network Type</Text>
                </View>
              </View>

              <Text style={styles.coverageDescription}>
                This package provides coverage with {groupedNetworks.operators?.length || 0} operators 
                with {groupedNetworks.speed || '4G/LTE'} connectivity where available.
              </Text>
            </View>

            {groupedNetworks.operators?.map((network, index) => (
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

          <TouchableOpacity style={styles.gotItButton} onPress={onClose}>
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
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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
  noNetworkText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    fontFamily: 'Quicksand',
  },
  gotItButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 25,
    padding: 16,
    alignItems: 'center',
    marginTop: 'auto',
  },
  gotItText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
  },
});

export default NetworkModal;