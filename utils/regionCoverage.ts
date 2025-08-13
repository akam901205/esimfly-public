export interface RegionCoverage {
  name: string;
  countries: string[];
}

export const regionCoverageData: RegionCoverage[] = [
  {
    name: 'Europe',
    countries: [
      'Andorra',
      'Austria', 
      'Belgium', 
      'Cyprus', 
      'Czech Republic',
      'Denmark', 
      'Estonia', 
      'Finland', 
      'France', 
      'Germany', 
      'Gibraltar',
      'Greece',
      'Hungary',
      'Iceland', 
      'Ireland', 
      'Italy', 
      'Latvia', 
      'Liechtenstein', 
      'Lithuania',
      'Luxembourg', 
      'Malta', 
      'Netherlands', 
      'Norway', 
      'Poland', 
      'Portugal',
      'Slovakia', 
      'Spain', 
      'Sweden', 
      'Switzerland',
      'Turkey',
      'Ukraine',
      'United Kingdom',
      'Monaco',
      'Vatican City',
      'San Marino',
      'Northern Cyprus'
    ]
  },
  {
    name: 'North America',
    countries: [
      'Canada',
      'Mexico',
      'Puerto Rico',
      'United States'
    ]
  },
  {
    name: 'Oceania',
    countries: [
      'Australia',
      'Fiji',
      'Nauru',
      'New Zealand',
      'Papua New Guinea',
      'Samoa',
      'Tonga',
      'Vanuatu'
    ]
  },
  {
    name: 'Balkans',
    countries: [
      'Albania',
      'Bosnia and Herzegovina',
      'Bulgaria',
      'Croatia',
      'Greece',
      'Montenegro',
      'North Macedonia',
      'Romania',
      'Serbia',
      'Slovenia'
    ]
  },
  {
    name: 'Caribbean',
    countries: [
      'Anguilla',
      'Antigua and Barbuda',
      'Bahamas',
      'Barbados',
      'Bermuda',
      'Bonaire',
      'British Virgin Islands',
      'Cayman Islands',
      'Curacao',
      'Dominica',
      'French Guiana',
      'Grenada',
      'Guyana',
      'Haiti',
      'Jamaica',
      'Martinique',
      'Montserrat',
      'Netherlands Antilles',
      'Puerto Rico',
      'Saint Kitts and Nevis',
      'Saint Lucia',
      'Saint Vincent and the Grenadines',
      'Sint Eustatius And Saba',
      'Suriname',
      'Trinidad and Tobago',
      'Turks and Caicos Islands'
    ]
  },
  {
    name: 'Middle East',
    countries: [
      'Egypt',
      'Iraq',
      'Israel',
      'Jordan',
      'Kuwait',
      'Morocco',
      'Oman',
      'Turkey',
      'United Arab Emirates'
    ]
  },
  {
    name: 'Asia',
    countries: [
      'Bangladesh',
      'Bhutan',
      'Brunei',
      'Cambodia',
      'China',
      'Hong Kong',
      'India',
      'Indonesia',
      'Japan',
      'Laos',
      'Macao',
      'Malaysia',
      'Maldives',
      'Mongolia',
      'Myanmar',
      'Nepal',
      'Pakistan',
      'Philippines',
      'Singapore',
      'South Korea',
      'Sri Lanka',
      'Taiwan',
      'Thailand',
      'Vietnam'
    ]
  },
  {
    name: 'Africa',
    countries: [
      'Algeria',
      'Benin',
      'Botswana',
      'Burkina Faso',
      'Cameroon',
      'Cape Verde',
      'Chad',
      'Congo',
      'Congo Democratic Republic',
      'Côte d\'Ivoire',
      'Egypt',
      'Eswatini',
      'Ethiopia',
      'Gabon',
      'Gambia',
      'Ghana',
      'Guinea',
      'Guinea-Bissau',
      'Kenya',
      'Liberia',
      'Madagascar',
      'Malawi',
      'Mali',
      'Mauritius',
      'Morocco',
      'Nigeria',
      'Rwanda',
      'Senegal',
      'Seychelles',
      'Sierra Leone',
      'South Africa',
      'Tanzania',
      'Togo',
      'Tunisia',
      'Uganda',
      'Zambia',
      'Zimbabwe'
    ]
  },
  {
    name: 'Latin America',
    countries: [
      'Argentina',
      'Bolivia',
      'Brazil',
      'Chile',
      'Colombia',
      'Costa Rica',
      'Ecuador',
      'El Salvador',
      'Guatemala',
      'Honduras',
      'Mexico',
      'Nicaragua',
      'Panama',
      'Paraguay',
      'Peru',
      'Uruguay',
      'Venezuela'
    ]
  }
];

// Helper function to find which regions include a specific country
export const findCountryRegions = (countryName: string): string[] => {
  return regionCoverageData
    .filter(region => region.countries.includes(countryName))
    .map(region => region.name);
};

// Helper function to check if a country is in a specific region
export const isCountryInRegion = (countryName: string, regionName: string): boolean => {
  const region = regionCoverageData.find(r => r.name === regionName);
  return region ? region.countries.includes(countryName) : false;
};

export default regionCoverageData;