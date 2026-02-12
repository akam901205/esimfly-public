import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Platform,
  RefreshControl,
  Linking,
  Alert,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { formatDistance } from 'date-fns';
import esimApi from '../api/esimApi';
import { colors } from '../theme/colors';
import { formatBalance, SupportedCurrency } from '../utils/currencyUtils';
import { newApi } from '../api/api';

const { width } = Dimensions.get('window');
const BASE_URL = 'https://esimfly.net';

interface Order {
  id: string;
  package_name: string;
  order_date: string;
  amount: number;
  amount_numeric?: number;
  currency?: string;
  status: string;
  status_formatted?: string;
  payment_method: string;
  flag_url?: string | null;
  has_stripe_payment?: boolean;
  order_reference?: string;
  esim_id?: number;
  payment_intent_id?: string;
  is_topup?: boolean;
}

const OrderHistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOrders(1);
  }, []);

  const fetchOrders = async (page: number, refresh = false) => {
    try {
      const response = await esimApi.fetchOrders(page);

      if (response.success && response.data) {
        const validOrders = response.data.orders.map((order: any) => ({
          ...order,
          amount: order.amount_numeric || parseFloat(order.amount) || 0,
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

  const handleDownloadReceipt = async (paymentIntentId: string) => {
    try {
      if (!paymentIntentId) {
        Alert.alert('Error', 'Receipt not available for this order');
        return;
      }

      const response = await newApi.get(`/user/stripe/receipt/${paymentIntentId}`);

      if (response.data.success && response.data.receiptUrl) {
        await Linking.openURL(response.data.receiptUrl);
      } else {
        Alert.alert('Error', 'Could not retrieve receipt');
      }
    } catch (error) {
      console.error('Error downloading receipt:', error);
      Alert.alert('Error', 'Failed to download receipt');
    }
  };

  const getStatusConfig = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'completed') {
      return {
        color: '#10B981',
        bg: '#D1FAE5',
        icon: 'checkmark-circle' as const,
        text: 'Completed'
      };
    } else if (statusLower === 'pending') {
      return {
        color: '#F59E0B',
        bg: '#FEF3C7',
        icon: 'time-outline' as const,
        text: 'Pending'
      };
    }
    return {
      color: '#EF4444',
      bg: '#FEE2E2',
      icon: 'close-circle' as const,
      text: 'Cancelled'
    };
  };

  const getPaymentIcon = (method: string, hasStripe?: boolean) => {
    if (method === 'card' || hasStripe) return 'card-outline';
    if (method === 'apple_pay') return 'logo-apple';
    if (method === 'google_pay') return 'logo-google';
    return 'wallet-outline';
  };

  const renderOrderItem = ({ item }: { item: Order }) => {
    const statusConfig = getStatusConfig(item.status_formatted || item.status);

    // Use is_topup field from API (detects from order_reference starting with "topup_")
    const isTopup = item.is_topup === true;

    // Payment icon always based on actual payment method (for meta row)
    const paymentIcon = getPaymentIcon(item.payment_method, item.has_stripe_payment);

    const flagUrl = item.flag_url?.startsWith('http')
      ? item.flag_url
      : `${BASE_URL}${item.flag_url}`;

    return (
      <View style={styles.orderCard}>
        {/* Header with Flag/Icon and Status */}
        <View style={styles.cardHeader}>
          <View style={styles.flagContainer}>
            {isTopup ? (
              <Ionicons name="reload-circle" size={28} color="#FF6B00" />
            ) : item.flag_url ? (
              <Image source={{ uri: flagUrl }} style={styles.flagImage} resizeMode="contain" />
            ) : (
              <Ionicons name="globe-outline" size={24} color="#9CA3AF" />
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Ionicons name={statusConfig.icon} size={14} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.text}
            </Text>
          </View>
        </View>

        {/* Package Name */}
        <Text style={styles.packageName} numberOfLines={2}>
          {item.package_name || 'Unknown Package'}
        </Text>

        {/* Price */}
        <Text style={styles.price}>
          {formatBalance(item.amount, (item.currency as SupportedCurrency) || 'USD')}
        </Text>

        {/* Meta Info Row */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color="#6B7280" />
            <Text style={styles.metaText}>
              {formatDistance(new Date(item.order_date || Date.now()), new Date(), { addSuffix: true })}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name={paymentIcon} size={14} color="#6B7280" />
            <Text style={styles.metaText}>
              {item.payment_method === 'card' ? 'Card' :
               item.payment_method === 'balance' ? 'Balance' :
               'Other'}
            </Text>
          </View>
        </View>

        {/* Download Receipt Button - Only for Stripe */}
        {(item.has_stripe_payment || item.payment_method === 'card') && item.payment_intent_id && (
          <TouchableOpacity
            onPress={() => handleDownloadReceipt(item.payment_intent_id!)}
            style={styles.receiptButton}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#FF6B00', '#FF8C42']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.receiptGradient}
            >
              <Ionicons name="download-outline" size={16} color="white" />
              <Text style={styles.receiptText}>Download Receipt</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderFooter = () => {
    if (!loading || orders.length === 0) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#FF6B00" />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <LinearGradient
            colors={['#FFF7ED', '#FFEDD5']}
            style={styles.emptyIconGradient}
          >
            <MaterialCommunityIcons name="receipt-text-outline" size={48} color="#FF6B00" />
          </LinearGradient>
        </View>
        <Text style={styles.emptyTitle}>No Orders Yet</Text>
        <Text style={styles.emptySubtitle}>
          Your order history will appear here after you make your first purchase.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Shop')}
          style={styles.shopButton}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#FF6B00', '#FF8C42']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shopGradient}
          >
            <Ionicons name="storefront-outline" size={20} color="white" />
            <Text style={styles.shopButtonText}>Browse Plans</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading && orders.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 0) }]}>
        <LinearGradient colors={['#F8F9FA', '#F3F4F6']} style={styles.backgroundGradient} />

        <View style={[styles.header, { paddingTop: 5 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order History</Text>
          <View style={styles.headerIcon} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? insets.top : (StatusBar.currentHeight || 0) }]}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient colors={['#F8F9FA', '#F3F4F6']} style={styles.backgroundGradient} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: 5 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Order History</Text>
          {orders.length > 0 && (
            <Text style={styles.headerSubtitle}>
              {orders.length} {orders.length === 1 ? 'order' : 'orders'}
            </Text>
          )}
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="receipt-outline" size={24} color="#374151" />
        </View>
      </View>

      {/* Order List */}
      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FF6B00"
            colors={['#FF6B00']}
          />
        }
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'transparent',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    fontFamily: 'Quicksand-Bold',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  flagContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  flagImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  packageName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF6B00',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  receiptButton: {
    marginTop: 12,
    borderRadius: 10,
    overflow: 'hidden',
  },
  receiptGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
  },
  receiptText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    fontFamily: 'Quicksand-Bold',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
  },
  shopButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  shopGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  shopButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Quicksand-SemiBold',
  },
});

export default OrderHistoryScreen;
