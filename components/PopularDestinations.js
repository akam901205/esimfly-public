import React, { memo, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { getPopularDestinations } from '../utils/popularDestinations';
import { FlagIcon } from '../utils/countryData';
import { colors } from '../theme/colors';

const destinations = getPopularDestinations();

const PopularDestinations = memo(({ onItemPress }) => {
  const renderDestinationItem = useCallback(({ item }) => (
    <TouchableOpacity 
      style={styles.popularDestinationItem} 
      onPress={() => onItemPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.flagContainer}>
        <FlagIcon 
          countryCode={item.flagCode} 
          size={48}
          variant="popular"
        />
      </View>
      <Text style={styles.countryName}>{item.name}</Text>
    </TouchableOpacity>
  ), [onItemPress]);

  const keyExtractor = useCallback((item) => `popular-destination-${item.id}-${item.code}`, []);

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerContainer}>
        <Text style={styles.sectionTitle}>Popular Destinations</Text>
      </View>
      <View style={styles.sectionContainer}>
        <View style={styles.container}>
          <FlatList
            horizontal
            data={destinations}
            renderItem={renderDestinationItem}
            keyExtractor={keyExtractor}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            initialNumToRender={5}
            maxToRenderPerBatch={8}
            windowSize={3}
            getItemLayout={(data, index) => ({
              length: 85,
              offset: 85 * index,
              index,
            })}
            removeClippedSubviews={true}
          />
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 6,
  },
  sectionContainer: {
    backgroundColor: colors.background.secondary,
    paddingVertical: 12,
    marginHorizontal: 12,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  container: {
    backgroundColor: colors.background.secondary,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    fontFamily: 'Quicksand',
  },
  listContent: {
    paddingHorizontal: 12,
  },
  popularDestinationItem: {
    alignItems: 'center',
    marginRight: 10,
    width: 80,
  },
  flagContainer: {
    padding: 6,
    backgroundColor: colors.background.secondary,
    borderRadius: 50,
    marginBottom: 6,
  },
  countryName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
    fontFamily: 'Quicksand',
    textAlign: 'center',
  }
});

export default PopularDestinations;