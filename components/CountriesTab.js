import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FlagIcon } from '../utils/countryData';
import { colors } from '../theme/colors';

interface TabProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

interface CountryItemProps {
  item: {
    id: string;
    name: string;
  };
  onPress: (item: any) => void;
}

interface RegionGlobalItemProps {
  item: {
    name: string;
    image?: React.ComponentType;
  };
  onPress: (item: any) => void;
}

const CountryListItem = memo(({ item, onPress }: CountryItemProps) => (
  <TouchableOpacity 
    style={styles.container} 
    onPress={() => onPress(item)}
    activeOpacity={0.7}
  >
    <LinearGradient
      colors={[colors.background.secondary, colors.border.light]}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      style={styles.gradient}
    >
      <View style={styles.content}>
        <View style={styles.flagWrapper}>
          <FlagIcon 
            countryCode={item?.id || ''} 
            size={32} // Reduced from 40
            variant="default" 
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.name}>{item?.name || ''}</Text>
        </View>
        <Ionicons 
          name="chevron-forward" 
          size={20} // Reduced from 24
          color={colors.text.secondary} 
        />
      </View>
    </LinearGradient>
  </TouchableOpacity>
), (prevProps, nextProps) => prevProps.item.id === nextProps.item.id);

const RegionGlobalListItem = memo(({ item, onPress }: RegionGlobalItemProps) => {
  const IconComponent = item?.image;
  
  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={[colors.background.secondary, colors.border.light]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <View style={styles.iconWrapper}>
              {IconComponent ? <IconComponent /> : (
                <Ionicons name="globe-outline" size={24} color={colors.text.primary} />
              )}
            </View>
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.name}>{item?.name}</Text>
          </View>
          <Ionicons 
            name="chevron-forward" 
            size={24} 
            color={colors.text.secondary} 
          />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
});

const TabNavigation = memo(({ activeTab, setActiveTab }: TabProps) => {
  const tabs = [
    { id: 'Countries', icon: 'flag-outline' },
    { id: 'Regional', icon: 'globe-outline' },
    { id: 'Global', icon: 'earth-outline' }
  ];

  return (
    <View style={styles.tabsContainer}>
      <LinearGradient
        colors={[colors.background.secondary, colors.border.light]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.tabGradientContainer}
      >
        <View style={styles.tabsWrapper}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.activeTab]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={[colors.background.secondary, colors.border.light]}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.tabItemGradient}
              >
                <View style={[
                  styles.tabContent,
                  activeTab === tab.id && styles.activeTabContent
                ]}>
                  <Ionicons 
                    name={tab.icon} 
                    size={20} 
                    color={activeTab === tab.id ? colors.stone[700] : colors.text.secondary}
                  />
                  <Text style={[
                    styles.tabText,
                    activeTab === tab.id && styles.activeTabText
                  ]}>
                    {tab.id}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 10,
    overflow: 'hidden'
  },
  gradient: {
    borderRadius: 10,
    padding: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.background.secondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  flagWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  iconContainer: {
    width: 40,
    height: 40,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 16,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    fontFamily: 'Quicksand',
  },
  tabsContainer: {
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 10,
    overflow: 'hidden',
  },
  tabGradientContainer: {
    borderRadius: 10,
    padding: 1,
  },
  tabsWrapper: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    borderRadius: 10,
    padding: 6,
  },
  tab: {
    flex: 1,
    marginHorizontal: 4,
  },
  activeTab: {
    transform: [{scale: 1.02}],
  },
  tabItemGradient: {
    borderRadius: 8,
    padding: 1,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    gap: 6,
    backgroundColor: colors.background.primary,
    borderRadius: 8,
  },
  activeTabContent: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.stone[700],
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    fontFamily: 'Quicksand',
  },
  activeTabText: {
    color: colors.stone[700],
  }
});

export { CountryListItem, RegionGlobalListItem, TabNavigation };