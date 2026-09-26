import React, { useState } from 'react';
import { 
  Database, 
  Cpu, 
  Wind, 
  CloudLightning, 
  BellRing, 
  ArrowRight,
  Layers,
  Activity,
  FileText,
  LineChart,
  BarChart3,
  Radar,
  Network
} from 'lucide-react';

const ArchitecturePage: React.FC = () => {
  const [activeStage, setActiveStage] = useState<number | null>(null);

  const pipelineStages = [
    {
      id: 1,
      title: "Data Ingestion",
      icon: <Database className="w-8 h-8 text-blue-400" />,
      description: "Ingesting real-time multispectral satellite data (TIR, WV, VIS) and radar reflectivity data.",
      sources: ["MOSDAC (INSAT-3D/3DR)", "IMD Radars", "SEVIR Dataset"]
    },
    {
      id: 2,
      title: "Preprocessing",
      icon: <Cpu className="w-8 h-8 text-purple-400" />,
      description: "Data alignment, normalization, grid interpolation, and sequence generation (10-min intervals).",
      sources: []
    },
    {
      id: 3,
      title: "Optical Flow Nowcast",
      icon: <Wind className="w-8 h-8 text-teal-400" />,
      description: "Extrapolating motion vectors using PySTEPS dense optical flow (Lucas-Kanade/DIS) for tracking.",
      sources: []
    },
    {
      id: 4,
      title: "ConvectNet Engine",
      icon: <Network className="w-8 h-8 text-rose-400" />,
      description: "Deep learning spatiotemporal prediction for severe hazard identification (POSH, SHI).",
      sources: []
    },
    {
      id: 5,
      title: "Alert Generation",
      icon: <BellRing className="w-8 h-8 text-amber-400" />,
      description: "Threshold-based geospatial alert dissemination for localized high-impact weather events.",
      sources: []
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 md:p-12 font-sans selection:bg-blue-500/30">
      
      {/* Header Section */}
      <div className="max-w-6xl mx-auto mb-16 text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
          System Architecture
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
          Explore the inner workings of VAJRA's hybrid physical-AI pipeline, merging dense optical flow with advanced spatiotemporal deep learning.
        </p>
      </div>

      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Pipeline Section */}
        <section className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-32 bg-blue-500/5 rounded-full blur-3xl -z-10"></div>
          
          <div className="flex items-center gap-3 mb-8">
            <Layers className="w-6 h-6 text-indigo-400" />
            <h2 className="text-2xl font-bold text-white">5-Stage Nowcasting Pipeline</h2>
          </div>

          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            {pipelineStages.map((stage, index) => (
              <React.Fragment key={stage.id}>
                <div 
                  className={`relative flex flex-col items-center p-6 rounded-2xl border transition-all duration-300 cursor-pointer w-full lg:w-48
                    ${activeStage === stage.id 
                      ? 'bg-indigo-900/40 border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.2)] scale-105 z-10' 
                      : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                    }`}
                  onMouseEnter={() => setActiveStage(stage.id)}
                  onMouseLeave={() => setActiveStage(null)}
                >
                  <div className="mb-4 bg-slate-900 p-4 rounded-full border border-slate-700/50 shadow-inner">
                    {stage.icon}
                  </div>
                  <h3 className="text-center font-semibold text-slate-200 mb-2">{stage.title}</h3>
                  
                  {activeStage === stage.id && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-64 bg-slate-800 border border-slate-700 p-4 rounded-xl shadow-xl z-20 text-sm text-slate-300 animate-in fade-in duration-200">
                      <p>{stage.description}</p>
                      {stage.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-700">
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Data Sources</span>
                          <ul className="mt-1 space-y-1">
                            {stage.sources.map(src => (
                              <li key={src} className="flex items-center gap-1.5 text-xs text-blue-300">
                                <Radar className="w-3 h-3" /> {src}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {index < pipelineStages.length - 1 && (
                  <ArrowRight className="hidden lg:block w-6 h-6 text-slate-600 flex-shrink-0" />
                )}
                {index < pipelineStages.length - 1 && (
                  <ArrowRight className="block lg:hidden w-6 h-6 text-slate-600 rotate-90 my-2 flex-shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* ConvectNet Model Section */}
          <section className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <Network className="w-6 h-6 text-rose-400" />
              <h2 className="text-2xl font-bold text-white">ConvectNet Architecture</h2>
            </div>
            
            <p className="text-slate-400 mb-8 leading-relaxed">
              Our proprietary neural network leverages attention mechanisms to focus on severe convective signatures while maintaining spatial coherence across temporal sequences.
            </p>

            <div className="flex-1 flex flex-col justify-center py-4">
              <div className="flex flex-col space-y-6 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
                
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full border border-slate-700 bg-slate-900 text-slate-400 group-hover:text-emerald-400 group-hover:border-emerald-500/50 transition-colors shadow-[0_0_0_8px_rgba(15,23,42,1)] z-10 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                    <Database size={20} />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-4 rounded-xl border border-slate-800 bg-slate-950/50 shadow-sm group-hover:border-slate-600 transition-colors">
                    <h4 className="font-bold text-slate-200">Spatial Encoder</h4>
                    <p className="text-sm text-slate-500 mt-1">Extracts hierarchical multi-scale feature maps from input tensors using ResNet blocks.</p>
                  </div>
                </div>

                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full border border-slate-700 bg-slate-900 text-slate-400 group-hover:text-blue-400 group-hover:border-blue-500/50 transition-colors shadow-[0_0_0_8px_rgba(15,23,42,1)] z-10 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                    <Activity size={20} />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-4 rounded-xl border border-slate-800 bg-slate-950/50 shadow-sm group-hover:border-slate-600 transition-colors">
                    <h4 className="font-bold text-slate-200">CBAM Attention</h4>
                    <p className="text-sm text-slate-500 mt-1">Convolutional Block Attention Module refines features spatially and channel-wise.</p>
                  </div>
                </div>

                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full border border-slate-700 bg-slate-900 text-slate-400 group-hover:text-purple-400 group-hover:border-purple-500/50 transition-colors shadow-[0_0_0_8px_rgba(15,23,42,1)] z-10 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                    <LineChart size={20} />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-4 rounded-xl border border-slate-800 bg-slate-950/50 shadow-sm group-hover:border-slate-600 transition-colors">
                    <h4 className="font-bold text-slate-200">ConvLSTM Core</h4>
                    <p className="text-sm text-slate-500 mt-1">Models temporal evolution and cell trajectory dynamics over the forecast horizon.</p>
                  </div>
                </div>

                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full border border-slate-700 bg-slate-900 text-slate-400 group-hover:text-amber-400 group-hover:border-amber-500/50 transition-colors shadow-[0_0_0_8px_rgba(15,23,42,1)] z-10 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                    <CloudLightning size={20} />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-4 rounded-xl border border-slate-800 bg-slate-950/50 shadow-sm group-hover:border-slate-600 transition-colors">
                    <h4 className="font-bold text-slate-200">Hazard Decoder</h4>
                    <p className="text-sm text-slate-500 mt-1">Reconstructs predictions into physical probability fields (POSH, SHI).</p>
                  </div>
                </div>

              </div>
            </div>
          </section>

          <div className="space-y-8 flex flex-col">
            
            {/* Methodology & Verification */}
            <section className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-3xl p-8 shadow-2xl flex-1">
              <div className="flex items-center gap-3 mb-6">
                <BarChart3 className="w-6 h-6 text-emerald-400" />
                <h2 className="text-2xl font-bold text-white">Verification & Metrics</h2>
              </div>
              <p className="text-slate-400 mb-6 text-sm">
                Model performance evaluated using Fractions Skill Score (FSS) and Critical Success Index (CSI) over varying spatial scales and lead times.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl overflow-hidden border border-slate-700/50 bg-slate-950 group relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60 z-10"></div>
                  <img src="/convectnet_verification_curve.png" alt="Verification Curve" className="w-full h-32 object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-slate-950 to-transparent z-20">
                    <p className="text-xs font-semibold text-white">FSS vs Lead Time</p>
                  </div>
                </div>
                <div className="rounded-xl overflow-hidden border border-slate-700/50 bg-slate-950 group relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60 z-10"></div>
                  <img src="/convectnet_nowcast_comparison.png" alt="Nowcast Comparison" className="w-full h-32 object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-slate-950 to-transparent z-20">
                    <p className="text-xs font-semibold text-white">Model Comparison</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Scientific References */}
            <section className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <FileText className="w-6 h-6 text-blue-400" />
                <h2 className="text-2xl font-bold text-white">Scientific Foundations</h2>
              </div>
              <ul className="space-y-4">
                <li className="flex gap-3 items-start group">
                  <div className="mt-0.5 p-1.5 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <FileText size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200">Probability of Severe Hail (POSH) & SHI</h4>
                    <p className="text-xs text-slate-500 mt-1">Witt, A., et al. (1998). "An Enhanced Hail Detection Algorithm for the WSR-88D."</p>
                  </div>
                </li>
                <li className="flex gap-3 items-start group">
                  <div className="mt-0.5 p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                    <FileText size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200">Fractions Skill Score (FSS)</h4>
                    <p className="text-xs text-slate-500 mt-1">Roberts, N. M., & Lean, H. W. (2008). "Scale-Selective Verification of Rainfall Accumulations."</p>
                  </div>
                </li>
                <li className="flex gap-3 items-start group">
                  <div className="mt-0.5 p-1.5 rounded-lg bg-teal-500/10 text-teal-400 group-hover:bg-teal-500 group-hover:text-white transition-colors">
                    <FileText size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200">Dense Optical Flow</h4>
                    <p className="text-xs text-slate-500 mt-1">Pulkkinen, S., et al. (2019). "pysteps: an open-source Python library for weather radar nowcasting."</p>
                  </div>
                </li>
              </ul>
            </section>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArchitecturePage;
