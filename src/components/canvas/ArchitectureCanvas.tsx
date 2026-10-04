'use client';

import React, { useState, useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { CloudResourceData } from '@/types/cloud-architecture';
import { INITIAL_NODES, INITIAL_EDGES } from '@/data/defaultTerraform';
import { nodeTypes } from './nodes/CloudNode';
import { edgeTypes } from './edges/HackerEdge';
import { NodeInspectorDrawer } from './NodeInspectorDrawer';
import { BlastRadiusOverlay } from './BlastRadiusOverlay';
import { RemediationPanel } from './RemediationPanel';
import { runBlastRadiusSimulation, BlastRadiusResult } from '@/lib/blastRadiusSimulator';
import {
  Maximize2,
  RefreshCw,
  Zap,
  Plus,
  Radiation,
} from 'lucide-react';

interface ArchitectureCanvasProps {
  onAppendSnippetToEditor?: (snippet: string) => void;
  externalNodes?: Node<CloudResourceData>[];
  externalEdges?: Edge[];
  isLoading?: boolean;
  currentTerraformCode?: string;
  originalTerraformCode?: string;
  onApplyFix?: (fixedCode: string) => void;
}

const CanvasInner: React.FC<ArchitectureCanvasProps> = ({
  onAppendSnippetToEditor,
  externalNodes,
  externalEdges,
  isLoading = false,
  currentTerraformCode = '',
  originalTerraformCode = '',
  onApplyFix,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<CloudResourceData>(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [selectedNode, setSelectedNode] = useState<Node<CloudResourceData> | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [isAnimated, setIsAnimated] = useState<boolean>(true);
  const [blastResult, setBlastResult] = useState<BlastRadiusResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationCount, setSimulationCount] = useState(0);
  const [showRemediation, setShowRemediation] = useState(false);
  const { fitView } = useReactFlow();

  // Sync external nodes/edges from API into the flow state
  React.useEffect(() => {
    if (externalNodes && externalNodes.length > 0) {
      setNodes(externalNodes);
      setEdges(externalEdges ?? []);
      setTimeout(() => fitView({ padding: 0.2, duration: 600 }), 150);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalNodes, externalEdges]);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: isAnimated,
            type: 'hacker',
            style: { stroke: '#0073bb', strokeWidth: 2 },
          },
          eds
        )
      ),
    [setEdges, isAnimated]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node as Node<CloudResourceData>);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // ── Blast Radius simulation ────────────────────────────────────────────────
  const handleSimulateChange = useCallback(() => {
    setIsSimulating(true);
    setShowRemediation(false);
    setTimeout(() => {
      const currentNodes = nodes;
      const currentEdges = edges;
      const result = runBlastRadiusSimulation(
        currentNodes,
        currentEdges,
        originalTerraformCode,
        currentTerraformCode,
      );
      setBlastResult(result);
      setIsSimulating(false);
      setSimulationCount((c) => c + 1);
    }, 400);
  }, [nodes, edges, originalTerraformCode, currentTerraformCode]);

  const handleDismissBlast = useCallback(() => {
    setBlastResult(null);
    setShowRemediation(false);
  }, []);

  const handleOpenRemediation = useCallback(() => {
    setShowRemediation(true);
  }, []);

  const handleCloseRemediation = useCallback(() => {
    setShowRemediation(false);
  }, []);

  const handleApplyFix = useCallback((fixedCode: string) => {
    onApplyFix?.(fixedCode);
    setBlastResult(null);
    setShowRemediation(false);
  }, [onApplyFix]);

  const nodeLabelsById = useMemo(() => {
    const map = new Map<string, string>();
    for (const n of nodes) {
      map.set(n.id, n.data?.label ?? n.id);
    }
    return map;
  }, [nodes]);

  // Filter nodes display — with Epicenter and Blast Radius animation triggers
  const filteredNodes = useMemo(() => {
    const blast = blastResult;

    return nodes.map((node) => {
      let matches = true;
      if (activeFilter !== 'all') {
        matches = false;
        if (activeFilter === 'compute') matches = node.type === 'webApp' || node.type === 'loadBalancer';
        if (activeFilter === 'database') matches = node.type === 'database' || node.type === 'cache';
        if (activeFilter === 'network') matches = node.type === 'gateway' || node.type === 'loadBalancer';
        if (activeFilter === 'storage') matches = node.type === 'storage' || node.type === 'database';
      }

      const isModified = blast ? blast.modifiedNodeIds.has(node.id) : false;
      const isAffected  = blast ? blast.affectedNodeIds.has(node.id) : false;

      return {
        ...node,
        data: {
          ...node.data,
          isModified,
          isAffected,
          simulationRunId: simulationCount,
        },
        style: {
          ...node.style,
          opacity: matches ? 1 : 0.3,
          pointerEvents: matches ? ('auto' as const) : ('none' as const),
        },
      };
    });
  }, [nodes, activeFilter, blastResult, simulationCount]);

  // Compute cascading edges when simulation is active (AWS Red with animated marching ants)
  const computedEdges = useMemo(() => {
    if (!blastResult || blastResult.modifiedNodeIds.size === 0) {
      return edges;
    }

    const { modifiedNodeIds, affectedNodeIds } = blastResult;

    return edges.map((edge) => {
      const isFromSourceOrAffected = modifiedNodeIds.has(edge.source) || affectedNodeIds.has(edge.source);
      const isToAffected = affectedNodeIds.has(edge.target);
      const isCascading = isFromSourceOrAffected && isToAffected;

      if (isCascading) {
        return {
          ...edge,
          animated: true,
          style: {
            ...edge.style,
            stroke: '#d13212',
            strokeWidth: 2.5,
          },
        };
      }

      return edge;
    });
  }, [edges, blastResult]);

  const toggleAnimation = () => {
    const nextState = !isAnimated;
    setIsAnimated(nextState);
    setEdges((prevEdges) =>
      prevEdges.map((e) => ({
        ...e,
        animated: nextState,
      }))
    );
  };

  const handleAddQuickNode = (type: 'db' | 'app' | 'cache') => {
    const randomOffset = Math.floor(Math.random() * 80) - 40;
    if (type === 'cache') {
      const newNode: Node<CloudResourceData> = {
        id: `node-redis-${Date.now()}`,
        type: 'cache',
        position: { x: 750 + randomOffset, y: 450 + randomOffset },
        data: {
          label: 'Redis Replica',
          sublabel: 'aws_elasticache_cluster.read_replica',
          resourceType: 'Cache Replica',
          terraformResource: 'aws_elasticache_cluster',
          provider: 'hashicorp/aws',
          status: 'ONLINE',
          metrics: { memory: '512MB', latency: '0.1ms' },
          details: { engine: 'Redis 7.0', port: 6379, tier: 'Private Subnet' },
          terraformSnippet: `resource "aws_elasticache_cluster" "redis_replica" {\n  cluster_id = "redis-replica-${Date.now() % 1000}"\n  engine = "redis"\n  port = 6379\n}`,
          accentColor: 'rose',
        },
      };
      setNodes((nds) => [...nds, newNode]);
    } else if (type === 'app') {
      const newNode: Node<CloudResourceData> = {
        id: `node-worker-${Date.now()}`,
        type: 'webApp',
        position: { x: 650 + randomOffset, y: 20 + randomOffset },
        data: {
          label: 'Async Worker',
          sublabel: 'aws_ecs_service.worker',
          resourceType: 'Background Worker',
          terraformResource: 'aws_ecs_service',
          provider: 'hashicorp/aws',
          status: 'HEALTHY',
          metrics: { cpu: '12%', memory: '256MB', replicas: '2 / 2 Active' },
          details: { port: 8080, tier: 'Private Subnet', engine: 'Node.js Worker' },
          terraformSnippet: `resource "aws_ecs_service" "worker" {\n  name = "background-worker"\n  desired_count = 2\n}`,
          accentColor: 'emerald',
        },
      };
      setNodes((nds) => [...nds, newNode]);
    } else {
      const newNode: Node<CloudResourceData> = {
        id: `node-pg-read-${Date.now()}`,
        type: 'database',
        position: { x: 990 + randomOffset, y: 200 + randomOffset },
        data: {
          label: 'Postgres Read Replica',
          sublabel: 'aws_db_instance.postgres_replica',
          resourceType: 'RDS Read Replica',
          terraformResource: 'aws_db_instance',
          provider: 'hashicorp/aws',
          status: 'SYNCED',
          metrics: { connections: '18 / 200', latency: '1.1ms' },
          details: { engine: 'PostgreSQL 16.2', port: 5432, tier: 'DB Subnet' },
          terraformSnippet: `resource "aws_db_instance" "read_replica" {\n  identifier = "postgres-read-replica"\n  replicate_source_db = "zeroradius-postgres-prod"\n  instance_class = "db.r6g.large"\n}`,
          accentColor: 'amber',
        },
      };
      setNodes((nds) => [...nds, newNode]);
    }
  };

  const handleResetLayout = () => {
    setNodes(INITIAL_NODES);
    setEdges(INITIAL_EDGES);
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 600 });
    }, 100);
  };

  return (
    <div className="relative w-full h-full bg-[#f2f3f3] select-none overflow-hidden min-h-0 min-w-0">
      {/* Parsing / Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 pointer-events-none">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="w-8 h-8 text-[#ec7211] animate-spin" />
            <div className="text-xs font-semibold text-gray-800">
              Generating Topology Graph…
            </div>
            <div className="text-[11px] text-gray-500">
              Parsing Terraform HCL resource dependencies
            </div>
          </div>
        </div>
      )}

      {/* Top Controls Toolbar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left Stats Card */}
        <div className="pointer-events-auto flex items-center gap-2.5 bg-white/95 border border-gray-300 rounded shadow-sm px-3 py-1.5 text-xs text-gray-700">
          <div className="flex items-center gap-1.5 font-medium text-gray-900">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Topology Live</span>
          </div>
          <span className="text-gray-300">|</span>
          <span className="text-gray-600">
            <span className="font-semibold text-gray-800">{nodes.length}</span> resources
          </span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-600">
            <span className="font-semibold text-gray-800">{edges.length}</span> connections
          </span>
        </div>

        {/* Center: Resource Filter Pills */}
        <div className="pointer-events-auto flex items-center bg-white/95 border border-gray-300 rounded shadow-sm p-1 text-xs gap-1">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-[#232f3e] text-white font-medium shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter('compute')}
            className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
              activeFilter === 'compute'
                ? 'bg-[#232f3e] text-white font-medium shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Compute
          </button>
          <button
            onClick={() => setActiveFilter('database')}
            className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
              activeFilter === 'database'
                ? 'bg-[#232f3e] text-white font-medium shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Data
          </button>
          <button
            onClick={() => setActiveFilter('network')}
            className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
              activeFilter === 'network'
                ? 'bg-[#232f3e] text-white font-medium shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Network
          </button>
        </div>

        {/* Right Actions */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-white/95 border border-gray-300 rounded shadow-sm p-1 text-xs">
          {/* Quick Node Adders */}
          <div className="flex items-center gap-1 pr-1.5 border-r border-gray-300">
            <button
              onClick={() => handleAddQuickNode('app')}
              className="p-1 px-2 rounded hover:bg-gray-100 text-gray-700 hover:text-gray-900 flex items-center gap-1 text-xs transition-colors cursor-pointer"
              title="Add Worker Service"
            >
              <Plus className="w-3 h-3 text-[#0073bb]" />
              <span>Worker</span>
            </button>
            <button
              onClick={() => handleAddQuickNode('db')}
              className="p-1 px-2 rounded hover:bg-gray-100 text-gray-700 hover:text-gray-900 flex items-center gap-1 text-xs transition-colors cursor-pointer"
              title="Add DB Replica"
            >
              <Plus className="w-3 h-3 text-[#0073bb]" />
              <span>DB Replica</span>
            </button>
          </div>

          <button
            onClick={toggleAnimation}
            className={`px-2 py-1 rounded flex items-center gap-1 text-xs transition-colors cursor-pointer ${
              isAnimated
                ? 'text-[#0073bb] bg-blue-50 font-medium'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title="Toggle Traffic Stream Animation"
          >
            <Zap className="w-3 h-3 text-[#0073bb]" />
            <span>Traffic</span>
          </button>

          <button
            onClick={() => fitView({ padding: 0.2, duration: 600 })}
            className="p-1.5 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
            title="Fit View"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleResetLayout}
            className="p-1.5 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
            title="Reset Architecture Layout"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <span className="w-px h-4 bg-gray-300 mx-0.5" />

          {/* Simulate Change / Blast Radius Button */}
          <button
            onClick={handleSimulateChange}
            disabled={isSimulating}
            className={`px-3 py-1 rounded flex items-center gap-1.5 text-xs font-semibold shadow-sm transition-all cursor-pointer ${
              isSimulating
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : blastResult
                ? 'bg-[#ec7211] text-white hover:bg-[#eb5f07]'
                : 'bg-white hover:bg-gray-50 text-[#ec7211] border border-[#ec7211] active:scale-95'
            }`}
            title="Simulate Change — compute Blast Radius from editor diff"
          >
            {isSimulating ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Simulating…</span>
              </>
            ) : (
              <>
                <Radiation className="w-3.5 h-3.5" />
                <span>Simulate Change</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* React Flow Core */}
      <ReactFlow
        nodes={filteredNodes}
        edges={computedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'hacker',
          animated: true,
        }}
        proOptions={{ hideAttribution: true }}
        className="react-flow-aws"
      >
        {/* Subtle Grid Dots Background */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.2}
          color="#d5dbdb"
          className="bg-[#f2f3f3]"
        />

        {/* AWS Themed Controls */}
        <Controls
          showInteractive={false}
          className="!bg-white !border !border-gray-300 !rounded !shadow-sm !p-0.5 [&>button]:!bg-white [&>button]:!border-b [&>button]:!border-gray-200 [&>button]:!text-gray-700 hover:[&>button]:!bg-gray-100"
        />

        {/* MiniMap */}
        <MiniMap
          nodeColor={() => '#545b64'}
          nodeStrokeWidth={2}
          maskColor="rgba(242, 243, 243, 0.75)"
          className="!bg-white !border !border-gray-300 !rounded !overflow-hidden !shadow-sm"
          style={{ width: 140, height: 95 }}
        />
      </ReactFlow>

      {/* Selected Node Inspector Drawer */}
      <NodeInspectorDrawer
        selectedNode={selectedNode}
        onClose={() => setSelectedNode(null)}
        onInsertCodeSnippet={onAppendSnippetToEditor}
      />

      {/* Blast Radius Warning Overlay */}
      {!showRemediation && (
        <BlastRadiusOverlay
          result={blastResult}
          onDismiss={handleDismissBlast}
          onAutoFix={blastResult?.modifiedNodeIds.size ? handleOpenRemediation : undefined}
        />
      )}

      {/* AI Remediation Panel — full-canvas modal */}
      {showRemediation && blastResult && (
        <RemediationPanel
          blastResult={blastResult}
          currentCode={currentTerraformCode}
          originalCode={originalTerraformCode}
          modifiedNodeLabels={[...blastResult.modifiedNodeIds].map((id) => nodeLabelsById.get(id) ?? id)}
          affectedNodeLabels={[...blastResult.affectedNodeIds].map((id) => nodeLabelsById.get(id) ?? id)}
          onApplyFix={handleApplyFix}
          onClose={handleCloseRemediation}
        />
      )}

      {/* Bottom Status Bar */}
      <div className="absolute bottom-2 left-3 z-10 pointer-events-none flex items-center gap-2.5 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0073bb]" />
          <span>Interactive Canvas</span>
        </span>
        <span className="text-gray-300">|</span>
        <span>Click node to inspect HCL attributes</span>
        <span className="text-gray-300">|</span>
        <span>Drag handles to connect</span>
        {blastResult && !showRemediation && (
          <>
            <span className="text-gray-300">|</span>
            <span className="text-[#ec7211] font-semibold">Blast Radius Active</span>
          </>
        )}
      </div>
    </div>
  );
};

export const ArchitectureCanvas: React.FC<ArchitectureCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
};
