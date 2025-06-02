import React, { useState, useEffect, useRef } from 'react';
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
import { FlagIcon } from '../utils/countryData';
import { colors } from '../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const NetworkModal = ({ visible, onClose, networks = [], locationNetworkList = [] }) => {
  const [activeTab, setActiveTab] = useState('coverage');
  const [selectedCountry, setSelectedCountry] = useState(null);
  
  // Get dimensions inside component to ensure they're available
  const [dimensions, setDimensions] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return { width: width || 375, height: height || 812 };
  });
  
  // Get styles with current dimensions
  const styles = getStyles(dimensions);
  
  useEffect(() => {
    const updateDimensions = ({ window }) => {
      setDimensions({ width: window.width || 375, height: window.height || 812 });
    };
    
    const subscription = Dimensions.addEventListener('change', updateDimensions);
    return () => subscription?.remove();
  }, []);
  
  const slideAnim = useRef(new Animated.Value(dimensions.height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (visible) {
      // Reset values before animating
      slideAnim.setValue(dimensions.height);
      fadeAnim.setValue(0);
      
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

  // Filter out Sint Eustatius And Saba from the locationNetworkList
  const filteredLocationNetworkList = locationNetworkList.filter(
    country => country.locationName !== 'Sint Eustatius And Saba'
  );

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
  
  const getNetworkStats = () => {
    const operators = networks.filter(n => n.type !== 'speed');
    const speed = networks.find(n => n.type === 'speed')?.value || '5G/LTE';
    return { operators, speed };
  };

  const renderNetworksTab = () => {
    const { operators, speed } = getNetworkStats();

    return (
      <ScrollView 
        style={styles.contentList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        <View style={styles.networkStatsContainer}>
          <LinearGradient
            colors={['#FFF7ED', '#FEF3C7']}
            style={styles.networkStatCard}
          >
            <View style={styles.networkStatIcon}>
              <Ionicons name="cellular" size={24} color="#F59E0B" />
            </View>
            <View style={styles.networkStatContent}>
              <Text style={styles.networkStatValue}>
                {operators.length}
              </Text>
              <Text style={styles.networkStatLabel}>Total Networks</Text>
            </View>
          </LinearGradient>
          
          <LinearGradient
            colors={['#EFF6FF', '#DBEAFE']}
            style={styles.networkStatCard}
          >
            <View style={styles.networkStatIcon}>
              <Ionicons name="speedometer" size={24} color="#3B82F6" />
            </View>
            <View style={styles.networkStatContent}>
              <Text style={styles.networkStatValue}>
                {speed}
              </Text>
              <Text style={styles.networkStatLabel}>Max Speed</Text>
            </View>
          </LinearGradient>
        </View>

        <Text style={styles.sectionTitle}>Available Networks</Text>
        
        {operators.map((network, index) => (
          <View key={index} style={styles.networkItemContainer}>
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
      </ScrollView>
    );
  };

  const renderCountryItem = (country) => {
    const isSelected = selectedCountry?.locationName === country.locationName;
    
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
                countryCode={country.countryCode}
                size={36}
              />
            </View>
            <View style={styles.countryItemInfo}>
              <Text style={styles.countryName}>{country.locationName}</Text>
              <View style={styles.operatorBadge}>
                <Ionicons name="wifi" size={14} color="#6B7280" />
                <Text style={styles.operatorCount}>
                  {country.operatorList.length} networks
                </Text>
              </View>
            </View>
            <View style={[styles.networkTypeBadge, country.operatorList.some(op => op.networkType.includes('5G')) && styles.badge5G]}>
              <Ionicons name="speedometer" size={16} color={country.operatorList.some(op => op.networkType.includes('5G')) ? '#3B82F6' : '#FF6B00'} />
              <Text style={[styles.networkTypeText, country.operatorList.some(op => op.networkType.includes('5G')) && styles.text5G]}>
                {country.operatorList.some(op => op.networkType.includes('5G')) ? '5G' : '4G'}
              </Text>
            </View>
          </View>
          
          {isSelected && (
            <View style={styles.operatorList}>
              {country.operatorList.map((operator, index) => (
                <View key={index} style={styles.operatorItem}>
                  <LinearGradient
                    colors={['#FF6B00', '#FF8533']}
                    style={styles.operatorIcon}
                  >
                    <Ionicons name="cellular" size={12} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={styles.operatorName}>{operator.operatorName}</Text>
                  <View style={styles.operatorSpeedBadge}>
                    <Text style={styles.operatorSpeed}>
                      {operator.networkType}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent={true}
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
                <MaterialCommunityIcons name="map-marker-multiple" size={28} color="#FFFFFF" />
              </LinearGradient>
              
              <View style={styles.headerTextContainer}>
                <Text style={styles.modalTitle}>Regional Coverage</Text>
                <Text style={styles.modalSubtitle}>
                  {filteredLocationNetworkList?.length || 0} countries covered
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
            {activeTab === 'networks' ? renderNetworksTab() : (
              <ScrollView 
                style={styles.contentList}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              >
                {filteredLocationNetworkList?.map((country, index) => (
                  <View key={index}>{renderCountryItem(country)}</View>
                ))}
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
    paddingTop: 8,
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
  // Networks tab styles
  networkStatsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  networkStatCard: {
    flex: 1,
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
  networkStatIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  networkStatContent: {
    alignItems: 'center',
  },
  networkStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  networkStatLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    marginBottom: 16,
    marginLeft: 4,
  },
  networkItemContainer: {
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

export default NetworkModal;