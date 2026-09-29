import React, { useState } from 'react';
import { ShieldAlert, Droplets, MapPin, Wind, ThermometerSun, Search } from 'lucide-react';

export const IMDOfficialFeaturesMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState<string | null>(null);

  const features = [
    {
      id: 'mausamgram',
      title: 'MausamGram (Hyper-Local)',
      desc: 'Pin-code & admin boundary forecasts.',
      icon: <MapPin className="w-4 h-4 text-emerald-400" />,
      tag: 'LIVE',
    },
    {
      id: 'rainfall',
      title: 'Rainfall Monitoring',
      desc: 'District-level actual vs normal departures.',
      icon: <Droplets className="w-4 h-4 text-blue-400" />,
      tag: 'ACTIVE',
    },
    {
      id: 'extreme',
      title: 'Extreme Weather Trackers',
      desc: 'GIS layers for cyclones & heatwaves.',
      icon: <ThermometerSun className="w-4 h-4 text-rose-400" />,
      tag: 'WARNINGS',
    }
  ];

  return (
    <div className="absolute top-20 left-4 z-40 flex flex-col items-start pointer-events-auto">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-[#090d15]/95 border border-indigo-500/50 hover:bg-[#111723] text-indigo-300 px-4 py-2 rounded-lg shadow-2xl backdrop-blur transition-all font-mono text-xs uppercase font-bold tracking-wider"
      >
        <img src="https://mausam.imd.gov.in/imd_latest/contents/img/IMD_logo.png" alt="IMD Logo" className="w-5 h-5 object-contain filter invert opacity-80" onError={(e) => (e.currentTarget.style.display = 'none')} />
        IMD GIS Services Hub
      </button>

      {isOpen && (
        <div className="mt-2 w-72 bg-[#0a0f18]/95 border border-[#1e2736] rounded-xl shadow-2xl backdrop-blur-xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
          <div className="p-3 border-b border-[#1e2736] bg-[#0d131f]">
            <div className="flex items-center gap-2 bg-[#06080c] border border-[#1e2736] rounded-md px-2 py-1.5">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <input type="text" placeholder="Search MausamGram pin code..." className="bg-transparent text-slate-300 text-xs font-mono focus:outline-none w-full" />
            </div>
          </div>
          <div className="flex flex-col p-1.5">
            {features.map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFeature(f.id === activeFeature ? null : f.id)}
                className={`flex items-start gap-3 p-2.5 rounded-lg text-left transition-all ${
                  activeFeature === f.id ? 'bg-indigo-900/30 border border-indigo-500/30' : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="mt-0.5">{f.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-200">{f.title}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#1e2736] text-slate-400">{f.tag}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{f.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
