import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Animated,
  Text,
  StyleSheet,
  Platform,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import debounce from 'lodash/debounce';
import { countries, FlagIcon } from '../utils/countryData';
import { isCountryInRegion, regionCoverageData } from '../utils/regionCoverage';
import { isCountryInGlobalCoverage } from '../utils/globalCoverage';
import { regions } from '../utils/regions';
import { globalPackages } from '../utils/global';
import { colors } from '../theme/colors';

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleSearch: (query: string) => void;
  activeTab: string;
}

interface Suggestion {
  id: string;
  name: string;
  type: 'country' | 'region' | 'global';
  description?: string;
  countryCode?: string;
  score?: number;
}

export const SearchBar: React.FC<SearchBarProps> = React.memo(({ 
  searchQuery, 
  setSearchQuery, 
  handleSearch, 
  activeTab 
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debouncedSearch = useRef(debounce(handleSearch, 300)).current;
  const searchInputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation();

  const formatCountryCount = (count: number) => {
    return count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count.toString();
  };

  const getPlaceholderText = useCallback(() => {
    switch (activeTab) {
      case 'Countries':
        return `Search across ${formatCountryCount(countries.length)} countries`;
      case 'Regional':
        return `Search ${regionCoverageData.length} regional plans`;
      case 'Global':
        return 'Search Discover Global packages';
      default:
        return 'Search destinations';
    }
  }, [activeTab]);

  const getSearchMatches = (text: string): Suggestion[] => {
    if (!text) return [];
    const searchLower = text.toLowerCase();
    const matches: Suggestion[] = [];
    const addedRegions = new Set<string>();
    const hasGlobalSuggestion = { added: false };

    // First, search for regional packages directly
    regions.forEach(region => {
      const name = region.name.toLowerCase();
      let score = 0;
      
      if (name.startsWith(searchLower)) {
        score = 110; // Higher score for direct regional matches
      } else if (name.includes(searchLower)) {
        score = 85;
      }
      
      if (score > 0) {
        matches.push({
          id: `region-${region.name}`,
          name: region.name,
          type: 'region',
          description: `${region.countries?.length || 'Multiple'} countries`,
          score
        });
        addedRegions.add(region.name);
      }
    });

    // Search for global packages
    globalPackages.forEach(pkg => {
      const name = pkg.name.toLowerCase();
      let score = 0;
      
      if (name.startsWith(searchLower)) {
        score = 105;
      } else if (name.includes(searchLower)) {
        score = 80;
      }
      
      if (score > 0 && !hasGlobalSuggestion.added) {
        hasGlobalSuggestion.added = true;
        matches.push({
          id: 'global',
          name: pkg.name,
          type: 'global',
          description: 'Worldwide coverage',
          score
        });
      }
    });

    // Match countries - strict matching only
    countries.forEach(country => {
      const name = country.name.toLowerCase();
      let score = 0;
      
      // Prioritize countries that start with the search term
      if (name.startsWith(searchLower)) {
        score = 100;
      } 
      // Also show countries that contain the search term, but with lower priority
      else if (name.includes(searchLower)) {
        // Check if it's a word boundary match (more relevant)
        const words = name.split(/[\s-]+/); // Split by space or hyphen
        const startsWithWord = words.some(word => word.toLowerCase().startsWith(searchLower));
        
        if (startsWithWord) {
          score = 75; // Higher score for word-boundary matches
        } else {
          score = 50; // Lower score for mid-word matches
        }
      }
      // No fuzzy matching - only show exact matches

      if (score > 0) {
        const suggestion: Suggestion = {
          id: country.id,
          name: country.name,
          type: 'country',
          countryCode: country.id,
          score
        };

        // Add regional coverage if available (but avoid duplicates)
        regionCoverageData.forEach(region => {
          if (isCountryInRegion(country.name, region.name) && !addedRegions.has(region.name)) {
            addedRegions.add(region.name);
            matches.push({
              id: `region-${region.name}`,
              name: region.name,
              type: 'region',
              description: `Regional coverage includes ${country.name}`,
              score: score - 10
            });
          }
        });

        // Add global coverage if available (only once)
        if (isCountryInGlobalCoverage(country.name) && !hasGlobalSuggestion.added) {
          hasGlobalSuggestion.added = true;
          matches.push({
            id: 'global',
            name: 'Discover Global',
            type: 'global',
            description: `Global coverage includes ${country.name}`,
            score: score - 20
          });
        }

        matches.push(suggestion);
      }
    });

    return matches
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 5);
  };

  const handleChangeText = useCallback((text: string) => {
    setSearchQuery(text);
    setSelectedIndex(-1);
    const newSuggestions = getSearchMatches(text);
    setSuggestions(newSuggestions);
    
    if (newSuggestions.length > 0) {
      setShowSuggestions(true);
      Animated.spring(fadeAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => setShowSuggestions(false));
    }
    
    debouncedSearch(text);
  }, [setSearchQuery, debouncedSearch, fadeAnim]);

  const handleSuggestionPress = useCallback((suggestion: Suggestion, index: number) => {
    setSelectedIndex(index);
    
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setShowSuggestions(false);
        setSelectedIndex(-1);
        setSuggestions([]);
        
        // Clear search after navigation
        setSearchQuery('');
        
        switch (suggestion.type) {
          case 'country':
            navigation.navigate('PackageType' as never, { country: suggestion.name } as never);
            break;
          case 'region':
            navigation.navigate('RegionalPackageType' as never, { region: suggestion.name } as never);
            break;
          case 'global':
            navigation.navigate('GlobalPackageType' as never, { 
              globalPackageName: 'Discover Global'
            } as never);
            break;
        }
      });
      Platform.OS !== 'web' && Keyboard.dismiss();
    }, 150);
  }, [setSearchQuery, fadeAnim, navigation]);

  const renderSuggestionIcon = (suggestion: Suggestion) => {
    switch (suggestion.type) {
      case 'country':
        return (
          <View style={styles.suggestionFlag}>
            <FlagIcon countryCode={suggestion.countryCode || ''} size={28} />
          </View>
        );
      case 'region':
        return (
          <LinearGradient
            colors={['#FF6B00', '#FF8533']}
            style={styles.suggestionFlag}
          >
            <Ionicons name="globe-outline" size={20} color="#FFFFFF" />
          </LinearGradient>
        );
      case 'global':
        return (
          <LinearGradient
            colors={['#FF6B00', '#FF8533']}
            style={styles.suggestionFlag}
          >
            <Ionicons name="earth-outline" size={20} color="#FFFFFF" />
          </LinearGradient>
        );
    }
  };

  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchWrapper}>
        {Platform.OS === 'ios' && (
          <BlurView intensity={80} tint="light" style={styles.searchBlur} />
        )}
        <View style={styles.searchContent}>
          <Ionicons 
            name="search" 
            size={20} 
            color="#6B7280" 
          />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder={getPlaceholderText()}
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={handleChangeText}
            autoCorrect={false}
            returnKeyType="search"
            autoCapitalize="none"
            allowFontScaling={false}
            multiline={false}
            numberOfLines={1}
            blurOnSubmit={true}
            clearButtonMode="never"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => {
                setSearchQuery('');
                setSuggestions([]);
                Animated.timing(fadeAnim, {
                  toValue: 0,
                  duration: 150,
                  useNativeDriver: true,
                }).start(() => setShowSuggestions(false));
                searchInputRef.current?.focus();
              }}
            >
              <Ionicons 
                name="close-circle" 
                size={20} 
                color="#9CA3AF" 
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showSuggestions && (
        <Animated.View 
          style={[
            styles.suggestionsContainer,
            {
              opacity: fadeAnim,
              transform: [{
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-10, 0]
                })
              }]
            }
          ]}
        >
          {suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={suggestion.id}
              style={[
                styles.suggestionItem,
                selectedIndex === index && styles.suggestionItemSelected,
                index === suggestions.length - 1 && styles.suggestionItemLast
              ]}
              onPress={() => handleSuggestionPress(suggestion, index)}
              activeOpacity={0.7}
            >
              <View style={styles.suggestionContent}>
                {renderSuggestionIcon(suggestion)}
                <View style={styles.suggestionTextContainer}>
                  <Text style={styles.suggestionText}>{suggestion.name}</Text>
                  <Text style={styles.suggestionSubtext}>
                    {suggestion.description || 'Tap to view plans'}
                  </Text>
                </View>
              </View>
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color={colors.stone[500]} 
              />
            </TouchableOpacity>
          ))}
        </Animated.View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  searchContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
    zIndex: 1000,
    height: 48, // Reduced height
  },
  searchWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    height: 48, // Reduced height
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
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 4 : 8,
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.9)',
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#1F2937',
    fontFamily: undefined, // Remove custom font to use system default
    fontWeight: '400',
    paddingRight: 8,
    paddingVertical: 0,
    backgroundColor: 'transparent',
    height: Platform.OS === 'ios' ? 36 : 40,
    lineHeight: Platform.OS === 'android' ? 20 : 20,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  clearButton: {
    padding: 2,
    marginLeft: 4,
    marginRight: -4, // Compensate for padding to ensure icon is visible
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 54, // Position below the search bar (48px height + 6px gap)
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: 350, // Limit height to prevent too many suggestions
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionItemSelected: {
    backgroundColor: '#FFF7ED',
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
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  suggestionIcon: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  suggestionTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  suggestionText: {
    color: '#1F2937',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    fontWeight: '600',
  },
  suggestionSubtext: {
    color: '#6B7280',
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    marginTop: 2,
  },
});

export default SearchBar;