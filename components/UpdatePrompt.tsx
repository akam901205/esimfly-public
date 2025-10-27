import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';

interface UpdatePromptProps {
  visible: boolean;
  onDismiss?: () => void;
  canDismiss?: boolean; // Allow dismissing for optional updates
}

export const UpdatePrompt: React.FC<UpdatePromptProps> = ({
  visible,
  onDismiss,
  canDismiss = true
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleUpdate = async () => {
    try {
      setIsDownloading(true);

      // Fetch and apply the update
      await Updates.fetchUpdateAsync();

      // Reload the app with the new update
      await Updates.reloadAsync();
    } catch (error) {
      console.error('Error applying update:', error);
      setIsDownloading(false);
      // Show error to user
      alert('Failed to download update. Please try again later.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={canDismiss ? onDismiss : undefined}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient
            colors={['#FFFFFF', '#F9FAFB']}
            style={styles.gradient}
          >
            {/* Icon */}
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={['#4F46E5', '#6366F1']}
                style={styles.iconGradient}
              >
                <Ionicons name="download-outline" size={36} color="#FFFFFF" />
              </LinearGradient>
            </View>

            {/* Title */}
            <Text style={styles.title}>Update Available</Text>

            {/* Message */}
            <Text style={styles.message}>
              A new version is ready to install. This update includes bug fixes and improvements.
            </Text>

            {/* Update Button */}
            <TouchableOpacity
              onPress={handleUpdate}
              activeOpacity={0.8}
              style={styles.button}
              disabled={isDownloading}
            >
              <LinearGradient
                colors={isDownloading ? ['#9CA3AF', '#6B7280'] : ['#4F46E5', '#6366F1']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isDownloading ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.buttonText}>Updating...</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.buttonText}>Update Now</Text>
                    <Ionicons name="refresh" size={20} color="#FFFFFF" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Dismiss button - only show if update is optional */}
            {canDismiss && (
              <TouchableOpacity
                onPress={onDismiss}
                style={styles.dismissButton}
                disabled={isDownloading}
              >
                <Text style={styles.dismissText}>Maybe Later</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.note}>
              App will restart after update
            </Text>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  gradient: {
    padding: 28,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  button: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonGradient: {
    paddingVertical: 15,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dismissButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  dismissText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  note: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
});
