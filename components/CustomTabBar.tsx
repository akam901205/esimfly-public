import React, { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  SharedValue,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

type CustomTabBarProps = {
  state: any;
  descriptors: any;
  navigation: any;
  tabBarVisibility?: SharedValue<number>;
};

const CustomTabBar: React.FC<CustomTabBarProps> = ({ 
  state, 
  descriptors, 
  navigation, 
  tabBarVisibility 
}) => {
  const insets = useSafeAreaInsets();
  const animatedValues = state.routes.map(() => useSharedValue(0));
  const fallbackVisibility = useSharedValue(1);

  useEffect(() => {
    animatedValues.forEach((value, index) => {
      value.value = withSpring(state.index === index ? 1 : 0, { stiffness: 100, damping: 10 });
    });
  }, [state.index]);

  const containerAnimatedStyle = useAnimatedStyle(() => {
    const visibilityValue = tabBarVisibility?.value ?? fallbackVisibility.value;
    const translateY = interpolate(
      visibilityValue,
      [0, 1],
      [100, 0],
      Extrapolate.CLAMP
    );
    
    return {
      transform: [{ translateY }],
      opacity: visibilityValue,
    };
  });

  const getIcon = (routeName: string, isFocused: boolean) => {
    const color = isFocused ? colors.text.primary : colors.text.secondary;
    const strokeWidth = isFocused ? 2.5 : 2;
    // Icon components remain the same...
    switch (routeName) {
      case 'Shop':
        return (
          <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <Path d="M3 6h18" />
            <Path d="M16 10a4 4 0 0 1-8 0" />
          </Svg>
        );
      case 'My eSims':
        return (
          <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
            <Path d="M12 8v8" />
            <Path d="M8 12h8" />
            <Path d="M7 4v3" />
            <Path d="M17 4v3" />
            <Path d="M7 17v3" />
            <Path d="M17 17v3" />
          </Svg>
        );
      case 'Guides':
        return (
          <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <Path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </Svg>
        );
      case 'Profile':
        return (
          <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <Path d="M12 3a4 4 0 1 0 0 8 4 4 0 1 0 0-8z" />
          </Svg>
        );
      default:
        return null;
    }
  };

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
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

          const animatedStyle = useAnimatedStyle(() => {
            return {
              transform: [{ scale: withSpring(isFocused ? 1.2 : 1) }],
            };
          });

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
            >
              <Animated.View style={[styles.iconContainer, animatedStyle]}>
                {getIcon(label, isFocused)}
                <Text style={[
                  styles.label,
                  { color: isFocused ? colors.text.primary : colors.text.secondary }
                ]}>
                  {label}
                </Text>
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background.primary,
  },
  buttonContainer: {
    flexDirection: 'row',
    height: 70,
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.background.primary,
    shadowColor: colors.stone[700],
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    fontFamily: 'Quicksand',
  },
});

export default CustomTabBar;