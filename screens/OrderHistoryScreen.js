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
import { colors } from '../theme/colors';

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

  const getPaymentMethodInfo = (method, hasStripePayment) => {
    if (method === 'card' || hasStripePayment) {
      return {
        icon: 'card-outline',
        text: 'Credit/Debit Card'
      };
    } else if (method === 'apple_pay') {
      return {
        icon: 'logo-apple',
        text: 'Apple Pay'
      };
    } else if (method === 'google_pay') {
      return {
        icon: 'logo-google',
        text: 'Google Pay'
      };
    }
    return {
      icon: 'wallet-outline',
      text: 'Balance'
    };
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

  const renderOrderItem = ({ item }) => {
    const paymentInfo = getPaymentMethodInfo(item.payment_method, item.has_stripe_payment);
    const statusColor = item.status === 'Completed' ? '#2ECC71' : 
                       item.status === 'Pending' ? '#F1C40F' : '#E74C3C';

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          {getPackageIcon(item.package_name, item.flag_url)}
          <View style={styles.packageDetails}>
            <Text style={styles.packageName}>
              {item.package_name || 'Unknown Package'}
            </Text>
            <View style={styles.orderInfo}>
              <Ionicons name="time-outline" size={16} color={colors.text.secondary} />
              <Text style={styles.orderDate}>
                {formatDistance(new Date(item.order_date || Date.now()), new Date(), { addSuffix: true })}
              </Text>
            </View>
            <View style={styles.orderFooter}>
              <View style={styles.paymentMethodContainer}>
                <Ionicons name={paymentInfo.icon} size={16} color={colors.text.secondary} />
                <Text style={styles.paymentMethod}>{paymentInfo.text}</Text>
              </View>
              <View style={[styles.statusContainer, { backgroundColor: `${statusColor}20` }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
              </View>
            </View>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>${item.amount.toFixed(2)}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.headerIcon, { backgroundColor: colors.background.headerIcon }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.icon.header} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order History</Text>
          <View style={[styles.headerIcon, { backgroundColor: 'transparent', borderWidth: 0 }]} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary.DEFAULT} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.content, { height: WINDOW_HEIGHT - insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.headerIcon, { backgroundColor: colors.background.headerIcon }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.icon.header} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order History</Text>
          <View style={[styles.headerIcon, { backgroundColor: 'transparent', borderWidth: 0 }]} />
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
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.headerIcon,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.header,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
    height: 40,
  },
  listContainer: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
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
    backgroundColor: colors.background.tertiary,
  },
  defaultIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
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
    color: colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderDate: {
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentMethod: {
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  statusContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  priceContainer: {
    marginLeft: 'auto',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    color: colors.text.secondary,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadMoreButton: {
    backgroundColor: colors.background.secondary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 20,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  loadMoreText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
});

export default OrderHistoryScreen;