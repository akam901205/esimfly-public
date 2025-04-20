// components/Header.tsx
import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../api/AuthContext';
import { EventEmitter } from '../utils/EventEmitter';
import esimApi from '../api/esimApi';
import { colors } from '../theme/colors';

interface HeaderProps {
  username: string;
}

const Header = React.memo(({ username }: HeaderProps) => {
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { userToken } = useContext(AuthContext);
  const navigation = useNavigation();

  const loadBalance = async () => {
    if (!userToken) {
      setLoading(false);
      return;
    }

    try {
      const response = await esimApi.fetchBalance();
      if (response.success && response.data) {
        setBalance(`$${Number(response.data.balance).toFixed(2)}`);
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBalance();
    
    // Subscribe to balance updates
    const unsubscribeBalance = EventEmitter.subscribe('BALANCE_UPDATED', (data) => {
      setBalance(`$${Number(data.balance).toFixed(2)}`);
    });

    // Auto-refresh as fallback
    const refreshInterval = setInterval(loadBalance, 60000);
    
    return () => {
      unsubscribeBalance();
      clearInterval(refreshInterval);
    };
  }, [userToken]);

  const handleBalancePress = () => {
    navigation.navigate('Profile', {
      screen: 'Deposit'
    });
  };

 const renderBalance = () => {
    if (loading) {
      return (
        <View style={[styles.balanceGradientContainer, { opacity: 0.7 }]}>
          <View style={styles.balanceInnerContainer}>
            <ActivityIndicator size="small" color={colors.stone[600]} />
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity 
        onPress={handleBalancePress}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={[colors.background.secondary, colors.border.light]}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.balanceGradientContainer}
        >
          <View style={styles.balanceInnerContainer}>
            <Ionicons name="wallet-outline" size={20} color="#34C759" />
            <Text style={styles.balanceText}>
              {balance || '$0.00'}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.header}>
      <View>
        <LinearGradient
          colors={[colors.background.secondary, colors.border.light]}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.iconGradientContainer}
        >
          <View style={styles.iconInnerContainer}>
            <Ionicons name="wifi-outline" size={24} color="#34C759" />
          </View>
        </LinearGradient>
      </View>
      <View style={styles.welcomeContainer}>
        <Text style={styles.welcomeSubtext}>Hey {username}</Text>
        <Text style={styles.welcomeText}>Welcome</Text>
      </View>
      {renderBalance()}
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    ...Platform.select({
      ios: {
        shadowColor: colors.stone[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  iconGradientContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    padding: 1,
    ...Platform.select({
      ios: {
        shadowColor: colors.stone[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  iconInnerContainer: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeContainer: {
    flex: 1,
    marginLeft: 12,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: 'Quicksand',
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    fontFamily: 'Quicksand',
  },
  balanceGradientContainer: {
    borderRadius: 20,
    padding: 1,
    ...Platform.select({
      ios: {
        shadowColor: colors.stone[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  balanceInnerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 90,
    justifyContent: 'center',
    gap: 6,
  },
  balanceText: {
    color: colors.text.primary,
    fontSize: 16,
    fontFamily: 'Quicksand',
    fontWeight: '600',
  },
});

export default Header;