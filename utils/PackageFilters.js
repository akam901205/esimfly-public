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
      alternatives: group.alternatives
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
    'middle east',
    'gulf'
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
  const networks = [];
  
  let highestSpeed = getHighestSpeed(packageData);
  if (highestSpeed) {
    networks.push({
      type: 'speed',
      value: highestSpeed.toUpperCase(),
      icon: 'speedometer-outline'
    });
  }

  if (packageData.provider === 'esimgo') {
    packageData.networks?.forEach(countryData => {
      if (countryData.networks && Array.isArray(countryData.networks)) {
        countryData.networks.forEach(network => {
          networks.push({
            type: 'network',
            value: network.name,
            icon: 'wifi-outline',
            location: countryData.country_name,
            speeds: network.type ? network.type.split(',').map(s => s.trim()) : [packageData.speed || '4G']
          });
        });
      }
    });
  } else if (packageData.provider === 'airalo') {
    packageData.networks?.forEach(network => {
      networks.push({
        type: 'network',
        value: network.name,
        icon: 'wifi-outline',
        speeds: network.types || ['4G']
      });
    });
  } else {
    packageData.locationNetworkList?.forEach(location => {
      location.operatorList?.forEach(operator => {
        networks.push({
          type: 'network',
          value: operator.operatorName,
          icon: 'wifi-outline',
          location: location.locationName,
          speeds: [operator.networkType || '4G']
        });
      });
    });
  }

  return networks;
};

export const formatLocationNetworkList = (packageData) => {
  if (!packageData) return [];

  if (packageData.provider === 'esimgo') {
    const networkList = [];
    
    packageData.networks?.forEach(countryData => {
      const countryName = getCountryNameByCode(countryData.country_iso);
      console.log('ESIMgo country:', {
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

    // Add coverage countries
    packageData.coverage?.forEach(country => {
      const countryName = getCountryNameByCode(country.iso);
      if (!networkList.some(item => item.countryCode === country.iso)) {
        networkList.push({
          locationName: countryName || country.name,
          countryCode: country.iso,
          operatorList: [{
            operatorName: 'Default Network',
            networkType: packageData.speed || '4G'
          }]
        });
      }
    });

    return networkList.sort((a, b) => a.locationName.localeCompare(b.locationName));
  } else if (packageData.provider === 'airalo') {
    const networksByCountry = new Map();
    
    packageData.networks?.forEach(network => {
      const countryName = getCountryNameByCode(network.country);
      if (!networksByCountry.has(network.country)) {
        networksByCountry.set(network.country, {
          locationName: countryName || network.country_name || network.country,
          countryCode: network.country,
          operatorList: []
        });
      }
      
      const countryData = networksByCountry.get(network.country);
      countryData.operatorList.push({
        operatorName: network.name,
        networkType: network.types?.[0] || '4G'
      });
    });

    return Array.from(networksByCountry.values())
      .sort((a, b) => a.locationName.localeCompare(b.locationName));
  } else {
    // For esimaccess
    const uniqueLocations = new Map();
    
    (packageData.locationNetworkList || []).forEach(location => {
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

    return Array.from(uniqueLocations.values())
      .sort((a, b) => a.locationName.localeCompare(b.locationName));
  }
};

export const processProviderNetworks = (pkg) => {
  console.log('============ Provider Network Processing Debug ============');
  console.log('Processing package:', pkg.provider);
  
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
      countryCount: pkg.coverage?.length || 0
    };
  }

  if (pkg.provider === 'airalo') {
    return {
      networks: pkg.networks || [],
      coverage: pkg.coverage || [],
      networkCount: pkg.networks?.length || 0,
      countryCount: pkg.coverage?.length || 0
    };
  }
  
  const rawNetworks = [];
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
    networks: networks,
    coverage: pkg.locationNetworkList || [],
    networkCount: networks.length,
    countryCount: pkg.locationNetworkList?.length || 0
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