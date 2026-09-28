export type VisualIntelPageId = 
  | 'hazard' 
  | 'tactical' 
  | 'hyperlocal' 
  | 'inference' 
  | 'replay' 
  | 'grid' 
  | 'microburst' 
  | 'public';

export type AlertLevel = 'CRITICAL' | 'WARNING' | 'ADVISORY' | 'NOMINAL';

export interface VisualIntelSensor {
  name: string;
  specs: string;
  spatialDomain: string;
  resolution: string;
  cadence: string;
  parameters: string;
}

export interface WhatYouSee {
  summary: string;
  sensor: VisualIntelSensor;
  points: string[];
}

export interface DecodeItem {
  color: string;
  label: string;
  range: string;
  meaning: string;
}

export interface HowToDecode {
  summary: string;
  items: DecodeItem[];
  vectors?: string[];
  thresholds?: string[];
}

export interface ActionableDecision {
  level: AlertLevel;
  primaryAction: string;
  protocol: string;
  stakeholders: string[];
  triggerCondition: string;
  actionChecklist: string[];
}

export interface VisualIntelTicker {
  status: string;
  metric: string;
  action: string;
  level: AlertLevel;
}

export interface VisualIntelData {
  pageId: VisualIntelPageId;
  pageTitle: string;
  subtitle: string;
  badge: string;
  whatYouSee: WhatYouSee;
  howToDecode: HowToDecode;
  actionableDecision: ActionableDecision;
  ticker: VisualIntelTicker;
  sopProtocol?: string;
  problemStatementRef?: string;
}
