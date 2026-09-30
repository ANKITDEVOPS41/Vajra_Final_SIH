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
    id: 'dwr_radar',
    label: 'Doppler Radar Reflectivity (dBZ)',
    shortLabel: 'DWR Radar',
    badge: 'RainViewer Live',
    icon: '📡',
    description: 'Real composite Doppler radar tiles from RainViewer Open Radar API — live radar mosaic updated every 10 min.',
    category: 'radar',
  },
  {
    id: 'insat_ir',
    label: 'INSAT-3DR Thermal IR (10.8µm)',
    shortLabel: 'INSAT-3DR IR',
    badge: 'IMD WMS Live',
    icon: '🛰️',
    description: 'Official IMD INSAT-3DR Thermal Infrared WMS stream (reactjs.imd.gov.in) showing real cloud tops.',
    category: 'satellite',
  },
  {
    id: 'enhanced_cloud',
    label: 'IR + Radar Composite (Cloud Canopy)',
    shortLabel: 'IR + Radar',
    badge: 'Composite',
    icon: '☁️',
    description: 'Overlay of INSAT-3DR thermal IR plus RainViewer radar. Best for convective storm tracking.',
    category: 'satellite',
  },
  {
    id: 'temperature',
    label: 'Surface 2m Temperature (°C)',
    shortLabel: 'Surface Heat',
    badge: 'Open-Meteo',
    icon: '🌡️',
    description: 'Live 2m temperature field interpolated from Open-Meteo API and AWS station network.',
    category: 'thermo',
  },
  {
    id: 'pressure',
    label: 'Atmospheric Pressure & Isobars (hPa)',
    shortLabel: 'MSLP Isobars',
    badge: 'Dynamic hPa',
    icon: '🧭',
    description: 'Mean sea level pressure field with dynamic isobar contours identifying surface mesolows.',
    category: 'thermo',
  },
  {
    id: 'humidity',
    label: 'Relative Humidity & Water Vapor (%)',
    shortLabel: 'Humidity',
    badge: 'Open-Meteo',
    icon: '💧',
    description: 'Live relative humidity and mid-tropospheric water vapor from Open-Meteo.',
    category: 'thermo',
  },
  {
    id: 'satellite',
    label: 'OSM Basemap (Runways & Streets)',
    shortLabel: 'OSM Map',
    badge: 'OpenStreetMap',
    icon: '🗺️',
    description: 'OpenStreetMap + CartoDB vector basemap — high detail for airfield runways and aerodrome perimeters.',
    category: 'basemap',
  },
  {
    id: 'dark',
    label: 'Dark Tactical Canvas',
    shortLabel: 'Dark Canvas',
    badge: 'C2 Tactical',
    icon: '🌑',
    description: 'Minimalist dark vector cartography for night tactical operations.',
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
      <div className="flex items-center bg-[#0a0f1d]/95 backdrop-blur-xl border border-[#1f293d] rounded-xl p-1  space-x-1 font-mono text-xs">
        {/* Quick icon indicator */}
        <div className="px-2 py-1 text-[#d0d6e0] font-bold flex items-center space-x-1.5 border-r border-[#1f293d] pr-2.5">
          <Layers className="w-3.5 h-3.5 text-[#5e6ad2]" />
          <span className="text-[10px] uppercase text-[#f7f8f8] hidden md:inline">Layer:</span>
        </div>

        {/* Dropdown Toggle Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-4 py-1.5 rounded-full.5 rounded-xl bg-[#141d30] hover:bg-[#1a2640] border border-[#263756] text-[#f7f8f8] font-bold transition-all"
        >
          <span>{activeOption.icon}</span>
          <span>{compact ? activeOption.shortLabel : activeOption.label}</span>
          <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#5e6ad2]/20 text-sky-300 border border-[#5e6ad2]/30">
            {activeOption.badge}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#d0d6e0] transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[600]" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-84 z-[700] bg-[#0a0f1d]/98 backdrop-blur-2xl border border-[#1f293d] rounded-xl  p-2 font-mono text-xs space-y-1 max-h-[80vh] overflow-y-auto">
            <div className="px-4 py-1.5 rounded-full.5 text-[10px] font-bold text-[#d0d6e0] uppercase tracking-wider border-b border-[#1f293d] flex justify-between">
              <span>Select Weather Raster Feed</span>
              <span className="text-[#5e6ad2]">IMD / RainViewer Live</span>
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
                  className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start space-x-2.5 ${
                    isSelected
                      ? 'bg-[#5e6ad2]/20 border border-[#5e6ad2]/40 text-[#f7f8f8] '
                      : 'hover:bg-[#131b2e] text-[#f7f8f8] border border-transparent'
                  }`}
                >
                  <span className="text-base shrink-0 mt-0.5">{opt.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#f7f8f8] truncate">{opt.label}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                          isSelected
                            ? 'bg-[#5e6ad2] text-[#f7f8f8]'
                            : 'bg-[#08090a] text-[#d0d6e0]'
                        }`}
                      >
                        {opt.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#d0d6e0] mt-0.5 line-clamp-2">
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
