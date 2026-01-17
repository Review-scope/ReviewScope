'use client';

import { CheckCircle, XCircle, Server, Database, Cpu, GitBranch } from 'lucide-react';

export function SystemInfo({ 
  config 
}: { 
  config: Record<string, boolean> 
}) {
  const info = {
    appVersion: '0.0.1',
    workerVersion: '0.0.1',
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: typeof process !== 'undefined' ? process.version : 'N/A',
  };

  return (
    <div className="border rounded-xl p-6 bg-card">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard 
          icon={Server} 
          label="App Version" 
          value={info.appVersion} 
        />
        <InfoCard 
          icon={Cpu} 
          label="Worker Version" 
          value={info.workerVersion} 
        />
        <InfoCard 
          icon={GitBranch} 
          label="Environment" 
          value={info.environment}
          highlight={info.environment === 'production'}
        />
        <InfoCard 
          icon={Database} 
          label="Node.js" 
          value={info.nodeVersion} 
        />
      </div>

      {/* Connection Status */}
      <div className="mt-6 pt-6 border-t">
        <h4 className="text-sm font-medium mb-4">Service Status</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatusBadge label="Database" status={config.DATABASE_URL ? 'connected' : 'disconnected'} />
          <StatusBadge label="Redis Queue" status={config.REDIS_URL ? 'connected' : 'disconnected'} />
          <StatusBadge label="Vector DB" status={config.QDRANT_URL ? 'connected' : 'disconnected'} />
          <StatusBadge label="GitHub API" status={config.GITHUB_APP_ID && config.GITHUB_PRIVATE_KEY ? 'connected' : 'disconnected'} />
        </div>
      </div>

      {/* Environment Variables Check */}
      <div className="mt-6 pt-6 border-t">
        <h4 className="text-sm font-medium mb-4">Configuration Check</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          <EnvCheck label="DATABASE_URL" isSet={config.DATABASE_URL} />
          <EnvCheck label="REDIS_URL" isSet={config.REDIS_URL} />
          <EnvCheck label="QDRANT_URL" isSet={config.QDRANT_URL} />
          <EnvCheck label="GITHUB_APP_ID" isSet={config.GITHUB_APP_ID} />
          <EnvCheck label="GITHUB_PRIVATE_KEY" isSet={config.GITHUB_PRIVATE_KEY} />
          <EnvCheck label="ENCRYPTION_KEY" isSet={config.ENCRYPTION_KEY} />
          <EnvCheck label="NEXTAUTH_SECRET" isSet={config.NEXTAUTH_SECRET} />
          <EnvCheck label="GOOGLE_API_KEY" isSet={config.GOOGLE_API_KEY} />
          <EnvCheck label="OPENAI_API_KEY" isSet={config.OPENAI_API_KEY} />
        </div>
      </div>
    </div>
  );
}

function InfoCard({ 
  icon: Icon, 
  label, 
  value,
  highlight = false
}: { 
  icon: any; 
  label: string; 
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="p-4 rounded-lg bg-muted/50">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className={`font-mono text-sm ${highlight ? 'text-green-500' : ''}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ label, status }: { label: string; status: 'connected' | 'disconnected' | 'unknown' }) {
  const isConnected = status === 'connected';
  
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg ${isConnected ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
      {isConnected ? (
        <CheckCircle className="w-4 h-4 text-green-500" />
      ) : (
        <XCircle className="w-4 h-4 text-red-500" />
      )}
      <span className={`text-xs ${isConnected ? 'text-green-500' : 'text-red-500'}`}>{label}</span>
    </div>
  );
}

function EnvCheck({ label, isSet }: { label: string; isSet: boolean }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded bg-muted/30">
      {isSet ? (
        <CheckCircle className="w-3 h-3 text-green-500" />
      ) : (
        <XCircle className="w-3 h-3 text-red-500" />
      )}
      <span className="font-mono text-muted-foreground">{label}</span>
    </div>
  );
}
