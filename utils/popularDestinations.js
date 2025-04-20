export const popularDestinations = [
  {
    id: 'tr',
    name: 'Turkey',
    code: 'TR',
    region: 'Europe',
    flagCode: 'tr',
    isPopular: true
  },
  {
    id: 'se',
    name: 'Sweden',
    code: 'SE',
    region: 'Europe',
    flagCode: 'se',
    isPopular: true
  },
  {
    id: 'us',
    name: 'United States',
    code: 'US',
    region: 'North America',
    flagCode: 'us',
    isPopular: true
  },
  {
    id: 'no',
    name: 'Norway',
    code: 'NO',
    region: 'Europe',
    flagCode: 'no',
    isPopular: true
  },
  {
    id: 'iq',
    name: 'Iraq',
    code: 'IQ',
    region: 'Middle East',
    flagCode: 'iq',
    isPopular: true
  },
  {
    id: 'sa',
    name: 'Saudi Arabia',
    code: 'SA',
    region: 'Middle East',
    flagCode: 'sa',
    isPopular: true
  },
  {
    id: 'cn',
    name: 'China',
    code: 'CN',
    region: 'Asia',
    flagCode: 'cn',
    isPopular: true
  },
  {
    id: 'ma',
    name: 'Morocco',
    code: 'MA',
    region: 'Africa',
    flagCode: 'ma',
    isPopular: true
  }
];
// Helper function to get a subset of popular destinations
export const getPopularDestinations = (limit = 8) => {
  return popularDestinations.slice(0, limit);
};
// Helper function to check if a destination is popular
export const isPopularDestination = (id) => {
  return popularDestinations.some(destination => destination.id === id.toLowerCase());
};
// Helper function to get a destination by ID
export const getDestinationById = (id) => {
  return popularDestinations.find(destination => destination.id === id.toLowerCase());
};
export default popularDestinations;