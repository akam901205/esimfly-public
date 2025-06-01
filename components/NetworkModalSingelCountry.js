import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const NetworkModal = ({ visible, onClose, networks = [] }) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Reset position to 0 (full height) before showing
      slideAnim.setValue(0);
      scaleAnim.setValue(1);
      
      // Only animate fade in
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

  const groupedNetworks = networks.reduce((acc, network) => {
    if (network.type === 'speed') {
      acc.speed = network.value;
    } else {
      if (!acc.operators) acc.operators = [];
      acc.operators.push(network);
    }
    return acc;
  }, {});

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
                <MaterialCommunityIcons name="access-point-network" size={28} color="#FFFFFF" />
              </LinearGradient>
              
              <View style={styles.headerTextContainer}>
                <Text style={styles.modalTitle}>Network Coverage</Text>
                <Text style={styles.modalSubtitle}>
                  {groupedNetworks.operators?.length || 0} operators available
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

            {/* Quick Stats */}
            <View style={styles.quickStats}>
              <LinearGradient
                colors={['#FFF7ED', '#FEF3C7']}
                style={styles.statCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.statIcon}>
                  <Ionicons name="cellular" size={24} color="#F59E0B" />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statNumber}>
                    {groupedNetworks.operators?.length || 0}
                  </Text>
                  <Text style={styles.statLabel}>Networks</Text>
                </View>
              </LinearGradient>

              <LinearGradient
                colors={['#EFF6FF', '#DBEAFE']}
                style={styles.statCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.statIcon}>
                  <Ionicons name="speedometer" size={24} color="#3B82F6" />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statNumber}>
                    {groupedNetworks.speed || '5G/LTE'}
                  </Text>
                  <Text style={styles.statLabel}>Speed</Text>
                </View>
              </LinearGradient>
            </View>

            {/* Network List */}
            <ScrollView 
              style={styles.networkList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.networkListContent}
            >
              {groupedNetworks.operators?.length > 0 ? (
                <>
                  <Text style={styles.sectionTitle}>Available Networks</Text>
                  {groupedNetworks.operators.map((network, index) => (
                    <View key={index} style={styles.networkItem}>
                      <LinearGradient
                        colors={['#FFFFFF', '#F9FAFB']}
                        style={styles.networkCard}
                      >
                        <View style={styles.networkIconContainer}>
                          <LinearGradient
                            colors={['#FF6B00', '#FF8533']}
                            style={styles.networkIconGradient}
                          >
                            <Ionicons name="wifi" size={20} color="#FFFFFF" />
                          </LinearGradient>
                        </View>
                        
                        <View style={styles.networkInfo}>
                          <Text style={styles.networkName}>{network.value}</Text>
                          {network.speeds && (
                            <View style={styles.speedBadges}>
                              {(Array.isArray(network.speeds) ? network.speeds : [network.speeds]).map((speed, idx) => (
                                <View key={idx} style={styles.speedBadge}>
                                  <Text style={styles.speedBadgeText}>{speed}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                        
                        <View style={styles.networkStatus}>
                          <View style={styles.statusDot} />
                          <Text style={styles.statusText}>Active</Text>
                        </View>
                      </LinearGradient>
                    </View>
                  ))}
                </>
              ) : (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconContainer}>
                    <Ionicons name="cellular-outline" size={48} color="#9CA3AF" />
                  </View>
                  <Text style={styles.emptyTitle}>No Network Details</Text>
                  <Text style={styles.emptyDescription}>
                    Network information will be available after purchase
                  </Text>
                </View>
              )}
            </ScrollView>

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
  quickStats: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
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
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    marginTop: 2,
  },
  networkList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  networkListContent: {
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    marginBottom: 16,
    marginLeft: 4,
  },
  networkItem: {
    marginBottom: 12,
  },
  networkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  networkIconContainer: {
    marginRight: 14,
  },
  networkIconGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  networkInfo: {
    flex: 1,
  },
  networkName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    letterSpacing: -0.2,
  },
  speedBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 6,
  },
  speedBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  speedBadgeText: {
    fontSize: 12,
    color: '#C2410C',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  networkStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 15,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 22,
  },
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

export default NetworkModal;