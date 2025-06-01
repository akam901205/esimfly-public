import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Text, Dimensions } from 'react-native';
import Svg, { Path, Circle, Rect, G, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { colors } from '../theme/colors';

const { width: screenWidth } = Dimensions.get('window');

type CustomTabBarProps = {
  state: any;
  descriptors: any;
  navigation: any;
  style?: any;
};

const CustomTabBar: React.FC<CustomTabBarProps> = ({ 
  state, 
  descriptors, 
  navigation, 
  style 
}) => {
  const insets = useSafeAreaInsets();

  const getIcon = (routeName: string, isFocused: boolean) => {
    const color = '#6B7280';
    const strokeWidth = 2;
    
    switch (routeName) {
      case 'Shop':
        return (
          <Svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <Path 
              d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" 
              stroke={color} 
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <Path d="M3 6h18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M16 10a4 4 0 0 1-8 0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        );
      case 'My eSims':
        return (
          <Svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            {/* Modern SIM card design */}
            <Path 
              d="M16 3H8C6.9 3 6 3.9 6 5v14c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" 
              stroke={color} 
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            {/* Chip */}
            <Rect 
              x="9" 
              y="8" 
              width="6" 
              height="4" 
              rx="1" 
              stroke={color} 
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Contacts */}
            <Path d="M10 14h4" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
            <Path d="M9 16h6" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
          </Svg>
        );
      case 'Guides':
        return (
          <Svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <Path 
              d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" 
              stroke={color} 
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <Path 
              d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" 
              stroke={color} 
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </Svg>
        );
      case 'Profile':
        return (
          <Svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <Path 
              d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" 
              stroke={color} 
              strokeWidth={strokeWidth}
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <Circle 
              cx="12" 
              cy="7" 
              r="4" 
              stroke={color} 
              strokeWidth={strokeWidth}
              fill="none"
            />
          </Svg>
        );
      default:
        return null;
    }
  };

  // Calculate indicator position
  const itemWidth = screenWidth / state.routes.length;
  const indicatorLeft = state.index * itemWidth + itemWidth / 2 - 30;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Background with shadow */}
      <View style={styles.backgroundContainer}>
        {Platform.OS === 'ios' && (
          <BlurView 
            intensity={90} 
            tint="light" 
            style={StyleSheet.absoluteFillObject}
          />
        )}
        <View style={[StyleSheet.absoluteFillObject, styles.backgroundWhite]} />
      </View>
      
      <View style={styles.buttonContainer}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel || options.title || route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };


          return (
            <TouchableOpacity
              key={index}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={`${label}, tab, ${isFocused ? 'selected' : ''}`}
              accessibilityHint={`Switches to ${label} tab`}
              testID={options.tabBarTestID}
              onPress={onPress}
              style={styles.button}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <View style={styles.iconWrapper}>
                  {getIcon(label, isFocused)}
                </View>
                <Text style={[
                  styles.label,
                  { 
                    color: '#6B7280',
                    fontWeight: '600'
                  }
                ]}>
                  {label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 15,
  },
  backgroundWhite: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    height: 72,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingTop: 6,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 64,
  },
  iconWrapper: {
    marginBottom: 4,
    height: 28,
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    letterSpacing: 0,
    marginTop: 0,
  },
});

export default CustomTabBar;