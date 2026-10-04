'use client';

import React from 'react';
import { 
  Layers, 
  Workflow, 
  Sparkles, 
  Cloud,
  CheckCircle2
} from 'lucide-react';

interface HeaderProps {
  splitRatio: number;
  onSetSplitRatio: (ratio: number) => void;
  onResetAll: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  splitRatio,
  onSetSplitRatio,
  onResetAll,
}) => {
  return (
    <header className="h-12 bg-[#232f3e] border-b border-[#16191f] px-4 flex items-center justify-between text-white text-xs select-none z-30 shrink-0">
      {/* Brand & Project Info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded bg-[#ec7211] text-white flex items-center justify-center shadow-sm">
            <Cloud className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-white">
              ZeroRadius
            </span>
            <span className="text-[11px] text-gray-300 font-normal border-l border-gray-600 pl-2">
              Architecture Console
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[#16191f] text-gray-300 border border-[#3b444b]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              us-east-1
            </span>
          </div>
        </div>
      </div>

      {/* Center System Telemetry / Breadcrumb */}
      <div className="hidden lg:flex items-center gap-2 text-xs bg-[#16191f] border border-[#3b444b] rounded px-3 py-1 text-gray-300">
        <span className="text-gray-400">Provider:</span>
        <span className="text-white font-medium">aws</span>
        <span className="text-gray-600">|</span>
        <span className="text-gray-400">Stack:</span>
        <span className="text-white font-medium">app-vpc-production</span>
        <span className="text-gray-600">|</span>
        <span className="text-gray-400">Status:</span>
        <span className="text-emerald-400 font-medium flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          In-Sync
        </span>
      </div>

      {/* Right Controls: Split Layout Controls & Actions */}
      <div className="flex items-center gap-2.5">
        {/* Split Preset Buttons */}
        <div className="hidden sm:flex items-center bg-[#16191f] border border-[#3b444b] rounded p-0.5">
          <button
            onClick={() => onSetSplitRatio(35)}
            className={`px-2 py-0.5 rounded text-xs transition-colors ${
              splitRatio === 35
                ? 'bg-[#3b444b] text-white font-semibold'
                : 'text-gray-300 hover:text-white'
            }`}
            title="Focus Canvas (35% Code / 65% Canvas)"
          >
            Canvas
          </button>
          <button
            onClick={() => onSetSplitRatio(50)}
            className={`px-2 py-0.5 rounded text-xs transition-colors ${
              splitRatio === 50
                ? 'bg-[#3b444b] text-white font-semibold'
                : 'text-gray-300 hover:text-white'
            }`}
            title="Split 50 / 50"
          >
            50 / 50
          </button>
          <button
            onClick={() => onSetSplitRatio(65)}
            className={`px-2 py-0.5 rounded text-xs transition-colors ${
              splitRatio === 65
                ? 'bg-[#3b444b] text-white font-semibold'
                : 'text-gray-300 hover:text-white'
            }`}
            title="Focus Code Editor (65% Code / 35% Canvas)"
          >
            Editor
          </button>
        </div>

        {/* Demo Stack Primary Action Button */}
        <button
          onClick={onResetAll}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#ec7211] hover:bg-[#eb5f07] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          title="Reset to default cloud architecture demo"
        >
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span className="hidden sm:inline">Demo Stack</span>
        </button>
      </div>
    </header>
  );
};
