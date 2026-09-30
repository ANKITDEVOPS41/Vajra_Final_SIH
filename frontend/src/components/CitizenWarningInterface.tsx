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
    <div className="flex-1 flex flex-col lg:flex-row h-full w-full bg-[#0a0d15] text-slate-100 overflow-hidden font-sans relative">
      {/* Background Ambient Glow */}
      
      

      {/* Main View Area: Smartphone Chassis Simulator or Fullscreen View */}
      <div className="flex-1 flex flex-col items-center justify-center p-3 lg:p-6 overflow-y-auto custom-scrollbar z-10">
        
        {/* Top Control Bar over Phone */}
        <div className="w-full max-w-[420px] flex items-center justify-between mb-3 text-xs font-mono">
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setIsPhoneFrame(true)}
              className={`px-3 py-1.5 rounded flex items-center space-x-1.5 transition-all border ${
                isPhoneFrame
                  ? '   text-[#f7f8f8] font-bold border-white/30 '
                  : 'bg-[#1b2333] text-[#d0d6e0] border-white/10 hover:text-[#f7f8f8]'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile Chassis</span>
            </button>
            <button
              onClick={() => setIsPhoneFrame(false)}
              className={`px-3 py-1.5 rounded flex items-center space-x-1.5 transition-all border ${
                !isPhoneFrame
                  ? '   text-[#f7f8f8] font-bold border-white/30 '
                  : 'bg-[#1b2333] text-[#d0d6e0] border-white/10 hover:text-[#f7f8f8]'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Full View</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {/* Language Switcher */}
            <div className="bg-[#101726] border border-white/10 p-0.5 rounded flex items-center text-[11px]">
              <button
                onClick={() => setLang('en')}
                className={`px-2 py-0.5 rounded transition-all ${
                  lang === 'en' ? 'bg-[#1b2333] border border-[#38bdf8] text-[#38bdf8] text-[#f7f8f8] font-bold' : 'text-[#d0d6e0] hover:text-[#f7f8f8]'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLang('hi')}
                className={`px-2 py-0.5 rounded transition-all ${
                  lang === 'hi' ? 'bg-[#1b2333] border border-[#38bdf8] text-[#38bdf8] text-[#f7f8f8] font-bold' : 'text-[#d0d6e0] hover:text-[#f7f8f8]'
                }`}
              >
                हिंदी
              </button>
            </div>

            {/* Sound Mute Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 rounded bg-[#1b2333] border border-white/10 text-[#d0d6e0] hover:text-[#f7f8f8] transition-colors"
              title={soundEnabled ? 'Mute alert sounds' : 'Enable alert sounds'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-[#d0d6e0]" />}
            </button>
          </div>
        </div>

        {/* Smartphone Chassis Container (iPhone 16 Pro styling) */}
        <div 
          className={`transition-all duration-300 ${
            isPhoneFrame 
              ? 'w-full max-w-[400px] h-[820px] bg-[#0a0d15] rounded border-[4px] border-[#2b3a55]  flex flex-col relative overflow-hidden select-none' 
              : 'w-full max-w-4xl bg-[#101726] rounded border border-white/15 p-6  relative'
          }`}
        >
          {isPhoneFrame && (
            <>
              {/* Dynamic Island Notch */}
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded z-40 flex items-center justify-between px-3 text-[10px] text-[#f7f8f8]/50 border border-white/5 shadow-inner">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-black border border-white/10" />
                  <span className="w-1.5 h-1.5 rounded bg-red-500 animate-ping" />
                </div>
                <span className="font-mono text-[9px] text-red-400 font-bold tracking-tight">MAUSAM SOS</span>
                <span className="w-2 h-2 rounded bg-amber-400/80 animate-pulse" />
              </div>

              {/* iOS Mobile Status Bar */}
              <div className="h-11 px-7 pt-2.5 flex items-center justify-between text-xs text-[#f7f8f8]/80 font-mono shrink-0 z-30">
                <span className="font-semibold text-[13px]">15:32</span>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold text-[#f7f8f8]">Jio 5G</span>
                  {/* Wi-Fi Icon */}
                  <svg className="w-3.5 h-3.5 fill-current text-[#f7f8f8]/80" viewBox="0 0 24 24">
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
              <div className="bg-[#101726]/95 border-2 border-red-500/60 p-3 rounded  backdrop-blur-xl animate-in slide-in-from-top duration-500 relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded    flex items-center justify-center ">
                      <Radio className="w-3.5 h-3.5 text-[#f7f8f8]" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-[#f7f8f8] uppercase tracking-wider font-display">
                        IMD MAUSAM · MoES
                      </span>
                      <span className="text-[9px] text-[#f7f8f8]/50 font-mono ml-2">Just Now</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowPushNotification(false)}
                    className="text-[#f7f8f8]/40 hover:text-[#f7f8f8] text-xs px-1"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-xs font-bold text-red-300 mt-1.5 leading-snug">
                  🚨 {lang === 'hi' ? 'आपातकालीन चेतावनी: तीव्र बादलों की गर्जना और बारिश' : 'NDMA/IMD FLASH ALERT: Severe Microburst & LLWS (PS-26084 Protocol)'}
                </p>
                <p className="text-[11px] text-[#f7f8f8] mt-0.5 leading-tight">
                  {lang === 'hi' 
                    ? `अनुमानित आगमन: ${Math.round(remainingSeconds / 60)} मिनट। निकटतम पक्के आश्रय में जाएं।`
                    : `ConvectNet AI indicates direct microburst core impact (68 dBZ) on your GPS location in ~${Math.round(remainingSeconds / 60)} min. 48 m/s wind shear capable of structural damage.`}
                </p>

                <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-emerald-400 font-bold">
                    📍 {lang === 'hi' ? 'पद्मापुर वार्ड 4' : 'VEBS Runway 19 Threshold (GPS Verified)'}
                  </span>
                  <span className="text-[#1aaaff]">Tap to follow SOPs ↓</span>
                </div>
              </div>
            )}

            {/* Official Indian Meteorological Department (IMD) / MoES Header */}
            <div className="border-b border-white/10 pb-2.5 pt-1">
              {/* Indian Tricolor Ribbon */}
              <div className="h-1 w-full   via-white  mb-2 rounded " />
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-[12px] font-black tracking-wider text-[#f7f8f8] uppercase font-display leading-tight">
                    {lang === 'hi' ? 'भारत मौसम विज्ञान विभाग' : 'INDIA METEOROLOGICAL DEPARTMENT'}
                  </h1>
                  <h2 className="text-[10px] font-semibold text-[#f7f8f8] uppercase tracking-tight font-sans">
                    Ministry of Earth Sciences (MoES)
                  </h2>
                </div>
                <span className="text-[9px] bg-red-950/90 text-red-400 font-mono px-2 py-0.5 rounded border border-red-500/60 font-bold animate-pulse">
                  NOWCAST LIVE
                </span>
              </div>
              <div className="mt-1.5 flex items-center space-x-1.5 text-[11px] text-[#1aaaff] font-mono">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>{lang === 'hi' ? activeAlert.targetLocationHi : activeAlert.targetLocation}</span>
              </div>
            </div>

            {/* Live Storm ETA Countdown Clock Hero Banner */}
            <div className="bg-[#1b2333] border-2 border-rose-500 rounded p-4 text-center relative overflow-hidden">
              
              
              <div className="flex items-center justify-center space-x-2">
                <span className="w-2.5 h-2.5 rounded bg-red-500 animate-ping" />
                <span className="text-[10px] font-mono font-bold tracking-widest text-red-200 bg-red-950/90 px-4 py-1.5 rounded rounded border border-red-600/80">
                  {lang === 'hi' ? '🔴 तुरंत सुरक्षित स्थान पर जाएं' : '🔴 IMMEDIATE SHELTER IN PLACE (LLWS 48 m/s)'}
                </span>
              </div>

              {/* Huge Live Countdown Timer */}
              <div className="text-4xl font-black font-mono text-[#f7f8f8] mt-2.5 tracking-tight drop-">
                {formatCountdown(remainingSeconds)}
              </div>
              <span className="text-[10px] text-[#f7f8f8] font-mono uppercase tracking-wider block mt-0.5">
                {lang === 'hi' ? 'प्रभाव क्षेत्र में आने का अनुमानित समय' : 'Estimated Time to Direct Impact'}
              </span>

              {/* 4 Core Telemetry Metrics Bar */}
              <div className="grid grid-cols-4 gap-1.5 mt-3 pt-2.5 border-t border-red-500/30 text-left font-mono">
                <div className="bg-\[#101726\] p-1.5 rounded border border-red-900/40">
                  <span className="text-[8px] text-[#d0d6e0] block uppercase">Radar dBZ</span>
                  <span className="text-[11px] font-bold text-red-300">{activeAlert.peakDbz} dBZ</span>
                </div>
                <div className="bg-\[#101726\] p-1.5 rounded border border-red-900/40">
                  <span className="text-[8px] text-[#d0d6e0] block uppercase">Rainfall</span>
                  <span className="text-[11px] font-bold text-amber-300">{activeAlert.rainRateMmh.toFixed(0)} mm/h</span>
                </div>
                <div className="bg-\[#101726\] p-1.5 rounded border border-red-900/40">
                  <span className="text-[8px] text-[#d0d6e0] block uppercase">Wind Gust</span>
                  <span className="text-[11px] font-bold text-[#f7f8f8]">{activeAlert.downburstKmh} km/h</span>
                </div>
                <div className="bg-\[#101726\] p-1.5 rounded border border-red-900/40">
                  <span className="text-[8px] text-[#d0d6e0] block uppercase">Hail MESH</span>
                  <span className="text-[11px] font-bold text-purple-300">{activeAlert.meshHailMm} mm</span>
                </div>
              </div>
            </div>

            {/* Scannable NDMA Standard Operating Procedures (SOPs) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-display font-bold uppercase tracking-wider text-[#f7f8f8] flex items-center space-x-1.5">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>{lang === 'hi' ? 'राष्ट्रीय आपदा प्रबंधन (NDMA) निर्देश' : 'NDMA Mandatory Safety SOPs'}</span>
                </h3>
                <span className="text-[10px] text-[#d0d6e0] font-mono">
                  {lang === 'hi' ? '4 त्वरित कदम' : '4 Action Rules'}
                </span>
              </div>

              {/* 4 Visual Action Cards */}
              <div className="space-y-2">
                {activeAlert.ndmaSops.map((sop) => (
                  <div
                    key={sop.id}
                    className="bg-[#101726]/90 border border-white/[0.1] rounded p-3 flex items-start space-x-3 hover:border-[#38a8ff]/40 transition-all "
                  >
                    <div className="w-9 h-9 rounded bg-ocean-800 border border-white/10 flex items-center justify-center shrink-0 mt-0.5 shadow-inner">
                      {renderSopIcon(sop.iconName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-[#f7f8f8] font-heading">
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
                      <p className="text-[11px] text-[#f7f8f8] mt-1 leading-snug font-sans">
                        {lang === 'hi' ? sop.instructionHi : sop.instructionEn}
                      </p>
                      <div className="mt-1.5 inline-flex items-center space-x-1 text-[10px] font-mono font-bold text-[#38bdf8] bg-[#0a0d15] px-2 py-0.5 rounded border border-[#38bdf8]/40">
                        ⚡ {lang === 'hi' ? sop.highlightHi : sop.highlightEn}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Nearest Safe Shelter Navigation Card */}
            <div className="  to-ocean-950 border-2 border-emerald-500/60 rounded p-3.5 space-y-2.5 ">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-[#f7f8f8] font-display">
                  <ShieldAlert className="w-4 h-4 text-emerald-400" />
                  <span>{lang === 'hi' ? 'निकटतम सुरक्षित राहत शिविर' : 'Designated Safe Shelter'}</span>
                </div>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 font-mono px-2 py-0.5 rounded border border-emerald-500/40 font-bold">
                  OPEN · {shelter.capacityOccupied}/{shelter.capacityTotal} OCCUPIED
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-100 font-heading">
                  {lang === 'hi' ? shelter.nameHi : shelter.name}
                </h4>
                <p className="text-[10px] text-[#d0d6e0] font-mono mt-0.5">
                  📍 {shelter.address}
                </p>
              </div>

              {/* Distance & Transit Time Chips */}
              <div className="grid grid-cols-2 gap-2 text-center font-mono">
                <div className="bg-[#1b2333] p-2 rounded border border-white/5">
                  <span className="text-[9px] text-[#d0d6e0] block uppercase">Walking ETA</span>
                  <span className="text-xs font-bold text-emerald-400">
                    ~{shelter.walkEtaMinutes} min ({shelter.distanceKm} km)
                  </span>
                </div>
                <div className="bg-[#1b2333] p-2 rounded border border-white/5">
                  <span className="text-[9px] text-[#d0d6e0] block uppercase">Vehicle ETA</span>
                  <span className="text-xs font-bold text-[#1aaaff]">
                    ~{shelter.driveEtaMinutes} min (Bypass)
                  </span>
                </div>
              </div>

              {/* Turn-by-Turn Route Guidance Advice */}
              <div className="bg-emerald-950/30 border border-emerald-500/30 p-2.5 rounded text-[11px] text-emerald-200 space-y-1">
                <div className="flex items-center space-x-1.5 font-bold text-emerald-300">
                  <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{lang === 'hi' ? 'सुरक्षित मार्ग निर्देश' : 'Turn-by-Turn Safe Route Advice'}</span>
                </div>
                <p className="text-[10px] leading-relaxed text-[#f7f8f8] font-sans">
                  {lang === 'hi' ? shelter.turnByTurnAdviceHi : shelter.turnByTurnAdviceEn}
                </p>
              </div>

              {/* Shelter Key Infrastructure Features */}
              <div className="flex flex-wrap gap-1 pt-1">
                {shelter.features.slice(0, 3).map((feat, i) => (
                  <span key={i} className="text-[9px] font-mono bg-[#1b2333] text-[#f7f8f8] px-2 py-0.5 rounded border border-white/5">
                    ✓ {feat}
                  </span>
                ))}
              </div>

              {/* GPS Navigation Call to Action */}
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${shelter.latitude},${shelter.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded text-xs font-bold font-display text-[#f7f8f8]  from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 border border-white/20  flex items-center justify-center space-x-2 transition-all hover:scale-[1.01]"
              >
                <Navigation className="w-4 h-4" />
                <span>{lang === 'hi' ? 'गूगल मैप्स में सुरक्षित मार्ग खोलें' : 'Open GPS Route Navigation'}</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
            </div>

            {/* Emergency One-Tap Direct Helplines */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#d0d6e0] font-semibold block">
                {lang === 'hi' ? '24x7 आपातकालीन हेल्पलाइन' : '24x7 Emergency SOS Helplines'}
              </span>
              <div className="grid grid-cols-3 gap-2 font-mono">
                {activeAlert.emergencyHelplines.slice(0, 3).map((line, i) => (
                  <a
                    key={i}
                    href={`tel:${line.number}`}
                    className="p-2 rounded bg-[#101726] border border-white/10 text-center hover:border-red-500/50 hover:bg-ocean-800 transition-all flex flex-col items-center group "
                  >
                    <PhoneCall className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform mb-0.5" />
                    <span className="text-xs font-black text-[#f7f8f8]">{line.number}</span>
                    <span className="text-[8px] text-[#d0d6e0] truncate max-w-[80px]">{line.label}</span>
                  </a>
                ))}
              </div>
            </div>

          </div>

          {/* iOS Bottom Home Bar */}
          {isPhoneFrame && (
            <div className="h-6 flex items-center justify-center shrink-0 z-30">
              <div className="w-32 h-1 bg-white/20 rounded" />
            </div>
          )}
        </div>
      </div>

      {/* Side Controller & Judge Test Bench */}
      <aside className="w-full lg:w-80 bg-[#0a0d15]/95 border-t lg:border-t-0 lg:border-l border-white/10 p-5 flex flex-col justify-between shrink-0 z-20 backdrop-blur-xl">
        <div className="space-y-5">
          {/* Back to Tactical Command Button */}
          <button
            onClick={onBackToAdmin}
            className="w-full btn-blizzard-secondary py-2.5 px-4 rounded text-xs font-bold font-display flex items-center justify-center space-x-2 text-[#f7f8f8] hover:text-[#f7f8f8]"
          >
            <ArrowLeft className="w-4 h-4 text-[#1aaaff]" />
            <span>Return to Tactical Command</span>
          </button>

          {/* Test Bench Header */}
          <div className="border-b border-white/10 pb-3">
            <h3 className="text-xs font-display font-bold uppercase tracking-wider text-[#f7f8f8] flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[#1aaaff]" />
              <span>Mausam Test Bench & Simulator</span>
            </h3>
            <p className="text-[11px] text-[#d0d6e0] mt-0.5 font-mono">
              Live broadcast validation & simulated citizen device test
            </p>
          </div>

          {/* Trigger Alert Notification Button */}
          <div className="bg-[#1b2333] border border-white/10 rounded p-3.5 space-y-2.5">
            <span className="text-[11px] font-mono font-bold text-[#f7f8f8] block uppercase">
              Simulate Broadcast Push
            </span>
            <p className="text-[10px] text-[#d0d6e0] leading-tight">
              Fires the IMD Mausam push banner with emergency chime audio and alert pulse.
            </p>
            <button
              onClick={handleTriggerSimulatedPush}
              className="w-full py-2.5 px-4 rounded text-xs font-bold font-display text-[#f7f8f8]  from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500  border border-white/20 flex items-center justify-center space-x-2"
            >
              <Bell className="w-3.5 h-3.5 animate-bounce" />
              <span>Simulate Incoming Push Alert</span>
            </button>
          </div>

          {/* Active Storm Cell Simulator Selector */}
          <div className="bg-[#1b2333] border border-white/10 rounded p-3.5 space-y-2.5">
            <span className="text-[11px] font-mono font-bold text-[#f7f8f8] block uppercase">
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
                    className={`w-full p-2 rounded text-left flex items-center justify-between border transition-all ${
                      isSelected
                        ? 'bg-[#1888ef]/20 text-[#1aaaff] border-[#38a8ff]/50 font-bold'
                        : 'bg-\[#101726\]/60 text-[#d0d6e0] border-white/5 hover:text-[#f7f8f8]'
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
          <div className="bg-\[#101726\]/60 border border-white/5 rounded p-3 text-[11px] font-mono space-y-1 text-[#d0d6e0]">
            <div className="flex justify-between">
              <span>App Target:</span>
              <strong className="text-[#f7f8f8]">IMD Mausam v4.2.1</strong>
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
          <p className="text-[10px] text-[#d0d6e0] font-mono">
            VAJRA Intelligence Dispatch Suite · SIH PS-26084
          </p>
        </div>
      </aside>
    </div>
  );
};
