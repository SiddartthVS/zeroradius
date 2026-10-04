'use client';

import React, { useState } from 'react';
import { Node } from 'reactflow';
import { 
  X, 
  Copy, 
  Check, 
  ShieldCheck, 
  ExternalLink,
  Activity,
  Server
} from 'lucide-react';
import { CloudResourceData } from '@/types/cloud-architecture';

interface NodeInspectorDrawerProps {
  selectedNode: Node<CloudResourceData> | null;
  onClose: () => void;
  onInsertCodeSnippet?: (snippet: string) => void;
}

export const NodeInspectorDrawer: React.FC<NodeInspectorDrawerProps> = ({
  selectedNode,
  onClose,
  onInsertCodeSnippet,
}) => {
  const [copied, setCopied] = useState(false);

  if (!selectedNode) return null;

  const data = selectedNode.data;

  const handleCopySnippet = () => {
    if (!data.terraformSnippet) return;
    navigator.clipboard.writeText(data.terraformSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="absolute top-4 right-4 bottom-4 w-96 max-w-[calc(100vw-2rem)] bg-white border border-gray-300 rounded-lg shadow-lg flex flex-col z-20 overflow-hidden font-sans text-gray-800 min-h-0">
      {/* Drawer Header */}
      <div className="p-3 px-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-[#0073bb]" />
          <span className="text-xs uppercase tracking-wider font-bold text-gray-900">
            Resource Inspector
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-gray-500 hover:text-gray-800 hover:bg-gray-200 transition-colors cursor-pointer"
          title="Close Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Node Identity Banner */}
        <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs uppercase tracking-wider text-[#0073bb] font-bold">
              {data.resourceType}
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {data.status}
            </span>
          </div>
          <div className="text-sm font-bold text-gray-900">{data.label}</div>
          <div className="text-xs text-gray-500 mt-0.5 truncate">{data.sublabel}</div>
        </div>

        {/* Specification Grid */}
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-gray-600" />
            <span>Infrastructure Spec</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded bg-gray-50 border border-gray-200">
              <span className="text-gray-500 block text-[10px] uppercase font-medium">Terraform Type</span>
              <span className="text-gray-800 font-semibold truncate block mt-0.5">
                {data.terraformResource}
              </span>
            </div>
            <div className="p-2 rounded bg-gray-50 border border-gray-200">
              <span className="text-gray-500 block text-[10px] uppercase font-medium">Provider</span>
              <span className="text-gray-800 font-semibold truncate block mt-0.5">
                {data.provider}
              </span>
            </div>
            {data.details.engine && (
              <div className="p-2 rounded bg-gray-50 border border-gray-200">
                <span className="text-gray-500 block text-[10px] uppercase font-medium">Engine</span>
                <span className="text-[#0073bb] font-semibold truncate block mt-0.5">
                  {data.details.engine}
                </span>
              </div>
            )}
            {data.details.port && (
              <div className="p-2 rounded bg-gray-50 border border-gray-200">
                <span className="text-gray-500 block text-[10px] uppercase font-medium">Listening Port</span>
                <span className="text-gray-800 font-semibold truncate block mt-0.5">
                  :{data.details.port}
                </span>
              </div>
            )}
            {data.details.tier && (
              <div className="p-2 rounded bg-gray-50 border border-gray-200 col-span-2">
                <span className="text-gray-500 block text-[10px] uppercase font-medium">Subnet Tier</span>
                <span className="text-gray-800 font-semibold truncate block mt-0.5">
                  {data.details.tier}
                </span>
              </div>
            )}
            {data.details.securityGroup && (
              <div className="p-2 rounded bg-gray-50 border border-gray-200 col-span-2">
                <span className="text-gray-500 block text-[10px] uppercase font-medium">Security Group</span>
                <span className="text-gray-800 font-mono text-[11px] truncate block mt-0.5">
                  {data.details.securityGroup}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Live Telemetry */}
        {data.metrics && (
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#0073bb]" />
              <span>Real-Time Telemetry</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(data.metrics).map(([key, value]) => (
                <div key={key} className="p-2 rounded bg-gray-50 border border-gray-200">
                  <span className="text-gray-500 uppercase text-[10px] block font-medium">{key}</span>
                  <span className="text-gray-900 font-semibold text-xs mt-0.5 block">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Terraform HCL Definition */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
              HCL Definition (.tf)
            </span>
            <button
              onClick={handleCopySnippet}
              className="flex items-center gap-1 text-xs text-[#0073bb] hover:text-[#00527c] transition-colors px-1.5 py-0.5 rounded hover:bg-blue-50 cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy HCL'}</span>
            </button>
          </div>
          <div className="relative rounded border border-gray-200 bg-gray-50 p-3 overflow-x-auto text-xs leading-relaxed text-gray-800">
            <pre className="font-mono">{data.terraformSnippet}</pre>
          </div>
        </div>
      </div>

      {/* Drawer Footer */}
      <div className="p-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs shrink-0">
        <span className="text-gray-500 font-mono text-[11px]">ID: {selectedNode.id}</span>
        {onInsertCodeSnippet && (
          <button
            onClick={() => onInsertCodeSnippet(data.terraformSnippet)}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#ec7211] hover:bg-[#eb5f07] text-white font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Append to Editor</span>
          </button>
        )}
      </div>
    </div>
  );
};
