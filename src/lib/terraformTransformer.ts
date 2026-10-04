import { Node, Edge } from 'reactflow';
import { CloudResourceData } from '@/types/cloud-architecture';

// ─── Resource Type Catalog ──────────────────────────────────────────────────

export type NodeClass =
  | 'gateway'
  | 'loadBalancer'
  | 'webApp'
  | 'database'
  | 'cache'
  | 'storage'
  | 'network'
  | 'security'
  | 'compute'
  | 'messaging'
  | 'unknown';

interface ResourceProfile {
  nodeClass: NodeClass;
  label: string;
  resourceType: string;
  accentColor: CloudResourceData['accentColor'];
  defaultPort?: number;
  engine?: string;
}

/** Maps Terraform resource types → display profile */
const RESOURCE_CATALOG: Record<string, ResourceProfile> = {
  // ── Networking & Edge ──────────────────────────────────────────────
  aws_internet_gateway:        { nodeClass: 'gateway',      label: 'Internet Gateway',       resourceType: 'Internet Gateway',           accentColor: 'cyan' },
  aws_nat_gateway:             { nodeClass: 'gateway',      label: 'NAT Gateway',             resourceType: 'NAT Gateway',                accentColor: 'cyan' },
  aws_vpc:                     { nodeClass: 'network',      label: 'VPC',                     resourceType: 'Virtual Private Cloud',      accentColor: 'cyan' },
  aws_subnet:                  { nodeClass: 'network',      label: 'Subnet',                  resourceType: 'VPC Subnet',                 accentColor: 'cyan' },
  aws_security_group:          { nodeClass: 'security',     label: 'Security Group',          resourceType: 'Security Group',             accentColor: 'violet' },
  aws_route53_record:          { nodeClass: 'gateway',      label: 'Route 53 DNS',            resourceType: 'DNS Record',                 accentColor: 'cyan' },
  aws_cloudfront_distribution: { nodeClass: 'gateway',      label: 'CloudFront CDN',          resourceType: 'CDN Distribution',           accentColor: 'cyan' },
  google_compute_network:      { nodeClass: 'network',      label: 'GCP VPC Network',         resourceType: 'Virtual Private Cloud',      accentColor: 'cyan' },
  azurerm_virtual_network:     { nodeClass: 'network',      label: 'Azure VNet',              resourceType: 'Virtual Network',            accentColor: 'cyan' },

  // ── Load Balancers ─────────────────────────────────────────────────
  aws_lb:                      { nodeClass: 'loadBalancer', label: 'Load Balancer',           resourceType: 'Application Load Balancer',  accentColor: 'violet', defaultPort: 443 },
  aws_alb:                     { nodeClass: 'loadBalancer', label: 'ALB',                     resourceType: 'Application Load Balancer',  accentColor: 'violet', defaultPort: 443 },
  aws_lb_listener:             { nodeClass: 'loadBalancer', label: 'LB Listener',             resourceType: 'Load Balancer Listener',     accentColor: 'violet' },
  google_compute_forwarding_rule: { nodeClass: 'loadBalancer', label: 'GCP Load Balancer',   resourceType: 'Forwarding Rule',            accentColor: 'violet' },
  azurerm_lb:                  { nodeClass: 'loadBalancer', label: 'Azure Load Balancer',     resourceType: 'Load Balancer',              accentColor: 'violet' },

  // ── Compute / Applications ─────────────────────────────────────────
  aws_ecs_service:             { nodeClass: 'webApp',       label: 'ECS Service',             resourceType: 'Container Service',          accentColor: 'emerald', defaultPort: 3000 },
  aws_ecs_cluster:             { nodeClass: 'compute',      label: 'ECS Cluster',             resourceType: 'Container Cluster',          accentColor: 'emerald' },
  aws_lambda_function:         { nodeClass: 'compute',      label: 'Lambda Function',         resourceType: 'Serverless Function',        accentColor: 'emerald' },
  aws_instance:                { nodeClass: 'compute',      label: 'EC2 Instance',            resourceType: 'Virtual Machine',            accentColor: 'emerald', defaultPort: 80 },
  aws_autoscaling_group:       { nodeClass: 'compute',      label: 'Auto Scaling Group',      resourceType: 'ASG',                        accentColor: 'emerald' },
  aws_elastic_beanstalk_environment: { nodeClass: 'webApp', label: 'Elastic Beanstalk',       resourceType: 'App Platform',               accentColor: 'emerald' },
  aws_eks_cluster:             { nodeClass: 'compute',      label: 'EKS Cluster',             resourceType: 'Kubernetes Cluster',         accentColor: 'emerald' },
  google_cloud_run_service:    { nodeClass: 'webApp',       label: 'Cloud Run',               resourceType: 'Serverless Container',       accentColor: 'emerald' },
  google_container_cluster:    { nodeClass: 'compute',      label: 'GKE Cluster',             resourceType: 'Kubernetes Cluster',         accentColor: 'emerald' },
  azurerm_app_service:         { nodeClass: 'webApp',       label: 'Azure App Service',       resourceType: 'App Service',                accentColor: 'emerald' },
  azurerm_container_group:     { nodeClass: 'compute',      label: 'ACI Container Group',     resourceType: 'Container Group',            accentColor: 'emerald' },

  // ── Relational Databases ───────────────────────────────────────────
  aws_db_instance:             { nodeClass: 'database',     label: 'RDS Instance',            resourceType: 'Relational Database',        accentColor: 'amber', engine: 'PostgreSQL/MySQL', defaultPort: 5432 },
  aws_rds_cluster:             { nodeClass: 'database',     label: 'Aurora Cluster',          resourceType: 'Aurora DB Cluster',          accentColor: 'amber', defaultPort: 5432 },
  google_sql_database_instance: { nodeClass: 'database',    label: 'Cloud SQL',               resourceType: 'Managed SQL Database',       accentColor: 'amber' },
  azurerm_postgresql_server:   { nodeClass: 'database',     label: 'Azure PostgreSQL',        resourceType: 'PostgreSQL Server',          accentColor: 'amber', defaultPort: 5432 },
  azurerm_mssql_server:        { nodeClass: 'database',     label: 'Azure SQL Server',        resourceType: 'SQL Server',                 accentColor: 'amber' },

  // ── Caches ─────────────────────────────────────────────────────────
  aws_elasticache_cluster:     { nodeClass: 'cache',        label: 'ElastiCache',             resourceType: 'In-Memory Cache',            accentColor: 'rose', engine: 'Redis/Memcached', defaultPort: 6379 },
  aws_elasticache_replication_group: { nodeClass: 'cache',  label: 'ElastiCache Cluster',     resourceType: 'Redis Replication Group',    accentColor: 'rose', defaultPort: 6379 },
  google_redis_instance:       { nodeClass: 'cache',        label: 'Cloud Memorystore',       resourceType: 'Redis Cache',                accentColor: 'rose', defaultPort: 6379 },
  azurerm_redis_cache:         { nodeClass: 'cache',        label: 'Azure Cache for Redis',   resourceType: 'Redis Cache',                accentColor: 'rose', defaultPort: 6379 },

  // ── Object Storage ─────────────────────────────────────────────────
  aws_s3_bucket:               { nodeClass: 'storage',      label: 'S3 Bucket',               resourceType: 'Object Storage',             accentColor: 'sky' },
  google_storage_bucket:       { nodeClass: 'storage',      label: 'GCS Bucket',              resourceType: 'Object Storage',             accentColor: 'sky' },
  azurerm_storage_account:     { nodeClass: 'storage',      label: 'Azure Storage',           resourceType: 'Blob Storage Account',       accentColor: 'sky' },

  // ── Messaging / Queues ─────────────────────────────────────────────
  aws_sqs_queue:               { nodeClass: 'messaging',    label: 'SQS Queue',               resourceType: 'Message Queue',              accentColor: 'violet' },
  aws_sns_topic:               { nodeClass: 'messaging',    label: 'SNS Topic',               resourceType: 'Pub/Sub Topic',              accentColor: 'violet' },
  aws_kinesis_stream:          { nodeClass: 'messaging',    label: 'Kinesis Stream',          resourceType: 'Data Stream',                accentColor: 'violet' },
  aws_msk_cluster:             { nodeClass: 'messaging',    label: 'MSK Kafka Cluster',       resourceType: 'Managed Kafka',              accentColor: 'violet' },
  google_pubsub_topic:         { nodeClass: 'messaging',    label: 'Pub/Sub Topic',           resourceType: 'Message Queue',              accentColor: 'violet' },
};

// ─── Connectivity Rules ──────────────────────────────────────────────────────

/** Defines preferred connection routing between node classes */
const EDGE_AFFINITY: Partial<Record<NodeClass, NodeClass[]>> = {
  gateway:      ['loadBalancer', 'webApp', 'compute'],
  loadBalancer: ['webApp', 'compute'],
  webApp:       ['database', 'cache', 'storage', 'messaging'],
  compute:      ['database', 'cache', 'storage', 'messaging'],
  messaging:    ['compute', 'webApp'],
};

const EDGE_STYLE: Record<NodeClass, { stroke: string; label: string }> = {
  gateway:      { stroke: '#06b6d4', label: 'HTTPS :443' },
  loadBalancer: { stroke: '#8b5cf6', label: 'HTTP  :80/443' },
  webApp:       { stroke: '#10b981', label: 'TCP' },
  database:     { stroke: '#f59e0b', label: 'TCP :5432' },
  cache:        { stroke: '#f43f5e', label: 'TCP :6379' },
  storage:      { stroke: '#0284c7', label: 'HTTPS (IAM)' },
  network:      { stroke: '#94a3b8', label: 'VPC' },
  security:     { stroke: '#6366f1', label: 'SG Rule' },
  compute:      { stroke: '#10b981', label: 'TCP' },
  messaging:    { stroke: '#8b5cf6', label: 'AMQP/HTTP' },
  unknown:      { stroke: '#64748b', label: 'Link' },
};

// ─── Layout Engine ───────────────────────────────────────────────────────────

const CLASS_TIER: Record<NodeClass, number> = {
  gateway:      0,
  network:      0,
  security:     0,
  loadBalancer: 1,
  webApp:       2,
  compute:      2,
  messaging:    3,
  database:     4,
  cache:        4,
  storage:      3,
  unknown:      2,
};

const NODE_WIDTH  = 270;
const NODE_HEIGHT = 170;
const H_GAP       = 90;
const V_GAP       = 60;

function computeLayout(
  nodes: Array<{ id: string; class: NodeClass }>
): Record<string, { x: number; y: number }> {
  // Group by tier
  const tiers: Map<number, string[]> = new Map();
  for (const n of nodes) {
    const tier = CLASS_TIER[n.class] ?? 2;
    if (!tiers.has(tier)) tiers.set(tier, []);
    tiers.get(tier)!.push(n.id);
  }

  const sortedTiers = [...tiers.keys()].sort((a, b) => a - b);
  const positions: Record<string, { x: number; y: number }> = {};

  for (const tier of sortedTiers) {
    const ids = tiers.get(tier)!;
    const x = tier * (NODE_WIDTH + H_GAP);
    const totalH = ids.length * (NODE_HEIGHT + V_GAP) - V_GAP;
    const startY = -totalH / 2;
    ids.forEach((id, i) => {
      positions[id] = { x, y: startY + i * (NODE_HEIGHT + V_GAP) };
    });
  }

  return positions;
}

// ─── Parsed Resource Shape ────────────────────────────────────────────────────

export interface ParsedResource {
  key: string;           // "aws_db_instance.postgres"
  type: string;          // "aws_db_instance"
  name: string;          // "postgres"
  provider: string;      // "aws" | "google" | "azurerm"
  line: number;
}

export interface TransformResult {
  nodes: Node<CloudResourceData>[];
  edges: Edge[];
  resourceCount: number;
  unknownTypes: string[];
}

// ─── Main Transformer ─────────────────────────────────────────────────────────

export function transformResourcesToFlow(
  resources: ParsedResource[]
): TransformResult {
  const unknownTypes: string[] = [];

  // 1. Build a node spec for every resource
  const nodeSpecs = resources.map((res) => {
    const profile = RESOURCE_CATALOG[res.type];
    if (!profile) unknownTypes.push(res.type);

    const nodeClass: NodeClass = profile?.nodeClass ?? 'unknown';
    const accentColor          = profile?.accentColor ?? 'cyan';
    const label                = profile
      ? `${profile.label}`
      : humanise(res.type);
    const resourceType         = profile?.resourceType ?? res.type;
    const engine               = profile?.engine;
    const defaultPort          = profile?.defaultPort;

    return { id: `node-${res.key}`, class: nodeClass, res, profile, label, resourceType, accentColor, engine, defaultPort };
  });

  // 2. Compute positions
  const layout = computeLayout(nodeSpecs.map((n) => ({ id: n.id, class: n.class })));

  // 3. Build React-Flow nodes
  const nodes: Node<CloudResourceData>[] = nodeSpecs.map((spec) => {
    const pos = layout[spec.id] ?? { x: 0, y: 0 };

    const terraformSnippet = [
      `resource "${spec.res.type}" "${spec.res.name}" {`,
      `  # (line ${spec.res.line} in uploaded .tf file)`,
      `  # Managed by: ${spec.res.provider ?? 'unknown'}`,
      `}`,
    ].join('\n');

    const data: CloudResourceData = {
      label:             spec.label,
      sublabel:          `${spec.res.type}.${spec.res.name}`,
      resourceType:      spec.resourceType,
      terraformResource: spec.res.type,
      provider:          `hashicorp/${spec.res.provider ?? 'aws'}`,
      status:            'ONLINE',
      accentColor:       spec.accentColor,
      details: {
        engine:   spec.engine,
        port:     spec.defaultPort,
        tier:     tierLabel(spec.class),
      },
      terraformSnippet,
    };

    return {
      id:       spec.id,
      type:     spec.class,
      position: pos,
      data,
    };
  });

  // 4. Build edges via affinity rules (one pass)
  const edges: Edge[] = [];
  const usedPairs = new Set<string>();

  for (const src of nodeSpecs) {
    const targets = EDGE_AFFINITY[src.class] ?? [];
    for (const dstClass of targets) {
      // Find first unused node of dstClass that is not src itself
      const dst = nodeSpecs.find(
        (n) => n.class === dstClass && n.id !== src.id
      );
      if (!dst) continue;

      const pairKey = [src.id, dst.id].sort().join('→');
      if (usedPairs.has(pairKey)) continue;
      usedPairs.add(pairKey);

      const style = EDGE_STYLE[src.class];
      edges.push({
        id:       `edge-${src.id}-${dst.id}`,
        source:   src.id,
        target:   dst.id,
        animated: true,
        label:    style.label,
        type:     'hacker',
        style:    { stroke: style.stroke, strokeWidth: 2 },
      });
    }
  }

  return { nodes, edges, resourceCount: resources.length, unknownTypes };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function humanise(type: string): string {
  // "aws_db_instance" → "Db Instance"
  return type
    .replace(/^[a-z]+_/, '')               // strip provider prefix
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function tierLabel(c: NodeClass): string {
  const map: Record<NodeClass, string> = {
    gateway:      'Public Edge',
    loadBalancer: 'Public Ingress Subnet',
    webApp:       'Private App Subnet',
    compute:      'Private App Subnet',
    database:     'Isolated DB Subnet',
    cache:        'Private Cache Subnet',
    storage:      'Managed Storage',
    network:      'Network Layer',
    security:     'Security Layer',
    messaging:    'Messaging Layer',
    unknown:      'Unknown Subnet',
  };
  return map[c] ?? 'Unknown';
}
