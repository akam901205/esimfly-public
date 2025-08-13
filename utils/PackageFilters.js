import { countries } from '../utils/countryData';

const ASIA_PACKAGE_RULES = {
  MAIN_MIN_COUNTRIES: 18,
  ALT_MAX_COUNTRIES: 7
};

const EXCLUDED_AFRICAN_COUNTRIES = ['Central African Republic', 'South Africa'];

export const isUnlimitedPackage = (pkg) => {
  if (!pkg) return false;
  return (
    pkg.data === 'Unlimited' ||
    pkg.unlimited === true ||
    pkg.isUnlimited === true ||
    (typeof pkg.data === 'string' && pkg.data.toLowerCase().includes('unlimited')) ||
    (typeof pkg.dataAmount === 'string' && pkg.dataAmount.toLowerCase().includes('unlimited')) ||
    parseFloat(pkg.data) >= 1000
  );
};

export const getCountryNameByCode = (code) => {
  if (!code) return '';
  
  // Normalize code to lowercase for comparison
  const normalizedCode = code.toLowerCase();
  
  // Find country by ID
  const country = countries.find(c => c.id.toLowerCase() === normalizedCode);
  
  // Log for debugging
  console.log('Looking up country:', {
    code: normalizedCode,
    found: country?.name || null
  });
  
  return country ? country.name : code;
};

export const normalizeDuration = (duration) => {
  if (!duration) return '0 DAYS';
  
  if (typeof duration === 'number') {
    return `${duration} DAY${duration > 1 ? 'S' : ''}`;
  }
  
  const durationStr = String(duration).toLowerCase();
  const number = parseInt(durationStr);
  
  if (isNaN(number)) return '0 DAYS';
  
  if (durationStr.includes('day')) {
    return `${number} DAY${number > 1 ? 'S' : ''}`;
  }
  
  return `${number} DAY${number > 1 ? 'S' : ''}`;
};

const calculatePriceRatio = (pkg) => {
  if (pkg.unlimited) return pkg.price;
  const data = parseFloat(pkg.data);
  if (!data || data <= 0) return Infinity;
  return pkg.price / data;
};

const isPriceUnreasonable = (pkg, allPackages) => {
  if (pkg.unlimited) return false;
  
  const pkgData = parseFloat(pkg.data);
  const pkgDuration = parseInt(pkg.duration);
  const pkgPricePerGB = pkg.price / pkgData;

  // Find packages with similar duration (within 2 days)
  const similarDurationPackages = allPackages.filter(p => {
    if (p.unlimited || p === pkg) return false;
    const pData = parseFloat(p.data);
    const pDuration = parseInt(p.duration);
    return pData > 0 && 
           Math.abs(pDuration - pkgDuration) <= 2;
  });

  // Find packages with lower data amount to compare
  const lowerDataPackages = similarDurationPackages.filter(p => {
    const pData = parseFloat(p.data);
    return pData < pkgData && pData >= pkgData * 0.3; // Compare with packages having at least 30% of the data
  });

  // Check price ratio against each lower data package
  for (const lowerPkg of lowerDataPackages) {
    const lowerData = parseFloat(lowerPkg.data);
    const lowerPrice = lowerPkg.price;

    // Calculate ratios
    const dataRatio = pkgData / lowerData;
    const priceRatio = pkg.price / lowerPrice;

    // Set stricter price ratio limits based on data increase
    let maxPriceRatio;
    if (dataRatio <= 1.5) {
      maxPriceRatio = dataRatio * 1.2;  // Allow 20% more price increase than data increase for small jumps
    } else if (dataRatio <= 2) {
      maxPriceRatio = dataRatio * 1.5;  // Allow 50% more price increase than data increase for medium jumps
    } else {
      maxPriceRatio = dataRatio * 1.8;  // Allow 80% more price increase than data increase for large jumps
    }

    // If price increase is too high relative to data increase
    if (priceRatio > maxPriceRatio) {
      console.log('Unreasonable price increase:', {
        package: {
          name: pkg.name,
          data: pkgData,
          price: pkg.price,
          pricePerGB: pkgPricePerGB
        },
        comparedTo: {
          name: lowerPkg.name,
          data: lowerData,
          price: lowerPrice,
          pricePerGB: lowerPrice / lowerData
        },
        ratios: {
          data: dataRatio,
          price: priceRatio,
          maxAllowed: maxPriceRatio
        }
      });
      return true;
    }

    // Additional check for price per GB
    const lowerPricePerGB = lowerPrice / lowerData;
    if (pkgPricePerGB > lowerPricePerGB * 1.8) {
      console.log('Unreasonable price per GB increase:', {
        package: `${pkgPricePerGB.toFixed(2)}/GB`,
        compared: `${lowerPricePerGB.toFixed(2)}/GB`,
      });
      return true;
    }
  }

  return false;
};

const calculateMaxPriceMultiplier = (dataIncrease) => {
  // For 2x data increase (e.g., 50GB to 100GB), max price increase is 1.8x
  // For 2.5x data, max price increase is 2x
  // For 3x data, max price increase is 2.2x
  if (dataIncrease <= 1.5) return dataIncrease; // Linear for small increases
  if (dataIncrease <= 2) return 1.8;   // e.g., 50GB→100GB should be max 1.8x price
  if (dataIncrease <= 2.5) return 2;    // e.g., 40GB→100GB should be max 2x price
  if (dataIncrease <= 3) return 2.2;    // e.g., 30GB→100GB should be max 2.2x price
  return 2.5;                           // Absolute maximum multiplier for any increase
};

export const getCoverageCount = (pkg) => {
  return pkg.provider === 'esimgo' ? 
    (pkg.coverage?.length || 0) : 
    pkg.provider === 'airalo' ?
    (pkg.coverage?.length || 0) :
    (pkg.locationNetworkList?.length || 0);
};



// Add this new function for Asia-specific coverage rules
const isValidAsiaPackage = (pkg, isMainPackage = false) => {
  const coverageCount = getCoverageCount(pkg);
  
  // For main packages: need at least 18 countries
  if (isMainPackage) {
    return coverageCount >= 18;
  }
  
  // For alternatives: max 7 countries
  return coverageCount <= 7;
};

export const groupSimilarPackages = (packages, region = '') => {
  const isAsia = region.toLowerCase() === 'asia';
  const groups = new Map();
  
  // First pass: group by data amount
  packages.forEach(pkg => {
    // Skip packages with unreasonable pricing
    if (!pkg.unlimited && isPriceUnreasonable(pkg, packages)) {
      return;
    }

    const data = pkg.unlimited ? `unlimited-${pkg.duration}` : Math.round(parseFloat(pkg.data));
    const key = `${data}`;
    
    const currentGroup = groups.get(key) || {
      main: null,
      alternatives: []
    };

    if (!currentGroup.main) {
      if (isAsia && !pkg.unlimited) {
        // Apply Asia rules only for non-unlimited packages
        const coverage = getCoverageCount(pkg);
        if (coverage >= ASIA_PACKAGE_RULES.MAIN_MIN_COUNTRIES) {
          currentGroup.main = pkg;
          groups.set(key, currentGroup);
        }
      } else {
        // Normal handling for unlimited packages or non-Asia regions
        currentGroup.main = pkg;
        groups.set(key, currentGroup);
      }
      return;
    }

    const pkgCoverage = getCoverageCount(pkg);
    const mainCoverage = getCoverageCount(currentGroup.main);
    
    if (isAsia && !pkg.unlimited) {
      // Apply Asia rules only for non-unlimited packages
      if (pkgCoverage >= ASIA_PACKAGE_RULES.MAIN_MIN_COUNTRIES && 
          pkg.price < currentGroup.main.price) {
        currentGroup.alternatives.push(currentGroup.main);
        currentGroup.main = pkg;
      } else if (pkgCoverage <= ASIA_PACKAGE_RULES.ALT_MAX_COUNTRIES) {
        currentGroup.alternatives.push(pkg);
      }
    } else {
      // Regular handling for unlimited packages or non-Asia regions
      if (pkg.unlimited) {
        handleUnlimitedPackageGrouping(pkg, currentGroup, pkgCoverage, mainCoverage);
      } else {
        handleLimitedPackageGrouping(pkg, currentGroup, pkgCoverage, mainCoverage);
      }
    }

    groups.set(key, currentGroup);
  });

  // Cleanup groups based on region and package type
  groups.forEach(group => {
    if (isAsia && !group.main.unlimited) {
      // Apply Asia rules only for non-unlimited packages
      group.alternatives = group.alternatives
        .filter(alt => !alt.unlimited && getCoverageCount(alt) <= ASIA_PACKAGE_RULES.ALT_MAX_COUNTRIES)
        .sort((a, b) => a.price - b.price)
        .slice(0, 3);
    } else {
      // Regular cleanup for unlimited packages or other regions
      const mainPrice = group.main.price;
      const mainCoverage = getCoverageCount(group.main);

      group.alternatives = group.alternatives
        .filter(alt => filterAlternative(alt, group.main.unlimited, mainPrice, mainCoverage))
        .filter(alt => !hasSuperiorsInGroup(alt, group.alternatives))
        .sort((a, b) => (getCoverageCount(b) / b.price) - (getCoverageCount(a) / a.price))
        .slice(0, 3);
    }
  });

  return Array.from(groups.values())
    .filter(group => group.main) // Ensure we have a main package
    .map(group => ({
      ...group.main,
      // Don't show alternatives for unlimited packages
      alternatives: group.main.unlimited ? [] : group.alternatives
    }))
    .sort((a, b) => {
      // First sort by price (ascending)
      if (a.price !== b.price) {
        return a.price - b.price;
      }
      // Then by unlimited status
      if (a.unlimited && !b.unlimited) return -1;
      if (!a.unlimited && b.unlimited) return 1;
      // Finally by data amount for same price
      return parseFloat(b.data) - parseFloat(a.data);
    });
};

const handleUnlimitedPackageGrouping = (pkg, currentGroup, pkgCoverage, mainCoverage) => {
  if (pkgCoverage > mainCoverage && pkg.price <= currentGroup.main.price * 1.2) {
    currentGroup.alternatives.push(currentGroup.main);
    currentGroup.main = pkg;
  } else if (pkg.price < currentGroup.main.price && pkgCoverage >= mainCoverage * 0.9) {
    currentGroup.alternatives.push(currentGroup.main);
    currentGroup.main = pkg;
  } else if (pkgCoverage >= mainCoverage * 0.8 || pkg.price <= currentGroup.main.price * 0.9) {
    currentGroup.alternatives.push(pkg);
  }
};

const handleLimitedPackageGrouping = (pkg, currentGroup, pkgCoverage, mainCoverage) => {
  const allPackagesInGroup = [currentGroup.main, ...currentGroup.alternatives];
  const shouldExclude = allPackagesInGroup.some(existingPkg => {
    const existingCoverage = getCoverageCount(existingPkg);
    return existingPkg.price <= pkg.price && existingCoverage >= pkgCoverage;
  });

  if (shouldExclude) return;

  if (pkg.price <= currentGroup.main.price && pkgCoverage >= mainCoverage) {
    currentGroup.alternatives.push(currentGroup.main);
    currentGroup.main = pkg;
  } else {
    currentGroup.alternatives.push(pkg);
  }
};

const cleanupGroups = (groups) => {
  groups.forEach(group => {
    const mainPrice = group.main.price;
    const mainCoverage = getCoverageCount(group.main);

    group.alternatives = group.alternatives
      .filter(alt => filterAlternative(alt, group.main.unlimited, mainPrice, mainCoverage))
      .filter(alt => !hasSuperiorsInGroup(alt, group.alternatives))
      .sort((a, b) => (getCoverageCount(b) / b.price) - (getCoverageCount(a) / a.price))
      .slice(0, 3);
  });
};

const filterAlternative = (alt, isUnlimited, mainPrice, mainCoverage) => {
  const altCoverage = getCoverageCount(alt);
  const altPrice = alt.price;

  if (isUnlimited) {
    return (
      (altCoverage > mainCoverage * 1.2) ||
      (altCoverage >= mainCoverage * 0.9 && altPrice < mainPrice * 0.85)
    );
  }

  return (
    (altCoverage > mainCoverage && altPrice <= mainPrice * 1.5) ||
    (altCoverage >= mainCoverage * 0.9 && altPrice < mainPrice * 0.8) ||
    (altCoverage > mainCoverage * 1.3)
  );
};

const hasSuperiorsInGroup = (pkg, alternatives) => {
  const pkgCoverage = getCoverageCount(pkg);
  return alternatives.some(other => {
    if (other === pkg) return false;
    const otherCoverage = getCoverageCount(other);
    return other.price <= pkg.price && otherCoverage >= pkgCoverage;
  });
};

export const filterPackagesByRegion = (packages, region, packageType) => {
  return packages.filter(pkg => {
    if (!pkg) return false;

    if (!pkg.unlimited) {
      const dataAmount = parseFloat(pkg.data);
      if (dataAmount < 1) return false;
    }

    const hasRegionalNetworks = pkg.provider === 'esimgo' ? 
      (pkg.coverage?.length > 0) :
      pkg.provider === 'airalo' ?
      (pkg.networks?.length > 0 && pkg.coverage?.length > 0) :
      (pkg.locationNetworkList?.length > 0);

    const isUnlimited = pkg.unlimited;
    const matchesPackageType = packageType === 'unlimited' ? isUnlimited : !isUnlimited;
    
    if (!matchesPackageType) return false;

    return matchRegionCriteria(pkg, region.toLowerCase(), hasRegionalNetworks);
  });
};

export const isEuropeanPackage = (pkg) => {
  const pkgName = (pkg.name || '').trim().toLowerCase();
  const pkgRegion = (pkg.region || '').trim().toLowerCase();
  const pkgSlug = (pkg.slug || '').trim().toLowerCase();

  const isEuropeInName = 
    pkgName.startsWith('europe') || 
    pkgName.startsWith('europe(') ||
    pkgName === 'europe' ||
    pkgSlug.startsWith('eu-');

  if (!isEuropeInName) return false;

  const otherRegions = [
    'asia', 
    'america', 
    'caribbean', 
    'africa', 
    'global', 
    'china', 
    'middle east'
  ];

  return !otherRegions.some(region => pkgName.includes(region));
};

const matchRegionCriteria = (pkg, region, hasRegionalNetworks) => {
  switch (region) {
    case 'europe':
      return isEuropeanPackage(pkg);
    case 'asia':
      return pkg.region === 'asia' || pkg.name.toLowerCase().includes('asia');
    case 'latin america':
      return pkg.region === 'latin america' || 
             pkg.name.toLowerCase().includes('latin america') ||
             pkg.region.includes('latam') || 
             pkg.name.toLowerCase().includes('latam');
    case 'africa':
      return (pkg.region.includes('africa') || pkg.name.toLowerCase().includes('africa')) &&
             !EXCLUDED_AFRICAN_COUNTRIES.some(country => 
               pkg.name.toLowerCase().includes(country.toLowerCase())
             );
    case 'middle east and africa':
      const isRegionMatch = pkg.name.toLowerCase().includes('middle east') || 
                           pkg.name.toLowerCase().includes('africa') ||
                           pkg.name.toLowerCase().includes('mena') ||
                           pkg.region.includes('middle east') || 
                           pkg.region.includes('africa') ||
                           pkg.region.includes('mena');
      
      return isRegionMatch && 
             hasRegionalNetworks && 
             !EXCLUDED_AFRICAN_COUNTRIES.some(country => 
               pkg.name.toLowerCase().includes(country.toLowerCase())
             );
    default:
      return pkg.region === region.toLowerCase() || 
             pkg.name.toLowerCase().includes(region.toLowerCase());
  }
};

export const getNetworks = (packageData) => {
  if (!packageData) return [];
  
  console.log('[DEBUG] getNetworks input:', packageData);
  
  const networks = [];
  
  // Add speed info
  let highestSpeed = getHighestSpeed(packageData) || packageData.speed || '4G';
  if (highestSpeed) {
    networks.push({
      type: 'speed',
      value: highestSpeed.toUpperCase(),
      icon: 'speedometer-outline'
    });
  }

  // Process networks based on provider and data structure
  if (packageData.networks && Array.isArray(packageData.networks)) {
    const uniqueNetworkNames = new Set();
    
    packageData.networks.forEach(network => {
      let networkName = '';
      
      if (typeof network === 'string') {
        networkName = network;
      } else if (network.name) {
        networkName = network.name;
      }
      
      if (networkName && !uniqueNetworkNames.has(networkName)) {
        uniqueNetworkNames.add(networkName);
        networks.push({
          type: 'network',
          value: networkName,
          icon: 'wifi-outline'
        });
      }
    });
  }
  
  // Provider-specific handling
  if (packageData.provider === 'esimgo') {
    packageData.networks?.forEach(countryData => {
      if (countryData.networks && Array.isArray(countryData.networks)) {
        countryData.networks.forEach(network => {
          if (!networks.find(n => n.value === network.name)) {
            networks.push({
              type: 'network',
              value: network.name,
              icon: 'wifi-outline',
              location: countryData.country_name,
              speeds: network.type ? network.type.split(',').map(s => s.trim()) : [packageData.speed || '4G']
            });
          }
        });
      }
    });
  } else if (packageData.provider === 'airalo') {
    packageData.networks?.forEach(network => {
      if (!networks.find(n => n.value === network.name)) {
        networks.push({
          type: 'network',
          value: network.name,
          icon: 'wifi-outline',
          speeds: network.types || ['4G']
        });
      }
    });
  } else if (packageData.locationNetworkList && packageData.locationNetworkList.length > 0) {
    packageData.locationNetworkList.forEach(location => {
      location.operatorList?.forEach(operator => {
        if (!networks.find(n => n.value === operator.operatorName)) {
          networks.push({
            type: 'network',
            value: operator.operatorName,
            icon: 'wifi-outline',
            location: location.locationName,
            speeds: [operator.networkType || '4G']
          });
        }
      });
    });
  }
  
  // If no networks found, add a default message
  if (networks.filter(n => n.type === 'network').length === 0) {
    let defaultMessage = 'Multiple operators available';
    
    if (packageData.provider === 'airalo') {
      defaultMessage = 'Coverage across multiple countries';
    } else if (packageData.provider === 'esimgo') {
      defaultMessage = 'Premium regional coverage';
    } else if (packageData.provider === 'esimaccess') {
      defaultMessage = 'Wide regional coverage';
    }
    
    networks.push({
      type: 'info',
      value: defaultMessage,
      icon: 'wifi-outline'
    });
  }

  console.log('[DEBUG] Final Processed Networks:', networks);
  return networks;
};

export const formatLocationNetworkList = (packageData) => {
  if (!packageData) return [];
  
  console.log('[DEBUG] formatLocationNetworkList:', packageData);
  
  const locationNetworks = [];
  
  // Helper function to get country code
  const getCountryCode = (countryName, countryCodeInput) => {
    if (countryCodeInput) return countryCodeInput.toLowerCase();
    if (!countryName) return '';
    
    const country = countries.find(c => 
      c.name.toLowerCase() === countryName.toLowerCase()
    );
    
    if (country) return country.id.toLowerCase();
    
    const countryMappings = {
      'united states': 'us',
      'united kingdom': 'gb',
      'south korea': 'kr',
      'north macedonia': 'mk',
      'czech republic': 'cz',
      'bosnia and herzegovina': 'ba',
      'trinidad and tobago': 'tt',
      'antigua and barbuda': 'ag',
      'saint kitts and nevis': 'kn',
      'saint vincent and the grenadines': 'vc',
      'democratic republic of the congo': 'cd',
      'central african republic': 'cf'
    };
    
    const normalized = countryName.toLowerCase();
    return countryMappings[normalized] || countryName.substring(0, 2).toLowerCase();
  };
  
  // Process coverage data from various sources
  // First check if we have coverages with network details
  if (packageData.coverages && Array.isArray(packageData.coverages) && packageData.coverages.length > 0) {
    // Use coverages which has actual network data
    packageData.coverages.forEach(coverage => {
      const countryName = coverage.name || 'Unknown';
      const countryCode = getCountryCode(countryName, coverage.code);
      
      const operatorList = coverage.networks && coverage.networks.length > 0 
        ? coverage.networks.map(network => ({
            operatorName: network.name || 'Network',
            networkType: network.type || packageData.speed || '4G'
          }))
        : [{
            operatorName: 'Multiple networks available',
            networkType: packageData.speed || '4G'
          }];
      
      locationNetworks.push({
        locationName: countryName,
        countryCode: countryCode,
        operatorList: operatorList
      });
    });
    
    return locationNetworks;
  }
  
  // Fallback to coverage array if coverages not available
  if (packageData.coverage && Array.isArray(packageData.coverage) && packageData.coverage.length > 0) {
    // Handle coverage array format
    packageData.coverage.forEach(country => {
      const countryName = country.name || country;
      const countryCode = getCountryCode(countryName, country.code || country.iso);
      
      // Use actual network data if available, otherwise use generic message
      const operatorList = [{
        operatorName: 'Multiple networks available',
        networkType: packageData.speed || '4G/5G'
      }];
      
      locationNetworks.push({
        locationName: countryName,
        countryCode: countryCode,
        operatorList: operatorList
      });
    });
    
    return locationNetworks;
  }
  
  // Provider-specific handling
  if (packageData.provider === 'esimgo') {
    const networkList = [];
    
    // For ESIMGo, check if we have coverages array with country info
    if (packageData.coverages && Array.isArray(packageData.coverages) && packageData.coverages.length > 0) {
      // Use the coverages array which has country and network info
      packageData.coverages.forEach(coverage => {
        const countryName = coverage.name || 'Unknown';
        const countryCode = getCountryCode(countryName, coverage.code);
        
        const operatorList = coverage.networks && coverage.networks.length > 0 
          ? coverage.networks.map(network => ({
              operatorName: network.name || 'Network',
              networkType: network.type || packageData.speed || '4G'
            }))
          : [{
              operatorName: 'Multiple networks available',
              networkType: packageData.speed || '4G'
            }];
        
        networkList.push({
          locationName: countryName,
          countryCode: countryCode,
          operatorList: operatorList
        });
      });
    } else if (packageData.coverage && Array.isArray(packageData.coverage) && packageData.coverage.length > 0) {
      // Use coverage array if coverages is not available
      packageData.coverage.forEach(country => {
        const countryName = country.name || country;
        const countryCode = getCountryCode(countryName, country.code);
        
        networkList.push({
          locationName: countryName,
          countryCode: countryCode,
          operatorList: [{
            operatorName: 'Multiple networks available',
            networkType: packageData.speed || '4G'
          }]
        });
      });
    }
    
    // If still no data, check if networks array is old format with country_iso
    if (networkList.length === 0 && packageData.networks && Array.isArray(packageData.networks)) {
      const firstNetwork = packageData.networks[0];
      
      // Check if old format (with country_iso property)
      if (firstNetwork && firstNetwork.country_iso !== undefined) {
        packageData.networks.forEach(countryData => {
          const countryName = getCountryNameByCode(countryData.country_iso);
          console.log('ESIMgo country (old format):', {
            iso: countryData.country_iso,
            name: countryName,
            original: countryData.country_name
          });
          
          if (countryData.networks && countryData.networks.length > 0) {
            networkList.push({
              locationName: countryName || countryData.country_name,
              countryCode: countryData.country_iso,
              operatorList: countryData.networks.map(network => ({
                operatorName: network.name,
                networkType: network.type || packageData.speed || '4G'
              }))
            });
          }
        });
      }
    }

    return networkList.sort((a, b) => a.locationName.localeCompare(b.locationName));
  } else if (packageData.provider === 'airalo') {
    const networksByCountry = new Map();
    
    // First try to use coverages if available (which has proper country names)
    if (packageData.coverages && Array.isArray(packageData.coverages) && packageData.coverages.length > 0) {
      packageData.coverages.forEach(coverage => {
        const countryName = coverage.name || 'Unknown';
        const countryCode = coverage.code || getCountryCode(countryName);
        
        const operatorList = coverage.networks && coverage.networks.length > 0 
          ? coverage.networks.map(network => ({
              operatorName: network.name || 'Network',
              networkType: network.type || packageData.speed || '4G'
            }))
          : [{
              operatorName: 'Multiple networks available',
              networkType: packageData.speed || '4G'
            }];
        
        networksByCountry.set(countryCode, {
          locationName: countryName,
          countryCode: countryCode,
          operatorList: operatorList
        });
      });
    } else if (packageData.networks && packageData.networks.length > 0) {
      // Fallback to networks array if coverages not available
      packageData.networks?.forEach(network => {
        const countryCode = network.country || '';
        const countryName = getCountryNameByCode(countryCode);
        
        if (!networksByCountry.has(countryCode)) {
          networksByCountry.set(countryCode, {
            locationName: countryName || network.country_name || countryCode,
            countryCode: countryCode.toLowerCase(),
            operatorList: []
          });
        }
        
        const countryData = networksByCountry.get(countryCode);
        countryData.operatorList.push({
          operatorName: network.name,
          networkType: network.types?.[0] || '4G'
        });
      });
    }
    
    // Add coverage countries if no networks found
    if (networksByCountry.size === 0 && packageData.coverage && Array.isArray(packageData.coverage)) {
      packageData.coverage.forEach(country => {
        const countryName = country.name || country;
        const countryCode = getCountryCode(countryName, country.code || country.iso);
        
        networksByCountry.set(countryCode, {
          locationName: countryName,
          countryCode: countryCode,
          operatorList: [{
            operatorName: 'Multiple networks available',
            networkType: packageData.speed || '4G'
          }]
        });
      });
    }

    return Array.from(networksByCountry.values())
      .sort((a, b) => a.locationName.localeCompare(b.locationName));
  } else {
    // For esimaccess and other providers
    const uniqueLocations = new Map();
    
    // First check if we have coverages with network data
    if (packageData.coverages && Array.isArray(packageData.coverages) && packageData.coverages.length > 0) {
      packageData.coverages.forEach(coverage => {
        const countryName = coverage.name || 'Unknown';
        const countryCode = coverage.code || getCountryCode(countryName);
        
        const operatorList = coverage.networks && coverage.networks.length > 0 
          ? coverage.networks.map(network => ({
              operatorName: network.name || 'Network',
              networkType: network.type || packageData.speed || '4G'
            }))
          : [{
              operatorName: 'Multiple networks available',
              networkType: packageData.speed || '4G'
            }];
        
        uniqueLocations.set(countryCode, {
          locationName: countryName,
          countryCode: countryCode,
          operatorList: operatorList
        });
      });
    } 
    // Then check if we have coverage array
    else if (packageData.coverage && Array.isArray(packageData.coverage) && packageData.coverage.length > 0) {
      // For ESIMAccess, we have a flat networks array without country mapping
      // We'll show a sample of networks for each country
      const allNetworks = packageData.networks || [];
      
      // Group networks by type for better display
      const networksByType = {};
      allNetworks.forEach(network => {
        const type = network.type || '4G';
        if (!networksByType[type]) {
          networksByType[type] = [];
        }
        networksByType[type].push(network.name);
      });
      
      // Create a representative sample of networks
      const sampleNetworks = [];
      Object.entries(networksByType).forEach(([type, networks]) => {
        networks.slice(0, 2).forEach(name => {
          sampleNetworks.push({
            operatorName: name,
            networkType: type
          });
        });
      });
      
      // If we have too many, show a summary
      const displayOperators = sampleNetworks.length > 0 
        ? sampleNetworks.slice(0, 3).concat(
            sampleNetworks.length > 3 
              ? [{
                  operatorName: `+ ${allNetworks.length - 3} more networks`,
                  networkType: packageData.speed || '4G'
                }]
              : []
          )
        : [{
            operatorName: 'Multiple networks available',
            networkType: packageData.speed || '4G'
          }];
      
      packageData.coverage.forEach(country => {
        const countryName = country.name || country;
        const countryCode = country.code || getCountryCode(countryName);
        
        uniqueLocations.set(countryCode, {
          locationName: countryName,
          countryCode: countryCode,
          operatorList: displayOperators
        });
      });
    }
    // Finally check locationNetworkList
    else if (packageData.locationNetworkList && packageData.locationNetworkList.length > 0) {
      packageData.locationNetworkList.forEach(location => {
        const locationKey = location.locationName.toLowerCase();
        
        if (!uniqueLocations.has(locationKey)) {
          let countryCode;
          if (location.locationLogo) {
            const parts = location.locationLogo.split('/');
            const filename = parts[parts.length - 1];
            countryCode = filename.split('.')[0].toLowerCase();
          } else {
            const country = countries.find(c => 
              c.name.toLowerCase() === location.locationName.toLowerCase()
            );
            countryCode = country ? country.id.toLowerCase() : location.locationName.substring(0, 2).toLowerCase();
          }

          const countryName = getCountryNameByCode(countryCode);
          const filteredOperators = location.operatorList.filter(op => 
            !op.operatorName.toLowerCase().includes('3g')
          );

          uniqueLocations.set(locationKey, {
            ...location,
            locationName: countryName || location.locationName,
            countryCode,
            operatorList: filteredOperators.map(op => ({
              ...op,
              networkType: op.networkType || op.type || '4G'
            }))
          });
        }
      });
    }
    
    // If no locationNetworkList, try to use coverage data
    if (uniqueLocations.size === 0 && packageData.coverage && Array.isArray(packageData.coverage)) {
      packageData.coverage.forEach(country => {
        const countryName = country.name || country;
        const countryCode = getCountryCode(countryName, country.code || country.iso);
        
        uniqueLocations.set(countryName.toLowerCase(), {
          locationName: countryName,
          countryCode: countryCode,
          operatorList: [{
            operatorName: 'Multiple networks available',
            networkType: packageData.speed || '4G'
          }]
        });
      });
    }

    return Array.from(uniqueLocations.values())
      .sort((a, b) => a.locationName.localeCompare(b.locationName));
  }
  
  // Final fallback - if no data found, return empty array
  return locationNetworks;
};

export const processProviderNetworks = (pkg) => {
  console.log('============ Provider Network Processing Debug ============');
  console.log('Processing package:', pkg.provider);
  
  // Helper function to get country count from various sources
  const getCountryCount = (pkg) => {
    // Check coverage array (most common)
    if (pkg.coverage && Array.isArray(pkg.coverage) && pkg.coverage.length > 0) {
      return pkg.coverage.length;
    }
    
    // Check coverages array (alternative format)
    if (pkg.coverages && Array.isArray(pkg.coverages) && pkg.coverages.length > 0) {
      return pkg.coverages.length;
    }
    
    // Check coverage_countries array
    if (pkg.coverage_countries && Array.isArray(pkg.coverage_countries) && pkg.coverage_countries.length > 0) {
      return pkg.coverage_countries.length;
    }
    
    // Check locationNetworkList
    if (pkg.locationNetworkList && Array.isArray(pkg.locationNetworkList) && pkg.locationNetworkList.length > 0) {
      return pkg.locationNetworkList.length;
    }
    
    // Default fallback based on region
    if (pkg.region) {
      const regionDefaults = {
        'europe': 30,
        'asia': 18,
        'africa': 20,
        'north-america': 3,
        'south-america': 12,
        'caribbean': 15,
        'middle-east': 10
      };
      return regionDefaults[pkg.region.toLowerCase()] || 10;
    }
    
    return 0;
  };
  
  if (pkg.provider === 'esimgo') {
    const allNetworks = [];
    
    pkg.networks?.forEach(countryData => {
      if (countryData.networks && Array.isArray(countryData.networks)) {
        countryData.networks.forEach(network => {
          allNetworks.push({
            name: network.name,
            type: network.type || pkg.speed || '4G',
            location: countryData.country_name
          });
        });
      }
    });

    pkg.coverage?.forEach(country => {
      const hasNetwork = allNetworks.some(n => 
        n.location === country.name
      );

      if (!hasNetwork) {
        allNetworks.push({
          name: 'Default Network',
          type: pkg.speed || '4G',
          location: country.name
        });
      }
    });

    return {
      networks: allNetworks,
      coverage: pkg.coverage || [],
      networkCount: allNetworks.length,
      countryCount: getCountryCount(pkg)
    };
  }

  if (pkg.provider === 'airalo') {
    return {
      networks: pkg.networks || [],
      coverage: pkg.coverage || [],
      networkCount: pkg.networks?.length || 0,
      countryCount: getCountryCount(pkg)
    };
  }
  
  // For esimaccess and other providers
  const rawNetworks = [];
  
  // Process networks from various sources
  if (pkg.networks && Array.isArray(pkg.networks)) {
    pkg.networks.forEach(network => {
      if (typeof network === 'object' && network.name) {
        rawNetworks.push({
          name: network.name,
          type: network.type || pkg.speed || '4G',
          location: network.country || 'Regional'
        });
      }
    });
  }
  
  // Process locationNetworkList if available
  pkg.locationNetworkList?.forEach(location => {
    location.operatorList?.forEach(op => {
      rawNetworks.push({
        name: op.operatorName,
        type: op.networkType,
        location: location.locationName,
        locationLogo: location.locationLogo
      });
    });
  });

  const uniqueNetworks = new Set();
  const networks = [];

  rawNetworks.forEach(op => {
    const networkKey = `${op.name}-${op.location}`;
    if (!op.name.toLowerCase().includes('3g') && !uniqueNetworks.has(networkKey)) {
      uniqueNetworks.add(networkKey);
      networks.push(op);
    }
  });

  return {
    networks: networks.length > 0 ? networks : pkg.networks || [],
    coverage: pkg.coverage || pkg.coverages || pkg.locationNetworkList || [],
    networkCount: networks.length || pkg.networks?.length || 0,
    countryCount: getCountryCount(pkg)
  };
};

export const getHighestSpeed = (pkg) => {
  const speedOrder = ['2g', '3g', '4g', '5g'];
  let allSpeeds = new Set();

  if (pkg.provider === 'airalo') {
    pkg.networks?.forEach(network => {
      network.types?.forEach(type => 
        allSpeeds.add(type.toLowerCase())
      );
    });
  } else if (pkg.provider === 'esimgo') {
    pkg.networks?.forEach(network => {
      if (network.speeds) {
        network.speeds.forEach(speed => 
          allSpeeds.add(speed.toLowerCase())
        );
      } else if (network.type) {
        allSpeeds.add(network.type.toLowerCase());
      }
    });
    
    if (pkg.speed) {
      pkg.speed.toLowerCase().split(/[^a-z0-9]+/).forEach(s => 
        allSpeeds.add(s)
      );
    }
  } else {
    if (pkg.speed) {
      pkg.speed.toLowerCase().split(/[^a-z0-9]+/).forEach(s => 
        allSpeeds.add(s)
      );
    }
    
    pkg.networks?.forEach(network => {
      if (network.type) {
        allSpeeds.add(network.type.toLowerCase());
      }
    });
  }

  return speedOrder.reduce((highest, current) => 
    allSpeeds.has(current) ? current : highest
  , null);
};

export const adjustDataDisplay = (data) => {
  if (!data) return 0;
  if (typeof data === 'string' && data.toLowerCase() === 'unlimited') {
    return 'Unlimited';
  }
  const numericData = parseFloat(data);
  if (isNaN(numericData)) return 0;
  if (numericData === 49) return 50;
  if (numericData >= 1000) return 'Unlimited';
  return Number.isInteger(numericData) ? numericData : numericData.toFixed(1);
};
