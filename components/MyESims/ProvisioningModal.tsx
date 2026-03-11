import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Platform,
  Dimensions,
  StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ProvisioningModalProps {
  visible: boolean;
  pendingCount: number;
  onClose: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const ProvisioningModal: React.FC<ProvisioningModalProps> = ({
  visible,
  pendingCount,
  onClose,
  onRefresh,
  isRefreshing
}) => {
  const insets = useSafeAreaInsets();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const scaleValue = useRef(new Animated.Value(0)).current;

  // Reset timer when modal opens
  useEffect(() => {
    if (visible) {
      setElapsedSeconds(0);
    }
  }, [visible]);

  // Timer
  useEffect(() => {
    if (!visible) return;

    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [visible]);

  // Spinning animation
  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true
      })
    );
    animation.start();
    return () => animation.stop();
  }, [spinValue]);

  // Pulse animation
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: true
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true
        })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseValue]);

  // Scale in animation
  useEffect(() => {
    if (visible) {
      Animated.spring(scaleValue, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true
      }).start();
    } else {
      scaleValue.setValue(0);
    }
  }, [visible, scaleValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const formatElapsedTime = () => {
    if (elapsedSeconds < 60) {
      return `${elapsedSeconds}s`;
    }
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    return `${minutes}m ${seconds}s`;
  };

  const getProgress = () => {
    // Assume 2-5 minutes, average 3.5 minutes = 210 seconds
    const estimatedTotal = 210;
    const progress = Math.min((elapsedSeconds / estimatedTotal) * 100, 95);
    return progress;
  };

  const getEstimatedTimeLeft = () => {
    if (elapsedSeconds < 60) {
      return '2-5 minutes';
    } else if (elapsedSeconds < 120) {
      return '2-3 minutes';
    } else if (elapsedSeconds < 180) {
      return '1-2 minutes';
    } else if (elapsedSeconds < 240) {
      return 'Almost ready...';
    } else {
      return 'Finalizing...';
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRefresh();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent={false}
    >
      <StatusBar backgroundColor="rgba(0, 0, 0, 0.5)" barStyle="light-content" />
      <BlurView intensity={90} style={styles.blurContainer}>
        <View style={[
          styles.overlay,
          {
            paddingTop: Math.max(insets.top, 20),
            paddingBottom: Math.max(insets.bottom, 20),
            paddingLeft: Math.max(insets.left, 0),
            paddingRight: Math.max(insets.right, 0),
          }
        ]}>
          <Animated.View
            style={[
              styles.modalContainer,
              {
                transform: [{ scale: scaleValue }],
                maxHeight: SCREEN_HEIGHT - Math.max(insets.top, 20) - Math.max(insets.bottom, 20) - 40
              }
            ]}
          >
            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={32} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Header with gradient */}
            <LinearGradient
              colors={['#FFF7ED', '#FFFFFF']}
              style={styles.header}
            >
              <Text style={styles.flag}>🇯🇵</Text>
              <Text style={styles.title}>Preparing Your Japan eSIM</Text>
              <Text style={styles.subtitle}>
                KDDI Network • {pendingCount} order{pendingCount > 1 ? 's' : ''}
              </Text>
            </LinearGradient>

            {/* Main Content */}
            <View style={styles.content}>
              {/* Animated Loader */}
              <View style={styles.loaderContainer}>
                <Animated.View
                  style={[
                    styles.loaderOuter,
                    { transform: [{ scale: pulseValue }] }
                  ]}
                >
                  <LinearGradient
                    colors={['#F97316', '#FB923C']}
                    style={styles.loaderGradient}
                  >
                    <Animated.View style={{ transform: [{ rotate: spin }] }}>
                      <Ionicons name="hardware-chip" size={48} color="#FFFFFF" />
                    </Animated.View>
                  </LinearGradient>
                </Animated.View>

                {/* Progress Ring */}
                <View style={styles.progressRing}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${getProgress()}%`,
                        borderTopRightRadius: getProgress() > 50 ? 60 : 0,
                        borderBottomRightRadius: getProgress() > 50 ? 60 : 0,
                      }
                    ]}
                  />
                </View>
              </View>

              {/* Status Text */}
              <Text style={styles.statusTitle}>Provisioning in Progress</Text>
              <Text style={styles.statusDescription}>
                Your eSIM is being activated with KDDI network. This process usually takes 2-5 minutes.
              </Text>

              {/* Time Display */}
              <View style={styles.timeContainer}>
                <View style={styles.timeCard}>
                  <Ionicons name="time-outline" size={20} color="#F97316" />
                  <View style={styles.timeTextContainer}>
                    <Text style={styles.timeLabel}>Elapsed</Text>
                    <Text style={styles.timeValue}>{formatElapsedTime()}</Text>
                  </View>
                </View>

                <View style={styles.timeDivider} />

                <View style={styles.timeCard}>
                  <Ionicons name="hourglass-outline" size={20} color="#10B981" />
                  <View style={styles.timeTextContainer}>
                    <Text style={styles.timeLabel}>Estimated</Text>
                    <Text style={styles.timeValue}>{getEstimatedTimeLeft()}</Text>
                  </View>
                </View>
              </View>

              {/* Info Boxes */}
              <View style={styles.infoContainer}>
                <View style={styles.infoBox}>
                  <View style={styles.infoIconContainer}>
                    <Ionicons name="refresh" size={16} color="#3B82F6" />
                  </View>
                  <Text style={styles.infoText}>
                    Auto-refreshing every 20 seconds
                  </Text>
                </View>

                <View style={styles.infoBox}>
                  <View style={styles.infoIconContainer}>
                    <Ionicons name="mail-outline" size={16} color="#8B5CF6" />
                  </View>
                  <Text style={styles.infoText}>
                    You'll receive an email when ready
                  </Text>
                </View>

                <View style={styles.infoBox}>
                  <View style={styles.infoIconContainer}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  </View>
                  <Text style={styles.infoText}>
                    Safe to close - we'll notify you
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.refreshButton, isRefreshing && styles.buttonDisabled]}
                  onPress={handleRefresh}
                  disabled={isRefreshing}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={isRefreshing ? ['#FDBA74', '#FDBA74'] : ['#F97316', '#EA580C']}
                    style={styles.buttonGradient}
                  >
                    {isRefreshing ? (
                      <Animated.View style={{ transform: [{ rotate: spin }] }}>
                        <Ionicons name="reload" size={20} color="#FFFFFF" />
                      </Animated.View>
                    ) : (
                      <Ionicons name="reload" size={20} color="#FFFFFF" />
                    )}
                    <Text style={styles.buttonText}>
                      {isRefreshing ? 'Checking...' : 'Check Now'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.closeButtonAction]}
                  onPress={handleClose}
                  activeOpacity={0.8}
                >
                  <Text style={styles.closeButtonText}>I'll Wait</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    // Safe area padding will be added dynamically
  },
  modalContainer: {
    width: Math.min(SCREEN_WIDTH - 40, 420),
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    maxHeight: '90%', // Fallback max height
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 4,
  },
  header: {
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  flag: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  content: {
    padding: 24,
    maxHeight: SCREEN_HEIGHT * 0.6, // Prevent content overflow on small screens
  },
  loaderContainer: {
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  loaderOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
  },
  loaderGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRing: {
    position: 'absolute',
    bottom: -16,
    width: 140,
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  statusDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  timeContainer: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  timeCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 12,
  },
  timeTextContainer: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 2,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  infoContainer: {
    gap: 10,
    marginBottom: 24,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 10,
    gap: 12,
  },
  infoIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  refreshButton: {
    shadowColor: '#F97316',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  closeButtonAction: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
});
