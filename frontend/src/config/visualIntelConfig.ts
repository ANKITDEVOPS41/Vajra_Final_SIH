import { VisualIntelData, VisualIntelPageId } from '../types/visualIntel';

export const VISUAL_INTEL_CONFIG: Record<VisualIntelPageId, VisualIntelData> = {
  hazard: {
    pageId: 'hazard',
    pageTitle: 'Hazard GIS & Nowcasting Console',
    subtitle: 'IMD S-Band Doppler Weather Radar (VEBS) & 0–6h Convective Nowcast',
    badge: '0–6h DWR NOWCAST // 1 km² GRID',
    whatYouSee: {
      summary: 'Real-time IMD S-Band Dual-Polarimetric Doppler Radar (VEBS Bhubaneswar, 2.875 GHz) composite merged with ConvectNet 0–6h nowcasting model over 1 km² grid cells across the 120 km Odisha coastal corridor.',
      sensor: {
        name: 'IMD S-Band Polarimetric Doppler Weather Radar (DWR)',
        specs: '2.875 GHz Frequency, 0.95° Beamwidth, 750 kW Peak Power, Dual-Pol (ZDR, KDP, ρHV)',
        spatialDomain: '120 km Regional Buffer • 20.0°N–20.6°N, 85.5°E–86.1°E • 1 km² Gridded AOI',
        resolution: '1.0 km × 1.0 km horizontal spatial grid, 12 vertical elevation cuts (0.5° to 19.5°)',
        cadence: '10-minute volume scan update cycle with 60-second in-situ AWS telemetry refresh',
        parameters: 'Reflectivity (Z), Radial Velocity (Vr), Spectrum Width (W), Vertically Integrated Liquid (VIL)',
      },
      points: [
        'Live S-Band DWR reflectivity sweep displaying convective storm cell development and boundary collisions.',
        'ConvectNet 0–6h nowcasting horizons computed every 10 minutes over discrete 1 km² grid cells.',
        'High-resolution multi-format weather raster overlays (INSAT-3DR Thermal IR, Doppler reflectivity, MSLP pressure isobars, and 2m temperature/humidity).',
        'Automatic cell identification and SCIT centroid tracking for severe convective cloudburst cores.'
      ],
    },
    howToDecode: {
      summary: 'Radar reflectivity is calibrated in decibels of reflectivity (dBZ) standard scale from 20 to >65 dBZ, indicating precipitation intensity, hydrometeor size, and severe hail presence.',
      items: [
        {
          color: '#22c55e',
          label: 'Stratiform Light Rain',
          range: '20–35 dBZ',
          meaning: 'Light stratiform precipitation (2–8 mm/h). No immediate aviation or flood hazard.',
        },
        {
          color: '#eab308',
          label: 'Moderate Convection',
          range: '35–50 dBZ',
          meaning: 'Moderate thunderstorm rain (15–50 mm/h). In-cloud turbulence, lightning potential present.',
        },
        {
          color: '#ef4444',
          label: 'Severe Thunderstorm',
          range: '50–65 dBZ',
          meaning: 'Violent squall with rainfall >90 mm/h, damaging surface gusts >45 kt, low-level wind shear.',
        },
        {
          color: '#d946ef',
          label: 'Cloudburst Core / Severe Hail',
          range: '>65 dBZ',
          meaning: 'Extreme cloudburst core (>100 mm/h) or destructive hail (>25mm MESH). High flash flood threat.',
        },
        {
          color: '#38bdf8',
          label: 'Velocity Couplet',
          range: 'Adjacent Cyan / Crimson',
          meaning: 'Mesocyclone rotation or intense microburst divergent outflow (>25 m/s shear).',
        },
      ],
      vectors: [
        'Solid cyan vectors: Cell trajectory vector indicating 15-minute and 30-minute extrapolated positions.',
        'Dashed yellow corridor: 30-minute cone of uncertainty accounting for storm propagation variance.',
      ],
      thresholds: [
        'dBZ ≥ 55 within 5 km: Airfield safety envelope breach.',
        'Projected rain rate ≥ 100 mm/h: MoES PS-26084 cloudburst definition threshold.',
      ],
    },
    actionableDecision: {
      level: 'CRITICAL',
      primaryAction: 'MANDATORY ATC HOLD & AUTOMATED NDMA CAP SIREN BROADCAST',
      protocol: 'MoES PS-26084 Severe Convection Standard Operating Procedure (SOP-01)',
      stakeholders: ['Air Traffic Control (VEBS Tower)', 'NDMA / OSDMA Emergency Operations', 'Bhubaneswar Smart City BMC'],
      triggerCondition: 'Radar core dBZ ≥ 55 within 5 km of VEBS or rain rate ≥ 100 mm/h projected into urban municipal cells.',
      actionChecklist: [
        'ATC: Instruct all arriving flights to enter southern holding stack; suspend Runway 01 departures.',
        'NDMA / OSDMA: Automated Common Alerting Protocol (CAP) Siren broadcast to smart city sirens in Sector T-NW/NE.',
        'Municipal Drainage: Pre-activate urban drainage sumps and high-capacity stormwater sluice gates along Gangua Nallah.',
        'First Responders: Place State Disaster Rapid Action Force (ODRAF) on stage-2 standby.',
      ],
    },
    ticker: {
      status: 'RADAR LIVE',
      metric: 'MAX CORE: 68.2 dBZ // Z-R: 174.5 mm/h',
      action: 'ACTION: NDMA CAP SIREN BROADCAST DISPATCHED • DRAINAGE PRE-ACTIVATED',
      level: 'CRITICAL',
    },
    sopProtocol: 'SOP-01: Severe Convective Storm Warning & Aviation Hazard Response',
    problemStatementRef: 'MoES / NCMRWF PS-26084: Sub-kilometer Convective Nowcasting',
  },

  tactical: {
    pageId: 'tactical',
    pageTitle: 'Tactical Operations Dashboard',
    subtitle: 'Airfield C2 Operations Center • VEBS 1–3 km Aerodrome Safety Zones',
    badge: '1–3 km RUNWAY ENVELOPE // ATC C2',
    whatYouSee: {
      summary: 'Command and Control (C2) aerodrome tactical map centered on Biju Patnaik International Airport (VEBS), showing storm cell centroids, velocity motion vectors, target intercept rays, and 1–3 km concentric aerodrome safety rings.',
      sensor: {
        name: 'SCIT Cell Tracking Engine Fused with Aerodrome ILS Approach Corridors',
        specs: 'Centroid cross-correlation tracking algorithm with Kalman filter motion extrapolation',
        spatialDomain: 'VEBS Aerodrome 1–3 km safety zones (Runway 01/19 orientation 010°/190°)',
        resolution: '100m spatial target accuracy with 10-second trajectory kinematic update',
        cadence: 'Continuous dynamic recalculation of intercept distance and ETA countdown',
        parameters: 'Cell Centroid, Peak dBZ, Velocity (km/h), Bearing, Distance (km), Runway Intercept ETA (min)',
      },
      points: [
        '1 km Red Ring: Immediate Runway Touchdown Zone (<2 min intercept critical envelope).',
        '2 km Amber Ring: Final Approach Alert Zone (Aviation decision altitude threshold).',
        '3 km Sky Blue Ring: Aerodrome Tactical Perimeter (MoES PS-26084 mandated tactical boundary).',
        'Dashed cyan intercept rays connecting cell centroids directly to runway thresholds with real-time ETA tags.',
      ],
    },
    howToDecode: {
      summary: 'Dynamic kinematic vectors show storm approach velocity and ETA countdown to Runway 01/19 touchdown zones.',
      items: [
        {
          color: '#ef4444',
          label: '1 km Touchdown Ring',
          range: 'Radius = 1,000m',
          meaning: 'Immediate runway danger zone. Any severe convective cell crossing triggers instant operations halt.',
        },
        {
          color: '#f59e0b',
          label: '2 km Final Approach Ring',
          range: 'Radius = 2,000m',
          meaning: 'Final approach alert boundary. Arriving aircraft reach missed approach decision point.',
        },
        {
          color: '#38bdf8',
          label: '3 km Aerodrome Perimeter',
          range: 'Radius = 3,000m',
          meaning: 'Tactical aerodrome boundary mandated by MoES PS-26084 for sub-kilometer nowcasting.',
        },
        {
          color: '#06b6d4',
          label: 'Target Intercept Ray',
          range: 'Cyan Dashed Line',
          meaning: 'Direct intercept trajectory showing straight-line distance (km) and computed arrival ETA (min).',
        },
      ],
      vectors: [
        'Solid arrow: 15-minute and 30-minute velocity vector showing heading and storm translation speed.',
        'White intercept tag: Real-time calculated ETA in minutes and distance in km to Runway 01/19.',
      ],
      thresholds: [
        'ETA ≤ 3.0 min & dBZ ≥ 55: Immediate mandatory Runway Go-Around.',
        'ETA ≤ 5.0 min & dBZ ≥ 50: Approach advisory and ground operations alert.',
      ],
    },
    actionableDecision: {
      level: 'CRITICAL',
      primaryAction: 'MANDATORY ATC RUNWAY GO-AROUND & AIRFIELD RAMP GROUND STOP',
      protocol: 'ICAO Doc 9817 / DGCA CAR Section 9 Aerodrome Weather Safety Directive',
      stakeholders: ['VEBS ATC Tower Controller', 'Airfield Ground Operations', 'Airline Flight Dispatch'],
      triggerCondition: 'Cell ETA ≤ 3 min with peak dBZ ≥ 55 or lightning flash rate > 20/min on airfield.',
      actionChecklist: [
        'ATC: Issue immediate "GO-AROUND, WINDSHEAR / THUNDERSTORM IN TOUCHDOWN ZONE" to approaching flight.',
        'Ground Ops: Declare AIRFIELD RAMP GROUND STOP; halt all aircraft refueling and open baggage ramp operations.',
        'Tower: Switch runway lighting to maximum intensity; alert Airport Rescue and Fire Fighting (ARFF).',
        'NOTAM: Dispatch emergency aerodrome closure NOTAM for 30 minutes until convective squall clears.',
      ],
    },
    ticker: {
      status: 'TACTICAL ALERT',
      metric: 'CELL-701: 68.2 dBZ // ETA: 2.4 min (1.8 km)',
      action: 'ACTION: ATC RUNWAY 01 GO-AROUND MANDATORY • RAMP GROUND STOP',
      level: 'CRITICAL',
    },
    sopProtocol: 'SOP-02: Aerodrome Convective Intercept & Runway Safety Protocol',
    problemStatementRef: 'MoES / NCMRWF PS-26084: 1–3 km Aerodrome Terminal Nowcasting',
  },

  hyperlocal: {
    pageId: 'hyperlocal',
    pageTitle: '3x3 Airfield Twin & Ground Truth Mesonet',
    subtitle: 'High-Density 9-Station In-Situ AWS Network Fused with Boundary Layer Telemetry',
    badge: '3x3 AWS TWIN // IN-SITU MESONET',
    whatYouSee: {
      summary: 'Digital twin of the 3x3 tactical aerodrome grid surrounding VEBS airport, synthesizing live telemetry from 9 in-situ Automatic Weather Stations (AWS) with Open-Meteo boundary layer models to track runway micro-climate and surface wind shear.',
      sensor: {
        name: '9-Station In-Situ AWS Mesonet Network Fused with Boundary Layer Profiler',
        specs: 'Ultrasonic anemometers (10m), barometric pressure sensors (0.01 hPa precision), tipping bucket rain gauges',
        spatialDomain: '3.0 km × 3.0 km domain divided into 9 tactical sectors (1.0 km² each, NW to SE)',
        resolution: '1.0 km² per sector tile with sub-second in-situ sensor sampling',
        cadence: '1-minute real-time telemetry streaming with 3-hour barometric trend calculations',
        parameters: '2m Dry Bulb & Dew Point, 3h Pressure Tendency (ΔP/3h), 10m Wind & Gusts, 1h Rain, CAPE',
      },
      points: [
        '3x3 Sector Matrix tiles (NW, N, NE, W, C, E, SW, S, SE) displaying real-time risk level, dBZ, and rainfall rate.',
        'In-situ AWS Mesonet cards detailing Station 42971 (VEBS Aerodrome) and 8 surrounding peripheral stations.',
        'Live thermodynamic parameters including Convective Available Potential Energy (CAPE) and Lifted Index (LI).',
        'Runway wind shear vectors detecting micro-climate thermal contrasts and barometric cold pool surges.',
      ],
    },
    howToDecode: {
      summary: 'In-situ thermodynamic telemetry reveals impending downburst touchdown before radar reflectivity reaches the surface.',
      items: [
        {
          color: '#ef4444',
          label: 'Rapid Pressure Drop',
          range: 'ΔP/3h < -2.0 hPa',
          meaning: 'Sharp barometric plunge signaling intense mesolow and advancing convective squall line.',
        },
        {
          color: '#f59e0b',
          label: 'Aerodynamic Gusts',
          range: 'Gusts > 50 kt (25 m/s)',
          meaning: 'Severe surface wind shear exceeding aircraft crosswind limits on Runway 01/19.',
        },
        {
          color: '#a855f7',
          label: 'Extreme Instability',
          range: 'CAPE > 3,000 J/kg',
          meaning: 'Explosive thermodynamic energy supporting rapid cloudburst updraft intensification.',
        },
        {
          color: '#38bdf8',
          label: 'Runway Micro-climate',
          range: 'T - Td < 1.5°C',
          meaning: 'Near-surface moisture saturation; fog, low cloud base, and heavy precipitation ceiling.',
        },
      ],
      vectors: [
        'Surface wind arrows: Instantaneous 10m wind direction with barb feathers indicating wind speed (kt).',
        'Sector borders: Green = Nominal, Amber = Pre-convective squall, Crimson = Downburst touchdown.',
      ],
      thresholds: [
        'ΔP/3h < -3.5 hPa & Gusts > 50 kt: Imminent squall front arrival.',
        'AWS 1h rainfall > 50 mm: Runway aquaplaning critical threshold.',
      ],
    },
    actionableDecision: {
      level: 'WARNING',
      primaryAction: 'ACTIVATE RUNWAY AQUAPLANING NOTAM & SUSPEND FLIGHT APPROACH OPERATIONS',
      protocol: 'DGCA Aerodrome Operational Directive AD-2024-WIND',
      stakeholders: ['Airport Authority of India (AAI)', 'Airport Rescue and Firefighting (ARFF)', 'Ground Handling Units'],
      triggerCondition: 'Barometric tendency ΔP/3h < -3.5 hPa with surface gusts > 50 kt or 1h rainfall > 50 mm.',
      actionChecklist: [
        'Airport Director: Issue emergency runway aquaplaning NOTAM; advise braking action POOR.',
        'ATC: Advise all inbound aircraft of LLWS wind shear on Runway 01 approach corridor.',
        'Drainage Team: Dispatch mobile high-capacity dewatering pumps to Runway 01 touchdown depression.',
        'ARFF: Position emergency foam tenders along taxiway bravo on high alert.',
      ],
    },
    ticker: {
      status: 'AWS MESONET LIVE',
      metric: 'STATION-VEBS: ΔP/3h -3.8 hPa // Gust 54 kt',
      action: 'ACTION: RUNWAY AQUAPLANING NOTAM ISSUED • AIRFIELD APPROACH ADVISORY',
      level: 'WARNING',
    },
    sopProtocol: 'SOP-03: Aerodrome Ground Truth Sensor Network & In-Situ Alerting',
    problemStatementRef: 'MoES / NCMRWF PS-26084: 3x3 km Hyperlocal In-Situ Verification',
  },

  inference: {
    pageId: 'inference',
    pageTitle: 'AI Deep Learning Inference Pipeline',
    subtitle: 'ConvectNet 4D Multi-Modal Spatiotemporal Tensor Network & Multi-Task Decoders',
    badge: 'CONVECTNET 4D // MULTI-HEAD AI',
    whatYouSee: {
      summary: 'Deep learning pipeline architecture visualizing the ingestion of 4D multi-modal spatiotemporal tensors (DWR radar + INSAT-3DR TIR-1 + Lightning network + AWS mesonet) into a 3D-CNN / CBAM attention / ConvLSTM backbone feeding 4 specialized hazard prediction neural heads.',
      sensor: {
        name: 'ConvectNet Multi-Modal Spatiotemporal Neural Architecture',
        specs: '128×128 spatial grid × 12 historical time steps (120 min) × 4 physical input channels',
        spatialDomain: '128 km × 128 km domain centered on Bhubaneswar at 1.0 km spatial resolution',
        resolution: '1.0 km horizontal grid, 4 multi-modal sensor channels, 0–60 min prediction steps',
        cadence: '10-minute inference execution cycle with <1.2 second GPU latency (PyTorch FP16)',
        parameters: 'C0: Radar VIL, C1: Reflectivity Trend ΔZ, C2: TIR Cooling Rate, C3: Lightning Jump',
      },
      points: [
        'Flowchart of 6 core stages: Multi-Modal Ingestion → 3D-CNN Spatial Encoder → CBAM Channel/Spatial Attention → ConvLSTM Temporal Dynamics → Latent Manifold → 4 Multi-Task Hazard Decoders.',
        'Channel C0: Vertically Integrated Liquid (VIL, 0–85 kg/m²) detecting suspended water mass.',
        'Channel C1: Reflectivity Trend (ΔZ, -15 to +25 dBZ/10m) quantifying vertical updraft acceleration.',
        'Channel C2: INSAT-3DR TIR-1 Cloud-Top Cooling Rate (-2.5 to 0 K/min) identifying overshooting tops.',
        'Channel C3: Total Lightning Jump (0–45 flashes/km²/min) providing 15-minute downburst precursor signals.',
      ],
    },
    howToDecode: {
      summary: 'The 4 neural decoders output calibrated probabilistic hazard forecasts and physical continuous field predictions.',
      items: [
        {
          color: '#38bdf8',
          label: 'Channel C0: Radar VIL',
          range: '>50 kg/m²',
          meaning: 'Massive suspended hydrometeor column primed for catastrophic collapse (cloudburst).',
        },
        {
          color: '#22c55e',
          label: 'Channel C1: ΔZ Trend',
          range: '>+15 dBZ/10m',
          meaning: 'Explosive convective updraft feeding supercell development.',
        },
        {
          color: '#f59e0b',
          label: 'Channel C2: TIR Cooling',
          range: '< -1.5 K/min',
          meaning: 'Vigorous cloud top punching into tropopause, signaling violent convective initiation.',
        },
        {
          color: '#ec4899',
          label: 'Channel C3: Lightning Jump',
          range: '> 2σ rate surge',
          meaning: 'Sudden lightning acceleration preceding microburst surface touchdown by 15–20 minutes.',
        },
        {
          color: '#a855f7',
          label: 'Hazard Probability Heads',
          range: '0–100% Calibrated',
          meaning: 'Multi-task predictions for Cloudburst, Microburst / LLWS, Severe Hail, and Convective Initiation.',
        },
      ],
      vectors: [
        'CBAM Attention Heatmap: Highlights spatial and channel regions exerting highest neural weight.',
        'Latent Manifold: 512-dimensional bottleneck representation compressing atmospheric dynamics.',
      ],
      thresholds: [
        'Cloudburst Head > 85% at T+30m: High-confidence catastrophic rainfall forecast.',
        'Microburst Head ΔV > 25 m/s at T+15m: Severe aerodynamic windshear forecast.',
      ],
    },
    actionableDecision: {
      level: 'CRITICAL',
      primaryAction: 'ACTIVATE AI CONFIDENCE GATING & PRE-STAGE DISASTER RESCUE TEAMS',
      protocol: 'MoES PS-26084 Deep Learning Model Confidence Decision Framework',
      stakeholders: ['State Emergency Operations Centre (SEOC)', 'National Weather Forecasting Centre (NWFC)', 'ATC Approach Radar'],
      triggerCondition: 'Cloudburst neural head probability > 85% with multi-sensor cross-check validation gate confirmed.',
      actionChecklist: [
        'Confidence Gating: Cross-check C0 VIL (>50 kg/m²) and C3 Lightning Jump (>2σ) to eliminate false alarms.',
        'SEOC: Pre-stage State Disaster Management Authority (OSDMA) rescue boats in low-lying catchments.',
        'ATC: Alert Approach Control of impending severe wind shear within 15 minutes on Runway 01 glidepath.',
        'Radar Control: Reconfigure DWR scan strategy from VCP-32 surveillance to rapid convective VCP-212.',
      ],
    },
    ticker: {
      status: 'NEURAL INFERENCE ACTIVE',
      metric: 'CLOUDBURST: 91.4% // MICROBURST: 88.2% (T+15m)',
      action: 'DECISION: AI CONFIDENCE GATE PASSED • ADVANCE APPROACH WARNING ISSUED',
      level: 'CRITICAL',
    },
    sopProtocol: 'SOP-04: Deep Learning Inference Gating & Automated Decision Thresholds',
    problemStatementRef: 'MoES / NCMRWF PS-26084: Multimodal Spatiotemporal Deep Learning',
  },

  replay: {
    pageId: 'replay',
    pageTitle: 'Historical Case Replay & Benchmark Validation',
    subtitle: 'WMO-Standard Retrospective Benchmarks • June 2022 Cherrapunji Extreme Cloudburst',
    badge: 'WMO BENCHMARK // CHERRAPUNJI 972mm',
    whatYouSee: {
      summary: 'Retrospective benchmark validation console comparing ConvectNet AI predictions against real observed ground truth radar and rain gauge records for extreme historical convective disasters (Case Study 1: Cherrapunji June 16–17, 2022, 972.6 mm/24h; Case Study 2: Bhubaneswar VEBS Microburst).',
      sensor: {
        name: 'Retrospective IMD DWR Radar Archive & AWS Ground Truth Benchmark Gauge Network',
        specs: 'WMO Meghalaya Rain Gauge Network, Sohra Automated Station, Cherrapunji IMD Observatory',
        spatialDomain: 'Khasi Hills Escarpment (25.26°N–25.30°N, 91.70°E–91.74°E) • Steep Orographic Ridge',
        resolution: '500m digital elevation model fused with 1.0 km radar grid at 5-minute timestep intervals',
        cadence: '180-minute scrubbing playback timeline with 5-minute granular validation steps',
        parameters: 'AI Predicted Storm Envelope, Observed Ground Truth Radar, Escarpment Line, CSI, POD, FAR',
      },
      points: [
        'Purple/Magenta Contour: ConvectNet AI predicted storm envelope, centroid path, and intensity footprint.',
        'Emerald/Cyan Contour: Actual observed IMD Doppler Weather Radar echo and rain gauge ground truth reality.',
        'Overlapping Zone: Real-time calculation of Critical Success Index (CSI), Probability of Detection (POD), and False Alarm Ratio (FAR).',
        'Cherrapunji escarpment orographic boundary illustrating cloudburst anchoring along steep ridge terrain.',
      ],
    },
    howToDecode: {
      summary: 'Color differentiation proves AI prediction accuracy against real ground truth meteorological records.',
      items: [
        {
          color: '#c084fc',
          label: 'AI Predicted Storm',
          range: 'Purple / Magenta Contour',
          meaning: 'ConvectNet 4D neural forecast generated with 15–45 minutes of advance lead time.',
        },
        {
          color: '#10b981',
          label: 'Ground Truth Reality',
          range: 'Emerald / Cyan Contour',
          meaning: 'Actual recorded IMD radar reflectivity and in-situ automated tipping bucket rain gauge data.',
        },
        {
          color: '#38bdf8',
          label: 'Critical Success Index (CSI)',
          range: 'CSI = 0.86 (Target > 0.85)',
          meaning: 'Intersection over union of predicted vs observed convective footprints, confirming rigorous accuracy.',
        },
        {
          color: '#f59e0b',
          label: 'Displacement Error',
          range: '< 1.8 km at T+60m',
          meaning: 'Minimal spatial centroid drift, well within the 3.0 km aerodrome tactical safety envelope.',
        },
      ],
      vectors: [
        'Dashed purple vector: ConvectNet forecasted trajectory heading.',
        'Solid emerald vector: Actual ground truth observed storm movement.',
      ],
      thresholds: [
        'POD ≥ 0.92 (Achieved 0.94): High-probability capture of extreme convective events.',
        'FAR ≤ 0.08 (Achieved 0.06): Ultra-low false alarm rate preventing operational panic.',
      ],
    },
    actionableDecision: {
      level: 'ADVISORY',
      primaryAction: 'MODEL BENCHMARK AUDIT & VALIDATION SIGN-OFF FOR MOES COMPLIANCE',
      protocol: 'WMO-No. 485 Manual on the Global Data-processing and Forecasting System',
      stakeholders: ['NCMRWF / MoES Evaluation Panel', 'Independent Forensic Auditor', 'Operational Met Services'],
      triggerCondition: 'Historical case study verification meeting POD ≥ 0.92, FAR ≤ 0.08, and CSI ≥ 0.85 criteria.',
      actionChecklist: [
        'Forensic Audit: Verify 45-minute advance lead time achieved prior to rain gauge tipping in Cherrapunji.',
        'Aviation Validation: Confirm 28-minute advance warning of Runway 01 LLWS during Bhubaneswar June 2024 microburst.',
        'Algorithm Sign-off: Validate that spatial displacement error remains under 1.8 km at 60-minute forecast horizon.',
        'Operational Authorization: Certify ConvectNet for deployment in civil defense and aerodrome operations.',
      ],
    },
    ticker: {
      status: 'BENCHMARK VERIFIED',
      metric: 'CHERRAPUNJI: CSI 0.86 // POD 0.94 // FAR 0.06',
      action: 'ACTION: RETROSPECTIVE AUDIT & BENCHMARK VALIDATION COMPLIANT',
      level: 'ADVISORY',
    },
    sopProtocol: 'SOP-05: Retrospective Verification & Disaster Benchmarking Protocol',
    problemStatementRef: 'MoES / NCMRWF PS-26084: WMO Extreme Event Benchmark Testing',
  },

  grid: {
    pageId: 'grid',
    pageTitle: 'Grid Explainable AI (XAI) Cockpit',
    subtitle: '1 km² Sector-Level Attribution via Integrated Gradients & Feature Importance',
    badge: '1km² XAI // INTEGRATED GRADIENTS',
    whatYouSee: {
      summary: 'Explainable AI (XAI) attribution console providing transparent breakdown of how ConvectNet arrives at convective hazard probabilities across 1 km² discrete aerodrome sectors (T-A1 to T-C3) and regional municipal sectors.',
      sensor: {
        name: 'Integrated Gradients & Path Attribution Explainability Engine',
        specs: '50-step Riemann approximation path integral over multi-modal tensor baseline',
        spatialDomain: 'VEBS Aerodrome 3.0 km × 3.0 km grid (9 cells of 1.0 km² each) & 60 km Regional Corridor',
        resolution: '1.0 km² discrete spatial bounding box cells with 37-step storm trajectory waypoints',
        cadence: 'On-demand and 10-minute automated attribution weight computation',
        parameters: 'Attribution Percentages: Radar Aloft (Z/VIL), Thermodynamic CAPE, Surface Gusts / LLWS',
      },
      points: [
        'Interactive map displaying 1 km² grid bounding boxes with real-time risk color-coding (T-A1 to T-C3).',
        '37-step storm trajectory waypoints showing future 5-minute discrete cell entry and exit steps.',
        'Integrated Gradients attribution panel breaking down feature contribution weights for each sector.',
        'Sector-level actionable intelligence card translating abstract weights into municipal and ATC directives.',
      ],
    },
    howToDecode: {
      summary: 'Attribution percentages explain the physical forcing mechanisms behind the neural network prediction.',
      items: [
        {
          color: '#38bdf8',
          label: 'Radar Aloft Weight',
          range: '~42% Attribution',
          meaning: 'Mass of suspended precipitation hydrometeors (VIL) driving negative buoyancy and downburst formation.',
        },
        {
          color: '#f59e0b',
          label: 'Thermodynamic CAPE',
          range: '~28% Attribution',
          meaning: 'Potential convective instability energy fueling violent vertical updraft acceleration.',
        },
        {
          color: '#ef4444',
          label: 'Gust & LLWS Weight',
          range: '~30% Attribution',
          meaning: 'Kinetic energy of surface outflow boundary and low-level wind shear causing aerodynamic turbulence.',
        },
        {
          color: '#10b981',
          label: 'Nominal Buffer Cell',
          range: 'Cyan Border',
          meaning: 'Adjacent low-risk sector serving as aerodynamic buffer or safety clearance zone.',
        },
      ],
      vectors: [
        'Number numbered waypoints: Projected 5-minute storm centroid trajectory steps.',
        'Progress attribution bars: Normalized feature importance contributing to hazard logit.',
      ],
      thresholds: [
        'Sector T-C2 (Touchdown) LLWS attribution > 35%: Immediate runway hazard.',
        'Regional Sector SEC-N (Mahanadi Basin) CAPE attribution peaks: Flash flood warning.',
      ],
    },
    actionableDecision: {
      level: 'CRITICAL',
      primaryAction: 'MANDATE SECTOR-LEVEL GLIDEPATH ABANDONMENT & DISPATCH TACTICAL SLUICE ORDERS',
      protocol: 'MoES PS-26084 Explainable AI Decision Action Framework',
      stakeholders: ['ATC Approach Operations', 'Bhubaneswar Smart City BMC', 'State Flood Control Room'],
      triggerCondition: 'Attribution on runway sector T-C2 shows LLWS > 35% with storm intercept probability > 75%.',
      actionChecklist: [
        'ATC: Issue immediate GLIDEPATH ABANDONMENT ORDER to all flights approaching Runway 01.',
        'Apron Control: Sector T-A3 (Terminal Apron) storm threat > 70%—direct ramp workers into lightning shelters.',
        'State SEOC: Sector SEC-N (Mahanadi Basin) CAPE peak alert—order Cuttack barrage sluice gates opened.',
        'City Engineering: Dispatch tactical mobile water pumps to inundated underpasses in Sector T-NW.',
      ],
    },
    ticker: {
      status: 'XAI ATTRIBUTION READY',
      metric: 'SECTOR T-C2: RADAR 42% // LLWS 30% // CAPE 28%',
      action: 'ACTION: RUNWAY GLIDEPATH ABANDONMENT • TACTICAL SLUICE DISPATCH',
      level: 'CRITICAL',
    },
    sopProtocol: 'SOP-06: Spatial Explainable AI & Sector-Specific Mitigation Protocol',
    problemStatementRef: 'MoES / NCMRWF PS-26084: Explainable Sub-kilometer Convective Grids',
  },

  microburst: {
    pageId: 'microburst',
    pageTitle: '3x3km Microburst & Aerodynamic LLWS Simulator',
    subtitle: 'Aviation Low-Level Wind Shear Physics • ICAO Annex 3 & FAA F-Factor Standard',
    badge: 'MICROBURST 3D // ICAO F-FACTOR > 0.13',
    whatYouSee: {
      summary: 'High-resolution aerodynamic wind shear simulator modeling wet microburst downburst plunging, surface cold pool stagnation, and 3D glidepath headwind-to-tailwind shear along the VEBS Runway 01/19 final approach corridor.',
      sensor: {
        name: '3D Glidepath Aerodynamic LLWS Profiler Calibrated to ICAO Annex 3',
        specs: 'Dual-frequency wind profiler fused with Terminal Doppler Weather Radar (TDWR) algorithms',
        spatialDomain: 'Runway 01/19 Final Approach & Touchdown Corridor (3.0 km × 3.0 km domain)',
        resolution: '50m vertical aerodynamic shear profiling from surface up to 1,500 ft AGL',
        cadence: '10-second real-time aerodynamic simulation update cycle',
        parameters: 'Velocity Shear (ΔV), Peak Outflow Gust, Z-R Rain Rate, Cold Pool ΔT, ICAO F-factor',
      },
      points: [
        'Inner Crimson Circle (300–750m): Severe vertical microburst downdraft shaft plunging with reflectivity 45–64.5 dBZ.',
        'Outer Amber Dashed Ring (700–1,500m): Divergent horizontal surface outflow vortex producing sudden headwind followed by severe tailwind.',
        'Runway 01 Touchdown zone marker detailing verbatim airspeed loss and downdraft velocity.',
        'Real-time ICAO F-factor hazard indicator computing aerodynamic lift degradation.',
      ],
    },
    howToDecode: {
      summary: 'Visual markers delineate genuine aerodynamic fluid dynamic boundaries across the approach corridor.',
      items: [
        {
          color: '#ef4444',
          label: 'Downdraft Shaft Core',
          range: 'Inner 300–750m Radius',
          meaning: 'Vertical downdraft plunging (>60 dBZ). Downward air velocities exceed aircraft climb capability.',
        },
        {
          color: '#f59e0b',
          label: 'Divergent Outflow Boundary',
          range: 'Outer 700–1,500m Ring',
          meaning: 'Expanding vortex ring. Induces rapid airspeed gain (headwind) immediately followed by catastrophic loss (tailwind).',
        },
        {
          color: '#dc2626',
          label: 'ICAO F-factor Hazard',
          range: 'F-factor > 0.13',
          meaning: 'Exceeds regulatory aircraft performance limit. Immediate loss of glidepath altitude occurs.',
        },
        {
          color: '#38bdf8',
          label: 'Cold Pool Chilling',
          range: 'ΔT < -5.0°C',
          meaning: 'Evaporative cooling sustaining intense negative buoyancy and continuous downdraft acceleration.',
        },
      ],
      vectors: [
        'White velocity shear arrows: Opposing headwind and tailwind vector components along Runway 01 axis.',
        'Touchdown target crosshair: Center of downburst impact zone relative to runway threshold.',
      ],
      thresholds: [
        'Velocity shear ΔV ≥ 15 m/s (30 kt): ICAO criteria for dangerous Low-Level Wind Shear.',
        'F-factor ≥ 0.13: Mandatory pilot windshear escape maneuver threshold.',
      ],
    },
    actionableDecision: {
      level: 'CRITICAL',
      primaryAction: 'EXECUTE IMMEDIATE WINDSHEAR ESCAPE MANEUVER & ORDER RUNWAY 01 MISSED APPROACH',
      protocol: 'FAA Advisory Circular AC 00-54 / ICAO Annex 3 Windshear Directive',
      stakeholders: ['Cockpit Flight Crew', 'VEBS Air Traffic Control Tower', 'Airport Duty Director'],
      triggerCondition: 'Velocity shear ΔV ≥ 15 m/s (30 kt) or F-factor ≥ 0.13 measured along the Runway 01 glidepath.',
      actionChecklist: [
        'Flight Crew: Apply MAXIMUM TOGA THRUST; rotate toward pitch limit; DO NOT change flap or gear configuration.',
        'ATC: Issue immediate directive: "WINDSHEAR ESCAPE MANEUVER REQUIRED, RUNWAY 01 MISSED APPROACH".',
        'Airport Director: Suspend all runway departures; order aircraft tie-downs against 54 kt outflow gusts.',
        'MET Office: Broadcast SPECI METAR warning of active microburst and taxiway flash flooding.',
      ],
    },
    ticker: {
      status: 'MICROBURST DETECTED',
      metric: 'ΔV: 48 m/s (93 kt) // F-FACTOR: 0.18 // CORE: 64.5 dBZ',
      action: 'ACTION: IMMEDIATE WINDSHEAR ESCAPE MANEUVER • RUNWAY GO-AROUND',
      level: 'CRITICAL',
    },
    sopProtocol: 'SOP-07: Low-Level Wind Shear & Microburst Escape Directive',
    problemStatementRef: 'MoES / NCMRWF PS-26084: 3D Runway Glidepath Windshear Nowcasting',
  },

  public: {
    pageId: 'public',
    pageTitle: 'GIS Warning & Citizen Advisory View',
    subtitle: 'Public Warning Interface & Multi-Channel Alert Broadcast',
    badge: 'PUBLIC SAFETY // NDMA CAP',
    whatYouSee: {
      summary: 'Citizen-facing early warning interface delivering clear, multi-lingual severe weather hazard warnings, safe shelter navigation, and civic advisory instructions during active cloudbursts and convective squalls.',
      sensor: {
        name: 'National Disaster Management Authority (NDMA) Integrated CAP Alert Feed',
        specs: 'W3C CAP-1.2 format integrated with telecom cell broadcast and public siren network',
        spatialDomain: 'District-wide municipal coverage with smart city emergency siren zoning',
        resolution: 'Ward and sector level granularity with geolocation-based proximity alerting',
        cadence: 'Instantaneous push broadcast upon operational trigger confirmation',
        parameters: 'Alert Level, Rainfall Rate, Flood Risk, Shelter Locations, Emergency Helplines',
      },
      points: [
        'High-visibility citizen warning cards detailing active convective hazard severity.',
        'Interactive safe shelter locator map routing citizens away from flooded underpasses.',
        'Direct emergency dispatch triggers for civic agencies and municipal first responders.',
        'Multi-lingual alert broadcasts in English, Odia, and Hindi.',
      ],
    },
    howToDecode: {
      summary: 'Public warnings follow international red/orange/yellow color-coded risk communication standards.',
      items: [
        {
          color: '#ef4444',
          label: 'Red Warning (Take Action)',
          range: 'Extreme Flash Flood / Squall',
          meaning: 'Stay indoors, move to higher ground, avoid all low-lying bridges and underpasses.',
        },
        {
          color: '#f59e0b',
          label: 'Orange Alert (Be Prepared)',
          range: 'Severe Thunderstorm',
          meaning: 'Expect power disruptions and localized waterlogging. Secure loose outdoor objects.',
        },
        {
          color: '#eab308',
          label: 'Yellow Watch (Be Aware)',
          range: 'Moderate Thunderstorm',
          meaning: 'Keep updated with official meteorological bulletins. No immediate evacuation needed.',
        },
        {
          color: '#22c55e',
          label: 'Green (Normal)',
          range: 'Nominal Weather',
          meaning: 'Standard meteorological conditions. Regular civic activities permitted.',
        },
      ],
      thresholds: [
        'Red Alert: Rain rate > 100 mm/h or surface wind gusts > 50 kt.',
        'Orange Alert: Rain rate 50–100 mm/h with active lightning.',
      ],
    },
    actionableDecision: {
      level: 'CRITICAL',
      primaryAction: 'ACTIVATE PUBLIC EMERGENCY BROADCAST & EVACUATE LOW-LYING URBAN POCKETS',
      protocol: 'NDMA National Disaster Management Plan Section 6.4',
      stakeholders: ['District Magistrate & Collector', 'Bhubaneswar Municipal Corporation (BMC)', 'State Disaster Management (OSDMA)'],
      triggerCondition: 'Red warning declared with extreme convective rainfall or squall threat confirmed.',
      actionChecklist: [
        'BMC: Sound emergency sirens in vulnerable wards; open pre-designated cyclone and flood shelters.',
        'Telecom: Push bilingual cell broadcast emergency SMS to all mobile subscribers in the municipal zone.',
        'Traffic Police: Close waterlogged underpasses at Jayadev Vihar and Rasulgarh junctions.',
        'Helplines: Activate dedicated 24x7 emergency helpline numbers (1077 / 112).',
      ],
    },
    ticker: {
      status: 'PUBLIC WARNING ACTIVE',
      metric: 'RED ALERT // SECTOR T-NW & T-NE',
      action: 'ACTION: NDMA CAP SIREN BROADCAST DISPATCHED • SHELTERS ACTIVATED',
      level: 'CRITICAL',
    },
    sopProtocol: 'SOP-08: Public Warning & Disaster Evacuation Protocol',
    problemStatementRef: 'MoES / NCMRWF PS-26084: Public Risk Communication & Warning',
  },
  convectnow: {
    pageId: 'convectnow',
    pageTitle: 'ConvectNow NE India Operations Console',
    subtitle: 'Sohra/Cherrapunji 0–6h Convective Nowcasting, Bhuvan WMS & NDMA CAP Gateway',
    badge: 'SIH PS-26084 // 1–3 km NOWCAST',
    whatYouSee: {
      summary: 'National 0–6h convective nowcasting console centered on the Sohra / Cherrapunji escarpment (25.27°N, 91.73°E), merging NRSC Bhuvan State & River Basin boundaries, IMD INSAT-3DR Thermal IR, and RainViewer Doppler radar mosaics over 1–3 km operational grids.',
      sensor: {
        name: 'Bhuvan WMS + IMD INSAT-3DR Thermal IR + RainViewer Radar',
        specs: '10.8 µm TIR-1 Band + S-Band DWR + Bhuvan 1:50,000 WMS Layers',
        spatialDomain: 'Northeast India AOI (23.5°N–27.0°N, 89.5°E–94.0°E) • Sohra Escarpment Center',
        resolution: '1.0 km × 1.0 km native grid resolution with 10 discrete forecast lead times (0–6 hours)',
        cadence: '15-minute INSAT-3DR rapid scan + 10-minute radar volume scan + 60s AWS stream',
        parameters: 'Convective Initiation (CI), Lightning density, Hail probability, Downburst velocity, Cloudburst rate',
      },
      points: [
        'Multi-agency OGC WMS map canvas integrating ISRO NRSC Bhuvan administrative boundaries and Brahmaputra/Barak river basins.',
        'Continuous 0–6 hour forecast lead-time timeline slider with 10 discrete intervals (NOW to +6h).',
        'Interactive 1 km² cell inspection drawer displaying 12 in-situ observations and 5 neural hazard outputs.',
        'Direct NDMA / SDMA Common Alerting Protocol (CAP v1.2) XML/JSON alert dispatch pipeline.',
        'WMO standard verification scorecard modal (CSI: 0.68, POD: 0.88, FAR: 0.16, HSS: 0.72).'
      ],
    },
    howToDecode: {
      summary: 'Color-coded hazard probabilities ranging from green (<30% nominal) to amber (30–60% elevated) and red (>60% severe/critical), paired with Dvorak IR cloud-top thermal thresholds.',
      items: [
        {
          color: '#22c55e',
          label: 'Nominal / Low Convection',
          range: '< 30% Probability',
          meaning: 'Background atmospheric moisture; no severe convective initiation or cloudburst threat.',
        },
        {
          color: '#eab308',
          label: 'Elevated Convection Watch',
          range: '30%–60% Probability',
          meaning: 'Developing updraft; rapid cloud-top cooling (<-0.25 K/min); moderate lightning potential.',
        },
        {
          color: '#ef4444',
          label: 'Severe Cloudburst Warning',
          range: '> 60% Probability',
          meaning: 'Deep convection over steep terrain; extreme rainfall rate (>100 mm/h); flash flood potential.',
        },
        {
          color: '#8b5cf6',
          label: 'Deep Convective Overshooting Top',
          range: '< 200 K IR BT',
          meaning: 'Severe cloud-top penetrating tropopause into lower stratosphere; intense hail and downdrafts.',
        },
      ],
      vectors: [
        'Solid cyan vectors: Cell trajectory vectors displaying convective translation speed (km/h) and azimuth bearing towards downstream river catchments.',
      ],
      thresholds: [
        'Cloudburst: Rainfall rate > 100 mm/h within 1 hour across a localized 10–30 km² area.',
        'Schultz Lightning Jump: Flash rate increase > 2σ (typically >40 flashes/min) indicating impending severe downburst.',
      ],
    },
    actionableDecision: {
      level: 'CRITICAL',
      primaryAction: 'ISSUE NDMA CAP v1.2 FLASH FLOOD EMERGENCY BROADCAST & PRE-ACTIVATE BASIN DRAINAGE',
      protocol: 'MoES PS-26084 Severe Convection Standard Operating Procedure',
      stakeholders: ['Meghalaya State Disaster Management Authority (SDMA)', 'Central Water Commission (CWC)', 'District Administration'],
      triggerCondition: 'Cloudburst probability > 60% or rain rate > 100 mm/h projected within 30 minutes.',
      actionChecklist: [
        'Dispatch bilingual CAP v1.2 XML payload to NDMA Sachet National Disaster Alert Gateway.',
        'Trigger local siren networks in vulnerable escarpment villages (Mawsynram, Sohra, Shella).',
        'CWC: Issue immediate flash flood advisory for downstream Barak and Sylhet plain catchments.',
        'District Police: Restrict vehicular movement on vulnerable NH-206 hill slopes prone to landslides.',
      ],
    },
    ticker: {
      status: 'NE INDIA NOWCAST ACTIVE',
      metric: 'SOHRA SEVERE CLOUDBURST RISK 73%',
      action: 'ACTION: NDMA CAP SIREN BROADCAST DISPATCHED • BASIN DRAINAGE PRE-ACTIVATED',
      level: 'CRITICAL',
    },
    sopProtocol: 'SOP-09: Northeast India Convective Nowcasting & Flash Flood Protocol',
    problemStatementRef: 'MoES / NCMRWF PS-26084: 0–6h Real-Time Convective Nowcasting System',
  },
};
