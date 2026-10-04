/**
 * POST /api/ai-remediate
 *
 * Takes the modified Terraform code and the list of at-risk downstream node
 * labels, sends a structured prompt to the Gemini LLM, and streams back a
 * JSON response containing:
 *   - fixedCode   : the full rewritten Terraform HCL
 *   - explanation : a concise markdown explanation of what was changed and why
 *   - changes     : a string array of bullet-point changes
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RemediateRequestBody {
  /** The current (modified) Terraform HCL that triggered the blast radius */
  currentCode: string;
  /** The original baseline Terraform HCL */
  originalCode: string;
  /** Labels of the directly modified nodes */
  modifiedNodes: string[];
  /** Labels of the downstream at-risk nodes */
  affectedNodes: string[];
  /** Risk level from blast radius simulation */
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Cost multiplier from blast radius simulation */
  costMultiplier: number;
}

interface RemediateResponseBody {
  fixedCode: string;
  explanation: string;
  changes: string[];
  modelUsed?: string;
}

// ─── System Prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are a Senior DevOps / Infrastructure-as-Code expert specialising in Terraform and cloud resilience engineering. 
Your job is to analyse modified Terraform configurations that have introduced cascading failure risks, and produce a hardened, production-safe rewrite that resolves those risks.

RULES:
1. Return ONLY valid JSON matching this schema exactly — no markdown fences, no extra text:
   {
     "fixedCode": "<complete rewritten Terraform HCL as a single string>",
     "explanation": "<concise markdown explanation of root cause and remediation strategy>",
     "changes": ["<change 1>", "<change 2>", ...]
   }
2. The fixedCode must be complete, valid, deployable Terraform HCL — not a snippet.
3. Focus on: high-availability, resilience, connection pooling, read replicas, caching strategies, auto-scaling, and graceful degradation.
4. Preserve all resource names and identifiers that don't need to change.
5. Each item in "changes" must be a single, concise, human-readable bullet describing one specific change made.
6. The explanation should be 2–4 sentences covering: what went wrong, and what the fix achieves.`;
}

function buildUserPrompt(body: RemediateRequestBody): string {
  const modifiedList = body.modifiedNodes.length > 0
    ? body.modifiedNodes.join(', ')
    : '(unknown — see diff below)';
  const affectedList = body.affectedNodes.length > 0
    ? body.affectedNodes.join(', ')
    : 'none detected';

  return `## Blast Radius Analysis

**Risk Level:** ${body.riskLevel}
**Cost Multiplier:** ${body.costMultiplier}× baseline load
**Directly Modified Resources:** ${modifiedList}
**Downstream At-Risk Resources:** ${affectedList}

## Original (Baseline) Terraform
\`\`\`hcl
${body.originalCode.trim()}
\`\`\`

## Modified (Current) Terraform — contains the risk
\`\`\`hcl
${body.currentCode.trim()}
\`\`\`

Please rewrite the Modified Terraform to eliminate the cascading failure risk. Apply best-practice infrastructure resilience patterns (e.g. increase connection pool sizes, add read replicas, tune autoscaling, add circuit-breaker friendly timeouts). Return only the JSON object.`;
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Validate API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return NextResponse.json(
      {
        error: 'GEMINI_API_KEY is not configured.',
        hint: 'Add GEMINI_API_KEY=<your_key> to .env.local. Get a free key at https://aistudio.google.com/app/apikey',
      },
      { status: 503 }
    );
  }

  // 2. Parse request body
  let body: RemediateRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body.' },
      { status: 400 }
    );
  }

  if (!body.currentCode || typeof body.currentCode !== 'string') {
    return NextResponse.json(
      { error: 'Missing required field: currentCode' },
      { status: 400 }
    );
  }

  // 3. Call Gemini with primary model and graceful fallbacks
  const configuredModel = process.env.GEMINI_MODEL?.trim();
  const candidateModels = configuredModel
    ? [configuredModel, 'gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.7-flash']
    : ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.7-flash'];

  // De-duplicate candidate list
  const modelsToTry = Array.from(new Set(candidateModels));
  const genAI = new GoogleGenerativeAI(apiKey);

  let rawText: string | null = null;
  let activeModelUsed = 'gemini-3.8-flash';
  let lastError: Error | null = null;

  for (const candidate of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: candidate,
        systemInstruction: buildSystemPrompt(),
        generationConfig: {
          temperature: 0.2,       // Keep the output deterministic and technical
          responseMimeType: 'application/json',
        },
      });

      const result = await model.generateContent(buildUserPrompt(body));
      rawText = result.response.text();
      activeModelUsed = candidate;
      if (rawText) break;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Continue to next candidate model if available
    }
  }

  if (!rawText) {
    return NextResponse.json(
      { error: `Gemini API error across models [${modelsToTry.join(', ')}]: ${lastError?.message || 'Unknown error'}` },
      { status: 502 }
    );
  }

  // 4. Parse the LLM JSON response
  let parsed: RemediateResponseBody;
  try {
    parsed = JSON.parse(rawText) as RemediateResponseBody;
  } catch {
    // LLM occasionally wraps in markdown — strip fences and retry
    const stripped = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();
    try {
      parsed = JSON.parse(stripped) as RemediateResponseBody;
    } catch {
      return NextResponse.json(
        {
          error: 'LLM returned malformed JSON. Raw response included for debugging.',
          rawResponse: rawText.slice(0, 2000),
        },
        { status: 502 }
      );
    }
  }

  // 5. Validate required fields
  if (!parsed.fixedCode || !parsed.explanation || !Array.isArray(parsed.changes)) {
    return NextResponse.json(
      { error: 'LLM response missing required fields (fixedCode, explanation, changes).', rawResponse: rawText.slice(0, 2000) },
      { status: 502 }
    );
  }

  parsed.modelUsed = activeModelUsed;
  return NextResponse.json(parsed satisfies RemediateResponseBody);
}

