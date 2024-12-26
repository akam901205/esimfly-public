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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { regions } from '../utils/regions';
import esimApi from '../api/esimApi';
import { fetchLatestEsim, EsimData, fetchBalance } from '../api/esimApi';
import { AuthContext } from '../api/AuthContext';
import { globalPackages } from '../utils/global';
import { countries, flagImages } from '../utils/countryData';
import debounce from 'lodash/debounce';
import { EventEmitter } from '../utils/EventEmitter';
import { getPopularDestinations } from '../utils/popularDestinations';
import SearchBar from '../components/SearchBar'; // New import


const ITEMS_PER_PAGE = 20;
const destinations = getPopularDestinations();

// Create animated FlatList component
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

// Memoized Header Component

const Header = React.memo(({ username }) => {
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
        <View style={[styles.balanceContainer, { opacity: 0.7 }]}>
          <ActivityIndicator size="small" color="#FF6B6B" />
        </View>
      );
    }

    return (
      <TouchableOpacity 
        style={styles.balanceContainer}
        onPress={handleBalancePress}
        activeOpacity={0.7}
      >
        <Ionicons name="wallet-outline" size={20} color="#FF6B6B" />
        <Text style={styles.balanceText}>
          {balance || '$0.00'}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.header}>
      <View style={styles.iconContainer}>
        <Ionicons name="cellular-outline" size={24} color="#FF6B6B" />
      </View>
      <View style={styles.welcomeContainer}>
        <Text style={styles.welcomeSubtext}>Hey {username}</Text>
        <Text style={styles.welcomeText}>Welcome</Text>
      </View>
      {renderBalance()}
    </View>
  );
});

const formatCountryCount = (count) => {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
};


// Memoized FlagIcon Component
const FlagIcon = React.memo(({ countryCode, size = 30 }) => {
  if (!countryCode) {
    return (
      <View style={{
        width: size,
        height: size,
        backgroundColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: size / 2
      }}>
        <Text style={{ fontSize: size / 3, color: '#fff' }}>?</Text>
      </View>
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
    <View style={{
      width: size,
      height: size,
      backgroundColor: '#ccc',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: size / 2
    }}>
      <Text style={{ fontSize: size / 3, color: '#fff' }}>
        {countryCode.substring(0, 2).toUpperCase()}
      </Text>
    </View>
  );
});

// Memoized EsimContainer Component
const EsimContainer = React.memo(() => {
  const [esimData, setEsimData] = useState<LatestEsimData | null>(null);
  const [loading, setLoading] = useState(true);
  const { userToken } = useContext(AuthContext);

  const loadLatestEsim = async () => {
    if (!userToken) {
      setLoading(false);
      return;
    }

    try {
      const result = await fetchLatestEsim();
      if (result.success && result.data) {
        setEsimData(result.data);
      }
    } catch (error) {
      console.error('Error loading latest eSIM:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLatestEsim();
    
    // Subscribe to new eSIM updates
    const unsubscribeEsim = EventEmitter.subscribe('ESIM_ADDED', () => {
      loadLatestEsim();
    });

    // Auto-refresh as fallback
    const refreshInterval = setInterval(loadLatestEsim, 60000);
    
    return () => {
      unsubscribeEsim();
      clearInterval(refreshInterval);
    };
  }, [userToken]);

  if (loading) {
    return (
      <View style={styles.esimWrapper}>
        <LinearGradient
          colors={['#FF6B6B', '#FF8E8E', '#FFA5A5']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.esimGlow}
        />
        <View style={styles.activeEsim}>
          <ActivityIndicator color="#FF6B6B" size="large" />
        </View>
      </View>
    );
  }

  if (!esimData) {
    return (
      <View style={styles.esimWrapper}>
        <LinearGradient
          colors={['#FF6B6B', '#FF8E8E', '#FFA5A5']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.esimGlow}
        />
        <View style={styles.activeEsim}>
          <View style={styles.esimContent}>
            <Text style={styles.activeEsimTitle}>No Active eSIM</Text>
            <Text style={styles.activeEsimSubtitle}>
              Purchase an eSIM to get started
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.esimWrapper}>
      <LinearGradient
        colors={['#FF6B6B', '#FF8E8E', '#FFA5A5']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.esimGlow}
      />
      <View style={styles.activeEsim}>
        <View style={styles.esimContent}>
          <View style={styles.esimHeader}>
            <View style={styles.esimIconContainer}>
              <Ionicons name="hardware-chip-outline" size={24} color="#FF6B6B" />
            </View>
            <Text style={styles.activeEsimTitle}>{esimData.country}</Text>
          </View>
          <View style={styles.esimDetailsContainer}>
            <Text style={styles.activeEsimSubtitle}>
              {esimData.status} - {esimData.time_left}
            </Text>
            <View style={styles.dataUsageContainer}>
              <View style={styles.dataUsageBar}>
                <View 
                  style={[
                    styles.dataUsageFill, 
                    { width: `${esimData.data_left_percentage}%` }
                  ]} 
                />
              </View>
              <Text style={styles.dataUsageText}>
                {esimData.data_left_formatted} Remaining
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
});

// Memoized PopularDestinations Component
const PopularDestinations = React.memo(({ onItemPress }) => (
  <View>
    <Text style={styles.sectionTitle}>Popular Destinations</Text>
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={destinations}
      renderItem={({ item }) => (
        <TouchableOpacity 
          style={styles.popularDestinationItem} 
          onPress={() => onItemPress(item)}
        >
          <View style={styles.popularFlagContainer}>
            <FlagIcon countryCode={item?.flagCode || ''} size={60} />
          </View>
          <Text style={styles.popularCountryName}>{item?.name || ''}</Text>
        </TouchableOpacity>
      )}
      keyExtractor={item => item?.id || Math.random().toString()}
      contentContainerStyle={styles.popularList}
      removeClippedSubviews={Platform.OS === 'android'}
      initialNumToRender={6}
      maxToRenderPerBatch={6}
    />
  </View>
));

// Memoized TabNavigation Component
const TabNavigation = React.memo(({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'Countries', icon: 'flag-outline' },
    { id: 'Regional', icon: 'globe-outline' },
    { id: 'Global', icon: 'earth-outline' }
  ];

  return (
    <View style={styles.tabContainer}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[styles.tab, activeTab === tab.id && styles.activeTab]}
          onPress={() => setActiveTab(tab.id)}
        >
          <View style={styles.tabContent}>
            <Ionicons 
              name={tab.icon} 
              size={20} 
              color={activeTab === tab.id ? '#FF6B6B' : '#888'} 
              style={styles.tabIcon}
            />
            <Text style={[
              styles.tabText, 
              activeTab === tab.id && styles.activeTabText
            ]}>
              {tab.id}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
});

const RegionGlobalListItem = React.memo(({ item, onPress }) => {
  const IconComponent = item?.image;
  return (
    <TouchableOpacity 
      style={styles.regionItem} 
      onPress={() => onPress(item)}
    >
      <View style={styles.regionImageContainer}>
        <View style={styles.regionIconWrapper}>
          {IconComponent && <IconComponent />}
        </View>
      </View>
      <Text style={styles.regionName}>{item?.name}</Text>
      <Ionicons name="chevron-forward" size={24} color="#888" />
    </TouchableOpacity>
  );
});

const ShopScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Countries');
  const [filteredData, setFilteredData] = useState([]);
  const [page, setPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const navigation = useNavigation();
  const { userEmail } = useContext(AuthContext);
  const flatListRef = useRef(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  const username = useMemo(() => {
    if (userEmail) {
      const atIndex = userEmail.indexOf('@');
      return atIndex !== -1 ? userEmail.substring(0, atIndex) : userEmail;
    }
    return 'stranger';
  }, [userEmail]);

  const handleSearch = useCallback((query) => {
    const searchQuery = query.toLowerCase();
    let filtered;
    
    if (activeTab === 'Regional') {
      filtered = regions.filter(item =>
        item.name.toLowerCase().includes(searchQuery)
      );
      setFilteredData(filtered);
      setHasMore(false);
    } else if (activeTab === 'Global') {
      filtered = globalPackages.filter(item =>
        item.name.toLowerCase().includes(searchQuery)
      );
      setFilteredData(filtered);
      setHasMore(false);
    }
  }, [activeTab]);

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore || activeTab !== 'Countries') return;

    setIsLoadingMore(true);
    requestAnimationFrame(() => {
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
  }, [page, isLoadingMore, hasMore, activeTab]);

const handleItemPress = useCallback((item) => {
    // If the item is from popular destinations (has a flagCode property)
    if (item.flagCode) {
      // Switch to Countries tab first
      setActiveTab('Countries');
      // Reset the filtered data to show countries
      setFilteredData(countries.slice(0, ITEMS_PER_PAGE));
      setHasMore(countries.length > ITEMS_PER_PAGE);
      setPage(0);
      // Navigate to PackageType
      navigation.navigate('PackageType', { country: item.name });
      return;
    }

    // Handle regular tab items
    if (activeTab === 'Countries') {
      navigation.navigate('PackageType', { country: item.name });
    } else if (activeTab === 'Regional') {
      navigation.navigate('RegionalPackageType', { region: item.name });
    } else {
      navigation.navigate('GlobalPackageType', { 
        globalPackageName: item.name 
      });
    }
  }, [navigation, activeTab, setActiveTab]);
	


const flatListConfig = useMemo(() => ({
    removeClippedSubviews: true,
    maxToRenderPerBatch: 10,
    updateCellsBatchingPeriod: 50,
    initialNumToRender: 10,
    windowSize: 5,
    getItemLayout: (data, index) => ({
      length: 76, // Height of item + margins
      offset: 76 * index,
      index,
    }),
    onEndReachedThreshold: 0.5,
    scrollEventThrottle: 16,
    maintainVisibleContentPosition: {
      minIndexForVisible: 0,
      autoscrollToTopThreshold: 10
    },
    // Enable viewport memoization
    viewabilityConfig: {
      itemVisiblePercentThreshold: 50,
      minimumViewTime: 1000,
    }
  }), []);

  // 2. Optimize render item with better memoization
  const renderItem = useCallback(({ item }) => {
    return activeTab === 'Countries' ? (
      <CountryListItem 
        item={item} 
        onPress={handleItemPress}
        shouldRender={true} // Add prop for conditional rendering
      />
    ) : (
      <RegionGlobalListItem 
        item={item} 
        onPress={handleItemPress}
        shouldRender={true}
      />
    );
  }, [activeTab, handleItemPress]);
	
// 3. Add virtualization helpers
  const keyExtractor = useCallback((item) => item?.id?.toString() || Math.random().toString(), []);
  
  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    // Mark items as viewable for optimization
    viewableItems.forEach(({ item, isViewable }) => {
      item.isViewable = isViewable;
    });
  }, []);

  const getItemLayout = useCallback((_, index) => ({
    length: 60,
    offset: 60 * index,
    index,
  }), []);

 useFocusEffect(
    useCallback(() => {
      if (activeTab === 'Countries') {
        setFilteredData(countries.slice(0, ITEMS_PER_PAGE));
        setHasMore(countries.length > ITEMS_PER_PAGE);
        setPage(0);
      } else if (activeTab === 'Regional') {
        setFilteredData(regions);
        setHasMore(false);
      } else {
        setFilteredData(globalPackages);
        setHasMore(false);
      }
      setSearchQuery('');
      
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: false });
      }
    }, [activeTab])
  );

 const ListHeaderComponent = useCallback(() => (
    <>
      <View style={styles.popularDestinationsContainer}>
        <PopularDestinations onItemPress={handleItemPress} />
      </View>
      <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
    </>
  ), [activeTab, setActiveTab, handleItemPress]);

  const ListFooterComponent = useCallback(() => {
    if (!hasMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator color="#FF6B6B" size="small" />
        <Text style={styles.loadingText}>Loading more countries...</Text>
      </View>
    );
  }, [hasMore]);

   return (
  <SafeAreaView style={styles.container}>
    <StatusBar barStyle="light-content" />
    <Header username={username} />
    <SearchBar 
      searchQuery={searchQuery} 
      setSearchQuery={setSearchQuery} 
      handleSearch={handleSearch}
      activeTab={activeTab}
    />
    <AnimatedFlatList
      ref={flatListRef}
      {...flatListConfig}
      style={styles.flatList}
      contentContainerStyle={styles.flatListContent}
      ListHeaderComponent={ListHeaderComponent}
      data={filteredData}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onEndReached={loadMore}
      ListFooterComponent={ListFooterComponent}
      onViewableItemsChanged={onViewableItemsChanged}
      {...Platform.select({
        android: {
          removeClippedSubviews: true,
          overScrollMode: 'never',
          scrollIndicatorInsets: { right: 1 },
        },
        ios: {
          scrollEventThrottle: 16,
          decelerationRate: 'fast',
        },
      })}
    />
  </SafeAreaView>
);
};

// 4. Optimize child components with memo and comparison
const CountryListItem = memo(({ item, onPress, shouldRender }) => {
  if (!shouldRender) return null;
  
  return (
    <TouchableOpacity 
      style={styles.countryItem} 
      onPress={() => onPress(item)}
    >
      <View style={styles.flagContainer}>
        <FlagIcon countryCode={item?.id || ''} size={40} />
      </View>
      <Text style={styles.countryName}>{item?.name || ''}</Text>
      <Ionicons name="chevron-forward" size={24} color="#888" />
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.shouldRender === nextProps.shouldRender
  );
});

// Optimized component export with memo and comparison function
export default React.memo(ShopScreen, (prevProps, nextProps) => {
  // In this case, we don't have props to compare
  // but we keep the comparison function for future props
  return true;
});
		  		  
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  flatList: {
    flex: 1,
  },
  flatListContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeContainer: {
    flex: 1,
    marginLeft: 12,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: '#888',
    fontFamily: 'Quicksand',
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
  },
  profileButton: {
    padding: 4,
  },
  searchContainer: {
    height: 60,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 30,
    overflow: 'hidden',
  },
  searchGradient: {
    flex: 1,
    padding: 2,
    borderRadius: 30,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 28,
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Quicksand',
  },
  filterButton: {
    padding: 8,
  },
  esimWrapper: {
    margin: 16,
    borderRadius: 20,
    padding: 2,
  },
  esimGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  activeEsim: {
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  
  },
  esimContent: {
    justifyContent: 'space-between',
  },
  esimHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  esimIconContainer: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 12,
    padding: 8,
    marginRight: 12,
  },
  activeEsimTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
    flex: 1,
  },
  esimDetailsContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 12,
  },
  activeEsimSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
    opacity: 0.9,
    marginBottom: 8,
  },
  dataUsageContainer: {
    marginTop: 8,
  },
  dataUsageBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
  },
  dataUsageFill: {
    height: '100%',
    backgroundColor: '#FF6B6B',
    borderRadius: 3,
  },
  dataUsageText: {
    color: '#FFFFFF',
    marginTop: 6,
    textAlign: 'right',
    fontFamily: 'Quicksand',
    fontSize: 14,
    opacity: 0.9,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 16,
    marginTop: 24,
    marginBottom: 12,
    fontFamily: 'Quicksand',
  },
  popularList: {
    paddingLeft: 16,
    paddingRight: 16,
  },
  popularDestinationItem: {
    alignItems: 'center',
    marginRight: 16,
  },
popularFlagContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,             // Add border
    borderColor: '#FF6B6B',     // Border color matching your theme
},
  popularCountryName: {
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  flagContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 16,
    backgroundColor: '#FFFFFF',
  },
  countryName: {
    flex: 1,
    fontSize: 18,
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
  },
  regionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  regionImageContainer: {
    width: 50,
    height: 50,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    overflow: 'hidden',
  },
  regionIconWrapper: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 20,
  },
  regionName: {
    flex: 1,
    fontSize: 18,
    color: '#FFFFFF',
    fontFamily: 'Quicksand',
  },
 loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  loadingText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Quicksand',
  },
balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 90,
    justifyContent: 'center',
    gap: 6,
  },
  balanceText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontFamily: 'Quicksand',
    fontWeight: '600',
  },
  emptyListText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    fontFamily: 'Quicksand',
  },
 popularDestinationsContainer: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    marginBottom: 16,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B6B',
  },
  tabIcon: {
    marginRight: 8,
  },
  tabText: {
    color: '#888',
    fontSize: 16,
    fontFamily: 'Quicksand',
  },
  activeTabText: {
    color: '#FF6B6B',
    fontWeight: 'bold',
  },
   searchContainer: {
    zIndex: 1000,
    marginVertical: 16,
    marginHorizontal: 16,
  },
  searchGradient: {
    borderRadius: 30,
    padding: 2,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 28,
    paddingHorizontal: 16,
    height: 60,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Quicksand',
    marginLeft: 8,
    paddingVertical: 8,
  },
  clearButton: {
    padding: 8,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#262626',
    borderRadius: 16,
    marginTop: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  suggestionItemSelected: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  suggestionItemLast: {
    borderBottomWidth: 0,
  },
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  suggestionFlag: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderWidth: 2,
    borderColor: '#333',
    overflow: 'hidden',
  },
  suggestionTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  suggestionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Quicksand',
    fontWeight: '600',
  },
  suggestionSubtext: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Quicksand',
    marginTop: 2,
  }
});

export default React.memo(ShopScreen);