import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { formatDistance } from 'date-fns';
import * as Haptics from 'expo-haptics';
import esimApi from '../api/esimApi';
import { colors } from '../theme/colors';
import { formatBalance, SupportedCurrency } from '../utils/currencyUtils';

const { width, height } = Dimensions.get('window');
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
}

interface OrderItemProps {
  item: Order;
  index: number;
}

// Separate component to avoid hooks in render function
const OrderItem: React.FC<OrderItemProps> = ({ item, index }) => {
  const itemAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(itemAnim, {
      toValue: 1,
      delay: index * 50,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [index]);

  const getPackageIcon = (packageName: string, flagUrl?: string | null) => {
    if (flagUrl) {
      const fullFlagUrl = flagUrl.startsWith('http') ? flagUrl : `${BASE_URL}${flagUrl}`;
      return (
        <View style={styles.flagContainer}>
          <Image 
            source={{ uri: fullFlagUrl }} 
            style={styles.flagImage}
            resizeMode="contain"
          />
        </View>
      );
    }

    // Fallback to emojis based on package name
    const name = packageName?.toLowerCase() || '';
    let emoji = '🌍';
    let gradientColors: [string, string] = ['#4F46E5', '#7C3AED'];
    
    if (name.includes('global') || name.includes('worldwide')) {
      emoji = '🌐';
      gradientColors = ['#06B6D4', '#0891B2'];
    } else if (name.includes('europe')) {
      emoji = '🇪🇺';
      gradientColors = ['#3B82F6', '#2563EB'];
    } else if (name.includes('asia')) {
      emoji = '🌏';
      gradientColors = ['#10B981', '#059669'];
    } else if (name.includes('usa') || name.includes('united states')) {
      emoji = '🇺🇸';
      gradientColors = ['#EF4444', '#DC2626'];
    } else if (name.includes('uk') || name.includes('united kingdom')) {
      emoji = '🇬🇧';
      gradientColors = ['#8B5CF6', '#7C3AED'];
    }
    
    return (
      <LinearGradient
        colors={gradientColors}
        style={styles.iconGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.packageEmoji}>{emoji}</Text>
      </LinearGradient>
    );
  };

  const getPaymentMethodInfo = (method: string, hasStripePayment?: boolean) => {
    if (method === 'card' || hasStripePayment) {
      return {
        icon: 'card' as const,
        text: 'Card',
        color: '#3B82F6'
      };
    } else if (method === 'apple_pay') {
      return {
        icon: 'logo-apple' as const,
        text: 'Apple Pay',
        color: '#000000'
      };
    } else if (method === 'google_pay') {
      return {
        icon: 'logo-google' as const,
        text: 'Google Pay',
        color: '#4285F4'
      };
    }
    return {
      icon: 'wallet' as const,
      text: 'Balance',
      color: '#10B981'
    };
  };

  const getStatusInfo = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'completed') {
      return {
        color: '#10B981',
        bgColor: '#10B98120',
        icon: 'checkmark-circle' as const
      };
    } else if (statusLower === 'pending') {
      return {
        color: '#F59E0B',
        bgColor: '#F59E0B20',
        icon: 'time' as const
      };
    }
    return {
      color: '#EF4444',
      bgColor: '#EF444420',
      icon: 'close-circle' as const
    };
  };

  const paymentInfo = getPaymentMethodInfo(item.payment_method, item.has_stripe_payment);
  const statusInfo = getStatusInfo(item.status_formatted || item.status);

  return (
    <Animated.View
      style={[
        styles.orderCardWrapper,
        {
          opacity: itemAnim,
          transform: [
            {
              scale: itemAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 1],
              }),
            },
            {
              translateY: itemAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          // Navigate to order details if needed
        }}
        activeOpacity={0.9}
      >
        <View style={styles.orderContent}>
          <View style={styles.orderLeft}>
            {getPackageIcon(item.package_name, item.flag_url)}
            <View style={styles.orderDetails}>
              <Text style={styles.packageName} numberOfLines={2}>
                {item.package_name || 'Unknown Package'}
              </Text>
              <View style={styles.orderMeta}>
                <Ionicons name="calendar-outline" size={14} color={colors.text.secondary} />
                <Text style={styles.orderDate}>
                  {formatDistance(new Date(item.order_date || Date.now()), new Date(), { addSuffix: true })}
                </Text>
              </View>
              <View style={styles.orderTags}>
                <View style={[styles.paymentTag, { backgroundColor: paymentInfo.color + '15' }]}>
                  <Ionicons name={paymentInfo.icon} size={14} color={paymentInfo.color} />
                  <Text style={[styles.paymentText, { color: paymentInfo.color }]}>
                    {paymentInfo.text}
                  </Text>
                </View>
                <View style={[styles.statusTag, { backgroundColor: statusInfo.bgColor }]}>
                  <Ionicons name={statusInfo.icon} size={14} color={statusInfo.color} />
                  <Text style={[styles.statusText, { color: statusInfo.color }]}>
                    {item.status_formatted || item.status}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          <View style={styles.orderRight}>
            <Text style={styles.priceAmount}>
              {formatBalance(item.amount, (item.currency as SupportedCurrency) || 'USD')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const OrderHistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(headerAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
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

  useEffect(() => {
    fetchOrders(1);
  }, []);

  const handleLoadMore = () => {
    if (!loading && !refreshing && hasMorePages) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchOrders(nextPage);
    }
  };

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    setCurrentPage(1);
    fetchOrders(1, true);
  };

  const renderOrderItem = ({ item, index }: { item: Order; index: number }) => {
    return <OrderItem item={item} index={index} />;
  };

  const renderFooter = () => {
    if (!hasMorePages) return null;
    
    return (
      <TouchableOpacity
        style={styles.loadMoreButton}
        onPress={handleLoadMore}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#4F46E5" />
        ) : (
          <>
            <Text style={styles.loadMoreText}>Load More</Text>
            <Ionicons name="chevron-down" size={20} color="#4F46E5" />
          </>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <LinearGradient
        colors={['#4F46E5', '#7C3AED']}
        style={styles.emptyIconContainer}
      >
        <Ionicons name="receipt-outline" size={48} color="#ffffff" />
      </LinearGradient>
      <Text style={styles.emptyTitle}>No Orders Yet</Text>
      <Text style={styles.emptySubtitle}>Your order history will appear here</Text>
      <TouchableOpacity
        style={styles.shopButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          navigation.navigate('Shop' as never);
        }}
      >
        <LinearGradient
          colors={['#4F46E5', '#6366F1']}
          style={styles.shopButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Ionicons name="cart" size={20} color="#ffffff" />
          <Text style={styles.shopButtonText}>Start Shopping</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing && orders.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={[colors.background.primary, colors.background.secondary]}
        style={styles.backgroundGradient}
      />
      
      <Animated.View
        style={[
          styles.header,
          {
            transform: [{ translateY: headerAnim }],
            paddingTop: Math.max(insets.top, 16),
          },
        ]}
      >
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Order History</Text>
          <Text style={styles.headerSubtitle}>
            {orders.length} {orders.length === 1 ? 'order' : 'orders'}
          </Text>
        </View>
        
        <View style={[styles.headerIcon, { backgroundColor: 'transparent', borderWidth: 0 }]} />
      </Animated.View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[styles.listContainer, { paddingBottom: Math.max(insets.bottom, 100) }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#4F46E5"
              colors={['#4F46E5']}
            />
          }
          ListFooterComponent={renderFooter}
          ListEmptyComponent={!loading ? renderEmptyState : null}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
        />
      </Animated.View>
    </SafeAreaView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    fontFamily: 'Quicksand-Bold',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: 'Quicksand-Regular',
  },
  content: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  orderCardWrapper: {
    marginBottom: 12,
  },
  orderCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  orderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderLeft: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
    gap: 12,
  },
  flagIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.background.tertiary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  flagImage: {
    width: '100%',
    height: '100%',
  },
  iconGradient: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagContainer: {
    width: 60,
    height: 40,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packageEmoji: {
    fontSize: 28,
  },
  orderDetails: {
    flex: 1,
    marginLeft: 16,
  },
  packageName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 6,
    fontFamily: 'Quicksand-SemiBold',
  },
  orderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderDate: {
    fontSize: 13,
    color: colors.text.secondary,
    marginLeft: 4,
    fontFamily: 'Quicksand-Regular',
  },
  orderTags: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  paymentText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Quicksand-Medium',
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Quicksand-Medium',
  },
  orderRight: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  priceAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
    marginHorizontal: 20,
    marginVertical: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  loadMoreText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4F46E5',
    fontFamily: 'Quicksand-SemiBold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
    fontFamily: 'Quicksand-Bold',
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
    fontFamily: 'Quicksand-Regular',
  },
  shopButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  shopButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 8,
  },
  shopButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Quicksand-SemiBold',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text.secondary,
    fontFamily: 'Quicksand-Regular',
  },
});

export default OrderHistoryScreen;