'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { 
  Globe, 
  Layers, 
  Database, 
  Zap, 
  HardDrive, 
  Server,
  Terminal
} from 'lucide-react';
import { CloudResourceData } from '@/types/cloud-architecture';

const getNodeIcon = (type?: string) => {
  switch (type) {
    case 'gateway':
      return <Globe className="w-4 h-4 text-[#0073bb]" />;
    case 'loadBalancer':
      return <Layers className="w-4 h-4 text-[#0073bb]" />;
    case 'webApp':
      return <Server className="w-4 h-4 text-[#0073bb]" />;
    case 'database':
      return <Database className="w-4 h-4 text-[#0073bb]" />;
    case 'cache':
      return <Zap className="w-4 h-4 text-[#ec7211]" />;
    case 'storage':
      return <HardDrive className="w-4 h-4 text-[#0073bb]" />;
    default:
      return <Terminal className="w-4 h-4 text-gray-600" />;
  }
};

export const CloudCustomNode = memo(({ data, selected, type }: NodeProps<CloudResourceData>) => {
  let visualClasses = 'border border-gray-300 shadow-sm hover:border-gray-400 hover:shadow';

  if (data.isModified) {
    // Epicenter Node (Source): Smooth pulse, thicker AWS Orange border, soft orange shadow
    visualClasses = 'animate-pulse border-2 border-[#ec7211] shadow-[0_0_10px_rgba(236,114,17,0.3)]';
  } else if (data.isAffected) {
    // Blast Radius Node (Downstream): AWS Red border, subtle shake animation
    visualClasses = 'border-2 border-[#d13212] animate-blast-shake shadow-sm';
  } else if (selected) {
    visualClasses = 'border-[#0073bb] ring-2 ring-[#0073bb]/40 shadow-md';
  }

  const accentBarColor = data.isModified
    ? 'bg-[#ec7211]'
    : data.isAffected
    ? 'bg-[#d13212]'
    : 'bg-[#232f3e]';

  return (
    <div
      key={data.isAffected ? `affected-${data.simulationRunId}` : undefined}
      className={`relative min-w-[230px] max-w-[270px] rounded-lg bg-white ${visualClasses} transition-all duration-500 ease-in-out select-none`}
    >
      {/* Target Handle (Left) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-[#0073bb] !border-2 !border-white transition-transform duration-150 hover:scale-125"
      />

      {/* Source Handle (Right) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-[#0073bb] !border-2 !border-white transition-transform duration-150 hover:scale-125"
      />

      {/* Top Accent Strip */}
      <div className={`h-1 w-full rounded-t-lg ${accentBarColor} transition-colors duration-500`} />

      {/* Node Header */}
      <div className="p-2.5 pb-2 flex items-center justify-between border-b border-gray-200 bg-gray-50/50">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded bg-white border border-gray-200 shadow-sm shrink-0">
            {getNodeIcon(type)}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-[#232f3e] truncate">
              {data.label}
            </div>
            <div className="text-[11px] text-gray-500 truncate">
              {data.sublabel}
            </div>
          </div>
        </div>

        {/* Status Pill */}
        <div
          className={`ml-1.5 shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors duration-500 ${
            data.isModified
              ? 'bg-orange-50 text-[#ec7211] border border-orange-200'
              : data.isAffected
              ? 'bg-red-50 text-[#d13212] border border-red-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              data.isModified
                ? 'bg-[#ec7211]'
                : data.isAffected
                ? 'bg-[#d13212]'
                : 'bg-emerald-500'
            }`}
          />
          <span>{data.isModified ? 'MODIFIED' : data.isAffected ? 'AT RISK' : data.status}</span>
        </div>
      </div>

      {/* Node Body Details */}
      <div className="p-2.5 pt-2 space-y-1.5 text-xs text-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-500 uppercase tracking-wide">Type</span>
          <span className="text-xs text-gray-800 font-medium truncate max-w-[150px]">
            {data.resourceType}
          </span>
        </div>

        {data.details.engine && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Engine</span>
            <span className="text-xs text-[#0073bb] font-medium truncate max-w-[150px]">
              {data.details.engine}
            </span>
          </div>
        )}

        {data.details.port && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Port</span>
            <span className="text-xs text-gray-800 font-medium">:{data.details.port}</span>
          </div>
        )}

        {/* Telemetry Metrics Bar */}
        {data.metrics && (
          <div className="mt-2 pt-2 border-t border-gray-100 grid grid-cols-2 gap-1.5">
            {Object.entries(data.metrics).slice(0, 2).map(([key, val]) => (
              <div key={key} className="bg-gray-50 px-2 py-1 rounded border border-gray-200">
                <div className="text-[9px] text-gray-500 uppercase tracking-wider">{key}</div>
                <div className="text-xs font-semibold text-gray-800 truncate">{val}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

CloudCustomNode.displayName = 'CloudCustomNode';

export const nodeTypes = {
  gateway: CloudCustomNode,
  loadBalancer: CloudCustomNode,
  webApp: CloudCustomNode,
  database: CloudCustomNode,
  cache: CloudCustomNode,
  storage: CloudCustomNode,
  custom: CloudCustomNode,
};
