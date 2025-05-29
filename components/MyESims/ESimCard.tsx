import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { ESim } from '../../types/esim.types';
import { getStatusColor, getStatusText } from '../../constants/esim.constants';

const { width: screenWidth } = Dimensions.get('window');

interface ESimCardProps {
  esim: ESim;
  isSelected: boolean;
  onPress: () => void;
  onViewDetails: () => void;
}

// Color mappings for easier access
const themeColors = {
  background: colors.background.primary,
  surface: colors.background.secondary,
  text: colors.text.primary,
  textSecondary: colors.text.secondary,
  primary: colors.primary.DEFAULT,
  border: colors.border.default
};

export const ESimCard: React.FC<ESimCardProps> = ({ 
  esim, 
  isSelected, 
  onPress, 
  onViewDetails 
}) => {

  const getGradientColors = () => {
    if (isSelected) {
      return ['#FF6B00', '#FF8533'];
    }
    return [themeColors.surface, themeColors.surface];
  };

  const formatDataLeft = () => {
    if (esim.data_left === 'Unlimited' || esim.unlimited) {
      return 'Unlimited';
    }
    return esim.data_left_formatted || `${esim.data_left} GB`;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={styles.cardTouchable}
    >
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.card,
          {
            borderColor: isSelected ? '#FF6B00' : themeColors.border,
            borderWidth: isSelected ? 2 : 1,
          }
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.countryInfo}>
            <View style={styles.countryRow}>
              <View style={[
                styles.chipIconContainer,
                { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : themeColors.background }
              ]}>
                <Ionicons 
                  name="hardware-chip-outline" 
                  size={16} 
                  color={isSelected ? '#FFFFFF' : themeColors.text}
                />
              </View>
              <Text style={[
                styles.countryText,
                { color: isSelected ? '#FFFFFF' : themeColors.text }
              ]} numberOfLines={1}>
                {esim.country}
              </Text>
            </View>
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(esim.status) + '20' }
          ]}>
            <View style={[
              styles.statusDot,
              { backgroundColor: getStatusColor(esim.status) }
            ]} />
            <Text style={[
              styles.statusText,
              { color: getStatusColor(esim.status) }
            ]}>
              {getStatusText(esim.status)}
            </Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <Text style={[
            styles.planName,
            { color: isSelected ? '#FFFFFF' : themeColors.text }
          ]} numberOfLines={2}>
            {esim.plan_name}
          </Text>
          
          <View style={styles.dataInfo}>
            <View style={styles.dataRow}>
              <Ionicons 
                name="cellular" 
                size={14} 
                color={isSelected ? '#FFFFFF' : themeColors.textSecondary}
              />
              <Text style={[
                styles.dataText,
                { color: isSelected ? '#FFFFFF' : themeColors.textSecondary }
              ]}>
                {formatDataLeft()} left
              </Text>
            </View>
            {esim.time_left && esim.time_left !== 'N/A' && (
              <View style={styles.dataRow}>
                <Ionicons 
                  name="time-outline" 
                  size={14} 
                  color={isSelected ? '#FFFFFF' : themeColors.textSecondary}
                />
                <Text style={[
                  styles.dataText,
                  { color: isSelected ? '#FFFFFF' : themeColors.textSecondary }
                ]}>
                  {esim.time_left}
                </Text>
              </View>
            )}
          </View>

          {esim.data_left !== 'Unlimited' && !esim.unlimited && (
            <View style={styles.progressContainer}>
              <View style={[
                styles.progressBar,
                { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : themeColors.surface }
              ]}>
                <View 
                  style={[
                    styles.progressFill,
                    { 
                      backgroundColor: isSelected ? '#FFFFFF' : themeColors.primary,
                      width: `${100 - esim.data_left_percentage}%`
                    }
                  ]} 
                />
              </View>
              <Text style={[
                styles.percentageText,
                { color: isSelected ? '#FFFFFF' : themeColors.textSecondary }
              ]}>
                {Math.round(100 - esim.data_left_percentage)}% used
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.viewDetailsButton,
            { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : themeColors.background }
          ]}
          onPress={onViewDetails}
        >
          <Text style={[
            styles.viewDetailsText,
            { color: isSelected ? '#FFFFFF' : themeColors.primary }
          ]}>
            View Details
          </Text>
          <Ionicons 
            name="chevron-forward" 
            size={16} 
            color={isSelected ? '#FFFFFF' : themeColors.primary}
          />
        </TouchableOpacity>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardTouchable: {
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  countryInfo: {
    flex: 1,
    marginRight: 10,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  countryText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardContent: {
    marginBottom: 12,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  dataInfo: {
    marginBottom: 12,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dataText: {
    fontSize: 13,
    marginLeft: 6,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  percentageText: {
    fontSize: 11,
    textAlign: 'right',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
});