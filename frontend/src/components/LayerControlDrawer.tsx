import React from 'react';
import { X, Layers, Eye, EyeOff, Sliders, Shield, Cloud, Zap, Radio, Map as MapIcon, Compass } from 'lucide-react';
import { MapLayerConfig } from '../types';

interface LayerControlDrawerProps {
  layers: MapLayerConfig[];
  onToggleLayer: (id: string) => void;
  onChangeOpacity: (id: string, opacity: number) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const LayerControlDrawer: React.FC<LayerControlDrawerProps> = ({
  layers,
  onToggleLayer,
  onChangeOpacity,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const getLayerIcon = (layer: MapLayerConfig) => {
    switch (layer.category) {
      case 'operational_radar':
        return <Radio className="w-4 h-4 text-emerald-400" />;
      case 'ogc_gov':
        if (layer.id.includes('sat')) return <Cloud className="w-4 h-4 text-blue-400" />;
        if (layer.id.includes('lightning')) return <Zap className="w-4 h-4 text-amber-400" />;
        return <MapIcon className="w-4 h-4 text-cyan-400" />;
      case 'ai_hazard':
        return <Shield className="w-4 h-4 text-purple-400" />;
      case 'vector_overlay':
        return <Compass className="w-4 h-4 text-orange-400" />;
      default:
        return <Layers className="w-4 h-4 text-slate-400" />;
    }
  };

  const getProviderBadge = (provider: MapLayerConfig['provider']) => {
    switch (provider) {
      case 'MOSDAC':
        return <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-500/40 text-blue-300 font-mono font-bold">MOSDAC</span>;
      case 'IMD':
        return <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono font-bold">IMD MoES</span>;
      case 'Bhuvan':
        return <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-950/80 border border-orange-500/40 text-orange-300 font-mono font-bold">ISRO Bhuvan</span>;
      case 'ConvectNet':
        return <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-500/40 text-purple-300 font-mono font-bold">ConvectNet AI</span>;
    }
  };

  return (
    <div className="fixed top-14 left-0 bottom-0 w-80 md:w-96 bg-[#0a0d15]/95 border-r border-[#1e293b] backdrop-blur-2xl shadow-2xl z-30 flex flex-col font-mono select-none overflow-hidden animate-in slide-in-from-left duration-200">
      {/* Header */}
      <div className="p-3.5 border-b border-[#1e293b] bg-[#131928]/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white tracking-wider">OGC & OPERATIONAL LAYERS</h2>
            <p className="text-[10px] text-slate-400">Independent WMS/WFS/Vector Controls</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          title="Close Layer Controller"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Layer List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {layers.map((layer) => (
          <div
            key={layer.id}
            className={`p-3 rounded-lg border transition-all ${
              layer.visible
                ? 'bg-[#131928]/60 border-[#334155]'
                : 'bg-[#0e1422]/40 border-[#1e293b]/60 opacity-60'
            }`}
          >
            {/* Top row: Icon, Name, Provider Badge, Toggle */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 p-1 rounded bg-black/40 border border-[#1e293b]">
                  {getLayerIcon(layer)}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-slate-200">
                      {layer.title}
                    </span>
                    {getProviderBadge(layer.provider)}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                    {layer.description}
                  </p>
                </div>
              </div>

              {/* Visibility Toggle Button */}
              <button
                onClick={() => onToggleLayer(layer.id)}
                className={`p-1.5 rounded transition-colors ${
                  layer.visible
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 hover:bg-blue-600/50'
                    : 'bg-slate-800/60 text-slate-500 border border-slate-700/60 hover:text-slate-300'
                }`}
                title={layer.visible ? 'Hide layer' : 'Show layer'}
              >
                {layer.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            {/* Opacity Slider */}
            {layer.visible && (
              <div className="mt-3 pt-2 border-t border-[#1e293b]/60 flex items-center justify-between gap-3 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Sliders className="w-3 h-3 text-slate-500" />
                  <span>Opacity</span>
                </div>
                <div className="flex items-center gap-2 flex-1 max-w-[160px]">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(layer.opacity * 100)}
                    onChange={(e) => onChangeOpacity(layer.id, parseFloat(e.target.value) / 100)}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <span className="w-8 text-right font-mono text-[10px] text-slate-300">
                    {Math.round(layer.opacity * 100)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-[#131928]/60 border-t border-[#1e293b] text-[10px] text-slate-500 flex items-center justify-between">
        <span>Direct OGC Protocol (Zero Iframe)</span>
        <span className="text-slate-400">EPSG:3857 / EPSG:4326</span>
      </div>
    </div>
  );
};
