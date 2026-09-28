import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Radio, 
  ShieldAlert, 
  MapPin, 
  Navigation, 
  PhoneCall, 
  Zap, 
  ZapOff,
  Waves, 
  Home, 
  Trees, 
  AlertTriangle, 
  Volume2, 
  VolumeX, 
  Smartphone, 
  Maximize2, 
  Minimize2, 
  ArrowLeft, 
  Bell, 
  Compass, 
  CloudRain, 
  Wind, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Shield,
  Clock,
  Layers,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { 
  DispatchedAlert, 
  DEFAULT_FALLBACK_ALERT, 
  FALLBACK_STORM_CELLS,
  StormCell,
  NDMASopRule,
  createDispatchedAlert
} from '../types/dispatch';

export interface CitizenWarningInterfaceProps {
  alert?: DispatchedAlert | null;
  onBackToAdmin: () => void;
  onSimulateDispatch?: (cellId: string) => void;
  availableCells?: StormCell[];
}

export const CitizenWarningInterface: React.FC<CitizenWarningInterfaceProps> = ({
  alert: propAlert,
  onBackToAdmin,
  onSimulateDispatch,
  availableCells = FALLBACK_STORM_CELLS
}) => {
  // Active alert data with solid fallback
  const activeAlert: DispatchedAlert = useMemo(() => {
    return propAlert || DEFAULT_FALLBACK_ALERT;
  }, [propAlert]);

  // Viewport mode: phone chassis simulation vs full-screen web view
  const [isPhoneFrame, setIsPhoneFrame] = useState<boolean>(true);
  // Language toggle: English vs Hindi
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  // Sound enabled
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  // Simulated incoming push notification banner state
  const [showPushNotification, setShowPushNotification] = useState<boolean>(true);
  const [pushExpanded, setPushExpanded] = useState<boolean>(false);
  // Live ticking countdown seconds
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    return (activeAlert.etaMinutes || 18) * 60 + 42;
  });
  // Active tab inside shelter navigation card (Route vs Amenities vs SOS)
  const [activeShelterTab, setActiveShelterTab] = useState<'route' | 'amenities'>('route');
  // Selected cell for simulation bench
  const [simCellId, setSimCellId] = useState<string>(activeAlert.cellId || 'CELL-701');

  // Sync remaining seconds when alert changes
  useEffect(() => {
    if (activeAlert.etaMinutes) {
      setRemainingSeconds(activeAlert.etaMinutes * 60 + 42);
      setShowPushNotification(true);
    }
  }, [activeAlert.alertId, activeAlert.etaMinutes]);

  // Countdown clock interval
  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Web Audio emergency tone generator
  const playEmergencyChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const now = ctx.currentTime;
      // Tone 1: 880 Hz (A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Tone 2: 1760 Hz (A6) alert pip
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1760, now + 0.18);
      gain2.gain.setValueAtTime(0.12, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.55);
    } catch (e) {
      // Audio autoplay policy might restrict without interaction
    }
  };

  // Format MM:SS
  const formatCountdown = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleTriggerSimulatedPush = () => {
    setShowPushNotification(true);
    playEmergencyChime();
    if (onSimulateDispatch) {
      onSimulateDispatch(simCellId);
    }
  };

  const shelter = activeAlert.nearestShelter;

  // Icon renderer for NDMA SOP rules
  const renderSopIcon = (iconName: string) => {
    switch (iconName) {
      case 'Home':
        return <Home className="w-5 h-5 text-emerald-400" />;
      case 'ZapOff':
        return <ZapOff className="w-5 h-5 text-amber-400" />;
      case 'Waves':
        return <Waves className="w-5 h-5 text-[#1aaaff]" />;
      case 'Trees':
        return <Trees className="w-5 h-5 text-rose-400" />;
      default:
        return <ShieldAlert className="w-5 h-5 text-red-400" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full w-full bg-[#0a0e1a] text-slate-100 overflow-hidden font-sans relative">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/3 left-1/3 w-[650px] h-[650px] bg-red-950/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-[#1888ef]/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main View Area: Smartphone Chassis Simulator or Fullscreen View */}
      <div className="flex-1 flex flex-col items-center justify-center p-3 lg:p-6 overflow-y-auto custom-scrollbar z-10">
        
        {/* Top Control Bar over Phone */}
        <div className="w-full max-w-[420px] flex items-center justify-between mb-3 text-xs font-mono">
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setIsPhoneFrame(true)}
              className={`px-3 py-1.5 rounded-full flex items-center space-x-1.5 transition-all border ${
                isPhoneFrame
                  ? 'bg-gradient-to-r from-[#1aaaff] to-[#1aaaff] text-white font-bold border-white/30 shadow-[0_0_12px_rgba(56,168,255,0.4)]'
                  : 'bg-ocean-900/80 text-slate-400 border-white/10 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile Chassis</span>
            </button>
            <button
              onClick={() => setIsPhoneFrame(false)}
              className={`px-3 py-1.5 rounded-full flex items-center space-x-1.5 transition-all border ${
                !isPhoneFrame
                  ? 'bg-gradient-to-r from-[#1aaaff] to-[#1aaaff] text-white font-bold border-white/30 shadow-[0_0_12px_rgba(56,168,255,0.4)]'
                  : 'bg-ocean-900/80 text-slate-400 border-white/10 hover:text-white'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Full View</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {/* Language Switcher */}
            <div className="bg-[#111729] border border-white/10 p-0.5 rounded-full flex items-center text-[11px]">
              <button
                onClick={() => setLang('en')}
                className={`px-2 py-0.5 rounded-full transition-all ${
                  lang === 'en' ? 'bg-[#38a8ff] text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLang('hi')}
                className={`px-2 py-0.5 rounded-full transition-all ${
                  lang === 'hi' ? 'bg-[#38a8ff] text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                हिंदी
              </button>
            </div>

            {/* Sound Mute Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 rounded-full bg-ocean-900 border border-white/10 text-slate-400 hover:text-white transition-colors"
              title={soundEnabled ? 'Mute alert sounds' : 'Enable alert sounds'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
            </button>
          </div>
        </div>

        {/* Smartphone Chassis Container (iPhone 16 Pro styling) */}
        <div 
          className={`transition-all duration-300 ${
            isPhoneFrame 
              ? 'w-full max-w-[400px] h-[820px] bg-[#0a0e1a] rounded-[52px] border-[8px] border-[#1c1f2e] shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_50px_rgba(56,168,255,0.15)] flex flex-col relative overflow-hidden select-none' 
              : 'w-full max-w-4xl card-blizzard rounded-3xl border border-white/15 p-6 shadow-2xl relative'
          }`}
        >
          {isPhoneFrame && (
            <>
              {/* Dynamic Island Notch */}
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-full z-40 flex items-center justify-between px-3 text-[10px] text-white/50 border border-white/5 shadow-inner">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#161616] border border-white/10" />
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                </div>
                <span className="font-mono text-[9px] text-red-400 font-bold tracking-tight">MAUSAM SOS</span>
                <span className="w-2 h-2 rounded-full bg-amber-400/80 animate-pulse" />
              </div>

              {/* iOS Mobile Status Bar */}
              <div className="h-11 px-7 pt-2.5 flex items-center justify-between text-xs text-white/80 font-mono shrink-0 z-30">
                <span className="font-semibold text-[13px]">15:32</span>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold text-slate-300">Jio 5G</span>
                  {/* Wi-Fi Icon */}
                  <svg className="w-3.5 h-3.5 fill-current text-white/80" viewBox="0 0 24 24">
                    <path d="M12 4C7.31 4 3.07 5.9 0 8.98L12 21 24 8.98C20.93 5.9 16.69 4 12 4zm0 3.5c3.67 0 7.02 1.41 9.53 3.73L12 19.3 2.47 11.23C4.98 8.91 8.33 7.5 12 7.5z"/>
                  </svg>
                  {/* Battery Pill */}
                  <div className="w-5 h-2.5 border border-white/70 rounded-xs p-0.5 flex items-center">
                    <div className="h-full bg-emerald-400 w-3.5 rounded-2xs" />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Phone Screen Body / Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3.5 custom-scrollbar z-20">
            
            {/* Simulated Incoming Push Notification Banner */}
            {showPushNotification && (
              <div className="bg-[#111729]/95 border-2 border-red-500/60 p-3 rounded-2xl shadow-[0_10px_35px_rgba(239,68,68,0.35)] backdrop-blur-xl animate-in slide-in-from-top duration-500 relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#1888ef] to-[#38a8ff] flex items-center justify-center shadow-[0_0_10px_rgba(56,168,255,0.4)]">
                      <Radio className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-white uppercase tracking-wider font-display">
                        IMD MAUSAM · MoES
                      </span>
                      <span className="text-[9px] text-white/50 font-mono ml-2">Just Now</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowPushNotification(false)}
                    className="text-white/40 hover:text-white text-xs px-1"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-xs font-bold text-red-300 mt-1.5 leading-snug">
                  🚨 {lang === 'hi' ? 'आपातकालीन चेतावनी: तीव्र बादलों की गर्जना और बारिश' : 'CRITICAL EMERGENCY: Severe Convective Storm & Hail Approaching'}
                </p>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-tight">
                  {lang === 'hi' 
                    ? `अनुमानित आगमन: ${Math.round(remainingSeconds / 60)} मिनट। निकटतम पक्के आश्रय में जाएं।`
                    : `Impact ETA ~${Math.round(remainingSeconds / 60)} min. Move immediately to concrete shelter.`}
                </p>

                <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-emerald-400 font-bold">
                    📍 {lang === 'hi' ? 'पद्मापुर वार्ड 4' : 'Padmapur Ward 4 (GPS Verified)'}
                  </span>
                  <span className="text-[#1aaaff]">Tap to follow SOPs ↓</span>
                </div>
              </div>
            )}

            {/* Official Indian Meteorological Department (IMD) / MoES Header */}
            <div className="border-b border-white/10 pb-2.5 pt-1">
              {/* Indian Tricolor Ribbon */}
              <div className="h-1 w-full bg-gradient-to-r from-[#FF9933] via-white to-[#138808] mb-2 rounded-full shadow-sm" />
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-[12px] font-black tracking-wider text-white uppercase font-display leading-tight">
                    {lang === 'hi' ? 'भारत मौसम विज्ञान विभाग' : 'INDIA METEOROLOGICAL DEPARTMENT'}
                  </h1>
                  <h2 className="text-[10px] font-semibold text-slate-300 uppercase tracking-tight font-sans">
                    Ministry of Earth Sciences (MoES)
                  </h2>
                </div>
                <span className="text-[9px] bg-red-950/90 text-red-400 font-mono px-2 py-0.5 rounded-full border border-red-500/60 font-bold animate-pulse">
                  NOWCAST LIVE
                </span>
              </div>
              <div className="mt-1.5 flex items-center space-x-1.5 text-[11px] text-[#1aaaff] font-mono">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>{lang === 'hi' ? activeAlert.targetLocationHi : activeAlert.targetLocation}</span>
              </div>
            </div>

            {/* Live Storm ETA Countdown Clock Hero Banner */}
            <div className="bg-gradient-to-b from-red-950/95 via-red-900/60 to-[#131928] border-2 border-red-500/80 rounded-2xl p-4 text-center shadow-[0_0_35px_rgba(239,68,68,0.4)] relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-36 h-36 bg-red-500/20 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center justify-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span className="text-[10px] font-mono font-bold tracking-widest text-red-200 bg-red-950/90 px-3 py-1 rounded-full border border-red-600/80">
                  {lang === 'hi' ? '🔴 तुरंत सुरक्षित स्थान पर जाएं' : '🔴 IMMEDIATE SEVERE STORM ALERT'}
                </span>
              </div>

              {/* Huge Live Countdown Timer */}
              <div className="text-4xl font-black font-mono text-white mt-2.5 tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                {formatCountdown(remainingSeconds)}
              </div>
              <span className="text-[10px] text-slate-300 font-mono uppercase tracking-wider block mt-0.5">
                {lang === 'hi' ? 'प्रभाव क्षेत्र में आने का अनुमानित समय' : 'Estimated Time to Direct Impact'}
              </span>

              {/* 4 Core Telemetry Metrics Bar */}
              <div className="grid grid-cols-4 gap-1.5 mt-3 pt-2.5 border-t border-red-500/30 text-left font-mono">
                <div className="bg-ocean-950/70 p-1.5 rounded-lg border border-red-900/40">
                  <span className="text-[8px] text-slate-400 block uppercase">Radar dBZ</span>
                  <span className="text-[11px] font-bold text-red-300">{activeAlert.peakDbz} dBZ</span>
                </div>
                <div className="bg-ocean-950/70 p-1.5 rounded-lg border border-red-900/40">
                  <span className="text-[8px] text-slate-400 block uppercase">Rainfall</span>
                  <span className="text-[11px] font-bold text-amber-300">{activeAlert.rainRateMmh.toFixed(0)} mm/h</span>
                </div>
                <div className="bg-ocean-950/70 p-1.5 rounded-lg border border-red-900/40">
                  <span className="text-[8px] text-slate-400 block uppercase">Wind Gust</span>
                  <span className="text-[11px] font-bold text-white">{activeAlert.downburstKmh} km/h</span>
                </div>
                <div className="bg-ocean-950/70 p-1.5 rounded-lg border border-red-900/40">
                  <span className="text-[8px] text-slate-400 block uppercase">Hail MESH</span>
                  <span className="text-[11px] font-bold text-purple-300">{activeAlert.meshHailMm} mm</span>
                </div>
              </div>
            </div>

            {/* Scannable NDMA Standard Operating Procedures (SOPs) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-display font-bold uppercase tracking-wider text-white flex items-center space-x-1.5">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>{lang === 'hi' ? 'राष्ट्रीय आपदा प्रबंधन (NDMA) निर्देश' : 'NDMA Mandatory Safety SOPs'}</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">
                  {lang === 'hi' ? '4 त्वरित कदम' : '4 Action Rules'}
                </span>
              </div>

              {/* 4 Visual Action Cards */}
              <div className="space-y-2">
                {activeAlert.ndmaSops.map((sop) => (
                  <div
                    key={sop.id}
                    className="bg-[#111729]/90 border border-white/[0.1] rounded-2xl p-3 flex items-start space-x-3 hover:border-[#38a8ff]/40 transition-all shadow-sm"
                  >
                    <div className="w-9 h-9 rounded-xl bg-ocean-800 border border-white/10 flex items-center justify-center shrink-0 mt-0.5 shadow-inner">
                      {renderSopIcon(sop.iconName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white font-heading">
                          {lang === 'hi' ? sop.titleHi : sop.titleEn}
                        </h4>
                        <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold shrink-0 ml-1 ${
                          sop.severity === 'MANDATORY' 
                            ? 'bg-red-950 text-red-300 border border-red-800/60'
                            : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                        }`}>
                          {sop.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1 leading-snug font-sans">
                        {lang === 'hi' ? sop.instructionHi : sop.instructionEn}
                      </p>
                      <div className="mt-1.5 inline-block text-[10px] font-mono font-bold text-[#1aaaff] bg-[#38a8ff]/10 px-2 py-0.5 rounded border border-[#38a8ff]/20">
                        ⚡ {lang === 'hi' ? sop.highlightHi : sop.highlightEn}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Nearest Safe Shelter Navigation Card */}
            <div className="bg-gradient-to-b from-[#131928] to-ocean-950 border-2 border-emerald-500/60 rounded-2xl p-3.5 space-y-2.5 shadow-[0_10px_30px_rgba(16,185,129,0.15)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-white font-display">
                  <ShieldAlert className="w-4 h-4 text-emerald-400" />
                  <span>{lang === 'hi' ? 'निकटतम सुरक्षित राहत शिविर' : 'Designated Safe Shelter'}</span>
                </div>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 font-mono px-2 py-0.5 rounded-full border border-emerald-500/40 font-bold">
                  OPEN · {shelter.capacityOccupied}/{shelter.capacityTotal} OCCUPIED
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-100 font-heading">
                  {lang === 'hi' ? shelter.nameHi : shelter.name}
                </h4>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  📍 {shelter.address}
                </p>
              </div>

              {/* Distance & Transit Time Chips */}
              <div className="grid grid-cols-2 gap-2 text-center font-mono">
                <div className="bg-ocean-900/80 p-2 rounded-xl border border-white/5">
                  <span className="text-[9px] text-slate-400 block uppercase">Walking ETA</span>
                  <span className="text-xs font-bold text-emerald-400">
                    ~{shelter.walkEtaMinutes} min ({shelter.distanceKm} km)
                  </span>
                </div>
                <div className="bg-ocean-900/80 p-2 rounded-xl border border-white/5">
                  <span className="text-[9px] text-slate-400 block uppercase">Vehicle ETA</span>
                  <span className="text-xs font-bold text-[#1aaaff]">
                    ~{shelter.driveEtaMinutes} min (Bypass)
                  </span>
                </div>
              </div>

              {/* Turn-by-Turn Route Guidance Advice */}
              <div className="bg-emerald-950/30 border border-emerald-500/30 p-2.5 rounded-xl text-[11px] text-emerald-200 space-y-1">
                <div className="flex items-center space-x-1.5 font-bold text-emerald-300">
                  <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{lang === 'hi' ? 'सुरक्षित मार्ग निर्देश' : 'Turn-by-Turn Safe Route Advice'}</span>
                </div>
                <p className="text-[10px] leading-relaxed text-slate-200 font-sans">
                  {lang === 'hi' ? shelter.turnByTurnAdviceHi : shelter.turnByTurnAdviceEn}
                </p>
              </div>

              {/* Shelter Key Infrastructure Features */}
              <div className="flex flex-wrap gap-1 pt-1">
                {shelter.features.slice(0, 3).map((feat, i) => (
                  <span key={i} className="text-[9px] font-mono bg-ocean-900 text-slate-300 px-2 py-0.5 rounded-md border border-white/5">
                    ✓ {feat}
                  </span>
                ))}
              </div>

              {/* GPS Navigation Call to Action */}
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${shelter.latitude},${shelter.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-full text-xs font-bold font-display text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 border border-white/20 shadow-[0_0_20px_rgba(16,185,129,0.35)] flex items-center justify-center space-x-2 transition-all hover:scale-[1.01]"
              >
                <Navigation className="w-4 h-4" />
                <span>{lang === 'hi' ? 'गूगल मैप्स में सुरक्षित मार्ग खोलें' : 'Open GPS Route Navigation'}</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
            </div>

            {/* Emergency One-Tap Direct Helplines */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">
                {lang === 'hi' ? '24x7 आपातकालीन हेल्पलाइन' : '24x7 Emergency SOS Helplines'}
              </span>
              <div className="grid grid-cols-3 gap-2 font-mono">
                {activeAlert.emergencyHelplines.slice(0, 3).map((line, i) => (
                  <a
                    key={i}
                    href={`tel:${line.number}`}
                    className="p-2 rounded-xl bg-[#111729] border border-white/10 text-center hover:border-red-500/50 hover:bg-ocean-800 transition-all flex flex-col items-center group shadow-sm"
                  >
                    <PhoneCall className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform mb-0.5" />
                    <span className="text-xs font-black text-white">{line.number}</span>
                    <span className="text-[8px] text-slate-400 truncate max-w-[80px]">{line.label}</span>
                  </a>
                ))}
              </div>
            </div>

          </div>

          {/* iOS Bottom Home Bar */}
          {isPhoneFrame && (
            <div className="h-6 flex items-center justify-center shrink-0 z-30">
              <div className="w-32 h-1 bg-white/20 rounded-full" />
            </div>
          )}
        </div>
      </div>

      {/* Side Controller & Judge Test Bench */}
      <aside className="w-full lg:w-80 bg-[#0a0e1a]/95 border-t lg:border-t-0 lg:border-l border-white/10 p-5 flex flex-col justify-between shrink-0 z-20 backdrop-blur-xl">
        <div className="space-y-5">
          {/* Back to Tactical Command Button */}
          <button
            onClick={onBackToAdmin}
            className="w-full btn-blizzard-secondary py-2.5 px-4 rounded-full text-xs font-bold font-display flex items-center justify-center space-x-2 text-white hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 text-[#1aaaff]" />
            <span>Return to Tactical Command</span>
          </button>

          {/* Test Bench Header */}
          <div className="border-b border-white/10 pb-3">
            <h3 className="text-xs font-display font-bold uppercase tracking-wider text-white flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[#1aaaff]" />
              <span>Mausam Test Bench & Simulator</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
              Live broadcast validation & simulated citizen device test
            </p>
          </div>

          {/* Trigger Alert Notification Button */}
          <div className="bg-ocean-900/80 border border-white/10 rounded-2xl p-3.5 space-y-2.5">
            <span className="text-[11px] font-mono font-bold text-slate-300 block uppercase">
              Simulate Broadcast Push
            </span>
            <p className="text-[10px] text-slate-400 leading-tight">
              Fires the IMD Mausam push banner with emergency chime audio and alert pulse.
            </p>
            <button
              onClick={handleTriggerSimulatedPush}
              className="w-full py-2.5 px-4 rounded-full text-xs font-bold font-display text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] border border-white/20 flex items-center justify-center space-x-2"
            >
              <Bell className="w-3.5 h-3.5 animate-bounce" />
              <span>Simulate Incoming Push Alert</span>
            </button>
          </div>

          {/* Active Storm Cell Simulator Selector */}
          <div className="bg-ocean-900/80 border border-white/10 rounded-2xl p-3.5 space-y-2.5">
            <span className="text-[11px] font-mono font-bold text-slate-300 block uppercase">
              Switch Target Storm Cell
            </span>
            <div className="space-y-1.5 font-mono text-xs">
              {availableCells.map((c) => {
                const isSelected = c.cell_id === activeAlert.cellId;
                return (
                  <button
                    key={c.cell_id}
                    onClick={() => {
                      setSimCellId(c.cell_id);
                      if (onSimulateDispatch) {
                        onSimulateDispatch(c.cell_id);
                      }
                    }}
                    className={`w-full p-2 rounded-xl text-left flex items-center justify-between border transition-all ${
                      isSelected
                        ? 'bg-[#1888ef]/20 text-[#1aaaff] border-[#38a8ff]/50 font-bold'
                        : 'bg-ocean-950/60 text-slate-400 border-white/5 hover:text-white'
                    }`}
                  >
                    <span>{c.cell_id}</span>
                    <span className="text-[10px] opacity-80">{c.peak_dbz} dBZ · {c.severity || 'SEVERE'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mausam App Status Metadata */}
          <div className="bg-ocean-950/60 border border-white/5 rounded-2xl p-3 text-[11px] font-mono space-y-1 text-slate-400">
            <div className="flex justify-between">
              <span>App Target:</span>
              <strong className="text-white">IMD Mausam v4.2.1</strong>
            </div>
            <div className="flex justify-between">
              <span>Protocol:</span>
              <strong className="text-[#1aaaff]">NDMA CAP v1.2 Push</strong>
            </div>
            <div className="flex justify-between">
              <span>GPS Sector:</span>
              <strong className="text-emerald-400">17.78° N, 83.25° E</strong>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-4 border-t border-white/10 text-center">
          <p className="text-[10px] text-slate-500 font-mono">
            VAJRA Intelligence Dispatch Suite · SIH PS-26084
          </p>
        </div>
      </aside>
    </div>
  );
};
