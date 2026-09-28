import React, { useState } from 'react';
import { Layers, ChevronDown } from 'lucide-react';
import { WeatherMapFormat } from './WeatherRasterOverlay';

export interface WeatherFormatSelectorProps {
  currentFormat: WeatherMapFormat;
  onSelectFormat: (format: WeatherMapFormat) => void;
  className?: string;
  compact?: boolean;
}

export interface WeatherFormatOption {
  id: WeatherMapFormat;
  label: string;
  shortLabel: string;
  badge: string;
  icon: string;
  description: string;
  category: 'satellite' | 'radar' | 'thermo' | 'basemap';
}

export const WEATHER_FORMAT_OPTIONS: WeatherFormatOption[] = [
  {
    id: 'radar',
    label: 'Doppler Radar Reflectivity (dBZ)',
    shortLabel: 'Doppler Radar',
    badge: 'Live Mosaic',
    icon: '📡',
    description: 'Real composite Doppler radar tiles (RainViewer Open Radar API & IMD DWR mosaic) across Odisha/India.',
    category: 'radar',
  },
  {
    id: 'insat_ir',
    label: 'INSAT-3DR Thermal IR (10.8µm)',
    shortLabel: 'INSAT-3DR IR',
    badge: 'IMD WMS Live',
    icon: '🛰️',
    description: 'Direct official IMD INSAT-3DR Thermal Infrared (10.8µm) WMS stream showing real cloud tops.',
    category: 'satellite',
  },
  {
    id: 'ir_rainbow',
    label: 'Thermal IR Rainbow (BT [K])',
    shortLabel: 'IR Rainbow (BT)',
    badge: '180K–245K',
    icon: '🌈',
    description: 'Dvorak / BD-curve calibrated brightness temperature gradient for overshooting convective towers.',
    category: 'satellite',
  },
  {
    id: 'temperature',
    label: 'Surface 2m Temperature (°C / K)',
    shortLabel: 'Surface Heat',
    badge: 'Live 2m',
    icon: '🌡️',
    description: 'Real 2m thermal raster field with smooth meteorological gradient, Open-Meteo & in-situ AWS station data.',
    category: 'thermo',
  },
  {
    id: 'pressure',
    label: 'Atmospheric Pressure & Isobars (hPa)',
    shortLabel: 'MSLP Isobars',
    badge: 'Dynamic hPa',
    icon: '🧭',
    description: 'Real mean sea level pressure field with dynamic isobar contour lines identifying surface mesolows.',
    category: 'thermo',
  },
  {
    id: 'humidity',
    label: 'Relative Humidity & Saturation (%)',
    shortLabel: 'Humidity / WV',
    badge: 'Live % RH',
    icon: '💧',
    description: 'Real relative humidity (%) and mid-tropospheric water vapor saturation contours.',
    category: 'thermo',
  },
  {
    id: 'enhanced_cloud',
    label: 'Enhanced Cloud Canopy (Windy)',
    shortLabel: 'Cloud Canopy',
    badge: 'Windy Style',
    icon: '☁️',
    description: 'Convective cloud canopy with embedded high-altitude glaciated cores.',
    category: 'satellite',
  },
  {
    id: 'satellite',
    label: 'Satellite HD (Runways & Streets)',
    shortLabel: 'Satellite HD',
    badge: 'Esri World',
    icon: '🗺️',
    description: 'High-resolution true color optical imagery for airfield runways and aerodrome perimeters.',
    category: 'basemap',
  },
  {
    id: 'dark',
    label: 'Dark Tactical Canvas',
    shortLabel: 'Dark Canvas',
    badge: 'C2 Tactical',
    icon: '🌑',
    description: 'Minimalist high-contrast dark vector cartography for night tactical operations.',
    category: 'basemap',
  },
];

export const WeatherFormatSelector: React.FC<WeatherFormatSelectorProps> = ({
  currentFormat,
  onSelectFormat,
  className = '',
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Normalize legacy format alias 'dwr_radar' to 'radar'
  const activeOption =
    WEATHER_FORMAT_OPTIONS.find(
      (o) => o.id === currentFormat || (currentFormat === 'dwr_radar' && o.id === 'radar')
    ) || WEATHER_FORMAT_OPTIONS[0];

  return (
    <div className={`relative inline-block text-left pointer-events-auto ${className}`}>
      {/* Dropdown / Quick Switch Pill */}
      <div className="flex items-center bg-[#0a0f1d]/95 backdrop-blur-xl border border-[#1f293d] rounded-xl p-1 shadow-2xl space-x-1 font-mono text-xs">
        {/* Quick icon indicator */}
        <div className="px-2 py-1 text-slate-400 font-bold flex items-center space-x-1.5 border-r border-[#1f293d] pr-2.5">
          <Layers className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-[10px] uppercase text-slate-300 hidden md:inline">Layer:</span>
        </div>

        {/* Dropdown Toggle Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#141d30] hover:bg-[#1a2640] border border-[#263756] text-white font-bold transition-all"
        >
          <span>{activeOption.icon}</span>
          <span>{compact ? activeOption.shortLabel : activeOption.label}</span>
          <span className="px-1.5 py-0.2 rounded text-[9px] bg-sky-500/20 text-sky-300 border border-sky-500/30">
            {activeOption.badge}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[600]" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-84 z-[700] bg-[#0a0f1d]/98 backdrop-blur-2xl border border-[#1f293d] rounded-xl shadow-2xl p-2 font-mono text-xs space-y-1 max-h-[80vh] overflow-y-auto">
            <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#1f293d] flex justify-between">
              <span>Select Weather Raster Feed</span>
              <span className="text-sky-400">IMD / RainViewer Live</span>
            </div>

            {WEATHER_FORMAT_OPTIONS.map((opt) => {
              const isSelected =
                currentFormat === opt.id || (currentFormat === 'dwr_radar' && opt.id === 'radar');
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onSelectFormat(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-lg transition-all flex items-start space-x-2.5 ${
                    isSelected
                      ? 'bg-sky-500/20 border border-sky-500/40 text-white shadow-sm'
                      : 'hover:bg-[#131b2e] text-slate-300 border border-transparent'
                  }`}
                >
                  <span className="text-base shrink-0 mt-0.5">{opt.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white truncate">{opt.label}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                          isSelected
                            ? 'bg-sky-500 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {opt.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">
                      {opt.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default WeatherFormatSelector;
