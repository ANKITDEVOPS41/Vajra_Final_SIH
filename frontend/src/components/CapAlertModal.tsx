import React, { useState } from 'react';
import { ShieldAlert, Copy, Check, Download, X } from 'lucide-react';
import { DataProvenanceBadge } from './DataProvenanceBadge';

interface CapAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  cellId: string;
}

export const CapAlertModal: React.FC<CapAlertModalProps> = ({
  isOpen,
  onClose,
  cellId
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const capXml = `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>CONVECTNOW-ALERT-${cellId}-20260924</identifier>
  <sender>ncrmwf.nowcast@moes.gov.in</sender>
  <sent>2026-09-24T04:00:00+05:30</sent>
  <status>Actual</status>
  <msgType>Alert</msgType>
  <scope>Public</scope>
  <info>
    <category>Met</category>
    <event>Severe Thunderstorm &amp; Cloudburst Warning</event>
    <urgency>Immediate</urgency>
    <severity>Extreme</severity>
    <certainty>Observed</certainty>
    <headline>IMMEDIATE HAZARD: Convective Storm Cell ${cellId} Approaching Rapidly</headline>
    <description>VAJRA multi-source radar and satellite fusion has detected an explosive convective core. Rain rate exceeding 100 mm/hr with high hail probability and severe downburst gusts up to 90 km/h.</description>
    <instruction>Take immediate shelter indoors. Avoid open fields, metal structures, and flood-prone drainage basins.</instruction>
    <area>
      <areaDesc>Northern Sector Urban &amp; Airport Corridor</areaDesc>
    </area>
  </info>
</alert>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(capXml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([capXml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CAP-ALERT-${cellId}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0e1a]/85 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="card-blizzard w-full max-w-2xl border border-red-500/40 rounded-3xl shadow-[0_20px_60px_rgba(239,68,68,0.2)] overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-[#111729]/90 border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-heading text-sm font-bold text-white uppercase tracking-wider">
                  NDMA / SDMA Common Alerting Protocol (CAP v1.2 XML)
                </h2>
                <DataProvenanceBadge source="LIVE" />
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Targeted Emergency Broadcast Payload for {cellId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* XML Viewer */}
        <div className="bg-[#0a0e1a] p-5 flex-1 overflow-y-auto">
          <pre className="text-xs font-mono text-emerald-400 leading-relaxed whitespace-pre-wrap select-all">
            {capXml}
          </pre>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-[#111729]/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">
            OASIS CAP v1.2 Standard · NDMA Direct Ingestion Standard
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="btn-blizzard-secondary text-xs px-4 py-2 flex items-center space-x-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied XML' : 'Copy'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="btn-blizzard-primary text-xs px-4 py-2 flex items-center space-x-1.5 bg-red-600 hover:bg-red-500 shadow-[0_0_16px_rgba(239,68,68,0.3)]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .XML</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
