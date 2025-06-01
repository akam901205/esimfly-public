

const countryCodeMap = {
  'Saint Barthelemy': 'BLM',
  'Bonaire, Sint Eustatius And Saba': 'BQ',
  'Democratic Republic of the Congo': 'CD',
  'Northern Cyprus': 'CYP',
  'Canary Islands': 'IC',
  'Guernsey': 'GG',
  'Guadeloupe': 'GP',
  'Guam': 'GU',
  'Kosovo': 'XK',
  'Mayotte': 'YT',
  'LATAM': 'LATAM',
  'Caribbean': 'CARIBBEAN',
  'Balkans': 'BALKANS',
  'North America': 'NORTH-AMERICA',
  'Global': 'GLOBAL',
  'Reunion': 'RE',
  'Turks and Caicos Islands': 'TC',
  'Virgin Islands British': 'VG',
  'Virgin Islands US': 'VI',
  'Isle Of Man': 'IM',
  'Jersey': 'JE',
  'Hawaii': 'US-HI',
  'Puerto Rico': 'PR',
  'Montserrat': 'MS',
  'Holy See (Vatican City State)': 'VA',
  'Swaziland': 'SZ',
  'Palestinian Territory (Occupied)': 'PS',
  'Saint Martin French': 'MF',
  'Africa': 'AFRICA',
  'Asia': 'ASIA',
  'Oceania': 'OCEANIA',
  'Middle East': 'MIDDLE-EAST',
  'Martinique': 'MQ',
  'Afghanistan': 'AF',
  'Aland Islands': 'AX',
  'Albania': 'AL',
  'Algeria': 'DZ',
  'American Samoa': 'AS',
  'Andorra': 'AD',
  'Angola': 'AO',
  'Anguilla': 'AI',
  'Antarctica': 'AQ',
  'Antigua and Barbuda': 'AG',
  'Argentina': 'AR',
  'Armenia': 'AM',
  'Aruba': 'AW',
  'Australia': 'AU',
  'Austria': 'AT',
  'Azerbaijan': 'AZ',
  'Bahamas': 'BS',
  'Bahrain': 'BH',
  'Bangladesh': 'BD',
  'Barbados': 'BB',
  'Belarus': 'BY',
  'Belgium': 'BE',
  'Belize': 'BZ',
  'Benin': 'BJ',
  'Bermuda': 'BM',
  'Bhutan': 'BT',
  'Bolivia': 'BO',
  'Bosnia and Herzegovina': 'BA',
  'Botswana': 'BW',
  'Bouvet Island': 'BV',
  'Brazil': 'BR',
  'British Indian Ocean Territory': 'IO',
  'Brunei Darussalam': 'BN',
  'Bulgaria': 'BG',
  'Burkina Faso': 'BF',
  'Burundi': 'BI',
  'Cambodia': 'KH',
  'Cameroon': 'CM',
  'Canada': 'CA',
  'Cape Verde': 'CV',
  'Cayman Islands': 'KY',
  'Central African Republic': 'CF',
  'Chad': 'TD',
  'Chile': 'CL',
  'China': 'CN',
  'Christmas Island': 'CX',
  'Cocos (Keeling) Islands': 'CC',
  'Colombia': 'CO',
  'Comoros': 'KM',
  'Congo': 'CG',
  'Cook Islands': 'CK',
  'Costa Rica': 'CR',
  'Cote d`Ivoire': 'CI',
  'Croatia': 'HR',
  'Cuba': 'CU',
  'Curacao': 'CW',
  'Cyprus': 'CY',
  'Czech Republic': 'CZ',
  'Denmark': 'DK',
  'Djibouti': 'DJ',
  'Dominica': 'DM',
  'Dominican Republic': 'DO',
  'Ecuador': 'EC',
  'Egypt': 'EG',
  'El Salvador': 'SV',
  'Equatorial Guinea': 'GQ',
  'Eritrea': 'ER',
  'Europe+': 'EU',
  'Europe': 'EU',
  'Estonia': 'EE',
  'Ethiopia': 'ET',
  'Falkland Islands (Malvinas)': 'FK',
  'Faroe Islands': 'FO',
  'Fiji': 'FJ',
  'Finland': 'FI',
  'France': 'FR',
  'French Guiana': 'GF',
  'French Polynesia': 'PF',
  'French Southern Territories': 'TF',
  'Gabon': 'GA',
  'Gambia': 'GM',
  'Georgia': 'GE',
  'Germany': 'DE',
  'Ghana': 'GH',
  'Gibraltar': 'GI',
  'Greece': 'GR',
  'Greenland': 'GL',
  'Grenada': 'GD',
  'Guatemala': 'GT',
  'Guinea': 'GN',
  'Guinea-Bissau': 'GW',
  'Guyana': 'GY',
  'Haiti': 'HT',
  'Honduras': 'HN',
  'Hong Kong (Special Administrative Region of China)': 'HK',
  'Hong Kong': 'HK',
  'Hong Kong (China)': 'HK',
  'Hungary': 'HU',
  'Iceland': 'IS',
  'India': 'IN',
  'Indonesia': 'ID',
  'Iran (Islamic Republic of)': 'IR',
  'Iraq': 'IQ',
  'Ireland': 'IE',
  'Israel': 'IL',
  'Italy': 'IT',
  'Jamaica': 'JM',
  'Japan': 'JP',
  'Jordan': 'JO',
  'Kazakhstan': 'KZ',
  'Kenya': 'KE',
  'Kiribati': 'KI',
  'Korea, North': 'KP',
  'Republic of Korea': 'KR',
  'Kuwait': 'KW',
  'Kyrgyzstan': 'KG',
  'Lao People`s Democratic Republic': 'LA',
  'Latvia': 'LV',
  'Lebanon': 'LB',
  'Lesotho': 'LS',
  'Liberia': 'LR',
  'Libya': 'LY',
  'Liechtenstein': 'LI',
  'Lithuania': 'LT',
  'Luxembourg': 'LU',
  'Macau (Special Administrative Region of China)': 'MO',
  'Macao (China)': 'MO',
  'Madagascar': 'MG',
  'Malawi': 'MW',
  'Malaysia': 'MY',
  'Maldives': 'MV',
  'Mali': 'ML',
  'Malta': 'MT',
  'Marshall Islands': 'MH',
  'Mauritania': 'MR',
  'Mauritius': 'MU',
  'Mexico': 'MX',
  'Micronesia': 'FM',
  'Moldova (Republic of)': 'MD',
  'Monaco': 'MC',
  'Mongolia': 'MN',
  'Montenegro': 'ME',
  'Morocco': 'MA',
  'Mozambique': 'MZ',
  'Myanmar': 'MM',
  'Namibia': 'NA',
  'Nauru': 'NR',
  'Nepal': 'NP',
  'Netherlands Antilles': 'AN',
  'Netherlands': 'NL',
  'New Zealand': 'NZ',
  'Nicaragua': 'NI',
  'Niger': 'NE',
  'Nigeria': 'NG',
  'North Macedonia': 'MK',
  'Norway': 'NO',
  'Oman': 'OM',
  'Pakistan': 'PK',
  'Palau': 'PW',
  'Palestine': 'PS',
  'Panama': 'PA',
  'Papua New Guinea': 'PG',
  'Paraguay': 'PY',
  'Peru': 'PE',
  'Philippines': 'PH',
  'Poland': 'PL',
  'Portugal': 'PT',
  'Qatar': 'QA',
  'Romania': 'RO',
  'Russian Federation': 'RU',
  'Rwanda': 'RW',
  'Saint Kitts and Nevis': 'KN',
  'Saint Lucia': 'LC',
  'Saint Vincent and the Grenadines': 'VC',
  'Samoa': 'WS',
  'San Marino': 'SM',
  'Sao Tome and Principe': 'ST',
  'Saudi Arabia': 'SA',
  'Senegal': 'SN',
  'Serbia': 'RS',
  'Seychelles': 'SC',
  'Sierra Leone': 'SL',
  'Singapore': 'SG',
  'Slovakia': 'SK',
  'Slovenia': 'SI',
  'Solomon Islands': 'SB',
  'Somalia': 'SO',
  'South Africa': 'ZA',
  'South Sudan': 'SS',
  'Spain': 'ES',
  'Sri Lanka': 'LK',
  'Sudan': 'SD',
  'Suriname': 'SR',
  'Sweden': 'SE',
  'Switzerland': 'CH',
  'Syria': 'SY',
  'Taiwan': 'TW',
  'Tajikistan': 'TJ',
  'Tanzania (United Republic of)': 'TZ',
  'Thailand': 'TH',
  'Tonga': 'TO',
  'Trinidad and Tobago': 'TT',
  'Tunisia': 'TN',
  'Turkey': 'TR',
  'Turkmenistan': 'TM',
  'Tuvalu': 'TV',
  'Uganda': 'UG',
  'Ukraine': 'UA',
  'United Arab Emirates': 'AE',
  'United Kingdom': 'GB',
  'United States': 'US',
  'Uruguay': 'UY',
  'Uzbekistan': 'UZ',
  'Vanuatu': 'VU',
  'Vatican City': 'VA',
  'Venezuela': 'VE',
  'Vietnam': 'VN',
  'Yemen': 'YE',
  'Zambia': 'ZM',
  'Zimbabwe': 'ZW'
};

// Create a reverse mapping from country code to name
const codeToCountryMap = Object.entries(countryCodeMap).reduce((acc, [name, code]) => {
  acc[code] = name;
  return acc;
}, {});

export const normalizeCountryName = (name) => {
  if (!name) return '';
  
  const upperName = name.toUpperCase().trim();
  
  // Check if it's a country code
  if (codeToCountryMap[upperName]) {
    return codeToCountryMap[upperName];
  }
  
  // Check if it's a known country name
  for (const [countryName, code] of Object.entries(countryCodeMap)) {
    if (countryName.toUpperCase() === upperName) {
      return countryName;
    }
  }
  
  // If not found, return the original name
  return name;
};

export const getCountryCode = (name) => {
  const normalizedName = normalizeCountryName(name);
  return countryCodeMap[normalizedName] || name;
};

export const normalizeDataValue = (data) => {
  if (typeof data === 'string') {
    if (data.toLowerCase() === 'unlimited' || data === '0' || data === '0GB') {
      return Infinity;
    }
    const numericValue = parseFloat(data);
    return isNaN(numericValue) ? data : numericValue;
  }
  return data === 0 ? Infinity : data;
};

export const normalizeDuration = (duration) => {
  const match = duration.match(/(\d+)\s*(\w+)/);
  if (match) {
    const [, number, unit] = match;
    const normalizedUnit = unit.toLowerCase().replace(/s$/, '');
    return `${number} ${normalizedUnit}`;
  }
  return duration;
};

export const getDurationInDays = (duration) => {
  const normalizedDuration = normalizeDuration(duration);
  const [number, unit] = normalizedDuration.split(' ');
  const days = parseInt(number);
  
  switch (unit) {
    case 'day':
      return days;
    case 'week':
      return days * 7;
    case 'month':
      return days * 30;
    case 'year':
      return days * 365;
    default:
      return days;
  }
};