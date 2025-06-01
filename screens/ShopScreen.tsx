import React, { useState, useCallback, useMemo, useContext, useRef, useEffect, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  SafeAreaView,
  Platform,
  StatusBar,
  FlatList,
  Keyboard,
  Image,
  ActivityIndicator,
  Animated,
  InteractionManager,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { regions } from '../utils/regions';
import esimApi from '../api/esimApi';
import { fetchBalance } from '../api/esimApi';
import { AuthContext } from '../api/AuthContext';
import { globalPackages } from '../utils/global';
import { countries, flagImages } from '../utils/countryData';
import debounce from 'lodash/debounce';
import { EventEmitter } from '../utils/EventEmitter';
import { getPopularDestinations } from '../utils/popularDestinations';
import { colors } from '../theme/colors';

const { width: screenWidth } = Dimensions.get('window');
const ITEMS_PER_PAGE = 20;
const destinations = getPopularDestinations();

// Create animated components
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

// Memoized FlagIcon Component
const FlagIcon = React.memo(({ countryCode, size = 40 }) => {
  if (!countryCode) {
    return (
      <LinearGradient
        colors={['#E5E7EB', '#D1D5DB']}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Ionicons name="globe-outline" size={size * 0.5} color="#6B7280" />
      </LinearGradient>
    );
  }

  const flagImage = flagImages?.[countryCode.toLowerCase()];
  
  if (flagImage) {
    return (
      <Image
        source={flagImage}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
        }}
      />
    );
  }

  return (
    <LinearGradient
      colors={['#E5E7EB', '#D1D5DB']}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: size / 3, color: '#6B7280', fontWeight: '600' }}>
        {countryCode.substring(0, 2).toUpperCase()}
      </Text>
    </LinearGradient>
  );
});


// Popular Destinations Component
const PopularDestinations = memo(({ onItemPress }) => {
  const scrollX = useRef(new Animated.Value(0)).current;

  const renderDestination = ({ item, index }) => {
    const inputRange = [
      (index - 1) * 140,
      index * 140,
      (index + 1) * 140,
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.9, 1, 0.9],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity
        onPress={() => onItemPress(item)}
        activeOpacity={0.8}
      >
        <Animated.View style={[
          styles.destinationCard,
          { transform: [{ scale }] }
        ]}>
          <LinearGradient
            colors={['#FFFFFF', '#F9FAFB']}
            style={styles.destinationGradient}
          >
            <View style={styles.destinationFlag}>
              <FlagIcon countryCode={item.flagCode} size={50} />
            </View>
            <Text style={styles.destinationName}>{item.name}</Text>
            <View style={styles.destinationBadge}>
              <MaterialIcons name="trending-up" size={12} color="#FF6B00" />
              <Text style={styles.destinationBadgeText}>Popular</Text>
            </View>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.popularSection}>
      <View style={styles.sectionHeader}>
        <MaterialIcons name="local-fire-department" size={24} color="#FF6B00" />
        <Text style={styles.sectionTitle}>Trending Destinations</Text>
      </View>
      <Animated.FlatList
        data={destinations}
        renderItem={renderDestination}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.destinationsList}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        snapToInterval={140}
        decelerationRate="fast"
      />
    </View>
  );
});

// Tab Component
const TabButton = memo(({ title, isActive, onPress, icon }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <LinearGradient
          colors={isActive ? ['#FF6B00', '#FF8533'] : ['#FFFFFF', '#F9FAFB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.tabButton,
            isActive && styles.tabButtonActive,
          ]}
        >
          <MaterialCommunityIcons 
            name={icon} 
            size={18} 
            color={isActive ? '#FFFFFF' : '#6B7280'} 
          />
          <Text style={[
            styles.tabText,
            isActive && styles.tabTextActive,
          ]}>
            {title}
          </Text>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
});

// Main Component
const ShopScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Countries');
  const [filteredData, setFilteredData] = useState([]);
  const [page, setPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [balance, setBalance] = useState(null);
  const navigation = useNavigation();
  const { userEmail, userToken } = useContext(AuthContext);
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef(null);

  const username = useMemo(() => {
    if (userEmail) {
      const atIndex = userEmail.indexOf('@');
      return atIndex !== -1 ? userEmail.substring(0, atIndex) : userEmail;
    }
    return 'Guest';
  }, [userEmail]);

  // Load balance
  useEffect(() => {
    const loadBalance = async () => {
      if (userToken) {
        try {
          const result = await fetchBalance();
          if (result.success && result.data) {
            setBalance(result.data);
          }
        } catch (error) {
          console.error('Error loading balance:', error);
        }
      }
    };

    loadBalance();

    const unsubscribeBalance = EventEmitter.subscribe('BALANCE_UPDATED', (data) => {
      setBalance(data);
    });

    return () => {
      unsubscribeBalance();
    };
  }, [userToken]);

  const handleSearch = useCallback(
    debounce((query) => {
      const searchQuery = query.toLowerCase();
      let filtered;
      
      if (activeTab === 'Countries') {
        filtered = countries.filter(item =>
          item.name.toLowerCase().includes(searchQuery)
        );
      } else if (activeTab === 'Regional') {
        filtered = regions.filter(item =>
          item.name.toLowerCase().includes(searchQuery)
        );
      } else {
        filtered = globalPackages.filter(item =>
          item.name.toLowerCase().includes(searchQuery)
        );
      }
      
      setFilteredData(filtered);
      setHasMore(false);
    }, 300),
    [activeTab]
  );

  const handleItemPress = useCallback((item) => {
    if (item.flagCode) {
      navigation.navigate('PackageType', { country: item.name });
      return;
    }

    if (activeTab === 'Countries') {
      navigation.navigate('PackageType', { country: item.name });
    } else if (activeTab === 'Regional') {
      navigation.navigate('RegionalPackageType', { region: item.name });
    } else {
      navigation.navigate('GlobalPackageType', { 
        globalPackageName: item.name 
      });
    }
  }, [navigation, activeTab]);

  const renderItem = useCallback(({ item, index }) => {
    const inputRange = [
      -1,
      0,
      index * 80,
      (index + 2) * 80,
    ];

    const scale = scrollY.interpolate({
      inputRange,
      outputRange: [1, 1, 1, 0.95],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={{ 
        transform: [{ scale }],
      }}>
        <TouchableOpacity
          onPress={() => handleItemPress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.itemCard}>
            <View style={styles.itemContent}>
              {activeTab === 'Countries' ? (
                <View style={styles.flagContainer}>
                  <FlagIcon countryCode={item.id} size={44} />
                </View>
              ) : activeTab === 'Regional' ? (
                <View style={styles.iconContainer}>
                  {item.image ? (
                    <item.image width={44} height={44} />
                  ) : (
                    <LinearGradient
                      colors={['#FF6B00', '#FF8533']}
                      style={styles.iconGradient}
                    >
                      <MaterialCommunityIcons 
                        name="earth" 
                        size={24} 
                        color="#FFFFFF" 
                      />
                    </LinearGradient>
                  )}
                </View>
              ) : (
                <View style={styles.iconContainer}>
                  <LinearGradient
                    colors={['#FF6B00', '#FF8533']}
                    style={styles.iconGradient}
                  >
                    <Ionicons 
                      name="globe" 
                      size={24} 
                      color="#FFFFFF" 
                    />
                  </LinearGradient>
                </View>
              )}
              
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                {activeTab === 'Regional' && item.countries && (
                  <Text style={styles.itemSubtext}>
                    {item.countries.length} countries
                  </Text>
                )}
                {activeTab === 'Global' && (
                  <Text style={styles.itemSubtext}>
                    Worldwide coverage
                  </Text>
                )}
              </View>
              
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color="#9CA3AF" 
              />
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [activeTab, handleItemPress, scrollY]);

  const ListHeaderComponent = useCallback(() => (
    <View style={styles.listHeader}>
      <PopularDestinations onItemPress={handleItemPress} />
      
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          <TabButton
            title="Countries"
            icon="earth"
            isActive={activeTab === 'Countries'}
            onPress={() => setActiveTab('Countries')}
          />
          <TabButton
            title="Regional"
            icon="map-marker-radius"
            isActive={activeTab === 'Regional'}
            onPress={() => setActiveTab('Regional')}
          />
          <TabButton
            title="Global"
            icon="globe-model"
            isActive={activeTab === 'Global'}
            onPress={() => setActiveTab('Global')}
          />
        </ScrollView>
      </View>
    </View>
  ), [activeTab, handleItemPress]);

  const ListFooterComponent = useCallback(() => {
    if (!hasMore || activeTab !== 'Countries') return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator color="#FF6B00" size="small" />
        <Text style={styles.loadingText}>Loading more...</Text>
      </View>
    );
  }, [hasMore, activeTab]);

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore || activeTab !== 'Countries' || searchQuery) return;

    setIsLoadingMore(true);
    
    InteractionManager.runAfterInteractions(() => {
      const nextPage = page + 1;
      const startIndex = nextPage * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const newItems = countries.slice(startIndex, endIndex);

      if (newItems.length > 0) {
        setFilteredData(prev => [...prev, ...newItems]);
        setPage(nextPage);
        setHasMore(endIndex < countries.length);
      } else {
        setHasMore(false);
      }
      setIsLoadingMore(false);
    });
  }, [page, isLoadingMore, hasMore, activeTab, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'Countries') {
        const initialItems = countries.slice(0, ITEMS_PER_PAGE);
        setFilteredData(initialItems);
        setHasMore(countries.length > ITEMS_PER_PAGE);
        setPage(0);
      } else {
        setFilteredData(activeTab === 'Regional' ? regions : globalPackages);
        setHasMore(false);
      }
      setSearchQuery('');
    }, [activeTab])
  );

  // Header animation
  const headerTranslate = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -50],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Sticky header animation
  const stickyHeaderOpacity = scrollY.interpolate({
    inputRange: [50, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const stickyHeaderTranslate = scrollY.interpolate({
    inputRange: [50, 100],
    outputRange: [-20, 0],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Background gradient */}
      <LinearGradient
        colors={['#FFFFFF', '#FFF7ED', '#FEF3C7']}
        style={styles.backgroundGradient}
      />
      
      {/* Header */}
      <Animated.View style={[
        styles.header,
        {
          transform: [{ translateY: headerTranslate }],
          opacity: headerOpacity,
        }
      ]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.username}>{username}</Text>
          </View>
          
          {balance && (
            <TouchableOpacity 
              style={styles.balanceCard}
              onPress={() => navigation.navigate('Deposit')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#FF6B00', '#FF8533']}
                style={styles.balanceGradient}
              >
                <MaterialIcons name="account-balance-wallet" size={20} color="#FFFFFF" />
                <Text style={styles.balanceAmount}>
                  ${balance.balance?.toFixed(2) || '0.00'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
      
      {/* Sticky Header - Shows when scrolling */}
      <Animated.View style={[
        styles.stickyHeader,
        {
          opacity: stickyHeaderOpacity,
          transform: [{ translateY: stickyHeaderTranslate }],
        }
      ]}>
        <LinearGradient
          colors={['#FF6B00', '#FF8533']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.stickyHeaderGradient}
        >
          <View style={styles.stickyHeaderContent}>
            <View style={styles.stickyHeaderLeft}>
              <Text style={styles.stickyHeaderTitle}>
                {activeTab === 'Countries' ? '🌍 Find your perfect destination' : 
                 activeTab === 'Regional' ? '🗺️ Travel across multiple countries' : 
                 '🌐 Stay connected worldwide'}
              </Text>
              <Text style={styles.stickyHeaderSubtitle}>
                {activeTab === 'Countries' ? `Choose from ${countries.length} countries` : 
                 activeTab === 'Regional' ? `${regions.length} regional packages to explore` : 
                 `${globalPackages.length} global plans for travelers`}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        {Platform.OS === 'ios' && (
          <BlurView intensity={80} tint="light" style={styles.searchBlur} />
        )}
        <View style={styles.searchContent}>
          <Ionicons name="search" size={20} color="#6B7280" />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder={`Search ${activeTab.toLowerCase()}...`}
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              handleSearch(text);
            }}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                searchInputRef.current?.clear();
                Keyboard.dismiss();
              }}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Main List */}
      <AnimatedFlatList
        data={filteredData}
        renderItem={renderItem}
        keyExtractor={(item) => `${activeTab}-${item.id || item.name}`}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 }
        ]}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={10}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  
  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  username: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  balanceCard: {
    borderRadius: 16,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  balanceGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    gap: 8,
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  
  // Sticky Header
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingTop: Platform.OS === 'ios' ? 45 : 5,
  },
  stickyHeaderGradient: {
    marginHorizontal: 20,
    marginVertical: 5,
    borderRadius: 16,
    padding: 12,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  stickyHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stickyHeaderLeft: {
    flex: 1,
  },
  stickyHeaderTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  stickyHeaderSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  // Search
  searchContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  searchBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  searchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(255, 255, 255, 0.9)',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  clearButton: {
    padding: 4,
  },
  
  // Popular Destinations
  popularSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  destinationsList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  destinationCard: {
    width: 120,
    marginRight: 12,
  },
  destinationGradient: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  destinationFlag: {
    marginBottom: 8,
  },
  destinationName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  destinationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  destinationBadgeText: {
    fontSize: 10,
    color: '#FF6B00',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  // Tabs
  tabsContainer: {
    marginBottom: 20,
  },
  tabsContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabButtonActive: {
    borderColor: 'transparent',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  
  // List Items
  listContent: {
    paddingBottom: 100,
  },
  listHeader: {
    paddingBottom: 20,
  },
  itemCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  flagContainer: {
    marginRight: 16,
  },
  iconContainer: {
    marginRight: 16,
  },
  iconGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  itemSubtext: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  
  // Loading Footer
  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});

export default React.memo(ShopScreen);