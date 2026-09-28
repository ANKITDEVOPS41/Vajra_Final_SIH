import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Play, Pause, RotateCcw, Sparkles, Volume2, VolumeX, FastForward } from 'lucide-react';
import { VerticalRadarCrossSection } from './VerticalRadarCrossSection';
import { AITelemetryHUD, TelemetryMetrics } from './AITelemetryHUD';
import { FeatureAttributionPanel, AttributionItem } from './FeatureAttributionPanel';
import { PhaseNavigationPill, PhaseNavOption } from './PhaseNavigationPill';
import { DataProvenanceBadge } from '../DataProvenanceBadge';

export interface StormPhase {
  id: number;
  timeLabel: string;
  phaseName: string;
  subtitle: string;
  physicsDescription: string;
  metPhenomena: string[];
  metrics: TelemetryMetrics;
  attribution: AttributionItem[];
}

export const STORM_PHASES: StormPhase[] = [
  {
    id: 1,
    timeLabel: "T-60 to T-45 MIN",
    phaseName: "Convective Initiation",
    subtitle: "Capping Inversion Erosion & Thermal Plume Ascent",
    physicsDescription: "Intense solar insolation and localized orographic valley convergence rapidly heat the boundary layer. Convective Available Potential Energy (CAPE) exceeds 3,400 J/kg while Convective Inhibition (CIN) erodes to near zero. A moist thermal updraft breaches the Level of Free Convection (LFC), forming dense cumulus congestus towers confined below the freezing level.",
    metPhenomena: [
      "Boundary-layer moisture pooling in foothill valley",
      "INSAT-3DR 10.8µm Tb cooling rate exceeds -2.4°C/min",
      "Pure liquid-phase collision-coalescence (no ice crystals)"
    ],
    metrics: {
      zMax: 32.5,
      coreHeightKm: 3.2,
      updraftVelocity: 12.0,
      vil: 8.4,
      vilDensity: 1.1,
      posh: 0.0,
      meshMm: 0.0,
      rainRateMmh: 8.5,
      cloudTopTempC: -14.0,
      lightningRate: 0,
      hazardState: "PRE-CONVECTIVE"
    },
    attribution: [
      { name: "Boundary-Layer CAPE Flux", score: 42, detail: "3,420 J/kg surface parcel energy" },
      { name: "CIN Erosion Rate", score: 28, detail: "CIN reduced from -85 to -4 J/kg" },
      { name: "Satellite IR Cooling Rate", score: 18, detail: "-2.4°C/min cloud-top plunge" },
      { name: "Orographic Lift Index", score: 12, detail: "Valley slope convergence trigger" }
    ]
  },
  {
    id: 2,
    timeLabel: "T-45 to T-25 MIN",
    phaseName: "Rapid Explosive Updraft",
    subtitle: "Latent Heat Release & Supercooled Core Eruption",
    physicsDescription: "Latent heat release from rapid condensation and freezing accelerates the central updraft core to over 34 m/s. The core erupts through the 0°C freezing level (4.5 km) and breaches the -20°C mixed-phase level (7.5 km). A Bounded Weak Echo Region (BWER) vault forms as the violent updraft sweeps precipitation aloft before raindrops can grow large enough to fall.",
    metPhenomena: [
      "Echo tops shoot past 14 km reaching the Tropopause",
      "Intense non-inductive charging between graupel & ice crystals",
      "Initial intra-cloud (IC) lightning flashes surge"
    ],
    metrics: {
      zMax: 54.0,
      coreHeightKm: 7.2,
      updraftVelocity: 36.5,
      vil: 38.2,
      vilDensity: 2.8,
      posh: 38.0,
      meshMm: 16.5,
      rainRateMmh: 34.0,
      cloudTopTempC: -62.0,
      lightningRate: 24,
      hazardState: "UPDRAFT SURGE"
    },
    attribution: [
      { name: "Updraft Acceleration (w)", score: 38, detail: "+36.5 m/s vertical velocity" },
      { name: "Latent Heat of Freezing", score: 27, detail: "Rapid glaciation above -20°C" },
      { name: "BWER Vault Depth", score: 21, detail: "3.2 km clear inflow vault" },
      { name: "Tropopause Penetration", score: 14, detail: "Overshooting top to 15.5 km" }
    ]
  },
  {
    id: 3,
    timeLabel: "T-25 to T-10 MIN",
    phaseName: "Hail Core Suspended Aloft",
    subtitle: "Hydrometeor Accumulation & Aerodynamic Suspension",
    physicsDescription: "The tremendous updraft (w > 42 m/s) acts as an aerodynamic floor, holding millions of tons of supercooled liquid water, heavy graupel, and giant hailstones suspended between 7 km and 11 km altitude. Reflectivity aloft reaches an extreme 68 dBZ with VIL density spiking to 4.8 g/m³. The surface experiences an eerie calm as precipitation is trapped aloft.",
    metPhenomena: [
      "Three-Body Scatter Spike (TBSS / Hail Flare) on radar radial",
      "Severe Hail Index (SHI) surges into 99th percentile",
      "Lightning Jump: Total flash rate exceeds 95 flashes/min"
    ],
    metrics: {
      zMax: 68.2,
      coreHeightKm: 8.9,
      updraftVelocity: 44.0,
      vil: 78.5,
      vilDensity: 4.8,
      posh: 96.0,
      meshMm: 52.0,
      rainRateMmh: 45.0,
      cloudTopTempC: -74.0,
      lightningRate: 98,
      hazardState: "SEVERE ALOFT"
    },
    attribution: [
      { name: "VIL Density Aloft", score: 36, detail: "4.8 g/m³ in hail-growth zone" },
      { name: "Core Height above -20°C", score: 31, detail: "+1.4 km above -20°C isotherm" },
      { name: "Total Lightning Jump", score: 20, detail: ">95 fl/min non-inductive surge" },
      { name: "Radar TBSS Spike", score: 13, detail: "Confirmed giant hail signatures" }
    ]
  },
  {
    id: 4,
    timeLabel: "T-10 to T+0 MIN",
    phaseName: "Downdraft Collapse & Extreme Cloudburst",
    subtitle: "Water-Loading Failure & Catastrophic Precipitation Dump",
    physicsDescription: "The accumulated hydrometeor mass overwhelms the updraft's mechanical capacity. Combined with dry mid-level air entrainment causing rapid evaporative cooling, the core loses positive buoyancy. The suspended 68 dBZ hail and water reservoir cascades to the surface in a catastrophic downdraft (w = -28 m/s), triggering an extreme cloudburst (>140 mm/hr).",
    metPhenomena: [
      "Radar core crashes from 9 km to 0 km in under 8 minutes",
      "Extreme rain rate exceeds 140 mm/hr (>100 mm/hr threshold)",
      "Severe downburst outflow winds exceed 95 km/h"
    ],
    metrics: {
      zMax: 66.5,
      coreHeightKm: 1.4,
      updraftVelocity: -28.0,
      vil: 52.0,
      vilDensity: 3.2,
      posh: 65.0,
      meshMm: 35.0,
      rainRateMmh: 148.5,
      cloudTopTempC: -66.0,
      lightningRate: 46,
      hazardState: "CLOUDBURST ACTIVE"
    },
    attribution: [
      { name: "Hydrometeor Loading Dump", score: 40, detail: "Downburst collapse from water mass" },
      { name: "Evaporative Cooling Deficit", score: 28, detail: "Mid-level dry air entrainment" },
      { name: "Tropical Z-R Exceedance", score: 20, detail: "148.5 mm/h rain rate calculated" },
      { name: "Microburst Divergence", score: 12, detail: "95 km/h divergent ground velocity" }
    ]
  },
  {
    id: 5,
    timeLabel: "T+0 to T+20 MIN",
    phaseName: "Ground Impact & Flash Flood",
    subtitle: "Orographic Catchment Inundation & Debris Torrent",
    physicsDescription: "The sudden precipitation deluge lands on steep, saturated Himalayan valleys. Runoff coefficients exceed 0.85 as natural streams and drainage gullies turn into violent torrents within minutes. The storm cell transitions to a cold pool outflow boundary, while downstream automated gauges and NDMA sirens trigger emergency flash flood broadcasts.",
    metPhenomena: [
      "Stream discharge spikes >400% in narrow drainage basin",
      "Cold-pool gust front pushes outward at surface",
      "Automated NDMA CAP v1.2 emergency broadcast triggered"
    ],
    metrics: {
      zMax: 44.0,
      coreHeightKm: 0.4,
      updraftVelocity: -6.0,
      vil: 16.5,
      vilDensity: 0.9,
      posh: 12.0,
      meshMm: 8.0,
      rainRateMmh: 42.0,
      cloudTopTempC: -52.0,
      lightningRate: 8,
      hazardState: "FLASH FLOOD SURGE"
    },
    attribution: [
      { name: "Orographic Catchment Runoff", score: 44, detail: ">85mm accumulated rain in 45m" },
      { name: "Peak Hydrograph Discharge", score: 26, detail: "+420% river surge above danger mark" },
      { name: "Cold-Pool Outflow Spread", score: 18, detail: "Surface gust front dispersion" },
      { name: "NDMA CAP Siren Activation", score: 12, detail: "Emergency alert sent to population" }
    ]
  }
];

interface StormAnatomyScrollyProps {
  onBackToTactical: () => void;
}

export const StormAnatomyScrolly: React.FC<StormAnatomyScrollyProps> = ({ onBackToTactical }) => {
  const [activePhaseIndex, setActivePhaseIndex] = useState<number>(0);
  const [scrollProgress, setScrollProgress] = useState<number>(0); // 0.0 to 1.0
  const [continuousPhase, setContinuousPhase] = useState<number>(0); // 0.0 to 4.0
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const autoplayTimerRef = useRef<number | null>(null);

  // Helper function to interpolate values between phases
  const getInterpolatedMetrics = (cPhase: number): TelemetryMetrics => {
    const cp = Math.max(0, Math.min(STORM_PHASES.length - 1, cPhase));
    const idx0 = Math.floor(cp);
    const idx1 = Math.min(STORM_PHASES.length - 1, idx0 + 1);
    const fraction = cp - idx0;

    const m0 = STORM_PHASES[idx0].metrics;
    const m1 = STORM_PHASES[idx1].metrics;

    const lerp = (a: number, b: number) => a + (b - a) * fraction;

    const currentClosest = STORM_PHASES[Math.round(cp)];

    return {
      zMax: lerp(m0.zMax, m1.zMax),
      coreHeightKm: lerp(m0.coreHeightKm, m1.coreHeightKm),
      updraftVelocity: lerp(m0.updraftVelocity, m1.updraftVelocity),
      vil: lerp(m0.vil, m1.vil),
      vilDensity: lerp(m0.vilDensity, m1.vilDensity),
      posh: lerp(m0.posh, m1.posh),
      meshMm: lerp(m0.meshMm, m1.meshMm),
      rainRateMmh: lerp(m0.rainRateMmh, m1.rainRateMmh),
      cloudTopTempC: lerp(m0.cloudTopTempC, m1.cloudTopTempC),
      lightningRate: lerp(m0.lightningRate, m1.lightningRate),
      hazardState: currentClosest.metrics.hazardState
    };
  };

  // Passive RAF Scroll Listener
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!containerRef.current || ticking) return;

      window.requestAnimationFrame(() => {
        if (!containerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        const maxScroll = scrollHeight - clientHeight;
        if (maxScroll <= 0) return;

        const progress = Math.min(1, Math.max(0, scrollTop / maxScroll));
        setScrollProgress(progress);

        const cPhase = progress * (STORM_PHASES.length - 1);
        setContinuousPhase(cPhase);

        const phaseIdx = Math.min(
          STORM_PHASES.length - 1,
          Math.max(0, Math.floor(progress * STORM_PHASES.length))
        );
        setActivePhaseIndex(phaseIdx);

        ticking = false;
      });

      ticking = true;
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
    }
    return () => {
      if (container) container.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Autoplay Simulation loop
  useEffect(() => {
    if (!isPlaying) {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
      return;
    }

    autoplayTimerRef.current = window.setInterval(() => {
      if (!containerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const maxScroll = scrollHeight - clientHeight;
      if (maxScroll <= 0) return;

      const currentRatio = scrollTop / maxScroll;
      if (currentRatio >= 0.99) {
        // Loop back to start
        containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const step = maxScroll / (STORM_PHASES.length - 1) / 30; // smooth 30 steps per phase
        containerRef.current.scrollTop += step;
      }
    }, 120);

    return () => {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
    };
  }, [isPlaying]);

  // Jump to specific phase
  const scrollToPhase = useCallback((index: number) => {
    if (!containerRef.current) return;
    const { scrollHeight, clientHeight } = containerRef.current;
    const maxScroll = scrollHeight - clientHeight;
    const targetScroll = maxScroll * (index / (STORM_PHASES.length - 1));
    containerRef.current.scrollTo({ top: targetScroll, behavior: 'smooth' });
    setActivePhaseIndex(index);
    setContinuousPhase(index);
    setScrollProgress(index / (STORM_PHASES.length - 1));
  }, []);

  const currentPhase = STORM_PHASES[activePhaseIndex];
  const dynamicMetrics = getInterpolatedMetrics(continuousPhase);

  const phaseNavOptions: PhaseNavOption[] = STORM_PHASES.map((p) => ({
    id: p.id,
    timeLabel: p.timeLabel,
    name: p.phaseName,
    subtitle: p.subtitle
  }));

  return (
    <div className="relative h-screen w-screen bg-ocean-950 text-ice-100 overflow-hidden flex flex-col font-sans select-none">
      {/* Top Scrollytelling Header */}
      <header className="h-14 bg-ocean-950/95 backdrop-blur-md border-b border-steel-800 px-5 flex items-center justify-between z-40 shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToTactical}
            className="px-3 py-1.5 bg-ocean-900 hover:bg-ocean-800 border border-steel-800 hover:border-ice-500/40 rounded-lg text-steel-400 hover:text-ice-100 transition-colors flex items-center space-x-2 text-xs font-sans font-semibold"
          >
            <ArrowLeft className="w-4 h-4 text-ice-500" />
            <span>Tactical Command</span>
          </button>

          <div className="w-px h-5 bg-steel-800" />

          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-sm font-bold tracking-wider text-ice-100 uppercase">
                  Anatomy of a Cloudburst: 60 Minutes to Catastrophe
                </h1>
                <DataProvenanceBadge source="DATASET" />
              </div>
              <p className="text-[10px] text-steel-400 font-mono">
                Physical 4D Storm Evolution · Vertical Reflectivity Cross-Section (0–18 km)
              </p>
            </div>
          </div>
        </div>

        {/* Playback Controls & Progress */}
        <div className="flex items-center space-x-3">
          {/* Autoplay Toggle */}
          <div className="flex items-center space-x-1.5 bg-ocean-900 border border-steel-800 p-1 rounded-lg">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-2.5 py-1 rounded text-xs font-sans font-semibold flex items-center space-x-1.5 transition-colors ${
                isPlaying
                  ? 'bg-ice-500 text-ocean-950 font-bold'
                  : 'text-steel-400 hover:text-ice-100 hover:bg-ocean-800'
              }`}
              title={isPlaying ? 'Pause Simulation' : 'Autoplay Storm Simulation'}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Autoplay</span>
                </>
              )}
            </button>

            <button
              onClick={() => scrollToPhase(0)}
              className="p-1 rounded text-steel-400 hover:text-ice-100 hover:bg-ocean-800 transition-colors"
              title="Reset to Phase 1 (T-60 MIN)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Overall Progress Gauge */}
          <div className="hidden sm:flex items-center space-x-2 font-mono text-xs">
            <span className="text-steel-400 text-[10px]">LIFECYCLE</span>
            <div className="w-24 bg-ocean-900 h-2 rounded-full overflow-hidden border border-steel-800">
              <div
                className="bg-ice-500 h-full rounded-full transition-all duration-150"
                style={{ width: `${(scrollProgress * 100).toFixed(0)}%` }}
              />
            </div>
            <span className="text-ice-500 font-bold min-w-[32px] text-right">
              {Math.round(scrollProgress * 100)}%
            </span>
          </div>
        </div>
      </header>

      {/* Main Split Layout: Sticky Visual Stage (Left 60%) + Narrative Rail (Right 40%) */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto relative flex flex-col lg:flex-row scroll-smooth"
      >
        {/* Floating Vertical Phase Navigation Pill */}
        <div className="hidden xl:block fixed left-4 top-24 z-30">
          <PhaseNavigationPill
            phases={phaseNavOptions}
            activePhaseIndex={activePhaseIndex}
            onSelectPhase={scrollToPhase}
          />
        </div>

        {/* Left Sticky Stage (60% width on desktop) */}
        <div className="lg:w-3/5 h-[65vh] lg:h-full lg:sticky lg:top-0 bg-ocean-950 p-3 lg:p-4 flex flex-col gap-2.5 z-10 border-b lg:border-b-0 lg:border-r border-steel-800 shrink-0">
          {/* Top Live AI Telemetry HUD */}
          <AITelemetryHUD metrics={dynamicMetrics} timeLabel={currentPhase.timeLabel} />

          {/* Center Vertical Radar Reflectivity Cross-Section Canvas */}
          <div className="flex-1 min-h-0 relative rounded-xl border border-steel-800 overflow-hidden bg-ocean-950 shadow-2xl">
            <VerticalRadarCrossSection
              phaseIndex={activePhaseIndex}
              scrollProgress={scrollProgress}
              continuousPhase={continuousPhase}
              phase={currentPhase}
            />
          </div>

          {/* Bottom ConvectNet Feature Attribution Panel */}
          <FeatureAttributionPanel
            attribution={currentPhase.attribution}
            phaseName={currentPhase.phaseName}
          />
        </div>

        {/* Right Narrative Scroll Rail (40% width on desktop, 5 Chapters) */}
        <div className="lg:w-2/5 p-6 lg:p-8 space-y-36 pb-36">
          {STORM_PHASES.map((phase, idx) => {
            const isActive = activePhaseIndex === idx;
            return (
              <section
                key={phase.id}
                className={`transition-all duration-500 p-6 rounded-2xl ${
                  isActive
                    ? 'glass-card-elevated border-ice-500/40 scale-100 opacity-100 shadow-[0_0_35px_rgba(0,229,255,0.18)]'
                    : 'glass-card border-white/[0.05] opacity-55 scale-95'
                }`}
              >
                {/* Chapter Header */}
                <div className="flex items-center justify-between pb-3 border-b border-steel-800/80">
                  <span className="text-xs font-mono font-bold text-ice-500 bg-ice-500/10 px-2.5 py-1 rounded border border-ice-500/30">
                    {phase.timeLabel}
                  </span>
                  <span className="text-xs font-mono text-steel-400">
                    PHASE {phase.id} OF 5
                  </span>
                </div>

                {/* Title & Subtitle */}
                <h2 className="text-2xl font-bold font-sans text-ice-100 mt-4 leading-tight">
                  {phase.phaseName}
                </h2>
                <p className="text-xs font-sans text-steel-400 font-medium uppercase tracking-wider mt-1.5">
                  {phase.subtitle}
                </p>

                {/* Physical Description */}
                <p className="text-sm font-sans text-ice-200/90 leading-relaxed mt-4">
                  {phase.physicsDescription}
                </p>

                {/* Observed Atmospheric Phenomena Box */}
                <div className="mt-5 bg-ocean-950/75 border border-steel-800 rounded-xl p-3.5 space-y-2">
                  <div className="text-[11px] font-sans font-bold uppercase tracking-wider text-ice-500 flex items-center space-x-1.5">
                    <span>Key Atmospheric Signatures:</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-steel-400 font-sans">
                    {phase.metPhenomena.map((item, i) => (
                      <li key={i} className="flex items-start space-x-2">
                        <span className="text-ice-500 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Snapshot Metric Grid in JetBrains Mono */}
                <div className="grid grid-cols-3 gap-2.5 mt-5">
                  <div className="bg-ocean-900/60 border border-steel-800/80 p-2.5 rounded-lg text-center">
                    <span className="text-[9px] uppercase font-sans text-steel-400 font-semibold">
                      Core Peak Z
                    </span>
                    <div className="text-xl font-bold font-mono text-ice-100 mt-0.5">
                      {phase.metrics.zMax.toFixed(1)}{' '}
                      <span className="text-[10px] text-steel-400 font-normal">dBZ</span>
                    </div>
                  </div>

                  <div className="bg-ocean-900/60 border border-steel-800/80 p-2.5 rounded-lg text-center">
                    <span className="text-[9px] uppercase font-sans text-steel-400 font-semibold">
                      Updraft (w)
                    </span>
                    <div
                      className={`text-xl font-bold font-mono mt-0.5 ${
                        phase.metrics.updraftVelocity >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {phase.metrics.updraftVelocity > 0
                        ? `+${phase.metrics.updraftVelocity}`
                        : phase.metrics.updraftVelocity}{' '}
                      <span className="text-[10px] text-steel-400 font-normal">m/s</span>
                    </div>
                  </div>

                  <div className="bg-ocean-900/60 border border-steel-800/80 p-2.5 rounded-lg text-center">
                    <span className="text-[9px] uppercase font-sans text-steel-400 font-semibold">
                      Rain Rate
                    </span>
                    <div
                      className={`text-xl font-bold font-mono mt-0.5 ${
                        phase.metrics.rainRateMmh >= 100
                          ? 'text-red-400 animate-pulse font-black'
                          : 'text-ice-100'
                      }`}
                    >
                      {phase.metrics.rainRateMmh.toFixed(0)}{' '}
                      <span className="text-[10px] text-steel-400 font-normal">mm/h</span>
                    </div>
                  </div>
                </div>

                {/* Chapter Jump Button */}
                <div className="mt-5 pt-4 border-t border-steel-800/60 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-steel-400">
                    Phase {idx + 1} of 5
                  </span>
                  <button
                    onClick={() => scrollToPhase(idx)}
                    className="px-3 py-1 bg-ocean-800 hover:bg-ocean-700 text-ice-400 hover:text-ice-100 rounded-md text-xs font-sans font-medium transition-colors border border-steel-700"
                  >
                    Focus Phase {idx + 1}
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
};
