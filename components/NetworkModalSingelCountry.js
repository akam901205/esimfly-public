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

const NetworkModal = ({ visible, onClose, networks = [] }) => {
  // Get dimensions inside component to ensure they're available
  const [dimensions, setDimensions] = React.useState(() => {
    const { width, height } = Dimensions.get('window');
    return { width: width || 375, height: height || 812 };
  });
  
  // Get styles with current dimensions
  const styles = getStyles(dimensions);
  
  React.useEffect(() => {
    const updateDimensions = ({ window }) => {
      setDimensions({ width: window.width || 375, height: window.height || 812 });
    };
    
    const subscription = Dimensions.addEventListener('change', updateDimensions);
    return () => subscription?.remove();
  }, []);
  
  const slideAnim = useRef(new Animated.Value(dimensions.height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Reset values before animating
      slideAnim.setValue(dimensions.height);
      fadeAnim.setValue(0);
      scaleAnim.setValue(1);
      
      // Use requestAnimationFrame for better cross-platform compatibility
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: 0,
            tension: 65,
            friction: 11,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: dimensions.height,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const groupedNetworks = networks.reduce((acc, network) => {
    if (network.type === 'speed') {
      acc.speed = network.value;
    } else if (network.type === 'voice') {
      acc.voice = network.value;
    } else if (network.type === 'sms') {
      acc.sms = network.value;
    } else {
      if (!acc.operators) acc.operators = [];
      acc.operators.push(network);
    }
    return acc;
  }, {});

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: dimensions.height,
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
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent={true}
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
          <View style={styles.modalContent}>
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
                  <Ionicons name="cellular" size={20} color="#F59E0B" />
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
                  <Ionicons name="speedometer" size={20} color="#3B82F6" />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statNumber}>
                    {groupedNetworks.speed || '5G'}
                  </Text>
                  <Text style={styles.statLabel}>Speed</Text>
                </View>
              </LinearGradient>

              {groupedNetworks.voice && (
                <LinearGradient
                  colors={['#F0FDF4', '#DCFCE7']}
                  style={styles.statCard}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.statIcon}>
                    <Ionicons name="call" size={20} color="#16A34A" />
                  </View>
                  <View style={styles.statContent}>
                    <Text style={styles.statNumber}>
                      {groupedNetworks.voice}
                    </Text>
                    <Text style={styles.statLabel}>Minutes</Text>
                  </View>
                </LinearGradient>
              )}

              {groupedNetworks.sms && (
                <LinearGradient
                  colors={['#F3E8FF', '#E9D5FF']}
                  style={styles.statCard}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.statIcon}>
                    <Ionicons name="chatbubble" size={20} color="#9333EA" />
                  </View>
                  <View style={styles.statContent}>
                    <Text style={styles.statNumber}>
                      {groupedNetworks.sms}
                    </Text>
                    <Text style={styles.statLabel}>SMS</Text>
                  </View>
                </LinearGradient>
              )}
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
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const getStyles = (dimensions) => StyleSheet.create({
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
    backgroundColor: '#FFFFFF',
    height: Platform.OS === 'ios' ? dimensions.height * 0.92 : dimensions.height * 0.95,
    maxHeight: Platform.OS === 'ios' ? dimensions.height * 0.92 : dimensions.height * 0.95,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: Platform.OS === 'android' ? 'visible' : 'hidden',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
    justifyContent: 'space-between',
  },
  statCard: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  combinedStatCard: {
    flex: 1.5,
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
  combinedStatContent: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.15)',
  },
  combinedStatText: {
    fontSize: 14,
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    fontWeight: '600',
    marginLeft: 6,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  statContent: {
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    marginTop: 1,
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