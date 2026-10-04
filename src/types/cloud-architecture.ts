export type CloudNodeType = 
  | 'gateway'
  | 'loadBalancer'
  | 'webApp'
  | 'database'
  | 'cache'
  | 'storage';

export interface CloudResourceData {
  label: string;
  sublabel: string;
  resourceType: string;
  terraformResource: string;
  provider: string;
  status: 'ONLINE' | 'STANDBY' | 'HEALTHY' | 'SYNCED' | 'PROVISIONING';
  metrics?: {
    cpu?: string;
    memory?: string;
    latency?: string;
    connections?: string;
    storage?: string;
    replicas?: string;
  };
  details: {
    engine?: string;
    port?: number;
    version?: string;
    multiAz?: boolean;
    tier?: string;
    securityGroup?: string;
    cidrBlock?: string;
  };
  terraformSnippet: string;
  accentColor: 'cyan' | 'emerald' | 'violet' | 'amber' | 'rose' | 'sky';
  isModified?: boolean;
  isAffected?: boolean;
  simulationRunId?: number;
}

export interface PresetArchitecture {
  id: string;
  name: string;
  description: string;
  fileName: string;
  code: string;
}
