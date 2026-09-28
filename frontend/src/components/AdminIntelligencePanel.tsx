import React, { useState, useMemo } from 'react';
import { 
  Radio, 
  ShieldAlert, 
  Users, 
  Building2, 
  Truck, 
  AlertTriangle, 
  Send, 
  CheckCircle2, 
  ArrowRight, 
  PhoneCall, 
  Activity, 
  Wind, 
  CloudRain, 
  Sparkles,
  Compass,
  Zap,
  Info,
  Layers,
  MapPin,
  ChevronRight
} from 'lucide-react';
import { 
  StormCell, 
  DispatchedAlert, 
  SettlementTypology, 
  SETTLEMENT_PROFILES, 
  FALLBACK_STORM_CELLS,
  calculateImpactedDemographics,
  calculateBuildingVulnerability,
  calculateBattalionProximity,
  createDispatchedAlert
} from '../types/dispatch';
import { DataProvenanceBadge } from './DataProvenanceBadge';

export interface AdminIntelligencePanelProps {
  selectedCell: StormCell | any;
  availableCells?: (StormCell | any)[];
  onSelectCell?: (cell: any) => void;
  activeDispatchedAlert?: DispatchedAlert | null;
  onDispatchAlert?: (alert: DispatchedAlert) => void;
  onSwitchToCitizenView?: () => void;
  className?: string;
}

export const AdminIntelligencePanel: React.FC<AdminIntelligencePanelProps> = ({
  selectedCell: rawSelectedCell,
  availableCells: rawAvailableCells,
  onSelectCell,
  activeDispatchedAlert,
  onDispatchAlert,
  onSwitchToCitizenView,
  className = ''
}) => {
  // Normalize available cells
  const availableCells: StormCell[] = useMemo(() => {
    if (rawAvailableCells && rawAvailableCells.length > 0) {
      return rawAvailableCells.map((c, idx) => {
        const fallback = FALLBACK_STORM_CELLS[idx % FALLBACK_STORM_CELLS.length];
        return {
          cell_id: c.cell_id || fallback.cell_id,
          centroid_lat: c.centroid_lat ?? fallback.centroid_lat,
          centroid_lon: c.centroid_lon ?? fallback.centroid_lon,
          area_km2: c.area_km2 ?? fallback.area_km2,
          peak_dbz: c.peak_dbz ?? c.max_dbz ?? fallback.peak_dbz,
          mean_dbz: c.mean_dbz ?? fallback.mean_dbz,
          velocity_kmh: c.velocity_kmh ?? fallback.velocity_kmh,
          heading_deg: c.heading_deg ?? fallback.heading_deg,
          severity: c.severity ?? fallback.severity,
          eta_minutes: c.eta_minutes ?? fallback.eta_minutes,
          hazards: {
            rain_rate_mmh: c.hazards?.rain_rate_mmh ?? fallback.hazards.rain_rate_mmh,
            cloudburst_flag: c.hazards?.cloudburst_flag ?? fallback.hazards.cloudburst_flag,
            posh_percent: c.hazards?.posh_percent ?? fallback.hazards.posh_percent,
            mesh_hail_mm: c.hazards?.mesh_hail_mm ?? fallback.hazards.mesh_hail_mm,
            downburst_gust_kmh: c.hazards?.downburst_gust_kmh ?? fallback.hazards.downburst_gust_kmh,
            lightning_density: c.hazards?.lightning_density ?? fallback.hazards.lightning_density,
            explainability: c.hazards?.explainability ?? fallback.hazards.explainability
          },
          target_etas: c.target_etas ?? fallback.target_etas,
          evolution: c.evolution ?? fallback.evolution
        };
      });
    }
    return FALLBACK_STORM_CELLS;
  }, [rawAvailableCells]);

  // Current active storm cell
  const currentCell: StormCell = useMemo(() => {
    if (rawSelectedCell) {
      const match = availableCells.find(c => c.cell_id === rawSelectedCell.cell_id);
      if (match) return match;
      const fallback = FALLBACK_STORM_CELLS[0];
      return {
        cell_id: rawSelectedCell.cell_id || fallback.cell_id,
        centroid_lat: rawSelectedCell.centroid_lat ?? fallback.centroid_lat,
        centroid_lon: rawSelectedCell.centroid_lon ?? fallback.centroid_lon,
        area_km2: rawSelectedCell.area_km2 ?? fallback.area_km2,
        peak_dbz: rawSelectedCell.peak_dbz ?? rawSelectedCell.max_dbz ?? fallback.peak_dbz,
        mean_dbz: rawSelectedCell.mean_dbz ?? fallback.mean_dbz,
        velocity_kmh: rawSelectedCell.velocity_kmh ?? fallback.velocity_kmh,
        heading_deg: rawSelectedCell.heading_deg ?? fallback.heading_deg,
        severity: rawSelectedCell.severity ?? fallback.severity,
        eta_minutes: rawSelectedCell.eta_minutes ?? fallback.eta_minutes,
        hazards: {
          rain_rate_mmh: rawSelectedCell.hazards?.rain_rate_mmh ?? fallback.hazards.rain_rate_mmh,
          cloudburst_flag: rawSelectedCell.hazards?.cloudburst_flag ?? fallback.hazards.cloudburst_flag,
          posh_percent: rawSelectedCell.hazards?.posh_percent ?? fallback.hazards.posh_percent,
          mesh_hail_mm: rawSelectedCell.hazards?.mesh_hail_mm ?? fallback.hazards.mesh_hail_mm,
          downburst_gust_kmh: rawSelectedCell.hazards?.downburst_gust_kmh ?? fallback.hazards.downburst_gust_kmh,
          lightning_density: rawSelectedCell.hazards?.lightning_density ?? fallback.hazards.lightning_density,
          explainability: rawSelectedCell.hazards?.explainability ?? fallback.hazards.explainability
        },
        target_etas: rawSelectedCell.target_etas ?? fallback.target_etas,
        evolution: rawSelectedCell.evolution ?? fallback.evolution
      };
    }
    return availableCells[0] || FALLBACK_STORM_CELLS[0];
  }, [rawSelectedCell, availableCells]);

  // Settlement typology selector
  const [selectedSettlement, setSelectedSettlement] = useState<SettlementTypology>('MDU');
  // Broadcast radius selector (5, 15, 25, 50 km)
  const [broadcastRadiusKm, setBroadcastRadiusKm] = useState<number>(25);
  // Dispatch feedback state
  const [justDispatched, setJustDispatched] = useState<boolean>(false);
  // Contacted radio station indicator
  const [radioFeedback, setRadioFeedback] = useState<string | null>(null);

  // Dynamic calculations
  const demographics = useMemo(() => {
    return calculateImpactedDemographics(currentCell, currentCell.eta_minutes ?? 20, selectedSettlement);
  }, [currentCell, selectedSettlement]);

  const buildingVulnerability = useMemo(() => {
    return calculateBuildingVulnerability(demographics, currentCell.hazards, selectedSettlement);
  }, [demographics, currentCell.hazards, selectedSettlement]);

  const nearbyBattalions = useMemo(() => {
    return calculateBattalionProximity(currentCell.centroid_lat, currentCell.centroid_lon, selectedSettlement === 'HLY');
  }, [currentCell.centroid_lat, currentCell.centroid_lon, selectedSettlement]);

  // Handle Dispatch Broadcast
  const handleDispatch = () => {
    const alert = createDispatchedAlert(currentCell, broadcastRadiusKm, selectedSettlement);
    if (onDispatchAlert) {
      onDispatchAlert(alert);
    }
    setJustDispatched(true);
    setTimeout(() => setJustDispatched(false), 8000);
  };

  const handleCallRadio = (bnName: string, channel: string) => {
    setRadioFeedback(`Transmitting to ${bnName} on ${channel}... Standby acknowledged.`);
    setTimeout(() => setRadioFeedback(null), 4500);
  };

  const isCloudburst = currentCell.hazards.cloudburst_flag || currentCell.hazards.rain_rate_mmh >= 100;
  const isSevereHail = currentCell.hazards.posh_percent >= 60;
  const isHighGust = currentCell.hazards.downburst_gust_kmh >= 80;

  return (
    <div className={`card-blizzard p-4 flex flex-col h-full shadow-blizzard-card border border-white/[0.12] overflow-y-auto custom-scrollbar space-y-4 ${className}`}>
      
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.12] shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#1888ef] to-[#38a8ff] flex items-center justify-center shadow-[0_0_12px_rgba(56,168,255,0.4)]">
            <Radio className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-xs font-display font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <span>SDMA Intelligence & Alert Dispatch</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              MoES Early Warning & Civil Defence Network
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <DataProvenanceBadge source="LIVE" />
          <span className="text-[10px] font-mono bg-[#111729] text-[#1aaaff] px-2.5 py-0.5 rounded-full border border-[#1aaaff]/30 font-bold">
            NDMA CAP v1.2
          </span>
        </div>
      </div>

      {/* Confirmation Banner when Alert Dispatched */}
      {(justDispatched || activeDispatchedAlert?.cellId === currentCell.cell_id) && (
        <div className="bg-gradient-to-r from-red-950/90 via-[#18233a] to-emerald-950/80 border-2 border-emerald-500/70 p-3 rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.3)] animate-in fade-in duration-300">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-600/50">
                  ALERT BROADCAST ACTIVE
                </span>
                <h4 className="text-xs font-bold text-white mt-1">
                  Pushed to SDMA Emergency Network & Mausam App
                </h4>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Target corridor: <strong className="text-white">{currentCell.cell_id} ({broadcastRadiusKm} km radius)</strong> · {demographics.totalExposedPopulation.toLocaleString()} citizens alerted.
                </p>
              </div>
            </div>
            {onSwitchToCitizenView && (
              <button
                onClick={onSwitchToCitizenView}
                className="btn-blizzard-primary text-[11px] px-3 py-1.5 flex items-center space-x-1 shrink-0 ml-2 shadow-[0_0_15px_rgba(56,168,255,0.4)]"
              >
                <span>Preview in Mausam App</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Radio Communication Toast */}
      {radioFeedback && (
        <div className="bg-ocean-950/90 border border-[#38a8ff]/60 p-2.5 rounded-xl text-xs text-[#d0e9ff] font-mono flex items-center space-x-2 animate-in fade-in">
          <Activity className="w-4 h-4 text-[#1aaaff] animate-pulse" />
          <span>{radioFeedback}</span>
        </div>
      )}

      {/* Storm Cell Selector & Core Telemetry Strip */}
      <div className="bg-[#111729]/90 border border-white/[0.1] rounded-2xl p-3 space-y-2.5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#1aaaff]" />
            <span>Active Storm Cell Selection</span>
          </span>
          <span className="text-[10px] font-mono text-slate-500">
            {availableCells.length} cells tracked
          </span>
        </div>

        {/* Cell Selector Pills */}
        <div className="flex flex-wrap gap-2">
          {availableCells.map((cell) => {
            const isSelected = cell.cell_id === currentCell.cell_id;
            const isCellExtreme = cell.hazards.cloudburst_flag || cell.peak_dbz >= 64;
            return (
              <button
                key={cell.cell_id}
                onClick={() => onSelectCell && onSelectCell(cell)}
                className={`px-3 py-1.5 rounded-full text-xs font-mono transition-all flex items-center space-x-2 border ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#1aaaff] to-[#1aaaff] text-white font-bold border-white/40 shadow-[0_0_15px_rgba(56,168,255,0.4)]'
                    : 'bg-ocean-900/80 text-slate-300 border-white/10 hover:border-[#38a8ff]/40 hover:text-white'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isCellExtreme ? 'bg-red-400 animate-pulse' : 'bg-amber-400'}`} />
                <span>{cell.cell_id}</span>
                <span className="text-[10px] opacity-80 font-normal">({cell.peak_dbz} dBZ)</span>
              </button>
            );
          })}
        </div>

        {/* Selected Cell Core Telemetry Bar */}
        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/[0.08] text-center font-mono">
          <div className="bg-ocean-950/60 p-2 rounded-xl border border-white/5">
            <span className="text-[9px] text-slate-400 block uppercase">Core dBZ</span>
            <span className={`text-sm font-black ${currentCell.peak_dbz >= 65 ? 'text-red-400' : 'text-amber-400'}`}>
              {currentCell.peak_dbz} dBZ
            </span>
          </div>
          <div className="bg-ocean-950/60 p-2 rounded-xl border border-white/5">
            <span className="text-[9px] text-slate-400 block uppercase">Ground Speed</span>
            <span className="text-sm font-bold text-white">
              {currentCell.velocity_kmh} km/h
            </span>
          </div>
          <div className="bg-ocean-950/60 p-2 rounded-xl border border-white/5">
            <span className="text-[9px] text-slate-400 block uppercase">Heading</span>
            <span className="text-sm font-bold text-[#1aaaff] flex items-center justify-center gap-0.5">
              <Compass className="w-3 h-3" />
              {currentCell.heading_deg}°
            </span>
          </div>
          <div className="bg-ocean-950/60 p-2 rounded-xl border border-white/5">
            <span className="text-[9px] text-slate-400 block uppercase">Rain Rate</span>
            <span className={`text-sm font-bold ${isCloudburst ? 'text-red-400' : 'text-amber-300'}`}>
              {currentCell.hazards.rain_rate_mmh.toFixed(0)} mm/h
            </span>
          </div>
        </div>
      </div>

      {/* Demographic Risk Assessment Section */}
      <div className="bg-[#111729]/90 border border-white/[0.1] rounded-2xl p-3.5 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-[#1aaaff]" />
            <h4 className="text-xs font-display font-bold uppercase tracking-wider text-white">
              Demographic Risk & Population Exposure
            </h4>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
            demographics.severityTier === 'EMERGENCY' 
              ? 'bg-red-950/90 text-red-300 border-red-500/70 animate-pulse'
              : demographics.severityTier === 'CRITICAL'
              ? 'bg-amber-950/80 text-amber-300 border-amber-500/60'
              : 'bg-blue-950/80 text-blue-300 border-blue-500/60'
          }`}>
            {demographics.severityTier} TIER
          </span>
        </div>

        {/* Settlement Typology Selector */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[10px] font-mono">
          <span className="text-slate-400 shrink-0 uppercase text-[9px]">Sector:</span>
          {(Object.keys(SETTLEMENT_PROFILES) as SettlementTypology[]).map((type) => {
            const isSelected = selectedSettlement === type;
            return (
              <button
                key={type}
                onClick={() => setSelectedSettlement(type)}
                className={`px-2 py-1 rounded-lg shrink-0 transition-all border ${
                  isSelected
                    ? 'bg-[#38a8ff]/20 text-[#1aaaff] border-[#38a8ff]/60 font-bold'
                    : 'bg-ocean-950/60 text-slate-400 border-white/5 hover:text-white'
                }`}
                title={SETTLEMENT_PROFILES[type].description}
              >
                {type}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-400 italic font-sans leading-tight">
          Current: <strong className="text-slate-200">{SETTLEMENT_PROFILES[selectedSettlement].label}</strong> ({SETTLEMENT_PROFILES[selectedSettlement].baseDensityPerKm2.toLocaleString()} citizens/km²).
        </p>

        {/* 3 Demographic Stat Cards */}
        <div className="grid grid-cols-3 gap-2 text-left">
          <div className="bg-ocean-950/80 p-2.5 rounded-xl border border-white/5">
            <span className="text-[9px] text-slate-400 uppercase font-mono block">Impact Corridor</span>
            <div className="text-lg font-black font-mono text-white mt-0.5">
              {demographics.totalExposedPopulation.toLocaleString()}
            </div>
            <span className="text-[9px] text-[#1aaaff] font-mono">
              {demographics.footprintAreaKm2} km² corridor
            </span>
          </div>

          <div className="bg-ocean-950/80 p-2.5 rounded-xl border border-amber-500/20">
            <span className="text-[9px] text-amber-300/80 uppercase font-mono block">Critical Jeopardy</span>
            <div className="text-lg font-black font-mono text-amber-300 mt-0.5">
              {demographics.criticalJeopardyPopulation.toLocaleString()}
            </div>
            <span className="text-[9px] text-slate-400 font-mono">
              {Math.round(demographics.severityFactor * 100)}% severity index
            </span>
          </div>

          <div className="bg-ocean-950/80 p-2.5 rounded-xl border border-red-500/30">
            <span className="text-[9px] text-red-300/80 uppercase font-mono block">Urgent Evacuation</span>
            <div className="text-lg font-black font-mono text-red-400 mt-0.5">
              {demographics.recommendedEvacuationCount.toLocaleString()}
            </div>
            <span className="text-[9px] text-red-300/70 font-mono">
              High-risk dwellings
            </span>
          </div>
        </div>

        {/* High-Risk Demographics Breakdown */}
        <div className="bg-ocean-950/60 p-2.5 rounded-xl border border-white/5 text-[11px] font-mono space-y-1.5">
          <div className="flex justify-between text-slate-300">
            <span className="text-slate-400">Kutcha / Slum Dwellers:</span>
            <strong className="text-red-300">{demographics.highRiskDemographics.kutchaDwellers.toLocaleString()} persons</strong>
          </div>
          <div className="flex justify-between text-slate-300">
            <span className="text-slate-400">Low-lying Drainage Submergence:</span>
            <strong className="text-amber-300">{demographics.highRiskDemographics.lowLyingDrainageZone.toLocaleString()} persons</strong>
          </div>
          <div className="flex justify-between text-slate-300">
            <span className="text-slate-400">Vulnerable Elderly & Children:</span>
            <strong className="text-white">{demographics.highRiskDemographics.elderlyAndChildren.toLocaleString()} persons</strong>
          </div>
        </div>
      </div>

      {/* Building Structural Vulnerability (BMTPC / NDMA 4-Tier Matrix) */}
      <div className="bg-[#111729]/90 border border-white/[0.1] rounded-2xl p-3.5 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-display font-bold uppercase tracking-wider text-white">
              BMTPC Structural Building Vulnerability
            </h4>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            ~{buildingVulnerability.totalEstimatedStructures.toLocaleString()} structures
          </span>
        </div>

        <div className="space-y-2">
          {/* Type A: Kutcha / Slums */}
          <div className="bg-ocean-950/80 p-2.5 rounded-xl border border-red-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-300 font-heading">
                {buildingVulnerability.typeA_kutcha.typeName}
              </span>
              <span className="text-[10px] font-mono font-bold bg-red-950 text-red-400 px-2 py-0.5 rounded border border-red-700/60">
                {buildingVulnerability.typeA_kutcha.failureRiskPct}% FAILURE RISK
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {buildingVulnerability.typeA_kutcha.description} ({buildingVulnerability.typeA_kutcha.structureCount.toLocaleString()} units)
            </p>
            <div className="w-full bg-ocean-900 h-1.5 rounded-full overflow-hidden mt-1.5 border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-red-600 to-rose-400 transition-all duration-500" 
                style={{ width: `${buildingVulnerability.typeA_kutcha.failureRiskPct}%` }}
              />
            </div>
            <span className="text-[9px] text-red-300/80 font-mono block mt-1">
              Threat: {buildingVulnerability.typeA_kutcha.primaryFailureMode}
            </span>
          </div>

          {/* Type B: Semi-Pucca */}
          <div className="bg-ocean-950/80 p-2.5 rounded-xl border border-amber-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 font-heading">
                {buildingVulnerability.typeB_semiPucca.typeName}
              </span>
              <span className="text-[10px] font-mono font-bold bg-amber-950 text-amber-400 px-2 py-0.5 rounded border border-amber-700/60">
                {buildingVulnerability.typeB_semiPucca.failureRiskPct}% DAMAGE RISK
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {buildingVulnerability.typeB_semiPucca.description} ({buildingVulnerability.typeB_semiPucca.structureCount.toLocaleString()} units)
            </p>
            <div className="w-full bg-ocean-900 h-1.5 rounded-full overflow-hidden mt-1.5 border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-amber-600 to-yellow-400 transition-all duration-500" 
                style={{ width: `${buildingVulnerability.typeB_semiPucca.failureRiskPct}%` }}
              />
            </div>
            <span className="text-[9px] text-amber-300/80 font-mono block mt-1">
              Threat: {buildingVulnerability.typeB_semiPucca.primaryFailureMode}
            </span>
          </div>

          {/* Type C: Engineered Pucca RCC */}
          <div className="bg-ocean-950/80 p-2.5 rounded-xl border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 font-heading">
                {buildingVulnerability.typeC_puccaRcc.typeName}
              </span>
              <span className="text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-700/60">
                {buildingVulnerability.typeC_puccaRcc.failureRiskPct}% INUNDATION RISK
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {buildingVulnerability.typeC_puccaRcc.description} ({buildingVulnerability.typeC_puccaRcc.structureCount.toLocaleString()} units)
            </p>
            <span className="text-[9px] text-slate-400 font-mono block mt-1">
              Threat: {buildingVulnerability.typeC_puccaRcc.primaryFailureMode}
            </span>
          </div>

          {/* Type D: Lifeline Infrastructure Assets */}
          <div className="bg-ocean-950/60 p-2.5 rounded-xl border border-white/5 text-[11px] font-mono space-y-1.5">
            <span className="text-[10px] uppercase text-[#1aaaff] font-bold block">
              Type D Lifeline Infrastructure Assets:
            </span>
            {buildingVulnerability.typeD_lifeline.assets.map((asset, i) => (
              <div key={i} className="flex items-center justify-between text-[10px] border-b border-white/5 pb-1 last:border-none">
                <span className="text-slate-300 truncate max-w-[210px]">{asset.name}</span>
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 ${
                  asset.status === 'CRITICAL_STANDBY'
                    ? 'bg-red-950 text-red-400 border border-red-600/40'
                    : asset.status === 'AT_RISK'
                    ? 'bg-amber-950 text-amber-300 border border-amber-600/40'
                    : 'bg-emerald-950 text-emerald-400 border border-emerald-600/40'
                }`}>
                  {asset.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Real-World NDRF / SDRF Battalions Proximity Table */}
      <div className="bg-[#111729]/90 border border-white/[0.1] rounded-2xl p-3.5 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Truck className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-display font-bold uppercase tracking-wider text-white">
              NDRF / SDRF Deployment Proximity (Road Route)
            </h4>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
            {nearbyBattalions.length} Bases Ranked
          </span>
        </div>

        <div className="space-y-2">
          {nearbyBattalions.slice(0, 3).map((item, idx) => {
            const bn = item.battalion;
            return (
              <div 
                key={bn.id}
                className="bg-ocean-950/80 p-2.5 rounded-xl border border-white/5 hover:border-[#1aaaff]/30 transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] font-mono font-bold bg-[#1888ef]/20 text-[#1aaaff] px-1.5 py-0.5 rounded border border-[#1aaaff]/30">
                      #{idx + 1}
                    </span>
                    <strong className="text-xs font-heading text-white">{bn.name}</strong>
                  </div>
                  <span className="text-xs font-mono font-black text-emerald-400">
                    ETA {item.totalEtaMinutes} min
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>📍 {bn.baseLocation}, {bn.state}</span>
                  <span className="text-[#1aaaff] font-bold">{item.roadDistanceKm} km road</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[9px] font-mono">
                  <span className="text-slate-300">
                    {bn.activeQrtTeams} QRT Teams ({bn.personnelStrength} pax)
                  </span>
                  <button
                    onClick={() => handleCallRadio(bn.name, bn.contactRadio)}
                    className="px-2 py-1 rounded bg-ocean-800 hover:bg-[#1888ef] text-white transition-colors flex items-center space-x-1 border border-white/10"
                    title={`Call on ${bn.contactRadio} or ${bn.hotlinePhone}`}
                  >
                    <PhoneCall className="w-2.5 h-2.5 text-[#1aaaff]" />
                    <span>Radio Net</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Broadcast Radius Selector & Primary Dispatch Action */}
      <div className="bg-gradient-to-b from-[#131928] to-[#0a0d15] border-2 border-red-500/40 rounded-2xl p-4 space-y-3.5 shadow-[0_4px_30px_rgba(239,68,68,0.15)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Send className="w-4 h-4 text-red-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-white font-display">
              Target Broadcast Radius
            </span>
          </div>
          <div className="flex items-center space-x-1 font-mono text-[11px]">
            {[5, 15, 25, 50].map((r) => (
              <button
                key={r}
                onClick={() => setBroadcastRadiusKm(r)}
                className={`px-2.5 py-1 rounded-full border transition-all ${
                  broadcastRadiusKm === r
                    ? 'bg-red-600 text-white font-bold border-white/30 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                    : 'bg-ocean-950 text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                {r}km
              </button>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
          Broadcasting to <strong className="text-white">{broadcastRadiusKm} km radius</strong> covers {demographics.totalExposedPopulation.toLocaleString()} citizens in the {currentCell.cell_id} impact corridor. Dispatches immediate NDMA SOPs, ETA clocks, and shelter routing to all citizen handsets via the Mausam App.
        </p>

        {/* Primary Action Button */}
        <button
          onClick={handleDispatch}
          className="w-full py-3.5 px-6 rounded-full font-display font-bold uppercase tracking-wider text-xs text-white bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 shadow-[0_0_30px_rgba(239,68,68,0.5)] border-2 border-white/30 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center space-x-2.5"
        >
          <AlertTriangle className="w-4 h-4 text-white animate-bounce" />
          <span>Dispatch Alert & Broadcast to Mausam App</span>
        </button>

        {/* Quick Shortcut to Citizen View if alert is active */}
        {onSwitchToCitizenView && (
          <div className="text-center pt-1">
            <button
              onClick={onSwitchToCitizenView}
              className="text-[11px] font-mono text-[#1aaaff] hover:text-white underline underline-offset-4 flex items-center justify-center gap-1 mx-auto transition-colors"
            >
              <span>Preview in Mausam App (Citizen POV)</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

    </div>
  );
};
