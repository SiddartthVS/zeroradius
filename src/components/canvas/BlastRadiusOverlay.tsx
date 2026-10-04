'use client';

import React, { useEffect, useState } from 'react';
import { BlastRadiusResult } from '@/lib/blastRadiusSimulator';
import { AlertTriangle, X, Zap, TrendingUp, Activity, ChevronRight, Wand2 } from 'lucide-react';

interface BlastRadiusOverlayProps {
  result: BlastRadiusResult | null;
  onDismiss: () => void;
  onAutoFix?: () => void;
}

const RISK_CONFIG = {
  LOW: {
    border: 'border-emerald-300',
    headerBg: 'bg-emerald-50',
    text: 'text-emerald-900',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icon: 'text-emerald-700',
    bar: 'bg-emerald-600',
    multiplierColor: 'text-emerald-700',
  },
  MEDIUM: {
    border: 'border-amber-300',
    headerBg: 'bg-amber-50',
    text: 'text-amber-900',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    icon: 'text-amber-700',
    bar: 'bg-amber-500',
    multiplierColor: 'text-amber-700',
  },
  HIGH: {
    border: 'border-orange-300',
    headerBg: 'bg-orange-50',
    text: 'text-orange-900',
    badge: 'bg-orange-100 text-orange-800 border-orange-300',
    icon: 'text-orange-700',
    bar: 'bg-orange-500',
    multiplierColor: 'text-orange-700',
  },
  CRITICAL: {
    border: 'border-red-300',
    headerBg: 'bg-red-50',
    text: 'text-red-900',
    badge: 'bg-red-100 text-red-800 border-red-300',
    icon: 'text-red-700',
    bar: 'bg-red-600',
    multiplierColor: 'text-red-700',
  },
};

const MultiplierBar: React.FC<{ multiplier: number; barClass: string }> = ({
  multiplier,
  barClass,
}) => {
  const [width, setWidth] = useState(0);
  const pct = Math.min(100, ((multiplier - 1.0) / 4.0) * 100);

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 80);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${barClass}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
};

export const BlastRadiusOverlay: React.FC<BlastRadiusOverlayProps> = ({
  result,
  onDismiss,
  onAutoFix,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (result) {
      const t = setTimeout(() => setVisible(true), 30);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [result]);

  if (!result) return null;

  const cfg = RISK_CONFIG[result.riskLevel];
  const hasChanges = result.modifiedNodeIds.size > 0;

  return (
    <div
      className={`
        absolute bottom-8 right-4 z-40 w-80 max-w-[calc(100vw-2rem)]
        rounded-lg border bg-white shadow-lg font-sans
        transition-all duration-200 ease-out
        ${cfg.border}
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-3.5 py-2 border-b ${cfg.border} ${cfg.headerBg} rounded-t-lg`}>
        <div className="flex items-center gap-2">
          <AlertTriangle className={`w-4 h-4 ${cfg.icon}`} />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-900">
            Blast Radius Report
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${cfg.badge}`}>
            {result.riskLevel}
          </span>
          <button
            onClick={onDismiss}
            className="p-0.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-3.5 space-y-3 text-xs text-gray-700">
        {/* Summary */}
        <p className="text-xs leading-relaxed text-gray-700">
          {result.summary}
        </p>

        {hasChanges && (
          <>
            {/* Node impact counts */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gray-50 border border-gray-200 rounded p-2 flex flex-col gap-0.5">
                <span className="text-[10px] text-gray-500 uppercase tracking-wide">Modified</span>
                <span className="text-base font-bold text-gray-900">{result.modifiedNodeIds.size}</span>
                <span className="text-[10px] text-gray-500">node{result.modifiedNodeIds.size !== 1 ? 's' : ''}</span>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded p-2 flex flex-col gap-0.5">
                <span className="text-[10px] text-gray-500 uppercase tracking-wide">Affected</span>
                <span className="text-base font-bold text-[#ec7211]">{result.affectedNodeIds.size}</span>
                <span className="text-[10px] text-gray-500">downstream</span>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded p-2 flex flex-col gap-0.5">
                <span className="text-[10px] text-gray-500 uppercase tracking-wide">Cascade</span>
                <span className="text-base font-bold text-[#0073bb]">{result.maxDepth}</span>
                <span className="text-[10px] text-gray-500">hop depth</span>
              </div>
            </div>

            {/* Cost Multiplier */}
            <div className="bg-gray-50 border border-gray-200 rounded p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className={`w-3.5 h-3.5 ${cfg.icon}`} />
                  <span className="text-[11px] text-gray-600 font-medium">Simulated Load Cost</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-base font-bold ${cfg.multiplierColor}`}>
                    {result.costMultiplier}×
                  </span>
                  <span className="text-[10px] text-gray-400">baseline</span>
                </div>
              </div>
              <MultiplierBar multiplier={result.costMultiplier} barClass={cfg.bar} />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>1.0× (baseline)</span>
                <span>5.0× (max)</span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 text-[11px] text-gray-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-600 inline-block" />
                Modified node
              </span>
              <ChevronRight className="w-3 h-3 text-gray-400" />
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#ec7211] inline-block" />
                Cascade impact
              </span>
            </div>
          </>
        )}

        {!hasChanges && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Activity className="w-3.5 h-3.5" />
            <span>Edit the Terraform code in the editor, then re-run simulation.</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3.5 py-2 border-t border-gray-200 bg-gray-50 rounded-b-lg flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <Zap className="w-3 h-3 text-gray-400" />
          <span>Simulation Engine</span>
        </div>

        {hasChanges && onAutoFix && (
          <button
            onClick={onAutoFix}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold
              bg-[#ec7211] hover:bg-[#eb5f07] text-white
              shadow-sm transition-colors cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5" />
            Auto-Fix Risks
          </button>
        )}
      </div>
    </div>
  );
};
