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
import { useNavigation } from '@react-navigation/native';
import debounce from 'lodash/debounce';
import { countries, FlagIcon } from '../utils/countryData';
import { isCountryInRegion, regionCoverageData } from '../utils/regionCoverage';
import { isCountryInGlobalCoverage } from '../utils/globalCoverage';

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleSearch: (query: string) => void;
  activeTab: string;
}

interface Country {
  id: string;
  name: string;
}

interface Suggestion {
  id: string;
  name: string;
  type: 'country' | 'region' | 'global';
  description?: string;
  countryCode?: string;
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
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

const getPlaceholderText = useCallback(() => {
    switch (activeTab) {
      case 'Countries':
        return `Search across ${formatCountryCount(countries.length)} countries`;
      case 'Regional':
        return `Search ${regionCoverageData.length} regional plans`;
      case 'Global':
        return `Search Discover Global packages`;  // Updated text
      default:
        return 'Search destinations';
    }
  }, [activeTab]);

  const getSuggestions = useCallback((text: string): Suggestion[] => {
    if (!text) return [];
    const searchLower = text.toLowerCase();
    let suggestions: Suggestion[] = [];

    // Get country matches
    const countryMatches = countries
      .filter(country => country.name.toLowerCase().startsWith(searchLower))
      .slice(0, 2)
      .map(country => ({
        id: country.id,
        name: country.name,
        type: 'country' as const,
        countryCode: country.id
      }));

    suggestions.push(...countryMatches);

    // If we found any country matches, check for regional and global coverage
    if (countryMatches.length > 0) {
      const countryName = countryMatches[0].name;

      // Add regional suggestions
      regionCoverageData.forEach(region => {
        if (isCountryInRegion(countryName, region.name)) {
          suggestions.push({
            id: `region-${region.name}`,
            name: region.name,
            type: 'region',
            description: `Regional coverage includes ${countryName}`
          });
        }
      });

      // Add global suggestion if available
      if (isCountryInGlobalCoverage(countryName)) {
        suggestions.push({
          id: 'global',
          name: 'Discover Global',  // Updated to match exact package name
          type: 'global',
          description: `Global coverage includes ${countryName}`
        });
      }
    }

    return suggestions;
  }, []);

  const handleChangeText = useCallback((text: string) => {
    setSearchQuery(text);
    setSelectedIndex(-1);
    const newSuggestions = getSuggestions(text);
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
      }).start(() => {
        setShowSuggestions(false);
      });
    }
    
    debouncedSearch(text);
  }, [setSearchQuery, debouncedSearch, getSuggestions, fadeAnim]);

  const handleSuggestionPress = useCallback((suggestion: Suggestion, index: number) => {
    setSelectedIndex(index);
    
    setTimeout(() => {
      setSearchQuery(suggestion.name);
      handleSearch(suggestion.name);
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setShowSuggestions(false);
        setSelectedIndex(-1);
        
        // Navigate based on suggestion type
        switch (suggestion.type) {
          case 'country':
            navigation.navigate('PackageType' as never, { country: suggestion.name } as never);
            break;
          case 'region':
            navigation.navigate('RegionalPackageType' as never, { region: suggestion.name } as never);
            break;
          case 'global':
            navigation.navigate('GlobalPackageType' as never, { 
              globalPackageName: 'Discover Global' // Updated to match exact package name
            } as never);
            break;
        }
      });
      Platform.OS !== 'web' && Keyboard.dismiss();
    }, 150);
  }, [setSearchQuery, handleSearch, fadeAnim, navigation]);

  const renderSuggestionIcon = (suggestion: Suggestion) => {
    switch (suggestion.type) {
      case 'country':
        return (
          <View style={styles.suggestionFlag}>
            <FlagIcon countryCode={suggestion.countryCode || ''} size={32} />
          </View>
        );
      case 'region':
        return (
          <View style={[styles.suggestionFlag, styles.suggestionIcon]}>
            <Ionicons name="globe-outline" size={20} color="#FF6B6B" />
          </View>
        );
      case 'global':
        return (
          <View style={[styles.suggestionFlag, styles.suggestionIcon]}>
            <Ionicons name="earth-outline" size={20} color="#FF6B6B" />
          </View>
        );
    }
  };

  return (
    <View style={styles.searchContainer}>
      <LinearGradient
        colors={['#FF6B6B', '#FF6B6B']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}
        style={styles.searchGradient}
      >
        <View style={styles.searchInputContainer}>
          <Ionicons 
            name="search" 
            size={24} 
            color="#888" 
            style={styles.searchIcon} 
          />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder={getPlaceholderText()}
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={handleChangeText}
            autoCorrect={false}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {searchQuery && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => {
                setSearchQuery('');
                setSuggestions([]);
                Animated.timing(fadeAnim, {
                  toValue: 0,
                  duration: 150,
                  useNativeDriver: true,
                }).start(() => {
                  setShowSuggestions(false);
                });
                searchInputRef.current?.focus();
              }}
            >
              <Ionicons name="close-circle" size={20} color="#888" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

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
                color={selectedIndex === index ? '#FF6B6B' : '#666'} 
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
  searchIcon: {
    marginRight: 8,
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
  suggestionIcon: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderColor: 'rgba(255, 107, 107, 0.2)',
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
  },
});

export default SearchBar;