import React from 'react';
import { View, Image } from 'react-native';

// Import all region PNG images
const AfricaIcon = require('../assets/flags/region/africa.png');
const AsiaIcon = require('../assets/flags/region/asia.png');
const BalkansIcon = require('../assets/flags/region/balkans.png');
const CaribbeanIcon = require('../assets/flags/region/caribbean.png');
const EuropeIcon = require('../assets/flags/region/europe.png');
const MiddleEastIcon = require('../assets/flags/region/middle-east.png');
const NorthAmericaIcon = require('../assets/flags/region/north-america.png');
const OceaniaIcon = require('../assets/flags/region/oceania.png');
const LatinAmericaIcon = require('../assets/flags/region/south-america1.png');

const createRegionComponent = (iconSource) => (props) => (
  <View style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}>
    <Image
      source={iconSource}
      style={{ width: 45, height: 45 }}
      resizeMode="contain"
    />
  </View>
);

const AfricaComponent = createRegionComponent(AfricaIcon);
const AsiaComponent = createRegionComponent(AsiaIcon);
const BalkansComponent = createRegionComponent(BalkansIcon);
const CaribbeanComponent = createRegionComponent(CaribbeanIcon);
const EuropeComponent = createRegionComponent(EuropeIcon);
const MiddleEastComponent = createRegionComponent(MiddleEastIcon);
const NorthAmericaComponent = createRegionComponent(NorthAmericaIcon);
const OceaniaComponent = createRegionComponent(OceaniaIcon);
const LatinAmericaComponent = createRegionComponent(LatinAmericaIcon);

export const regions = [
  { id: "africa", name: "Africa", image: AfricaComponent },
  { id: "asia", name: "Asia", image: AsiaComponent },
  { id: "balkans", name: "Balkans", image: BalkansComponent },
  { id: "caribbean", name: "Caribbean", image: CaribbeanComponent },
  { id: "europe", name: "Europe", image: EuropeComponent },
  { id: "latin-america", name: "Latin America", image: LatinAmericaComponent },
  { id: "middle-east", name: "Middle East", image: MiddleEastComponent },
  { id: "north-america", name: "North America", image: NorthAmericaComponent },
  { id: "oceania", name: "Oceania", image: OceaniaComponent }
];