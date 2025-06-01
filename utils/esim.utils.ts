// ESim utility functions

import { ESim, TopUpAvailability } from '@/types/esim.types';

export const getCountryFromPackageName = (packageName?: string): string => {
  if (!packageName) return 'International';
  
  const lowerPackageName = packageName.toLowerCase();
  
  // Check if this is a regional package based on the package name
  // Define regional package patterns
  if (lowerPackageName.includes('central asia')) return 'Central Asia';
  if (lowerPackageName.includes('southeast asia')) return 'Southeast Asia';
  if (lowerPackageName.includes('south america')) return 'South America';
  if (lowerPackageName.includes('europe')) return 'Europe';
  if (lowerPackageName.includes('africa')) return 'Africa';
  if (lowerPackageName.includes('asia pacific')) return 'Asia Pacific';
  if (lowerPackageName.includes('caribbean')) return 'Caribbean';
  if (lowerPackageName.includes('middle east')) return 'Middle East';
  if (lowerPackageName.includes('global') || lowerPackageName.includes('discover')) return 'Global';
  
  return 'International';
};

export const transformEsimData = (esim: any): ESim => {
  const packageName = esim.package?.toLowerCase() || '';
  
  return {
    id: parseInt(esim.id),
    plan_name: esim.package,
    status: esim.status === 'new' ? 'New' : (esim.rawStatus || esim.status),
    status_key: esim.status,
    data_left: esim.dataTotal === 'Unlimited' ? 'Unlimited' : (esim.dataTotal - esim.dataUsed),
    data_left_formatted: esim.dataTotal === 'Unlimited' ? 'Unlimited' : `${(esim.dataTotal - esim.dataUsed).toFixed(2)} GB`,
    data_left_percentage: 100 - esim.dataPercentage,
    total_volume: esim.dataTotal === 'Unlimited' ? 'Unlimited' : `${esim.dataTotal} GB`,
    time_left: esim.expires && esim.expires !== 'N/A' ? 
      (() => {
        const expiryDate = new Date(esim.expires);
        const now = new Date();
        const diffTime = expiryDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? `${diffDays} days` : 'Expired';
      })() : 'N/A',
    activated_before: 'N/A',
    iccid: esim.iccid,
    flag_url: esim.flagUrl,
    short_url: '',
    country: (() => {
      // Check if this is a regional package based on the package name
      if (packageName.includes('central asia')) return 'Central Asia';
      if (packageName.includes('southeast asia')) return 'Southeast Asia';
      if (packageName.includes('south america')) return 'South America';
      if (packageName.includes('europe')) return 'Europe';
      if (packageName.includes('africa')) return 'Africa';
      if (packageName.includes('asia pacific')) return 'Asia Pacific';
      if (packageName.includes('caribbean')) return 'Caribbean';
      if (packageName.includes('middle east')) return 'Middle East';
      if (packageName.includes('global') || packageName.includes('discover')) return 'Global';
      
      // For multi-country packages like "Singapore & Malaysia & Thailand"
      if (packageName.includes('&') && esim.countries && esim.countries.length > 1) {
        return esim.countries.slice(0, 3).join(' & ');
      }
      
      // Default to first country or 'International'
      return esim.countries && esim.countries.length > 0 ? esim.countries[0] : 'International';
    })(),
    package_code: esim.provider || '',
    unlimited: esim.dataTotal === 'Unlimited',
    assigned_user: null
  };
};

export const checkTopUpAvailability = (
  esim: ESim, 
  navigation: any
): TopUpAvailability => {
  const iccid = esim.iccid;
  const upperStatus = esim.status.toUpperCase();
  
  // Map of statuses and their topup availability
  switch (upperStatus) {
    case 'ACTIVE':
    case 'IN_USE':
      return {
        canTopUp: true,
        message: 'You can top up this active eSIM.'
      };
      
    case 'EXPIRED':
      return {
        canTopUp: true,
        message: 'Your eSIM has expired. You can reactivate it with a top-up.'
      };
      
    case 'EXPIRING':
      return {
        canTopUp: true,
        message: 'Your eSIM is expiring soon. Top up now to extend it.'
      };
      
    case 'DEPLETED':
      return {
        canTopUp: true,
        message: 'Your data has been fully used. Top up to add more data.'
      };
      
    case 'NEW':
    case 'NOT_ACTIVE':
    case 'ONBOARD':
    case 'GOT_RESOURCE':
      return {
        canTopUp: false,
        message: 'This eSIM needs to be activated before it can be topped up.',
        action: {
          label: 'View Activation Instructions',
          handler: () => {
            if (iccid) {
              navigation.navigate('Instructions', { iccid, esimId: esim.id });
            }
          }
        }
      };
      
    case 'RELEASED':
      return {
        canTopUp: false,
        message: 'This eSIM needs to be activated. Please scan the QR code or follow the installation instructions.',
        action: {
          label: 'View Installation Guide',
          handler: () => {
            if (iccid) {
              navigation.navigate('Shop', {
                screen: 'Instructions',
                params: {
                  iccid: iccid,
                  esimId: esim.id
                }
              });
            }
          }
        }
      };
      
    default:
      return {
        canTopUp: false,
        message: 'Top-up is not available for this eSIM status.'
      };
  }
};