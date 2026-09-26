/**
 * VAJRA — Intelligence Dispatch & Citizen Warning System
 * Types, Mathematical Models, Real-World NDRF Registry & Fallback Data
 * SIH PS-26084 · MoES / NCMRWF
 */

export type SeverityTier = 'EMERGENCY' | 'CRITICAL' | 'WARNING' | 'WATCH' | 'ADVISORY';
export type SettlementTypology = 'HDU' | 'MDU' | 'PUI' | 'RUR' | 'CST' | 'HLY';

export interface StormHazards {
  rain_rate_mmh: number;
  cloudburst_flag: boolean;
  posh_percent: number;
  mesh_hail_mm: number;
  downburst_gust_kmh: number;
  lightning_density: number;
  explainability?: {
    radar_core_driver?: string;
    vil_liquid_driver?: string;
    convective_severity?: string;
  };
}

export interface StormCell {
  cell_id: string;
  centroid_x?: number;
  centroid_y?: number;
  centroid_lat: number;
  centroid_lon: number;
  area_km2: number;
  peak_dbz: number;
  mean_dbz?: number;
  velocity_kmh: number;
  heading_deg: number;
  hazards: StormHazards;
  severity?: string;
  eta_minutes?: number;
  target_etas?: Array<{
    target_name: string;
    distance_km: number;
    eta_minutes: number;
    eta_window_min: string;
    threat_level: 'WARNING' | 'WATCH' | 'EMERGENCY';
    is_footprint_expanding?: boolean;
  }>;
  evolution?: {
    state: 'INITIATING' | 'INTENSIFYING' | 'MATURE' | 'DECAYING' | 'MICROBURST' | 'TRAINING' | 'DISSIPATING' | 'TRACKING';
    probabilities?: Record<string, number>;
    trend_summary?: string;
    rate_dbz_per_10min?: number;
    rate_area_pct_per_10min?: number;
    rate_lightning_per_10min?: number;
    footprint_expansion_factor?: number;
  };
}

// ============================================================================
// NDRF & SDRF BATTALIONS
// ============================================================================
export interface NDRFBattalion {
  id: string;
  name: string;
  force: 'NDRF' | 'SDRF';
  baseLocation: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  personnelStrength: number;
  activeQrtTeams: number; // ~45 personnel per Quick Reaction Team
  equipmentSpecialization: string[];
  contactRadio: string;
  hotlinePhone: string;
}

export interface ResponseCenterProximity {
  battalion: NDRFBattalion;
  straightLineDistanceKm: number;
  roadDistanceKm: number;
  estimatedMobilizationMinutes: number;
  convoyTransitMinutes: number;
  totalEtaMinutes: number;
  recommendedDeploymentTeams: number;
}

// ============================================================================
// DEMOGRAPHIC & STRUCTURAL RISK
// ============================================================================
export interface SettlementProfile {
  type: SettlementTypology;
  label: string;
  baseDensityPerKm2: number;
  kutchaPercentage: number;
  semiPuccaPercentage: number;
  puccaPercentage: number;
  description: string;
}

export interface DemographicRisk {
  footprintAreaKm2: number;
  totalExposedPopulation: number;
  criticalJeopardyPopulation: number;
  recommendedEvacuationCount: number;
  settlementType: SettlementTypology;
  settlementLabel: string;
  highRiskDemographics: {
    kutchaDwellers: number;
    lowLyingDrainageZone: number;
    elderlyAndChildren: number;
  };
  severityFactor: number; // 0.0 .. 1.0
  severityTier: SeverityTier;
}

export interface StructuralRiskTier {
  typeName: string;
  description: string;
  structureCount: number;
  percentage: number;
  failureRiskPct: number;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  primaryFailureMode: string;
}

export interface BuildingVulnerability {
  totalEstimatedStructures: number;
  typeA_kutcha: StructuralRiskTier;
  typeB_semiPucca: StructuralRiskTier;
  typeC_puccaRcc: StructuralRiskTier;
  typeD_lifeline: {
    assets: Array<{
      name: string;
      category: 'HOSPITAL' | 'SUBSTATION' | 'RADAR_AIRPORT' | 'PUMPING_STATION' | 'RAILWAY';
      threatDescription: string;
      status: 'CRITICAL_STANDBY' | 'PROTECTED' | 'AT_RISK';
    }>;
  };
}

// ============================================================================
// CITIZEN & DISPATCH ALERT
// ============================================================================
export interface NDMASopRule {
  id: string;
  category: 'SHELTER' | 'ELECTRICAL' | 'DRAINAGE' | 'MOBILITY';
  titleEn: string;
  titleHi: string;
  instructionEn: string;
  instructionHi: string;
  highlightEn: string;
  highlightHi: string;
  iconName: 'ShieldAlert' | 'ZapOff' | 'Waves' | 'Trees' | 'Home' | 'AlertTriangle';
  severity: 'MANDATORY' | 'CRITICAL' | 'RECOMMENDED';
}

export interface DesignatedShelter {
  id: string;
  name: string;
  nameHi: string;
  type: string;
  address: string;
  distanceKm: number;
  walkEtaMinutes: number;
  driveEtaMinutes: number;
  capacityTotal: number;
  capacityOccupied: number;
  contactNumber: string;
  latitude: number;
  longitude: number;
  turnByTurnAdviceEn: string;
  turnByTurnAdviceHi: string;
  features: string[];
}

export interface DispatchedAlert {
  alertId: string;
  cellId: string;
  stormName: string;
  severity: 'Moderate' | 'Severe' | 'Extreme';
  threatLevel: 'WATCH' | 'WARNING' | 'EMERGENCY';
  peakDbz: number;
  rainRateMmh: number;
  downburstKmh: number;
  meshHailMm: number;
  lightningDensity: number;
  etaMinutes: number;
  etaWindowMin: string;
  targetLocation: string;
  targetLocationHi: string;
  affectedPopulation: number;
  criticalJeopardyPopulation: number;
  urgentEvacuationCount: number;
  broadcastRadiusKm: number;
  dispatchedAt: string;
  dispatchedTimestamp: number;
  demographicRisk: DemographicRisk;
  buildingVulnerability: BuildingVulnerability;
  assignedBattalions: ResponseCenterProximity[];
  nearestShelter: DesignatedShelter;
  ndmaSops: NDMASopRule[];
  emergencyHelplines: Array<{ label: string; number: string; desc: string }>;
}

// ============================================================================
// REAL-WORLD 16 NDRF BATTALIONS REGISTRY ACROSS INDIA
// ============================================================================
export const REAL_WORLD_NDRF_BATTALIONS: NDRFBattalion[] = [
  {
    id: 'NDRF-BN-08',
    name: '8th Battalion NDRF',
    force: 'NDRF',
    baseLocation: 'Kamla Nehru Nagar, Ghaziabad',
    district: 'Ghaziabad',
    state: 'Uttar Pradesh / Delhi-NCR',
    latitude: 28.6942,
    longitude: 77.4478,
    personnelStrength: 1149,
    activeQrtTeams: 18,
    equipmentSpecialization: ['Urban Flood Rescue', 'Deep Diving', 'CBRN', 'Collapse SAR'],
    contactRadio: 'VHF-CH-12 (NDRF NCR NET)',
    hotlinePhone: '+91-120-2766013'
  },
  {
    id: 'NDRF-BN-10',
    name: '10th Battalion NDRF',
    force: 'NDRF',
    baseLocation: 'ANU Campus, Guntur / Vijayawada',
    district: 'Guntur',
    state: 'Andhra Pradesh',
    latitude: 16.3768,
    longitude: 80.5283,
    personnelStrength: 1149,
    activeQrtTeams: 16,
    equipmentSpecialization: ['Cyclonic Surge Rescue', 'Inflatable Boats (IRB)', 'Heavy De-watering Pumps'],
    contactRadio: 'VHF-CH-09 (AP DISASTER NET)',
    hotlinePhone: '+91-863-2293178'
  },
  {
    id: 'NDRF-BN-03',
    name: '3rd Battalion NDRF',
    force: 'NDRF',
    baseLocation: 'Mundali, Cuttack',
    district: 'Cuttack',
    state: 'Odisha',
    latitude: 20.4487,
    longitude: 85.7682,
    personnelStrength: 1149,
    activeQrtTeams: 20,
    equipmentSpecialization: ['Super-cyclone Response', 'High-capacity OBM Boats', 'Helicopter Winch Units'],
    contactRadio: 'VHF-CH-15 (ODISHA COAST NET)',
    hotlinePhone: '+91-671-2879710'
  },
  {
    id: 'NDRF-BN-01',
    name: '1st Battalion NDRF',
    force: 'NDRF',
    baseLocation: 'Patgaon, Guwahati',
    district: 'Kamrup Metropolitan',
    state: 'Assam',
    latitude: 26.1342,
    longitude: 91.6033,
    personnelStrength: 1149,
    activeQrtTeams: 14,
    equipmentSpecialization: ['Brahmaputra Flood Rescue', 'Landslide Debris Extrication', 'Mountain SAR'],
    contactRadio: 'VHF-CH-04 (NER DISASTER NET)',
    hotlinePhone: '+91-361-2840284'
  },
  {
    id: 'NDRF-BN-04',
    name: '4th Battalion NDRF',
    force: 'NDRF',
    baseLocation: 'Arakkonam (INS Rajali Collocated)',
    district: 'Ranipet',
    state: 'Tamil Nadu',
    latitude: 13.0694,
    longitude: 79.6972,
    personnelStrength: 1149,
    activeQrtTeams: 18,
    equipmentSpecialization: ['Airborne Emergency Response', 'Submerged Vehicle Extrication', 'Medical First Responders'],
    contactRadio: 'VHF-CH-07 (TN COAST NET)',
    hotlinePhone: '+91-4177-246594'
  },
  {
    id: 'NDRF-BN-05',
    name: '5th Battalion NDRF',
    force: 'NDRF',
    baseLocation: 'Sudumbare, Talegaon Dabhade, Pune',
    district: 'Pune',
    state: 'Maharashtra',
    latitude: 18.7188,
    longitude: 73.6823,
    personnelStrength: 1149,
    activeQrtTeams: 16,
    equipmentSpecialization: ['Western Ghats Flash Floods', 'Industrial HAZMAT Containment', 'Urban Collapse Rescue'],
    contactRadio: 'VHF-CH-11 (MAHA DISASTER NET)',
    hotlinePhone: '+91-2114-247000'
  },
  {
    id: 'NDRF-BN-06',
    name: '6th Battalion NDRF',
    force: 'NDRF',
    baseLocation: 'Jarod, Vadodara',
    district: 'Vadodara',
    state: 'Gujarat',
    latitude: 22.4286,
    longitude: 73.3082,
    personnelStrength: 1149,
    activeQrtTeams: 15,
    equipmentSpecialization: ['Chemical Industrial SAR', 'Coastal Surge Evacuation', 'Earthquake SAR'],
    contactRadio: 'VHF-CH-08 (GUJ SEC NET)',
    hotlinePhone: '+91-2668-274581'
  },
  {
    id: 'NDRF-BN-15',
    name: '15th Battalion NDRF',
    force: 'NDRF',
    baseLocation: 'Gadabari, Haldwani',
    district: 'Nainital',
    state: 'Uttarakhand',
    latitude: 29.2183,
    longitude: 79.5130,
    personnelStrength: 1149,
    activeQrtTeams: 15,
    equipmentSpecialization: ['Cloudburst Debris Search', 'Mountain Torrent SAR', 'Kumaon/Garhwal Rapid Teams'],
    contactRadio: 'VHF-CH-14 (UK DISASTER NET)',
    hotlinePhone: '+91-5946-281005'
  },
  {
    id: 'NDRF-BN-07',
    name: '7th Battalion NDRF',
    force: 'NDRF',
    baseLocation: 'Bhatinda',
    district: 'Bathinda',
    state: 'Punjab',
    latitude: 30.2110,
    longitude: 74.9455,
    personnelStrength: 1149,
    activeQrtTeams: 14,
    equipmentSpecialization: ['Plains River Inundation', 'Canal Breach Rescue', 'Agro-Chemical Containment'],
    contactRadio: 'VHF-CH-06 (PUNJAB NET)',
    hotlinePhone: '+91-164-2246014'
  },
  {
    id: 'NDRF-BN-09',
    name: '9th Battalion NDRF',
    force: 'NDRF',
    baseLocation: 'Bihta, Patna',
    district: 'Patna',
    state: 'Bihar',
    latitude: 25.5684,
    longitude: 84.8761,
    personnelStrength: 1149,
    activeQrtTeams: 18,
    equipmentSpecialization: ['Gangetic Flood Rescue', 'Deep Draft Motor Boats', 'Waterborne Hospital Units'],
    contactRadio: 'VHF-CH-10 (BIHAR SDMA NET)',
    hotlinePhone: '+91-6115-252111'
  },
  {
    id: 'NDRF-BN-11',
    name: '11th Battalion NDRF',
    force: 'NDRF',
    baseLocation: 'Varanasi',
    district: 'Varanasi',
    state: 'Uttar Pradesh',
    latitude: 25.3176,
    longitude: 82.9739,
    personnelStrength: 1149,
    activeQrtTeams: 16,
    equipmentSpecialization: ['Ghats & River Torrent SAR', 'Dense Urban Debris Search', 'Mass Gathering Crowd Safety'],
    contactRadio: 'VHF-CH-13 (PURVANCHAL NET)',
    hotlinePhone: '+91-542-2501230'
  },
  {
    id: 'NDRF-BN-12',
    name: '12th Battalion NDRF',
    force: 'NDRF',
    baseLocation: 'Doimukh, Itanagar',
    district: 'Papum Pare',
    state: 'Arunachal Pradesh',
    latitude: 27.1420,
    longitude: 93.7533,
    personnelStrength: 1149,
    activeQrtTeams: 12,
    equipmentSpecialization: ['Sub-Himalayan Flash Floods', 'Mudflow Extrication', 'Rope Traverse Rescues'],
    contactRadio: 'VHF-CH-03 (EAST HIMALAYA NET)',
    hotlinePhone: '+91-360-2277100'
  },
  {
    id: 'NDRF-BN-13',
    name: '13th Battalion NDRF',
    force: 'NDRF',
    baseLocation: 'Ladhowal, Ludhiana',
    district: 'Ludhiana',
    state: 'Punjab / J&K Border',
    latitude: 30.9850,
    longitude: 75.7920,
    personnelStrength: 1149,
    activeQrtTeams: 14,
    equipmentSpecialization: ['Sutlej Basin Floods', 'Winter Heavy Storm Response', 'Border Area Logistics'],
    contactRadio: 'VHF-CH-05 (NORTH DISASTER NET)',
    hotlinePhone: '+91-161-2805555'
  },
  {
    id: 'NDRF-BN-14',
    name: '14th Battalion NDRF',
    force: 'NDRF',
    baseLocation: 'Jassur, Nurpur, Kangra',
    district: 'Kangra',
    state: 'Himachal Pradesh',
    latitude: 32.1024,
    longitude: 76.2691,
    personnelStrength: 1149,
    activeQrtTeams: 14,
    equipmentSpecialization: ['Cloudburst Valley Search', 'High-Angle Rope Rigging', 'Raging Stream Lifelines'],
    contactRadio: 'VHF-CH-16 (HP SEOC NET)',
    hotlinePhone: '+91-1893-228114'
  },
  {
    id: 'NDRF-BN-16',
    name: '16th Battalion NDRF',
    force: 'NDRF',
    baseLocation: 'Balasore',
    district: 'Balasore',
    state: 'Odisha / Bengal Border',
    latitude: 21.4934,
    longitude: 86.9135,
    personnelStrength: 1149,
    activeQrtTeams: 15,
    equipmentSpecialization: ['Subarnarekha Delta Rescue', 'Cyclone Surge Containment', 'Tree Clearance Saws'],
    contactRadio: 'VHF-CH-17 (BALASORE SECTOR)',
    hotlinePhone: '+91-6782-261160'
  },
  {
    id: 'NDRF-BN-02',
    name: '2nd Battalion NDRF',
    force: 'NDRF',
    baseLocation: 'Haringhata, Nadia',
    district: 'Nadia',
    state: 'West Bengal',
    latitude: 22.9578,
    longitude: 88.5442,
    personnelStrength: 1149,
    activeQrtTeams: 17,
    equipmentSpecialization: ['Delta Inundation SAR', 'Sunderbans Amphibious Operations', 'Kolkata Urban Flood Teams'],
    contactRadio: 'VHF-CH-02 (WB SDMA NET)',
    hotlinePhone: '+91-33-25878444'
  },
  // Key SDRF Hubs
  {
    id: 'SDRF-AP-VIZAG',
    name: 'AP SDRF Regional Response Centre',
    force: 'SDRF',
    baseLocation: 'Port Area, Visakhapatnam',
    district: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    latitude: 17.6983,
    longitude: 83.2985,
    personnelStrength: 380,
    activeQrtTeams: 8,
    equipmentSpecialization: ['Coastal Storm Surge Rescue', 'Industrial Chemical Containment', 'Swift Water Boats'],
    contactRadio: 'VHF-CH-21 (VIZAG PORT TAC)',
    hotlinePhone: '+91-891-2565555'
  },
  {
    id: 'SDRF-OD-ODRAF',
    name: '1st ODRAF Unit (Odisha Disaster Rapid Action)',
    force: 'SDRF',
    baseLocation: 'Bhubaneswar Central Camp',
    district: 'Khurda',
    state: 'Odisha',
    latitude: 20.2961,
    longitude: 85.8245,
    personnelStrength: 450,
    activeQrtTeams: 10,
    equipmentSpecialization: ['Hydraulic Tower Cutters', 'Heavy Chainsaws', 'Inflatable Rescue Rafts'],
    contactRadio: 'VHF-CH-23 (ODRAF TAC-1)',
    hotlinePhone: '+91-674-2534177'
  },
  {
    id: 'SDRF-UK-DOON',
    name: 'Uttarakhand SDRF Headquarters',
    force: 'SDRF',
    baseLocation: 'Jolly Grant, Dehradun',
    district: 'Dehradun',
    state: 'Uttarakhand',
    latitude: 30.1895,
    longitude: 78.1802,
    personnelStrength: 650,
    activeQrtTeams: 12,
    equipmentSpecialization: ['Glacial & Cloudburst Rescue', 'Mountain High-Angle SAR', 'River Canyon Lifelines'],
    contactRadio: 'VHF-CH-01 (DOON SEOC)',
    hotlinePhone: '+91-135-2410197'
  }
];

// ============================================================================
// SETTLEMENT DENSITY PROFILES
// ============================================================================
export const SETTLEMENT_PROFILES: Record<SettlementTypology, SettlementProfile> = {
  HDU: {
    type: 'HDU',
    label: 'High-Density Urban',
    baseDensityPerKm2: 14500,
    kutchaPercentage: 18,
    semiPuccaPercentage: 32,
    puccaPercentage: 50,
    description: 'High-density metro corridors, multi-story masonry, slum pockets & heavy traffic'
  },
  MDU: {
    type: 'MDU',
    label: 'Tier-2 / Coastal Urban',
    baseDensityPerKm2: 4800,
    kutchaPercentage: 24,
    semiPuccaPercentage: 42,
    puccaPercentage: 34,
    description: 'Tier-2 cities, coastal commercial hubs, mixed residential & low-lying ward colonies'
  },
  PUI: {
    type: 'PUI',
    label: 'Peri-Urban / Industrial',
    baseDensityPerKm2: 1800,
    kutchaPercentage: 32,
    semiPuccaPercentage: 46,
    puccaPercentage: 22,
    description: 'Industrial corridors, factory colonies, warehousing complexes & suburban settlements'
  },
  RUR: {
    type: 'RUR',
    label: 'Rural Plains / Taluk',
    baseDensityPerKm2: 650,
    kutchaPercentage: 58,
    semiPuccaPercentage: 30,
    puccaPercentage: 12,
    description: 'Agricultural villages, thatched/tin dwellings, open crop fields & canal belts'
  },
  CST: {
    type: 'CST',
    label: 'Coastal Fishing Hamlet',
    baseDensityPerKm2: 1250,
    kutchaPercentage: 48,
    semiPuccaPercentage: 36,
    puccaPercentage: 16,
    description: 'Direct sea-front villages, boat anchoring jetties, thatched sheds & sand bar habitations'
  },
  HLY: {
    type: 'HLY',
    label: 'Hilly Valley / Terai',
    baseDensityPerKm2: 240,
    kutchaPercentage: 44,
    semiPuccaPercentage: 38,
    puccaPercentage: 18,
    description: 'Steep hill slopes, river terrace hamlets, fragile road cuts & landslide prone spurs'
  }
};

// ============================================================================
// NDMA STANDARD OPERATING PROCEDURES (SOP) RULES
// ============================================================================
export const NDMA_SOP_RULES: NDMASopRule[] = [
  {
    id: 'ndma-sop-1',
    category: 'SHELTER',
    titleEn: 'Seek Pucca Concrete Shelter Immediately',
    titleHi: 'तुरंत पक्के कंक्रीट आश्रय में जाएं',
    instructionEn: 'Relocate into a permanent RCC concrete building. Stay clear of tin sheds, asbestos roofs, balconies, and temporary metal awnings that can rip loose in violent downburst gusts.',
    instructionHi: 'तुरंत किसी ठोस पक्के भवन में शरण लें। टिन शेड, टीन की छतों, बालकोनी और धातु की अस्थाई छतरियों से दूर रहें जो तेज आंधी में उड़ सकती हैं।',
    highlightEn: 'Avoid tin roofs & open sheds',
    highlightHi: 'टीन शेड और खुले छतों से बचें',
    iconName: 'Home',
    severity: 'MANDATORY'
  },
  {
    id: 'ndma-sop-2',
    category: 'ELECTRICAL',
    titleEn: 'Unplug Electrical Appliances & Stay Indoors',
    titleHi: 'विद्युत उपकरण अनप्लग करें और घर में रहें',
    instructionEn: 'Disconnect televisions, computers, inverters, and heavy motor loads. Lightning surges follow powerlines. Avoid corded telephones, metal plumbing pipes, and wire boundary fences.',
    instructionHi: 'टीवी, कंप्यूटर, इन्वर्टर और भारी बिजली उपकरणों को प्लग से निकाल दें। आकाशीय बिजली तारों से फैल सकती है। तार वाली बाड़ और पाइपों से दूर रहें।',
    highlightEn: 'Protect from lightning surge & 30/30 rule',
    highlightHi: 'आकाशीय बिजली के करंट से सुरक्षा',
    iconName: 'ZapOff',
    severity: 'CRITICAL'
  },
  {
    id: 'ndma-sop-3',
    category: 'DRAINAGE',
    titleEn: 'Avoid Waterlogged Underpasses & Low Drains',
    titleHi: 'जलभराव वाले अंडरपास और नालों से दूर रहें',
    instructionEn: 'Cloudburst rainfall (>100 mm/h) produces rapid flash flooding within 10–15 minutes. Never drive or walk through moving or standing water; low underpasses submerge abruptly.',
    instructionHi: 'बादल फटने की वर्षा (>100 मिमी/घंटा) से 10-15 मिनट में अचानक बाढ़ आती है। जलमग्न अंडरपास और बहते पानी में कभी भी पैदल या वाहन से न जाएं।',
    highlightEn: 'Flash flood runoff risk in < 15 min',
    highlightHi: '15 मिनट के भीतर तेज बहाव का खतरा',
    iconName: 'Waves',
    severity: 'MANDATORY'
  },
  {
    id: 'ndma-sop-4',
    category: 'MOBILITY',
    titleEn: 'Never Shelter Under Isolated Trees or Poles',
    titleHi: 'अकेले पेड़ों या बिजली के खंभों के नीचे कभी न रुकें',
    instructionEn: 'Tall solitary trees, light towers, and metal electricity poles act as primary lightning ground-strike conductors. If caught in open terrain, crouch low on the balls of your feet.',
    instructionHi: 'ऊंचे अकेले पेड़, लाइट पोल और बिजली के खंभे आकाशीय बिजली को आकर्षित करते हैं। खुले में फंसे हों तो पंजों के बल झुककर बैठें, जमीन पर न लेटें।',
    highlightEn: 'High lightning strike ground-arc hazard',
    highlightHi: 'बिजली गिरने और जमीन पर करंट का खतरा',
    iconName: 'Trees',
    severity: 'MANDATORY'
  }
];

// ============================================================================
// HELPER FUNCTIONS & MATHEMATICAL RISK MODELS
// ============================================================================

/**
 * Great-circle distance between two latitude/longitude points via Haversine formula
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Calculates impacted population corridor, critical jeopardy, and urgent evacuation numbers
 */
export function calculateImpactedDemographics(
  cell: StormCell,
  leadTimeMin: number = 45,
  settlementType: SettlementTypology = 'MDU'
): DemographicRisk {
  const profile = SETTLEMENT_PROFILES[settlementType];
  const rEff = Math.max(3.0, Math.sqrt(cell.area_km2 / Math.PI));
  const expansion = cell.evolution?.footprint_expansion_factor ?? 1.25;

  // Dynamic storm sweep corridor area A_corridor = 2 * rEff * (v * dt/60) + pi * rEff^2
  const speed = Math.max(12, cell.velocity_kmh);
  const transitDistKm = speed * (leadTimeMin / 60);
  const corridorKm2 = (2 * rEff * transitDistKm + Math.PI * rEff * rEff) * expansion;

  // Severity Weight Calculation
  const dbzTerm = Math.max(0, (cell.peak_dbz - 35) / 30); // 0 at 35, 1.0 at 65 dBZ
  const rainTerm = Math.min(1.5, cell.hazards.rain_rate_mmh / 100);
  const gustTerm = Math.min(1.4, cell.hazards.downburst_gust_kmh / 90);
  const hailTerm = cell.hazards.posh_percent / 100;

  const rawSeverity = 0.20 + 0.32 * dbzTerm + 0.24 * rainTerm + 0.14 * gustTerm + 0.10 * hailTerm;
  const severityFactor = Math.min(1.0, Math.max(0.18, rawSeverity));

  const totalExposed = Math.round(corridorKm2 * profile.baseDensityPerKm2);
  const criticalJeopardy = Math.round(totalExposed * severityFactor);

  const kutchaDwellers = Math.round(criticalJeopardy * (profile.kutchaPercentage / 100));
  const lowLyingDrainage = Math.round(
    criticalJeopardy * (cell.hazards.cloudburst_flag ? 0.38 : 0.18)
  );
  const elderlyChildren = Math.round(criticalJeopardy * 0.28);

  const recommendedEvac = Math.round(kutchaDwellers * 0.88 + lowLyingDrainage * 0.70);

  let severityTier: SeverityTier = 'WATCH';
  if (severityFactor >= 0.75 || cell.hazards.cloudburst_flag || cell.hazards.downburst_gust_kmh >= 90) {
    severityTier = 'EMERGENCY';
  } else if (severityFactor >= 0.55 || cell.hazards.rain_rate_mmh >= 65) {
    severityTier = 'CRITICAL';
  } else if (severityFactor >= 0.35) {
    severityTier = 'WARNING';
  }

  return {
    footprintAreaKm2: Math.round(corridorKm2),
    totalExposedPopulation: totalExposed,
    criticalJeopardyPopulation: criticalJeopardy,
    recommendedEvacuationCount: recommendedEvac,
    settlementType,
    settlementLabel: profile.label,
    highRiskDemographics: {
      kutchaDwellers,
      lowLyingDrainageZone: lowLyingDrainage,
      elderlyAndChildren: elderlyChildren
    },
    severityFactor: Math.round(severityFactor * 100) / 100,
    severityTier
  };
}

/**
 * Calculates BMTPC 4-tier structural building damage vulnerability
 */
export function calculateBuildingVulnerability(
  demographics: DemographicRisk,
  hazards: StormHazards,
  settlementType: SettlementTypology = 'MDU'
): BuildingVulnerability {
  const profile = SETTLEMENT_PROFILES[settlementType];
  // Average 4.8 persons per household structure in India
  const totalStructures = Math.max(450, Math.round(demographics.totalExposedPopulation / 4.8));

  const countA = Math.round(totalStructures * (profile.kutchaPercentage / 100));
  const countB = Math.round(totalStructures * (profile.semiPuccaPercentage / 100));
  const countC = Math.max(0, totalStructures - countA - countB);

  // Failure probability modeling
  const kutchaFailure = Math.min(
    98,
    Math.round(35 + (hazards.downburst_gust_kmh / 90) * 40 + (hazards.rain_rate_mmh / 100) * 23)
  );

  const semiPuccaFailure = Math.min(
    85,
    Math.round(18 + (hazards.mesh_hail_mm / 35) * 32 + (hazards.downburst_gust_kmh / 90) * 28)
  );

  const puccaFailure = Math.min(
    38,
    Math.round(hazards.cloudburst_flag ? 24 : (hazards.downburst_gust_kmh >= 85 ? 16 : 8))
  );

  return {
    totalEstimatedStructures: totalStructures,
    typeA_kutcha: {
      typeName: 'Type A (Kutcha / Slums)',
      description: 'Mud mortar, unanchored corrugated tin roofs, thatch & asbestos sheets',
      structureCount: countA,
      percentage: profile.kutchaPercentage,
      failureRiskPct: kutchaFailure,
      riskLevel: kutchaFailure >= 75 ? 'CRITICAL' : 'HIGH',
      primaryFailureMode: 'Tin roof uplift, windward wall collapse & plinth mud washout'
    },
    typeB_semiPucca: {
      typeName: 'Type B (Semi-Pucca / Tile Roofs)',
      description: 'Brick masonry with clay tiles, unreinforced parapets & metal chhajjas',
      structureCount: countB,
      percentage: profile.semiPuccaPercentage,
      failureRiskPct: semiPuccaFailure,
      riskLevel: semiPuccaFailure >= 50 ? 'HIGH' : 'MODERATE',
      primaryFailureMode: 'Hail projectile roof destruction & parapet shearing under gusts'
    },
    typeC_puccaRcc: {
      typeName: 'Type C (Engineered Pucca / RCC)',
      description: 'Reinforced concrete framed columns, slab roofs & engineered foundation',
      structureCount: countC,
      percentage: profile.puccaPercentage,
      failureRiskPct: puccaFailure,
      riskLevel: puccaFailure >= 20 ? 'MODERATE' : 'LOW',
      primaryFailureMode: 'Basement storm backflow, glass facade shatter & electrical ingress'
    },
    typeD_lifeline: {
      assets: [
        {
          name: 'District Government Medical College & Hospital',
          category: 'HOSPITAL',
          threatDescription: 'ICU uninterrupted power & medical oxygen generator room flooding',
          status: hazards.cloudburst_flag ? 'CRITICAL_STANDBY' : 'PROTECTED'
        },
        {
          name: '33/11 kV City Electrical Distribution Substation',
          category: 'SUBSTATION',
          threatDescription: 'Lightning surge flashover & yard transformer oil saturation',
          status: hazards.lightning_density >= 3.0 ? 'AT_RISK' : 'PROTECTED'
        },
        {
          name: 'Civil Airport Radar & Navigation Glide Path',
          category: 'RADAR_AIRPORT',
          threatDescription: 'Severe wind-shear > 70 km/h, convective downdraft on final approach',
          status: hazards.downburst_gust_kmh >= 65 ? 'AT_RISK' : 'PROTECTED'
        },
        {
          name: 'Municipal Stormwater Drain Pumping Station',
          category: 'PUMPING_STATION',
          threatDescription: 'Pumping sump silt choke & rapid backflow in low-lying wards',
          status: hazards.rain_rate_mmh >= 80 ? 'CRITICAL_STANDBY' : 'PROTECTED'
        }
      ]
    }
  };
}

/**
 * Calculates road distance and mobilization ETA for all NDRF/SDRF battalions, sorted by proximity
 */
export function calculateBattalionProximity(
  stormLat: number,
  stormLon: number,
  isHillyTerrain: boolean = false
): ResponseCenterProximity[] {
  const circuity = isHillyTerrain ? 1.65 : 1.30;
  const convoySpeedKmh = isHillyTerrain ? 35 : 55;
  const turnoutMins = 15; // 15 min golden-hour muster

  return REAL_WORLD_NDRF_BATTALIONS.map((bn) => {
    const distStraight = calculateHaversineDistanceKm(stormLat, stormLon, bn.latitude, bn.longitude);
    const roadDist = Math.round(distStraight * circuity);
    const transitMins = Math.round((roadDist / convoySpeedKmh) * 60);
    const totalEta = turnoutMins + transitMins;

    return {
      battalion: bn,
      straightLineDistanceKm: distStraight,
      roadDistanceKm: roadDist,
      estimatedMobilizationMinutes: turnoutMins,
      convoyTransitMinutes: transitMins,
      totalEtaMinutes: totalEta,
      recommendedDeploymentTeams: distStraight < 45 ? 4 : distStraight < 120 ? 2 : 1
    };
  }).sort((a, b) => a.totalEtaMinutes - b.totalEtaMinutes);
}

// ============================================================================
// REALISTIC PRE-POPULATED FALLBACK STORMS & DISPATCH ALERT
// ============================================================================
export const FALLBACK_STORM_CELLS: StormCell[] = [
  {
    cell_id: 'CELL-701',
    centroid_lat: 22.6620,
    centroid_lon: 88.4380,
    area_km2: 14.5,
    peak_dbz: 66.8,
    mean_dbz: 52.4,
    velocity_kmh: 46.0,
    heading_deg: 193,
    severity: 'EXTREME',
    eta_minutes: 8,
    hazards: {
      rain_rate_mmh: 118.5,
      cloudburst_flag: true,
      posh_percent: 78,
      mesh_hail_mm: 34.0,
      downburst_gust_kmh: 88.5,
      lightning_density: 5.6,
      explainability: {
        radar_core_driver: 'VIL core suspended above -20°C level with 66.8 dBZ echo top at 14.2 km',
        vil_liquid_driver: 'Extreme Vertically Integrated Liquid (VIL) density > 4.8 g/m³',
        convective_severity: 'Supercell cluster with explosive downburst collapse trigger'
      }
    },
    target_etas: [
      {
        target_name: 'Runway 19L Touchdown Zone',
        distance_km: 1.2,
        eta_minutes: 4,
        eta_window_min: '3–6 min',
        threat_level: 'EMERGENCY',
        is_footprint_expanding: true
      },
      {
        target_name: 'Terminal 2 Apron & Stand 14',
        distance_km: 2.1,
        eta_minutes: 8,
        eta_window_min: '6–10 min',
        threat_level: 'WARNING',
        is_footprint_expanding: true
      },
      {
        target_name: 'Air Traffic Control Tower',
        distance_km: 2.4,
        eta_minutes: 9,
        eta_window_min: '8–12 min',
        threat_level: 'WARNING',
        is_footprint_expanding: true
      }
    ],
    evolution: {
      state: 'MICROBURST',
      footprint_expansion_factor: 1.32,
      trend_summary: 'Severe convective cloudburst cell advancing at 46 km/h with heavy microburst signature over Runway 19L'
    }
  },
  {
    cell_id: 'CELL-702',
    centroid_lat: 22.6850,
    centroid_lon: 88.4200,
    area_km2: 8.8,
    peak_dbz: 58.2,
    mean_dbz: 46.1,
    velocity_kmh: 38.0,
    heading_deg: 165,
    severity: 'SEVERE',
    eta_minutes: 18,
    hazards: {
      rain_rate_mmh: 72.0,
      cloudburst_flag: false,
      posh_percent: 54,
      mesh_hail_mm: 22.0,
      downburst_gust_kmh: 68.0,
      lightning_density: 3.8,
      explainability: {
        radar_core_driver: 'Strong convective reflectivity core at 58.2 dBZ with moderate hail aloft',
        vil_liquid_driver: 'VIL density 3.1 g/m³',
        convective_severity: 'Severe multicell squall line'
      }
    },
    target_etas: [
      {
        target_name: 'North Approach Holding Sector',
        distance_km: 4.8,
        eta_minutes: 18,
        eta_window_min: '15–22 min',
        threat_level: 'WARNING',
        is_footprint_expanding: false
      }
    ],
    evolution: {
      state: 'INTENSIFYING',
      footprint_expansion_factor: 1.18,
      trend_summary: 'Multicell line intensifying along northern aerodrome approach corridor'
    }
  },
  {
    cell_id: 'CELL-703',
    centroid_lat: 22.6350,
    centroid_lon: 88.4650,
    area_km2: 5.4,
    peak_dbz: 51.5,
    mean_dbz: 41.0,
    velocity_kmh: 32.0,
    heading_deg: 45,
    severity: 'MODERATE',
    eta_minutes: 35,
    hazards: {
      rain_rate_mmh: 42.0,
      cloudburst_flag: false,
      posh_percent: 28,
      mesh_hail_mm: 12.0,
      downburst_gust_kmh: 52.0,
      lightning_density: 2.1
    },
    target_etas: [
      {
        target_name: 'Runway 01R Departure Climb-out',
        distance_km: 3.2,
        eta_minutes: 35,
        eta_window_min: '30–40 min',
        threat_level: 'WATCH',
        is_footprint_expanding: false
      }
    ],
    evolution: {
      state: 'INITIATING',
      footprint_expansion_factor: 1.10,
      trend_summary: 'Newly initiated convective cell southeast of aerodrome perimeter'
    }
  },
  {
    cell_id: 'CELL-805',
    centroid_lat: 22.58,
    centroid_lon: 88.42,
    area_km2: 12.5,
    peak_dbz: 68.2,
    mean_dbz: 55.0,
    velocity_kmh: 45.0,
    heading_deg: 42,
    severity: 'EXTREME',
    eta_minutes: 8,
    hazards: {
      rain_rate_mmh: 125.0,
      cloudburst_flag: true,
      posh_percent: 92,
      mesh_hail_mm: 45.0,
      downburst_gust_kmh: 105.0,
      lightning_density: 12.4,
      explainability: {
        radar_core_driver: 'Explosive updraft. Cloud top cooling at 15K/min.',
        vil_liquid_driver: 'Extreme VIL density 9.2 g/m³',
        convective_severity: 'Supercell characteristics detected'
      }
    },
    target_etas: [
      {
        target_name: 'CCU Airport (Netaji Subhas)',
        distance_km: 6.0,
        eta_minutes: 8,
        eta_window_min: '6-10 min',
        threat_level: 'EMERGENCY',
        is_footprint_expanding: true
      }
    ],
    evolution: {
      state: 'MICROBURST',
      footprint_expansion_factor: 1.45,
      trend_summary: 'Severe microburst collapsing directly over approach path.'
    }
  },
  {
    cell_id: 'CELL-912',
    centroid_lat: 22.40,
    centroid_lon: 88.35,
    area_km2: 215.0,
    peak_dbz: 52.0,
    mean_dbz: 44.5,
    velocity_kmh: 15.0,
    heading_deg: 90,
    severity: 'SEVERE',
    eta_minutes: 45,
    hazards: {
      rain_rate_mmh: 65.0,
      cloudburst_flag: false,
      posh_percent: 40,
      mesh_hail_mm: 15.0,
      downburst_gust_kmh: 55.0,
      lightning_density: 4.2,
      explainability: {
        radar_core_driver: 'Broad stratiform region with embedded convective cores.',
        vil_liquid_driver: 'VIL density 2.8 g/m³',
        convective_severity: 'Training multicell system'
      }
    },
    target_etas: [
      {
        target_name: 'Howrah Station',
        distance_km: 11.2,
        eta_minutes: 45,
        eta_window_min: '40-55 min',
        threat_level: 'WARNING',
        is_footprint_expanding: true
      }
    ],
    evolution: {
      state: 'TRAINING',
      footprint_expansion_factor: 1.10,
      trend_summary: 'Cells training over same area leading to urban flooding risk.'
    }
  },
  {
    cell_id: 'CELL-401',
    centroid_lat: 22.75,
    centroid_lon: 88.20,
    area_km2: 8.0,
    peak_dbz: 42.0,
    mean_dbz: 35.0,
    velocity_kmh: 55.0,
    heading_deg: 120,
    severity: 'MODERATE',
    eta_minutes: 25,
    hazards: {
      rain_rate_mmh: 15.0,
      cloudburst_flag: false,
      posh_percent: 5,
      mesh_hail_mm: 0.0,
      downburst_gust_kmh: 30.0,
      lightning_density: 0.5,
      explainability: {
        radar_core_driver: 'Shallow convection, low echo tops.',
        vil_liquid_driver: 'VIL density 0.8 g/m³',
        convective_severity: 'Ordinary cell'
      }
    },
    target_etas: [
      {
        target_name: 'Chandannagar',
        distance_km: 22.9,
        eta_minutes: 25,
        eta_window_min: '22-28 min',
        threat_level: 'WATCH',
        is_footprint_expanding: false
      }
    ],
    evolution: {
      state: 'DISSIPATING',
      footprint_expansion_factor: 0.85,
      trend_summary: 'Cell is moving into hostile environment and dissipating.'
    }
  },
];

export const DEFAULT_SAFE_SHELTER: DesignatedShelter = {
  id: 'SHELTER-PADMAPUR-01',
  name: 'Padmapur Multipurpose Cyclone Shelter (MPCS)',
  nameHi: 'पद्मापुर बहुउद्देश्यीय चक्रवात एवं बाढ़ आश्रय केंद्र',
  type: 'Engineered Multi-Purpose Cyclone Shelter',
  address: 'Sector 4, Near High School Ground, Padmapur Ward Bypass',
  distanceKm: 1.2,
  walkEtaMinutes: 6,
  driveEtaMinutes: 3,
  capacityTotal: 1200,
  capacityOccupied: 280,
  contactNumber: '+91-891-2845112 / Helpline: 1077',
  latitude: 17.792,
  longitude: 83.251,
  turnByTurnAdviceEn: 'Head West onto NH-16 Elevated Bypass road. Strictly avoid the low-lying Canal Road underpass which is flooding. Follow neon green NDMA emergency evacuation arrows directly to the High School campus.',
  turnByTurnAdviceHi: 'एनएच-16 एलिवेटेड बाईपास की ओर पश्चिम दिशा में बढ़ें। नहर रोड अंडरपास से बिल्कुल बचें जहां जलभराव हो रहा है। हाई स्कूल परिसर में बने आश्रय केंद्र के हरे दिशा-सूचकों का पालन करें।',
  features: [
    'Reinforced 3-Story Concrete Structure',
    'Dedicated 120kVA Silent Diesel Generator',
    'Reverse Osmosis (RO) Safe Drinking Water',
    'Emergency Medical First-Aid Dispensary',
    'Dedicated Women & Children Safe Ward',
    'Satellite POLNET VHF Communication Hub'
  ]
};

export const EMERGENCY_HELPLINES = [
  { label: 'National Emergency', number: '112', desc: 'Police / Fire / Ambulance Unified Emergency' },
  { label: 'District Disaster Control (DEOC)', number: '1077', desc: 'Collectorate Disaster Management Unit' },
  { label: 'State Emergency Operations (SEOC)', number: '1070', desc: 'State Relief Commissioner / SDMA' },
  { label: 'Medical Ambulance Support', number: '108', desc: 'Emergency 24x7 Ambulance Dispatch' }
];

/**
 * Creates a fully grounded, realistic DispatchedAlert object for a given storm cell
 */
export function createDispatchedAlert(
  cell: any = FALLBACK_STORM_CELLS[0],
  radiusKm: number = 25,
  settlementType: SettlementTypology = 'MDU'
): DispatchedAlert {
  const fallback = FALLBACK_STORM_CELLS[0];
  const safeCell: StormCell = {
    cell_id: cell?.cell_id || fallback.cell_id,
    centroid_lat: cell?.centroid_lat ?? (cell?.centroid_y != null ? 17.6 + cell.centroid_y * 0.005 : fallback.centroid_lat),
    centroid_lon: cell?.centroid_lon ?? (cell?.centroid_x != null ? 83.1 + cell.centroid_x * 0.005 : fallback.centroid_lon),
    area_km2: cell?.area_km2 ?? fallback.area_km2,
    peak_dbz: cell?.peak_dbz ?? cell?.max_dbz ?? fallback.peak_dbz,
    mean_dbz: cell?.mean_dbz ?? fallback.mean_dbz,
    velocity_kmh: cell?.velocity_kmh ?? fallback.velocity_kmh,
    heading_deg: cell?.heading_deg ?? fallback.heading_deg,
    severity: cell?.severity ?? fallback.severity,
    eta_minutes: cell?.eta_minutes ?? fallback.eta_minutes,
    hazards: {
      rain_rate_mmh: cell?.hazards?.rain_rate_mmh ?? (cell?.peak_dbz ? Math.pow(10, (cell.peak_dbz - 10) / 16) * 0.3 : fallback.hazards.rain_rate_mmh),
      cloudburst_flag: cell?.hazards?.cloudburst_flag ?? ((cell?.peak_dbz ?? 0) >= 64),
      posh_percent: cell?.hazards?.posh_percent ?? ((cell?.peak_dbz ?? 0) >= 55 ? 65 : 25),
      mesh_hail_mm: cell?.hazards?.mesh_hail_mm ?? ((cell?.peak_dbz ?? 0) >= 60 ? 30 : 10),
      downburst_gust_kmh: cell?.hazards?.downburst_gust_kmh ?? (cell?.velocity_kmh ? cell.velocity_kmh * 1.6 : fallback.hazards.downburst_gust_kmh),
      lightning_density: cell?.hazards?.lightning_density ?? fallback.hazards.lightning_density,
      explainability: cell?.hazards?.explainability ?? fallback.hazards.explainability
    },
    target_etas: cell?.target_etas ?? fallback.target_etas,
    evolution: cell?.evolution ?? fallback.evolution
  };

  const demographics = calculateImpactedDemographics(safeCell, safeCell.eta_minutes ?? 20, settlementType);
  const vulnerability = calculateBuildingVulnerability(demographics, safeCell.hazards, settlementType);
  const battalions = calculateBattalionProximity(safeCell.centroid_lat, safeCell.centroid_lon, settlementType === 'HLY');

  const now = new Date();
  const timeString = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  const isExtreme = safeCell.hazards.cloudburst_flag || safeCell.peak_dbz >= 64 || safeCell.hazards.downburst_gust_kmh >= 85;
  const isSevere = safeCell.hazards.rain_rate_mmh >= 60 || safeCell.hazards.downburst_gust_kmh >= 65;

  const targetName = safeCell.target_etas && safeCell.target_etas.length > 0
    ? safeCell.target_etas[0].target_name
    : 'Padmapur Coastal Sector & Urban Corridor';

  const targetNameHi = 'पद्मापुर तटीय क्षेत्र एवं शहरी कॉरिडोर';

  return {
    alertId: `MAUSAM-NDMA-${safeCell.cell_id}-${Date.now().toString().slice(-6)}`,
    cellId: safeCell.cell_id,
    stormName: `${safeCell.cell_id} Convective Core`,
    severity: isExtreme ? 'Extreme' : isSevere ? 'Severe' : 'Moderate',
    threatLevel: isExtreme ? 'EMERGENCY' : isSevere ? 'WARNING' : 'WATCH',
    peakDbz: safeCell.peak_dbz,
    rainRateMmh: safeCell.hazards.rain_rate_mmh,
    downburstKmh: safeCell.hazards.downburst_gust_kmh,
    meshHailMm: safeCell.hazards.mesh_hail_mm,
    lightningDensity: safeCell.hazards.lightning_density,
    etaMinutes: safeCell.eta_minutes ?? 18,
    etaWindowMin: `${Math.max(0, (safeCell.eta_minutes ?? 18) - 4)}–${(safeCell.eta_minutes ?? 18) + 6} min`,
    targetLocation: targetName,
    targetLocationHi: targetNameHi,
    affectedPopulation: demographics.totalExposedPopulation,
    criticalJeopardyPopulation: demographics.criticalJeopardyPopulation,
    urgentEvacuationCount: demographics.recommendedEvacuationCount,
    broadcastRadiusKm: radiusKm,
    dispatchedAt: `${timeString} IST`,
    dispatchedTimestamp: Date.now(),
    demographicRisk: demographics,
    buildingVulnerability: vulnerability,
    assignedBattalions: battalions.slice(0, 4),
    nearestShelter: DEFAULT_SAFE_SHELTER,
    ndmaSops: NDMA_SOP_RULES,
    emergencyHelplines: EMERGENCY_HELPLINES
  };
}

export const DEFAULT_FALLBACK_ALERT: DispatchedAlert = createDispatchedAlert(
  FALLBACK_STORM_CELLS[0],
  25,
  'MDU'
);
