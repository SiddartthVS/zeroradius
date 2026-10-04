import { NextRequest, NextResponse } from 'next/server';
import { parse as parseHCL, HCLParseResult } from '@evops/hcl-terraform-parser';
import { transformResourcesToFlow, ParsedResource } from '@/lib/terraformTransformer';
// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── 1. Parse request body ──────────────────────────────────────────
  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body. Expected { code: string }.' },
      { status: 400 }
    );
  }

  const { code } = body;

  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    return NextResponse.json(
      { error: 'Missing or empty "code" field.' },
      { status: 400 }
    );
  }

  // ── 2. Parse HCL → JSON via @evops/hcl-terraform-parser ───────────
  let parsed: HCLParseResult;
  try {
    parsed = parseHCL(code);
  } catch (parseErr: unknown) {
    const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
    return NextResponse.json(
      {
        error: 'HCL parse error — ensure the uploaded file is valid Terraform HCL.',
        detail: msg,
      },
      { status: 422 }
    );
  }

  // ── 3. Extract managed_resources into our ParsedResource array ─────
  const managedResources = parsed.managed_resources ?? {};
  const resourceCount = Object.keys(managedResources).length;

  if (resourceCount === 0) {
    // Return an empty graph — no nodes, no edges — with a helpful hint
    return NextResponse.json({
      nodes: [],
      edges: [],
      meta: {
        resourceCount: 0,
        unknownTypes: [],
        hint: 'No "resource" blocks were found in the provided HCL. Only managed resources are visualised.',
      },
    });
  }

  const resources: ParsedResource[] = Object.entries(managedResources).map(
    ([key, r]) => ({
      key,
      type:     r.type,
      name:     r.name,
      provider: r.provider?.name ?? deriveProvider(r.type),
      line:     r.pos?.line ?? 0,
    })
  );

  // ── 4. Transform to React Flow nodes & edges ───────────────────────
  const { nodes, edges, unknownTypes } = transformResourcesToFlow(resources);

  // ── 5. Return structured response ─────────────────────────────────
  return NextResponse.json({
    nodes,
    edges,
    meta: {
      resourceCount,
      unknownTypes,
      parsedAt: new Date().toISOString(),
    },
  });
}

// Fallback: infer provider from resource type prefix
function deriveProvider(type: string): string {
  if (type.startsWith('aws_'))      return 'aws';
  if (type.startsWith('google_'))   return 'google';
  if (type.startsWith('azurerm_'))  return 'azurerm';
  if (type.startsWith('kubernetes_')) return 'kubernetes';
  return 'unknown';
}
