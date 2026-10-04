/**
 * blastRadiusSimulator.ts
 *
 * Pure logic for the "Simulate Change" / Blast Radius feature.
 *
 * Given the current Terraform code and the original Terraform code, it detects
 * which resource(s) were modified, then performs a BFS on the React Flow edge
 * graph to find all downstream dependent nodes — visualising cascading failure
 * risk. It also computes a simulated cost-multiplier warning.
 */

import { Node, Edge } from 'reactflow';
import { CloudResourceData } from '@/types/cloud-architecture';

// ─── Types ───────────────────────────────────────────────────────────────────

export type BlastStatus = 'idle' | 'running' | 'done';

export interface BlastRadiusResult {
  /** IDs of directly modified nodes — highlighted RED */
  modifiedNodeIds: Set<string>;
  /** IDs of downstream/dependent nodes — highlighted YELLOW */
  affectedNodeIds: Set<string>;
  /** Simulated cost multiplier (e.g. 2.4 = 240 % of baseline) */
  costMultiplier: number;
  /** Human-readable risk level */
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Number of hops in the longest affected path */
  maxDepth: number;
  /** Brief explanation shown in the overlay */
  summary: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Extract every `resource "TYPE" "NAME"` block header from HCL */
function extractResourceSignatures(code: string): Map<string, string> {
  const map = new Map<string, string>();
  // Match resource blocks: resource "type" "name" { ... }
  // Capture the entire block (non-greedy between braces)
  const blockRe = /resource\s+"([^"]+)"\s+"([^"]+)"\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(code)) !== null) {
    const key = `${match[1]}.${match[2]}`;
    // Normalise whitespace so cosmetic-only changes don't count
    const body = match[3].replace(/\s+/g, ' ').trim();
    map.set(key, body);
  }
  return map;
}

/**
 * Given node sublabels like "aws_db_instance.postgres_primary",
 * find all node IDs whose terraform resource key appears in the modified set.
 */
function detectModifiedNodes(
  nodes: Node<CloudResourceData>[],
  originalCode: string,
  currentCode: string,
): Set<string> {
  const original = extractResourceSignatures(originalCode);
  const current  = extractResourceSignatures(currentCode);

  const changedKeys = new Set<string>();

  // Resources that exist in both but with different bodies → changed
  for (const [key, body] of current.entries()) {
    const originalBody = original.get(key);
    if (originalBody === undefined || originalBody !== body) {
      changedKeys.add(key);
    }
  }
  // Resources that existed before but are now removed → changed/deleted
  for (const key of original.keys()) {
    if (!current.has(key)) changedKeys.add(key);
  }

  if (changedKeys.size === 0) return new Set();

  // Map changed resource keys to node IDs
  const modified = new Set<string>();
  for (const node of nodes) {
    const sublabel = node.data?.sublabel ?? ''; // e.g. "aws_db_instance.postgres_primary"
    const terraformRes = node.data?.terraformResource ?? ''; // e.g. "aws_db_instance"

    // Check if the node's sublabel or resource type matches a changed key
    for (const key of changedKeys) {
      if (
        sublabel === key ||
        sublabel.startsWith(key) ||
        key.startsWith(terraformRes + '.')
      ) {
        modified.add(node.id);
        break;
      }
    }
  }

  return modified;
}

/**
 * BFS on directed edges: starting from `sourceIds`, follow edges in the
 * direction source → target to enumerate all downstream nodes.
 */
function findDownstreamNodes(
  sourceIds: Set<string>,
  edges: Edge[],
): { affected: Set<string>; maxDepth: number } {
  // Build adjacency list: source → [targets]
  const adj = new Map<string, string[]>();
  for (const edge of edges) {
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    adj.get(edge.source)!.push(edge.target);
  }

  const visited = new Set<string>();
  // BFS queue: [nodeId, depth]
  const queue: Array<[string, number]> = [];
  for (const id of sourceIds) {
    queue.push([id, 0]);
    visited.add(id);
  }

  let maxDepth = 0;
  while (queue.length > 0) {
    const [current, depth] = queue.shift()!;
    maxDepth = Math.max(maxDepth, depth);
    for (const neighbour of adj.get(current) ?? []) {
      if (!visited.has(neighbour)) {
        visited.add(neighbour);
        queue.push([neighbour, depth + 1]);
      }
    }
  }

  // Affected = visited minus the original source nodes (those are "modified")
  const affected = new Set<string>();
  for (const id of visited) {
    if (!sourceIds.has(id)) affected.add(id);
  }

  return { affected, maxDepth };
}

/** Compute a simulated cost multiplier based on blast radius */
function computeCostMultiplier(
  modifiedCount: number,
  affectedCount: number,
  totalNodes: number,
  maxDepth: number,
): number {
  // Base multiplier: grows with % of infrastructure impacted
  const impactRatio = (modifiedCount + affectedCount) / Math.max(totalNodes, 1);
  // Depth penalty: deep cascades are more costly
  const depthFactor = 1 + maxDepth * 0.15;
  // Simulate DB downsizing → throughput bottleneck adds extra multiplier
  const base = 1.0 + impactRatio * 2.5 * depthFactor;
  // Clamp between 1.0 and 5.0
  return Math.min(5.0, Math.max(1.0, parseFloat(base.toFixed(2))));
}

function getRiskLevel(multiplier: number): BlastRadiusResult['riskLevel'] {
  if (multiplier < 1.4) return 'LOW';
  if (multiplier < 2.0) return 'MEDIUM';
  if (multiplier < 3.0) return 'HIGH';
  return 'CRITICAL';
}

function buildSummary(
  modifiedCount: number,
  affectedCount: number,
  riskLevel: BlastRadiusResult['riskLevel'],
  maxDepth: number,
): string {
  if (modifiedCount === 0) {
    return 'No resource changes detected in the editor. Edit Terraform code first.';
  }
  const cascade = affectedCount > 0
    ? ` Cascading failure risk across ${affectedCount} downstream node${affectedCount !== 1 ? 's' : ''} (${maxDepth} hop${maxDepth !== 1 ? 's' : ''}).`
    : ' No downstream dependencies affected.';
  return `${riskLevel} RISK — ${modifiedCount} resource${modifiedCount !== 1 ? 's' : ''} modified.${cascade}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function runBlastRadiusSimulation(
  nodes: Node<CloudResourceData>[],
  edges: Edge[],
  originalCode: string,
  currentCode: string,
): BlastRadiusResult {
  const modifiedNodeIds = detectModifiedNodes(nodes, originalCode, currentCode);

  const { affected: affectedNodeIds, maxDepth } = modifiedNodeIds.size > 0
    ? findDownstreamNodes(modifiedNodeIds, edges)
    : { affected: new Set<string>(), maxDepth: 0 };

  const costMultiplier = computeCostMultiplier(
    modifiedNodeIds.size,
    affectedNodeIds.size,
    nodes.length,
    maxDepth,
  );
  const riskLevel = getRiskLevel(costMultiplier);
  const summary   = buildSummary(modifiedNodeIds.size, affectedNodeIds.size, riskLevel, maxDepth);

  return { modifiedNodeIds, affectedNodeIds, costMultiplier, riskLevel, maxDepth, summary };
}
