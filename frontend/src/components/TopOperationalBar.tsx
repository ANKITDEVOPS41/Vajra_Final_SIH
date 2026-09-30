import React, { useState, useEffect } from 'react';
import { Radar, Radio, Database, History, Layers, AlertTriangle, Award, Send } from 'lucide-react';
import { DataQuality } from '../types';

interface TopOperationalBarProps {
  isLiveMode: boolean;
  isReplayActive: boolean;
  onToggleReplay: () => void;
  onToggleLayers: () => void;
  onOpenVerification?: () => void;
  onOpenCapModal?: () => void;
  isLayerDrawerOpen: boolean;
  dataQuality: DataQuality;
}

export const TopOperationalBar: React.FC<TopOperationalBarProps> = ({
  isLiveMode,
  isReplayActive,
  onToggleReplay,
  onToggleLayers,
  onOpenVerification,
  onOpenCapModal,
  isLayerDrawerOpen,
  dataQuality,
}) => {
  const [utcTime, setUtcTime] = useState<string>('');
  const [istTime, setIstTime] = useState<string>('');

  useEffect(() => {
    const updateClocks = () => {
      const now = new Date();
      // UTC (Zulu)
      const uHours = String(now.getUTCHours()).padStart(2, '0');
      const uMinutes = String(now.getUTCMinutes()).padStart(2, '0');
      const uSeconds = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`${uHours}:${uMinutes}:${uSeconds} Z`);

      // IST (UTC + 5:30)
      const istDate = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
      const iHours = String(istDate.getUTCHours()).padStart(2, '0');
      const iMinutes = String(istDate.getUTCMinutes()).padStart(2, '0');
      const iSeconds = String(istDate.getUTCSeconds()).padStart(2, '0');
      setIstTime(`${iHours}:${iMinutes}:${iSeconds}`);
    };

    updateClocks();
    const interval = setInterval(updateClocks, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-[72px] bg-[#08090a]/72 border-b border-[#23252a] backdrop-blur-xl px-6 flex items-center justify-between z-30 select-none">
      {/* Brand & Mission Badge */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl    flex items-center justify-center   ">
          <Radar className="w-5 h-5 text-[#f7f8f8]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold tracking-wider text-[#f7f8f8] font-mono">CONVECTNOW</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1b1d] border border-[#34343a] text-[#828fff] font-mono font-medium">
              SIH PS-26084
            </span>
          </div>
          <p className="text-[10px] text-[#d0d6e0] font-mono tracking-tight">
            0–6h NORTHEAST CONVECTIVE NOWCASTING · SOHRA RADAR 25.27°N 91.73°E
          </p>
        </div>
      </div>

      {/* Center: System Status & Data Mode & Latencies */}
      <div className="hidden xl:flex items-center gap-2.5 flex-shrink min-w-0">
        {/* System Beacon */}
        <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#4cb782]/12 border border-[#4cb782]/20 text-[#4cb782] text-xs font-mono flex-shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4cb782] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4cb782]"></span>
          </span>
          <span className="font-semibold tracking-wide">ACTIVE NOWCASTING</span>
        </div>

        {/* Live vs Historical Mode Badge */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono transition-colors flex-shrink-0 ${
            isLiveMode
              ? 'bg-blue-950/40 border-blue-500/40 text-blue-300'
              : 'bg-[#08090a]/60 border-slate-500/40 text-[#f7f8f8]'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>{isLiveMode ? 'LIVE SENSORS' : 'HISTORICAL FALLBACK'}</span>
        </div>

        {/* Latency Tickers */}
        <div className="flex items-center gap-2 text-[11px] font-mono text-[#d0d6e0] bg-[#131928]/80 px-4 py-1.5 rounded-full rounded border border-[#1e293b] flex-shrink-0">
          <span className="flex items-center gap-1">
            <Radio className="w-3 h-3 text-emerald-400" />
            <span className="text-[#f7f8f8] font-medium">Radar:</span>
            <span className="text-emerald-400">{dataQuality.radar.lag}</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1">
            <span className="text-[#f7f8f8] font-medium">INSAT:</span>
            <span className="text-emerald-400">{dataQuality.satellite.lag}</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1">
            <span className="text-[#f7f8f8] font-medium">Ltg:</span>
            <span className="text-emerald-400">{dataQuality.lightning.lag}</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1">
            <span className="text-[#f7f8f8] font-medium">AWS:</span>
            <span className="text-amber-400">{dataQuality.aws.lag}</span>
          </span>
        </div>
      </div>

      {/* Right Controls: Dual Clock, Replay Button, Layers Drawer Button */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
        {/* Dual UTC / IST Real-Time Clock */}
        <div className="flex-shrink-0 bg-[#131928] border border-[#1e293b] rounded-xl px-4 py-1.5 rounded-full text-right font-mono whitespace-nowrap  flex flex-col justify-center">
          <div className="text-[11px] font-semibold text-[#f7f8f8] tracking-wider flex items-center justify-end gap-1.5 leading-none">
            <span className="text-[9px] px-1 py-0.5 rounded bg-sky-950/80 border border-[#5e6ad2]/40 text-[#5e6ad2] font-bold">UTC</span>
            <span className="tabular-nums">{utcTime || '--:--:-- Z'}</span>
          </div>
          <div className="text-[10px] text-[#f7f8f8] tracking-tight flex items-center justify-end gap-1.5 leading-none mt-1">
            <span className="text-[9px] px-1 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-amber-400 font-bold">IST</span>
            <span className="tabular-nums">{istTime || '--:--:--'}</span>
          </div>
        </div>

        {/* Historical Event Replay Toggle */}
        <button
          onClick={onToggleReplay}
          className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono font-medium transition-all ${
            isReplayActive
              ? 'bg-rose-600/30 border border-rose-500 text-rose-200 ring-2 ring-rose-500/30  shadow-rose-900/40 animate-pulse'
              : 'bg-[#131928] hover:bg-[#1a2236] border border-[#1e293b] text-[#f7f8f8] hover:text-[#f7f8f8]'
          }`}
          title="Toggle June 16–17, 2022 Cherrapunji Extreme Cloudburst Historical Replay"
        >
          <History className={`w-3.5 h-3.5 ${isReplayActive ? 'text-rose-400' : 'text-[#d0d6e0]'}`} />
          <span>{isReplayActive ? 'REPLAY: Active (972mm)' : 'REPLAY: Inactive'}</span>
        </button>

        {/* WMO Verification Scorecard */}
        {onOpenVerification && (
          <button
            onClick={onOpenVerification}
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full.5 rounded text-xs font-mono font-medium transition-colors bg-[#131928] hover:bg-[#1a2236] text-blue-300 hover:text-[#f7f8f8] border border-[#1e293b] hover:border-blue-500/50"
            title="WMO Operational Verification Benchmark (POD, FAR, CSI vs pySTEPS)"
          >
            <Award className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">VERIFICATION</span>
          </button>
        )}

        {/* WMO/NDMA CAP Alert Dispatcher */}
        {onOpenCapModal && (
          <button
            onClick={onOpenCapModal}
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full.5 rounded text-xs font-mono font-medium transition-colors bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 hover:text-[#f7f8f8] border border-rose-800/40 hover:border-rose-500/60"
            title="Generate & Dispatch WMO/NDMA CAP v1.2 Warning Alert"
          >
            <Send className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden md:inline">CAP ALERT</span>
          </button>
        )}

        {/* Layer Drawer Toggle */}
        <button
          onClick={onToggleLayers}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-medium transition-colors border ${
            isLayerDrawerOpen
              ? 'bg-blue-600 text-[#f7f8f8] border-blue-500  shadow-blue-600/30'
              : 'bg-[#131928] hover:bg-[#1a2236] text-[#f7f8f8] hover:text-[#f7f8f8] border-[#1e293b]'
          }`}
          title="Toggle Government & Operational Map Layers"
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">LAYERS</span>
        </button>
      </div>
    </header>
  );
};
