export interface SeoData {
  keywords: string[];
  selectedTitle: string;
}

export interface ScriptContent {
  hook: string;
  body: string;
  cta: string;
  sceneBreakdown: string[];
}

export interface VisualPlan {
  imagePrompts: string[];
  videoPrompts: string[];
}

export interface MarketingData {
  targetUrl: string;
  offerType: string;
  validationStatus: 'pending' | 'valid' | 'invalid';
  logicReport?: string;
}

export interface ProductionBlueprint {
  projectId: string;
  videoNumber: number; // 1-5
  videoType: string;
  seoData: SeoData;
  scriptContent: ScriptContent;
  visualPlan: VisualPlan;
  marketingData: MarketingData;
  lastUpdated: number;
}

export enum AgentStatus {
  IDLE = 'IDLE',
  WORKING = 'WORKING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export interface AgentLog {
  id: string;
  agentName: string;
  message: string;
  timestamp: number;
  type: 'info' | 'success' | 'warning' | 'error';
}

export enum AspectRatio {
  RATIO_1_1 = '1:1',
  RATIO_2_3 = '2:3',
  RATIO_3_2 = '3:2',
  RATIO_3_4 = '3:4',
  RATIO_4_3 = '4:3',
  RATIO_9_16 = '9:16',
  RATIO_16_9 = '16:9',
  RATIO_21_9 = '21:9',
}

export enum ImageSize {
  SIZE_1K = '1K',
  SIZE_2K = '2K',
  SIZE_4K = '4K',
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}
