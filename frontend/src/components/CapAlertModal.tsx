import React, { useState } from 'react';
import { X, Send, Radio, Copy, Check, Download, AlertTriangle, FileCode, CheckCircle2 } from 'lucide-react';
import { GridCellData } from '../types';

interface CapAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  cellData?: GridCellData | null;
  isReplayActive?: boolean;
}

export const CapAlertModal: React.FC<CapAlertModalProps> = ({
  isOpen,
  onClose,
  cellData,
  isReplayActive = false,
}) => {
  const [activeFormat, setActiveFormat] = useState<'xml' | 'json'>('xml');
  const [copied, setCopied] = useState(false);
  const [isDispatched, setIsDispatched] = useState(false);

  if (!isOpen) return null;

  const lat = cellData?.coordinates.lat || 25.2702;
  const lon = cellData?.coordinates.lon || 91.7323;
  const dbz = cellData?.observations.radar_dbz || 52.1;
  const rainRate = cellData?.observations.rainfall_rate || 78.4;
  const ciProb = cellData?.ai_hazards.ci_prob || 87;
  const cloudburstProb = cellData?.ai_hazards.cloudburst_prob || 73;
  const etaMin = cellData?.storm_motion.eta_min || 24;

  const alertId = `IN-MEG-IMD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-NC-${Math.floor(1000 + Math.random() * 9000)}`;
  const timestamp = new Date().toISOString();

  const capXml = `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>${alertId}</identifier>
  <sender>mc.shillong@imd.gov.in</sender>
  <sent>${timestamp}</sent>
  <status>${isReplayActive ? 'Exercise' : 'Actual'}</status>
  <msgType>Alert</msgType>
  <scope>Public</scope>
  <code>IMD-MoES-CAP-v1.2</code>
  <info>
    <category>Met</category>
    <event>Severe Thunderstorm &amp; Cloudburst Warning</event>
    <urgency>Immediate</urgency>
    <severity>${cloudburstProb >= 70 ? 'Extreme' : 'Severe'}</severity>
    <certainty>${ciProb >= 80 ? 'Observed' : 'Likely'}</certainty>
    <eventCode>
      <valueName>IMD_COLOR_CODE</valueName>
      <value>RED</value>
    </eventCode>
    <expires>${new Date(Date.now() + 3 * 3600 * 1000).toISOString()}</expires>
    <senderName>India Meteorological Department - MC Shillong</senderName>
    <headline>RED WARNING: Imminent Severe Convective Cloudburst (${rainRate} mm/h) over East Khasi Hills (Sohra / Cherrapunji)</headline>
    <description>ConvectNet Hybrid AI Nowcasting has detected deep convective intensification at ${lat.toFixed(4)}N, ${lon.toFixed(4)}E (Reflectivity: ${dbz} dBZ, Rain Rate: ${rainRate} mm/h). Cloudburst risk evaluated at ${cloudburstProb}%. High probability of localized flash floods and landslide triggers within ${etaMin} minutes along Khasi escarpment.</description>
    <instruction>1. Evacuate low-lying river channels in Sohra, Mawphlang, and Shella gorges immediately.
2. Avoid traveling on Shillong-Sohra highway due to rockfall and flash inundation risks.
3. Keep emergency batteries charged and monitor NDMA Sachet updates.</instruction>
    <parameter>
      <valueName>ConvectNet_CI_Probability</valueName>
      <value>${ciProb}%</value>
    </parameter>
    <parameter>
      <valueName>ConvectNet_Cloudburst_Risk</valueName>
      <value>${cloudburstProb}%</value>
    </parameter>
    <parameter>
      <valueName>Estimated_Time_to_Impact</valueName>
      <value>${etaMin} minutes</value>
    </parameter>
    <area>
      <areaDesc>East Khasi Hills (Sohra, Mawphlang, Shella Bholaganj Blocks)</areaDesc>
      <circle>${lat.toFixed(4)},${lon.toFixed(4)},15.0</circle>
      <geocode>
        <valueName>FIPS_DISTRICT</valueName>
        <value>IN.ML.EK</value>
      </geocode>
    </area>
  </info>
</alert>`;

  const capJson = JSON.stringify(
    {
      cap_version: '1.2',
      identifier: alertId,
      sender: 'mc.shillong@imd.gov.in',
      sent: timestamp,
      status: isReplayActive ? 'Exercise' : 'Actual',
      msgType: 'Alert',
      scope: 'Public',
      info: {
        category: 'Met',
        event: 'Severe Thunderstorm & Cloudburst Warning',
        urgency: 'Immediate',
        severity: cloudburstProb >= 70 ? 'Extreme' : 'Severe',
        certainty: ciProb >= 80 ? 'Observed' : 'Likely',
        headline: `RED WARNING: Imminent Severe Cloudburst over East Khasi Hills (Sohra)`,
        areaDesc: 'East Khasi Hills (Sohra, Mawphlang, Shella Blocks)',
        centroid: [lat, lon],
        radius_km: 15.0,
        convectnet_telemetry: {
          radar_dbz: dbz,
          rainfall_rate_mmh: rainRate,
          ci_probability: ciProb,
          cloudburst_risk: cloudburstProb,
          eta_minutes: etaMin,
        },
        ndma_target_nodes: [
          'NDMA_SACHET_GW',
          'SDMA_MEGHALAYA_DISPATCH',
          'DISTRICT_MAGISTRATE_EKH',
        ],
      },
    },
    null,
    2
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(activeFormat === 'xml' ? capXml : capJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = activeFormat === 'xml' ? capXml : capJson;
    const blob = new Blob([content], { type: activeFormat === 'xml' ? 'application/xml' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${alertId}.${activeFormat}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDispatch = () => {
    setIsDispatched(true);
    setTimeout(() => setIsDispatched(false), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-mono select-none">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#0c1220] border border-[#1e293b] rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-[#1e293b] bg-[#131928] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-wider">
                  COMMON ALERTING PROTOCOL (CAP v1.2) DISPATCHER
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                  ITU-T X.1303 / NDMA
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Standard interoperable disaster warning payload for NDMA Sachet & State Disaster Management Authorities
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selectors and Actions */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1e293b] bg-[#0f172a]/60">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveFormat('xml')}
              className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                activeFormat === 'xml'
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#1e293b] text-slate-400 hover:text-slate-200'
              }`}
            >
              CAP v1.2 XML (WMO Standard)
            </button>
            <button
              onClick={() => setActiveFormat('json')}
              className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                activeFormat === 'json'
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#1e293b] text-slate-400 hover:text-slate-200'
              }`}
            >
              NDMA Sachet JSON
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-[#1e293b] hover:bg-[#283548] text-slate-300 hover:text-white transition-colors border border-slate-700"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-[#1e293b] hover:bg-[#283548] text-slate-300 hover:text-white transition-colors border border-slate-700"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>

        {/* Code View Area */}
        <div className="p-4 overflow-y-auto flex-1 bg-[#090d16]">
          <pre className="text-[11px] leading-relaxed font-mono text-emerald-400/90 whitespace-pre-wrap selection:bg-blue-500/30">
            {activeFormat === 'xml' ? capXml : capJson}
          </pre>
        </div>

        {/* Dispatch Action Footer */}
        <div className="p-3 border-t border-[#1e293b] bg-[#131928] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <Radio className="w-3.5 h-3.5 text-blue-400" />
            <span>Target: NDMA Sachet National Gateway + Meghalaya SDMA</span>
          </div>

          <div className="flex items-center gap-2">
            {isDispatched ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold animate-pulse">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                DISPATCHED TO NDMA SACHET
              </span>
            ) : (
              <button
                onClick={handleDispatch}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-lg shadow-rose-900/30 transition-all hover:scale-[1.02]"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Simulate NDMA Broadcast</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
