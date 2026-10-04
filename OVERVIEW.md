# OVERVIEW.md — Technical Deep Dive

> This document covers the architecture, algorithms, design decisions, and theory behind ZeroRadius. For setup instructions, see [README.md](./README.md).

---

## Table of Contents

- [System Architecture](#system-architecture)
- [Data Flow Pipeline](#data-flow-pipeline)
- [HCL Parsing & IaC Interceptor](#hcl-parsing--iac-interceptor)
- [Terraform → Graph Transformation](#terraform--graph-transformation)
- [Graph Layout Algorithm](#graph-layout-algorithm)
- [Blast Radius Simulation](#blast-radius-simulation)
- [AI-Powered Remediation](#ai-powered-remediation)
- [Frontend Architecture](#frontend-architecture)
- [Multi-Cloud Support](#multi-cloud-support)
- [Security Considerations](#security-considerations)

---

## System Architecture

ZeroRadius is a monolithic Next.js 16 application using the **App Router** pattern. All processing happens in two layers:

```
┌──────────────────────────────────────────────────────────────┐
│                        Browser (Client)                       │
│                                                              │
│  ┌─────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │   Monaco     │  │   React Flow     │  │  Blast Radius  │  │
│  │   Editor     │──│   Canvas         │──│  Overlay +     │  │
│  │   (HCL)      │  │   (Topology)     │  │  Remediation   │  │
│  └──────┬───────┘  └────────▲─────────┘  └───────┬────────┘  │
│         │                   │                    │            │
│         │    Code Change    │   Nodes/Edges      │ Fix Code   │
│         ▼                   │                    ▼            │
│  ┌──────────────────────────┴────────────────────────────┐   │
│  │              SplitDashboard (Orchestrator)             │   │
│  └──────────┬───────────────────────────────┬────────────┘   │
└─────────────┼───────────────────────────────┼────────────────┘
              │ POST /api/parse-terraform     │ POST /api/ai-remediate
              ▼                               ▼
┌─────────────────────────┐    ┌──────────────────────────────┐
│  IaC Interceptor API    │    │  AI Remediation API          │
│                         │    │                              │
│  @evops/hcl-terraform   │    │  Google Gemini               │
│  -parser → AST          │    │  (@google/generative-ai)     │
│  terraformTransformer   │    │  System prompt engineering   │
│  → React Flow graph     │    │  Model fallback chain        │
└─────────────────────────┘    └──────────────────────────────┘
```

### Key Design Decisions

1. **Server-side HCL parsing** — The `@evops/hcl-terraform-parser` library uses Node.js-specific APIs, so parsing is done in Next.js API routes (server-side), keeping the client bundle lean.
2. **Client-side blast radius** — The BFS simulation runs entirely in the browser for instant feedback without network round-trips.
3. **Server-side AI calls** — Gemini API keys never reach the client; all LLM communication is proxied through the `/api/ai-remediate` route.

---

## Data Flow Pipeline

The core pipeline transforms raw HCL text into a visual, interactive, and analyzable graph:

```
                    ┌─────────┐
   User writes/     │  Raw    │
   uploads .tf  ──► │  HCL    │
                    │  String │
                    └────┬────┘
                         │
                    POST /api/parse-terraform
                         │
                    ┌────▼────────────────────┐
                    │  @evops/hcl-terraform    │
                    │  -parser.parse(code)     │
                    │                          │
                    │  Output: AST with        │
                    │  managed_resources[]     │
                    └────┬────────────────────┘
                         │
                    ┌────▼────────────────────┐
                    │  terraformTransformer    │
                    │  .transformResources     │
                    │  ToFlow(resources)       │
                    │                          │
                    │  1. Classify resources   │
                    │  2. Compute tier layout  │
                    │  3. Generate edges       │
                    └────┬────────────────────┘
                         │
                    ┌────▼────┐
                    │  React  │    ┌─────────────┐
                    │  Flow   │◄───│  User edits  │
                    │  Graph  │    │  HCL code    │
                    └────┬────┘    └──────┬───────┘
                         │               │
                    ┌────▼───────────────▼──────┐
                    │  blastRadiusSimulator     │
                    │  .runBlastRadiusSimulation │
                    │                           │
                    │  1. Diff resource blocks  │
                    │  2. BFS downstream walk   │
                    │  3. Compute risk/cost     │
                    └────┬──────────────────────┘
                         │
                    ┌────▼────────────────────┐
                    │  POST /api/ai-remediate  │
                    │  (optional — user click) │
                    │                          │
                    │  Gemini generates        │
                    │  hardened HCL + diff     │
                    └──────────────────────────┘
```

---

## HCL Parsing & IaC Interceptor

### How it works

The IaC Interceptor (`/api/parse-terraform`) receives raw HCL text and:

1. **Parses** it using `@evops/hcl-terraform-parser` which produces an AST containing `managed_resources`, `data`, `modules`, `variables`, etc.
2. **Extracts** each managed resource's `type`, `name`, line number, and inferred provider.
3. **Passes** the resource list to the transformer for graph generation.

### Provider Detection

The parser infers the cloud provider from the resource type prefix:

| Prefix | Provider |
|---|---|
| `aws_*` | Amazon Web Services |
| `google_*` | Google Cloud Platform |
| `azurerm_*` | Microsoft Azure |
| `kubernetes_*` | Kubernetes |

### Error Handling

Invalid HCL returns a structured 422 response with parser error details, allowing the editor to display inline diagnostics.

---

## Terraform → Graph Transformation

The `terraformTransformer.ts` module is the heart of the visualization engine.

### Resource Classification

Every Terraform resource type is mapped to a semantic **NodeClass** via the `RESOURCE_CATALOG` — a lookup table of 35+ resource types across AWS, GCP, and Azure:

| NodeClass | Examples | Color |
|---|---|---|
| `gateway` | Internet Gateway, NAT Gateway, CloudFront, Route 53 | Cyan |
| `loadBalancer` | ALB, NLB, GCP Forwarding Rule, Azure LB | Violet |
| `webApp` | ECS Service, Cloud Run, Azure App Service | Emerald |
| `compute` | EC2, Lambda, EKS, GKE, Auto Scaling Group | Emerald |
| `database` | RDS, Aurora, Cloud SQL, Azure PostgreSQL | Amber |
| `cache` | ElastiCache, Memorystore, Azure Redis | Rose |
| `storage` | S3, GCS, Azure Storage Account | Sky |
| `messaging` | SQS, SNS, Kinesis, Pub/Sub, MSK | Violet |
| `network` | VPC, Subnet, GCP Network, Azure VNet | Cyan |
| `security` | Security Groups | Violet |

### Edge Affinity Rules

Edges are not random — they follow an **affinity matrix** that models real-world traffic flow:

```
gateway      → loadBalancer, webApp, compute
loadBalancer → webApp, compute
webApp       → database, cache, storage, messaging
compute      → database, cache, storage, messaging
messaging    → compute, webApp
```

Each edge is styled with the source node's protocol label (e.g., `HTTPS :443`, `TCP :5432`, `AMQP/HTTP`) and features animated SVG particle traffic.

---

## Graph Layout Algorithm

ZeroRadius uses a **tier-based topological layout** — not a force-directed or random layout.

### Tier Assignment

Each `NodeClass` is assigned a **tier number** (0–4) representing its position in a typical cloud architecture:

| Tier | Layer | NodeClasses |
|---|---|---|
| 0 | Edge / Network / Security | `gateway`, `network`, `security` |
| 1 | Ingress | `loadBalancer` |
| 2 | Application | `webApp`, `compute` |
| 3 | Messaging / Storage | `messaging`, `storage` |
| 4 | Data | `database`, `cache` |

### Position Calculation

```
For each tier:
  x = tier × (NODE_WIDTH + H_GAP)        // 270px + 90px = 360px horizontal spacing
  
  For nodes in that tier:
    totalHeight = count × (NODE_HEIGHT + V_GAP) - V_GAP
    startY = -totalHeight / 2             // Center vertically
    y[i] = startY + i × (NODE_HEIGHT + V_GAP)
```

This produces a clean left-to-right flow: **Edge → Ingress → App → Messaging → Data**, similar to how cloud architects mentally model infrastructure.

---

## Blast Radius Simulation

The blast radius simulator answers: *"If I change resource X, what else breaks?"*

### Algorithm

The simulation runs in 4 phases, entirely client-side:

#### Phase 1: Resource Diff Detection

```
extractResourceSignatures(code) →
  Regex: /resource\s+"([^"]+)"\s+"([^"]+)"\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g
  
  For each block:
    key = "type.name"   (e.g., "aws_db_instance.postgres")
    body = normalized whitespace content
  
  Returns: Map<key, body>
```

The diff compares the **original** (baseline) code against the **current** (modified) code:
- Resources with **changed bodies** → modified
- Resources that **existed before but are now missing** → deleted
- Resources that are **new** → added

> Whitespace normalization prevents false positives from formatting-only changes.

#### Phase 2: Node Mapping

Modified resource keys are mapped to React Flow node IDs by matching against each node's `sublabel` (e.g., `aws_db_instance.postgres_primary`) or `terraformResource` type.

#### Phase 3: BFS Cascade Walk

Starting from modified nodes, a **Breadth-First Search** traverses the directed edge graph:

```
Input:  sourceIds (modified nodes), edges (directed graph)
Output: affectedIds (downstream nodes), maxDepth

1. Build adjacency list: source → [targets]
2. Initialize BFS queue with all modified nodes at depth 0
3. For each node in queue:
   a. Record max depth
   b. For each unvisited neighbor:
      - Mark visited
      - Enqueue at depth + 1
4. Return: visited \ sourceIds (affected only), maxDepth
```

**Time complexity**: O(V + E) where V = nodes, E = edges.

#### Phase 4: Risk Assessment

```
impactRatio = (modifiedCount + affectedCount) / totalNodes
depthFactor = 1 + maxDepth × 0.15
costMultiplier = clamp(1.0 + impactRatio × 2.5 × depthFactor, 1.0, 5.0)

Risk Levels:
  < 1.4x → LOW     (green)
  < 2.0x → MEDIUM  (amber)
  < 3.0x → HIGH    (orange)
  ≥ 3.0x → CRITICAL (red)
```

The cost multiplier simulates the real-world cascading load effect — e.g., if you downsize a database, the cache layer gets overloaded, which cascades to the application tier.

### Visual Representation

| Element | Modified (Epicenter) | Affected (Downstream) |
|---|---|---|
| Border | AWS Orange `#ec7211` | AWS Red `#d13212` |
| Animation | `animate-pulse` | `animate-blast-shake` |
| Badge | — | "AT RISK" |
| Edges | — | Red + marching ants animation |

---

## AI-Powered Remediation

### Prompt Engineering

The `/api/ai-remediate` route uses a carefully crafted system prompt that instructs Gemini to act as a **Senior DevOps / IaC Resilience Engineer**. Key constraints:

1. **Structured JSON output** — Response must match `{ fixedCode, explanation, changes }` exactly
2. **Complete HCL** — The `fixedCode` must be deployable, not a snippet
3. **Resilience patterns** — Focus on HA, connection pooling, read replicas, auto-scaling, circuit breakers, graceful degradation
4. **Preserve identifiers** — Don't rename resources unnecessarily

### Model Fallback Chain

```
Configured model (env var)
  └─► gemini-3.8-flash
       └─► gemini-flash-latest
            └─► gemini-3.7-flash
```

If the primary model is unavailable (rate limited, deprecated, etc.), the API cascades through fallback models automatically.

### Response Pipeline

```
LLM Raw Output
  │
  ├─ Try JSON.parse() directly
  │
  ├─ If fails: Strip markdown code fences, retry parse
  │
  ├─ If fails: Return 502 with raw response for debugging
  │
  └─ Validate required fields (fixedCode, explanation, changes[])
```

### Diff Viewer

The `RemediationPanel` computes a line-by-line diff between the current and fixed HCL, classifying each line as:
- **Addition** (`+`) — green highlight
- **Deletion** (`-`) — red highlight  
- **Context** — collapsible unchanged blocks

---

## Frontend Architecture

### Component Hierarchy

```
RootLayout
└── Home (page.tsx)
    └── SplitDashboard (orchestrator)
        ├── Header (AWS-style nav bar)
        ├── Left Pane
        │   ├── TerraformUploadZone (drag-drop + presets)
        │   └── TerraformEditor (Monaco)
        └── Right Pane
            └── ArchitectureCanvas (React Flow)
                ├── CloudNode[] (custom nodes)
                ├── HackerEdge[] (custom edges)
                ├── NodeInspectorDrawer (detail panel)
                ├── BlastRadiusOverlay (risk card)
                └── RemediationPanel (AI fix modal)
```

### Key Technologies

| Tech | Purpose | Why |
|---|---|---|
| **React 19** | UI framework | Concurrent features, React Compiler for auto-memoization |
| **React Compiler** (`babel-plugin-react-compiler`) | Build-time optimization | Eliminates manual `useMemo`/`useCallback` — the compiler infers optimal memoization boundaries |
| **React Flow** | Graph visualization | Purpose-built for node-graph UIs with handles, edges, minimap, and pan/zoom |
| **Monaco Editor** | Code editor | VS Code's editor engine — full HCL support with syntax highlighting |
| **Tailwind CSS v4** | Styling | Utility-first CSS with `@tailwindcss/postcss` — no config file needed in v4 |
| **Next.js App Router** | Server components + API routes | File-based routing, server-side HCL parsing, env var protection |

### Custom React Flow Components

- **`CloudNode`** — Renders resource cards with dynamic icons (via Lucide), status indicators, accent color bars, and blast-radius visual states (pulse, shake, risk badge)
- **`HackerEdge`** — Custom Bézier edge with animated SVG `<circle>` particles traveling along the path using `<animateMotion>`, plus protocol label pills via `EdgeLabelRenderer`

### Resizable Split View

The `SplitDashboard` implements a custom drag-to-resize split pane:
- Mouse-down on the center divider starts tracking
- Mouse-move updates `splitRatio` (clamped 25%–75%)
- Mouse-up ends tracking
- Mobile: Falls back to tab-based navigation

---

## Multi-Cloud Support

The `RESOURCE_CATALOG` in `terraformTransformer.ts` supports resources across three major cloud providers:

| Provider | Resource Types Supported |
|---|---|
| **AWS** | VPC, Subnet, Security Group, Internet Gateway, NAT Gateway, Route 53, CloudFront, ALB/NLB, ECS, EKS, EC2, Lambda, Auto Scaling, Elastic Beanstalk, RDS, Aurora, ElastiCache, S3, SQS, SNS, Kinesis, MSK |
| **GCP** | VPC Network, Forwarding Rule, Cloud Run, GKE, Cloud SQL, Memorystore, GCS, Pub/Sub |
| **Azure** | VNet, Load Balancer, App Service, Container Group, PostgreSQL, SQL Server, Redis Cache, Storage Account |

Unknown resource types are gracefully handled — they render as "unknown" nodes with auto-generated labels derived from the resource type name.

---

## Security Considerations

| Concern | Mitigation |
|---|---|
| API keys in client bundle | Gemini key lives in `.env.local` (server-only), never shipped to client |
| `.env.local` in git | `.gitignore` excludes `.env*` but includes `.env.example` for onboarding |
| LLM injection | System prompt constrains output to JSON schema; response is parsed, not executed |
| HCL parsing DoS | Parser runs server-side with standard Node.js memory limits |
| CORS | Next.js API routes are same-origin by default |

---

## References

- [Terraform Documentation](https://developer.hashicorp.com/terraform/docs)
- [React Flow Documentation](https://reactflow.dev/docs)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [Google Gemini API](https://ai.google.dev/docs)
- [Blast Radius Concept (HashiCorp)](https://developer.hashicorp.com/terraform/tutorials/state/resource-targeting)
- [BFS Algorithm — Wikipedia](https://en.wikipedia.org/wiki/Breadth-first_search)
