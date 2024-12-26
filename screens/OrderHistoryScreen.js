import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { formatDistance } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import esimApi from '../api/esimApi';

const TAB_BAR_HEIGHT = 84;
const WINDOW_HEIGHT = Dimensions.get('window').height;
const BASE_URL = 'https://esimfly.net';

const LoadMoreButton = ({ onPress, loading }) => (
  <TouchableOpacity 
    style={styles.loadMoreButton}
    onPress={onPress}
    disabled={loading}
  >
    {loading ? (
      <ActivityIndicator color="#FFFFFF" size="small" />
    ) : (
      <Text style={styles.loadMoreText}>Load More</Text>
    )}
  </TouchableOpacity>
);

const OrderHistoryScreen = () => {
  const navigation = useNavigation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const fetchOrders = async (page, refresh = false) => {
    try {
      const response = await esimApi.fetchOrders(page);
      
      if (response.success && response.data) {
        const validOrders = response.data.orders.map(order => ({
          ...order,
          amount: parseFloat(order.amount) || 0,
        }));
        
        setOrders(prev => refresh ? validOrders : [...prev, ...validOrders]);
        setHasMorePages(response.data.pagination.currentPage < response.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders(1);
  }, []);

  const getPackageIcon = (package_name, flag_url) => {
    if (flag_url) {
      const fullFlagUrl = flag_url.startsWith('http') ? flag_url : `${BASE_URL}${flag_url}`;
      return (
        <Image 
          source={{ uri: fullFlagUrl }} 
          style={styles.flagIcon}
          defaultSource={require('../assets/images/global-icon.png')}
        />
      );
    }

    const name = package_name?.toLowerCase() || '';
    if (name.includes('global')) {
      return (
        <View style={styles.defaultIconContainer}>
          <Text style={styles.packageIcon}>🌍</Text>
        </View>
      );
    } else if (name.includes('europe')) {
      return (
        <View style={styles.defaultIconContainer}>
          <Text style={styles.packageIcon}>🏛️</Text>
        </View>
      );
    }
    return (
      <View style={styles.defaultIconContainer}>
        <Text style={styles.packageIcon}>🌎</Text>
      </View>
    );
  };

  const handleLoadMore = () => {
    if (!loading && !refreshing && hasMorePages) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchOrders(nextPage);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setCurrentPage(1);
    fetchOrders(1, true);
  };

  const renderOrderItem = ({ item }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        {getPackageIcon(item.package_name, item.flag_url)}
        <View style={styles.packageDetails}>
          <Text style={styles.packageName}>
            {item.package_name || 'Unknown Package'}
          </Text>
          <View style={styles.orderInfo}>
            <Ionicons name="time-outline" size={16} color="#888" />
            <Text style={styles.orderDate}>
              {formatDistance(new Date(item.order_date || Date.now()), new Date(), { addSuffix: true })}
            </Text>
          </View>
          <View style={styles.paymentMethodContainer}>
            <Ionicons name="card-outline" size={16} color="#888" />
            <Text style={styles.paymentMethod}>Balance</Text>
          </View>
        </View>
      </View>
    </View>
  );

 if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order History</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#FF6B6B" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.content, { height: WINDOW_HEIGHT - insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order History</Text>
          <View style={styles.placeholder} />
        </View>

        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => (item.id || Math.random()).toString()}
          contentContainerStyle={[
            styles.listContainer,
            { paddingBottom: TAB_BAR_HEIGHT + insets.bottom }
          ]}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListFooterComponent={hasMorePages ? (
            <LoadMoreButton onPress={handleLoadMore} loading={loading} />
          ) : null}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No orders found</Text>
              </View>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
  },
header: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 16,
  backgroundColor: '#1E1E1E',
},
headerIcon: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: 'rgba(255, 107, 107, 0.1)',
  justifyContent: 'center',
  alignItems: 'center',
},
headerTitle: {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#FFFFFF',
  fontFamily: Platform.select({ ios: 'Quicksand', android: 'Quicksand-Regular' }),
},
title: {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#FFFFFF',
},
placeholder: {
  width: 40, // Same width as backButton for symmetry
},
  listContainer: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  flagIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  defaultIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  packageIcon: {
    fontSize: 24,
  },
  packageDetails: {
    flex: 1,
    gap: 4,
  },
  packageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderDate: {
    fontSize: 14,
    color: '#888',
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentMethod: {
    fontSize: 14,
    color: '#888',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#888',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadMoreButton: {
    backgroundColor: '#2A2A2A',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 20,
    marginHorizontal: 16,
  },
  loadMoreText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default OrderHistoryScreen;