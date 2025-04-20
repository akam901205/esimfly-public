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
import { colors } from '../theme/colors';
import PopularDestinations from '../components/PopularDestinations';
import { CountryListItem, RegionGlobalListItem, TabNavigation } from '../components/CountriesTab';
import Header from '../components/Header';


const ITEMS_PER_PAGE = 20;
const destinations = getPopularDestinations();

// Create animated FlatList component
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);


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

  const handleScroll = useRef(
    Animated.event(
      [{ nativeEvent: { contentOffset: { y: scrollY } } }],
      { useNativeDriver: true }
    )
  ).current;

  const username = useMemo(() => {
    if (userEmail) {
      const atIndex = userEmail.indexOf('@');
      return atIndex !== -1 ? userEmail.substring(0, atIndex) : userEmail;
    }
    return 'stranger';
  }, [userEmail]);

  const keyExtractor = useCallback((item, index) => {
    if (!item?.id) return `empty-${index}`;
    return `${activeTab.toLowerCase()}-${item.id}-${index}`;
  }, [activeTab]);

  const MemoizedCountryItem = memo(CountryListItem, (prev, next) => {
    return prev.item.id === next.item.id;
  });

  const MemoizedRegionItem = memo(RegionGlobalListItem, (prev, next) => {
    return prev.item.name === next.item.name;
  });

  const handleSearch = useCallback(
    debounce((query) => {
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
    }, 300),
    [activeTab]
  );

  const handleItemPress = useCallback((item) => {
    if (item.flagCode) {
      setActiveTab('Countries');
      const initialItems = countries.slice(0, ITEMS_PER_PAGE);
      setFilteredData(initialItems);
      setHasMore(countries.length > ITEMS_PER_PAGE);
      setPage(0);
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
  }, [navigation, activeTab, setActiveTab]);

  const renderItem = useCallback(({ item }) => {
    if (!item?.id) return null;
    
    if (activeTab === 'Countries') {
      return (
        <MemoizedCountryItem 
          item={item}
          onPress={handleItemPress}
        />
      );
    }
    return (
      <MemoizedRegionItem 
        item={item}
        onPress={handleItemPress}
      />
    );
  }, [activeTab, handleItemPress]);

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

 const onMomentumScrollEnd = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      if (isLoadingMore) setIsLoadingMore(false);
    });
  }, [isLoadingMore]);

  // Optimize list configuration
  const flatListConfig = useMemo(() => ({
    removeClippedSubviews: Platform.OS === 'android', // Enable only on Android
    maxToRenderPerBatch: 5, // Reduced from 10
    updateCellsBatchingPeriod: 100, // Increased from 50
    initialNumToRender: 10, // Reduced from 15
    windowSize: 3, // Reduced from 5
    maintainVisibleContentPosition: {
      minIndexForVisible: 0,
      autoscrollToTopThreshold: 10,
    },
    getItemLayout: (data, index) => ({
      length: 76,
      offset: 76 * index,
      index,
    }),
    onEndReachedThreshold: 0.7, // Increased from 0.5
    scrollEventThrottle: Platform.OS === 'ios' ? 16 : 32,
    viewabilityConfig: {
      viewAreaCoveragePercentThreshold: 50,
      waitForInteraction: true,
    },
    extraData: activeTab,
  }), [activeTab]);

  // Optimize data loading
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore || activeTab !== 'Countries') return;

    setIsLoadingMore(true);
    
    InteractionManager.runAfterInteractions(() => {
      const nextPage = page + 1;
      const startIndex = nextPage * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;

      const existingIds = new Set(filteredData.map(item => item.id));
      const newItems = countries
        .slice(startIndex, endIndex)
        .filter(item => !existingIds.has(item.id));

      if (newItems.length > 0) {
        setFilteredData(prev => [...prev, ...newItems]);
        setPage(nextPage);
        setHasMore(endIndex < countries.length);
      } else {
        setHasMore(false);
      }
      setIsLoadingMore(false);
    });
  }, [page, isLoadingMore, hasMore, activeTab, filteredData]);

 useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const initializeData = async () => {
        if (activeTab === 'Countries') {
          const initialItems = countries
            .slice(0, ITEMS_PER_PAGE)
            .filter((item, index, self) => 
              index === self.findIndex(t => t.id === item.id)
            );

          if (isMounted) {
            await InteractionManager.runAfterInteractions(() => {
              setFilteredData(initialItems);
              setHasMore(countries.length > ITEMS_PER_PAGE);
              setPage(0);
              setSearchQuery('');
            });
          }
        } else {
          if (isMounted) {
            await InteractionManager.runAfterInteractions(() => {
              setFilteredData(activeTab === 'Regional' ? regions : globalPackages);
              setHasMore(false);
            });
          }
        }
      };

      initializeData();

      return () => {
        isMounted = false;
      };
    }, [activeTab])
  );

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
        contentContainerStyle={[
          styles.flatListContent,
          // Add bottom padding to prevent content from being hidden behind the tab bar
          { paddingBottom: Platform.OS === 'ios' ? 110 : 90 }
        ]}
        ListHeaderComponent={ListHeaderComponent}
        data={filteredData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        onEndReached={loadMore}
        ListFooterComponent={ListFooterComponent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        onMomentumScrollEnd={onMomentumScrollEnd}
        decelerationRate={Platform.OS === 'ios' ? 'normal' : 0.985}
        {...Platform.select({
          android: {
            overScrollMode: 'never',
          },
          ios: {
            directionalLockEnabled: true,
          },
        })}
      />
    </SafeAreaView>
  );
};

		  		  
const styles = StyleSheet.create({
  // Main Container Styles
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  listContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  list: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  headerContainer: {
    paddingTop: 16,
  },

  // Balance Container Styles
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.stone[100],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 90,
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.stone[300],
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
  balanceText: {
    color: colors.stone[800],
    fontSize: 16,
    fontFamily: 'Quicksand',
    fontWeight: '600',
  },

  // Search Styles
  searchContainer: {
    zIndex: 1000,
    marginVertical: 12,
    marginHorizontal: 12,
    ...Platform.select({
      ios: {
        shadowColor: colors.stone[900],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  searchGradient: {
    borderRadius: 12,
    padding: 2,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.stone[100],
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 56,
    borderWidth: 1,
    borderColor: colors.stone[300],
  },
  searchInput: {
    flex: 1,
    color: colors.stone[800],
    fontSize: 16,
    fontFamily: 'Quicksand',
    marginLeft: 8,
  },
  clearButton: {
    padding: 8,
  },

  // Item Styles
  itemTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background.primary,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  itemShadow: {
    ...Platform.select({
      ios: {
        shadowColor: colors.stone[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  flagWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 16,
  },
  flagImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  imageNoShadow: {
    shadowColor: 'transparent',
    elevation: 0,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  itemName: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
    fontFamily: 'Quicksand',
  },

  // Loading Footer Styles
  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadingText: {
    marginLeft: 8,
    color: colors.text.secondary,
    fontSize: 14,
    fontFamily: 'Quicksand',
  },

  // Popular Destinations Styles
  popularDestinationsContainer: {
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.stone[800],
    marginLeft: 16,
    marginTop: 24,
    marginBottom: 12,
    fontFamily: 'Quicksand',
  },

  // Suggestions Styles
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.stone[100],
    borderRadius: 12,
    marginTop: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.stone[300],
    ...Platform.select({
      ios: {
        shadowColor: colors.stone[900],
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[300],
  },
  suggestionItemSelected: {
    backgroundColor: colors.stone[200],
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
    backgroundColor: colors.stone[100],
    borderWidth: 1,
    borderColor: colors.stone[300],
    overflow: 'hidden',
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
  suggestionTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  suggestionText: {
    color: colors.stone[800],
    fontSize: 16,
    fontFamily: 'Quicksand',
    fontWeight: '600',
  },
  suggestionSubtext: {
    color: colors.stone[600],
    fontSize: 12,
    fontFamily: 'Quicksand',
    marginTop: 2,
  },

  // Empty State Styles
  emptyListText: {
    color: colors.stone[600],
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    fontFamily: 'Quicksand',
  },
});

export default React.memo(ShopScreen);