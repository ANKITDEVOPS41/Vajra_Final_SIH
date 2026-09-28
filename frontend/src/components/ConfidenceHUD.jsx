import React from 'react';
import { ShieldCheck, Database, TrendingUp, TrendingDown, Activity, AlertTriangle, Clock } from 'lucide-react';

const FreshnessIndicator = ({ source, ageMinutes, status }) => {
  const getStatusColor = () => {
    if (status === 'OFFLINE') return 'text-red-500 bg-red-500/10 border-red-500/30';
    if (ageMinutes > 15) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
    return 'text-green-400 bg-green-400/10 border-green-400/30';
  };

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
      <span className="text-xs font-mono text-gray-300">{source}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-gray-400">{status === 'OFFLINE' ? '--' : `${ageMinutes}m`}</span>
        <div className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusColor()}`}>
          {status}
        </div>
      </div>
    </div>
  );
};

const EvidenceRow = ({ factor, trend, impact }) => {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        {trend === 'up' ? <TrendingUp size={14} className="text-red-400" /> : <TrendingDown size={14} className="text-green-400" />}
        <span className="text-xs text-gray-300">{factor}</span>
      </div>
      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
        impact === 'high' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-[#38a8ff]/20 text-[#38a8ff] border-[#38a8ff]/30'
      }`}>
        {impact.toUpperCase()} IMPACT
      </span>
    </div>
  );
};

// NEW COMPONENT: Horizon Degradation Warning
const ForecastHorizonWarning = ({ targetEtaMinutes }) => {
  const isResearchPhase = targetEtaMinutes > 120;
  
  return (
    <div className={`mt-4 p-3 rounded-lg border ${isResearchPhase ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
      <div className="flex items-center gap-2 mb-1">
        <Clock size={16} className={isResearchPhase ? 'text-yellow-400' : 'text-green-400'} />
        <span className={`text-xs font-bold ${isResearchPhase ? 'text-yellow-400' : 'text-green-400'}`}>
          {isResearchPhase ? '2-6H STRATEGIC WINDOW' : '0-2H TACTICAL WINDOW'}
        </span>
      </div>
      <p className="text-[10px] text-gray-300 leading-tight">
        {isResearchPhase 
          ? "WARNING: Forecast exceeds optical flow reliability (120m). Relying on deep learning Research Arm. Model trained on US morphology; calibration for Indian orographics pending."
          : "STATUS: High Reliability. Driven by Optical Flow + real-time precursor fusion."}
      </p>
    </div>
  );
};

const ConfidenceHUD = ({ selectedCell }) => {
  if (!selectedCell) {
    return (
      <div className="card-blizzard p-6 rounded-2xl flex flex-col items-center justify-center border-dashed border-2 border-[#38a8ff]/30 h-full opacity-70">
        <Activity size={24} className="text-[#38a8ff] mb-2" />
        <p className="text-sm font-mono text-[#38a8ff]">SELECT A CELL</p>
        <p className="text-xs text-gray-400 mt-1 text-center">Click a storm cell to view explainability data.</p>
      </div>
    );
  }

  // Simulated target ETA for demonstration (in reality, passed down from clicked target)
  const simulatedEta = selectedCell.id === 'CELL-A17' ? 45 : 180; 

  const { id, confidence_score, hazards, freshness, evidence } = selectedCell;
  
  // Degrade confidence artificially if ETA > 2 hours due to domain gap
  const finalConfidence = simulatedEta > 120 ? Math.min(confidence_score, 0.45) : confidence_score;
  const isHighConfidence = finalConfidence > 0.8;
  const isMediumConfidence = finalConfidence > 0.4 && finalConfidence <= 0.8;

  return (
    <div className="w-[380px] pointer-events-auto flex flex-col h-full max-h-[95vh] gap-4">
      
      {/* 1. Main Prediction & Confidence Card */}
      <div className="card-blizzard p-5 rounded-2xl border-t-4 border-t-[#38a8ff]">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="text-lg font-heading font-bold text-white leading-tight">AI Explainability</h2>
            <p className="text-xs font-mono text-[#38a8ff] mt-0.5">{id} ANALYSIS</p>
          </div>
          <ShieldCheck size={24} className={isHighConfidence ? "text-green-400" : isMediumConfidence ? "text-yellow-400" : "text-red-400"} />
        </div>

        <ForecastHorizonWarning targetEtaMinutes={simulatedEta} />

        <div className="bg-black/40 rounded-lg p-3 border border-white/5 flex items-center justify-between my-4">
          <span className="text-sm text-gray-300 font-semibold">Overall Confidence</span>
          <div className="flex items-center gap-2">
            <span className={`font-mono text-lg font-bold ${isHighConfidence ? "text-green-400" : isMediumConfidence ? "text-yellow-400" : "text-red-400"}`}>
              {Math.round(finalConfidence * 100)}%
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded border ${
              isHighConfidence ? "bg-green-400/10 border-green-400/30 text-green-400" : 
              isMediumConfidence ? "bg-yellow-400/10 border-yellow-400/30 text-yellow-400" : 
              "bg-red-400/10 border-red-400/30 text-red-400"
            }`}>
              {isHighConfidence ? 'HIGH' : isMediumConfidence ? 'MODERATE' : 'RESEARCH'}
            </span>
          </div>
        </div>
        
        {/* Hazard Breakdown */}
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(hazards).map(([hazard, prob]) => (
            <div key={hazard} className="bg-white/5 rounded p-2 flex flex-col items-center justify-center border border-white/5">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{hazard}</span>
              <span className={`font-mono font-bold ${prob > 0.6 ? 'text-red-400' : 'text-white'}`}>
                {Math.round(prob * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Why Did Risk Increase? (Evidence Ledger) */}
      <div className="card-blizzard p-5 rounded-2xl">
        <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
          <AlertTriangle size={16} className="text-yellow-500" />
          WHY DID RISK INCREASE?
        </h3>
        <div className="space-y-1">
          {evidence.map((ev, idx) => (
            <EvidenceRow key={idx} factor={ev.factor} trend={ev.trend} impact={ev.impact} />
          ))}
        </div>
      </div>

      {/* 3. Data Freshness Ledger */}
      <div className="card-blizzard p-5 rounded-2xl">
        <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
          <Database size={16} className="text-[#38a8ff]" />
          DATA FRESHNESS LEDGER
        </h3>
        <div className="bg-black/30 rounded-lg p-2 border border-white/5">
          {Object.entries(freshness).map(([source, data]) => (
            <FreshnessIndicator key={source} source={source.toUpperCase()} ageMinutes={data.age} status={data.status} />
          ))}
        </div>
      </div>

    </div>
  );
};

export default ConfidenceHUD;
