'use client';

import React, { memo } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';

export const HackerEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  selected,
}: EdgeProps) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const strokeColor = selected
    ? '#0073bb'
    : (style.stroke as string) || '#879596';

  const strokeWidth = selected
    ? 2.5
    : ((style.strokeWidth as number) || 1.75);

  const particleColor = selected
    ? '#ec7211'
    : (style.stroke as string) || '#0073bb';

  return (
    <>
      {/* Main Connection Path */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={style.strokeDasharray || '5 5'}
        className="react-flow__edge-path transition-all duration-300"
        markerEnd={markerEnd}
      />

      {/* Dynamic Data Flow Particle */}
      <circle r={2.5} fill={particleColor}>
        <animateMotion
          dur="2.5s"
          repeatCount="indefinite"
          path={edgePath}
          keyPoints="0;1"
          keyTimes="0;1"
        />
      </circle>

      {/* Edge Label Badge */}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <div className="px-2 py-0.5 rounded border border-gray-300 bg-white text-[11px] font-medium text-gray-700 shadow-sm flex items-center gap-1.5 hover:border-gray-400 transition-colors">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: strokeColor }} />
              <span>{label}</span>
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

HackerEdge.displayName = 'HackerEdge';

export const edgeTypes = {
  hacker: HackerEdge,
  default: HackerEdge,
};
