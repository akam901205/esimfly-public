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

    // Fuzzy match countries
    countries.forEach(country => {
      const name = country.name.toLowerCase();
      let score = 0;
      
      if (name.startsWith(searchLower)) {
        score = 100;
      } else if (name.includes(searchLower)) {
        score = 75;
      } else {
        let textIndex = 0;
        let nameIndex = 0;
        while (textIndex < searchLower.length && nameIndex < name.length) {
          if (searchLower[textIndex] === name[nameIndex]) {
            score += 10;
            textIndex++;
          }
          nameIndex++;
        }
      }

      if (score > 30) {
        const suggestion: Suggestion = {
          id: country.id,
          name: country.name,
          type: 'country',
          countryCode: country.id,
          score
        };

        // Add regional coverage if available
        regionCoverageData.forEach(region => {
          if (isCountryInRegion(country.name, region.name)) {
            matches.push({
              id: `region-${region.name}`,
              name: region.name,
              type: 'region',
              description: `Regional coverage includes ${country.name}`,
              score: score - 10
            });
          }
        });

        // Add global coverage if available
        if (isCountryInGlobalCoverage(country.name)) {
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
      setSearchQuery(suggestion.name);
      handleSearch(suggestion.name);
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setShowSuggestions(false);
        setSelectedIndex(-1);
        
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
        colors={[colors.stone[50], colors.stone[100]]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}
        style={styles.searchGradient}
      >
        <View style={styles.searchInputContainer}>
          <Ionicons 
            name="search" 
            size={24} 
            color={colors.stone[500]} 
          />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder={getPlaceholderText()}
            placeholderTextColor={colors.stone[500]}
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
                }).start(() => setShowSuggestions(false));
                searchInputRef.current?.focus();
              }}
            >
              <Ionicons 
                name="close-circle" 
                size={20} 
                color={colors.stone[500]} 
              />
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
    zIndex: 1000,
    marginVertical: 16,
    marginHorizontal: 14,
    elevation: Platform.OS === 'android' ? 6 : 0,
  },
  searchGradient: {
    borderRadius: 16,
    padding: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: colors.stone[900],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
    }),
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 45,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  searchInput: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 16,
    fontFamily: 'Quicksand',
    marginLeft: 12,
    paddingVertical: 12,
  },
  clearButton: {
    padding: 8,
    marginLeft: 4,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    marginTop: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...Platform.select({
      ios: {
        shadowColor: colors.stone[900],
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
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
    borderBottomColor: colors.stone[200],
  },
  suggestionItemSelected: {
    backgroundColor: colors.stone[50],
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
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.stone[200],
    overflow: 'hidden',
  },
  suggestionIcon: {
    backgroundColor: colors.stone[100],
  },
  suggestionTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  suggestionText: {
    color: colors.text.primary,
    fontSize: 16,
    fontFamily: 'Quicksand',
    fontWeight: '600',
  },
  suggestionSubtext: {
    color: colors.text.secondary,
    fontSize: 12,
    fontFamily: 'Quicksand',
    marginTop: 2,
  },
});

export default SearchBar;