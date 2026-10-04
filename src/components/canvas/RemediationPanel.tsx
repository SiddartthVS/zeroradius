'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { BlastRadiusResult } from '@/lib/blastRadiusSimulator';
import {
  Wand2,
  X,
  CheckCircle2,
  AlertCircle,
  Copy,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TerminalSquare,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';

export type RemediationStatus = 'idle' | 'loading' | 'success' | 'error';

interface RemediationPanelProps {
  blastResult: BlastRadiusResult;
  currentCode: string;
  originalCode: string;
  modifiedNodeLabels: string[];
  affectedNodeLabels: string[];
  onApplyFix: (fixedCode: string) => void;
  onClose: () => void;
}

const DiffViewer: React.FC<{ original: string; fixed: string }> = ({ original, fixed }) => {
  const [showAll, setShowAll] = useState(false);

  const origLines = original.split('\n');
  const fixLines  = fixed.split('\n');

  type DiffLine = { kind: 'same' | 'add' | 'remove'; text: string };

  const origSet = new Set(origLines.map((l) => l.trimEnd()));
  const fixSet  = new Set(fixLines.map((l) => l.trimEnd()));

  const CONTEXT = 2;

  const displayLines: DiffLine[] = fixLines.map((line) => {
    const trimmed = line.trimEnd();
    return origSet.has(trimmed)
      ? { kind: 'same' as const, text: line }
      : { kind: 'add' as const, text: line };
  });

  const removedLines: DiffLine[] = origLines
    .filter((l) => !fixSet.has(l.trimEnd()))
    .map((l) => ({ kind: 'remove' as const, text: l }));

  const allLines = [...displayLines, ...removedLines];

  const interesting = new Set<number>();
  allLines.forEach((l, i) => {
    if (l.kind !== 'same') {
      for (let j = Math.max(0, i - CONTEXT); j <= Math.min(allLines.length - 1, i + CONTEXT); j++) {
        interesting.add(j);
      }
    }
  });

  let skipCount = 0;
  const rows: Array<{ type: 'line'; line: DiffLine; idx: number } | { type: 'skip'; count: number }> = [];

  for (let i = 0; i < allLines.length; i++) {
    if (interesting.has(i) || showAll) {
      if (skipCount > 0) {
        rows.push({ type: 'skip', count: skipCount });
        skipCount = 0;
      }
      rows.push({ type: 'line', line: allLines[i], idx: i });
    } else {
      skipCount++;
    }
  }
  if (skipCount > 0) rows.push({ type: 'skip', count: skipCount });

  const addCount    = allLines.filter((l) => l.kind === 'add').length;
  const removeCount = allLines.filter((l) => l.kind === 'remove').length;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Diff stats bar */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-b border-gray-200 bg-gray-50 text-xs shrink-0">
        <span className="flex items-center gap-1 text-emerald-700 font-medium">
          <span className="font-bold">+{addCount}</span> additions
        </span>
        <span className="flex items-center gap-1 text-red-700 font-medium">
          <span className="font-bold">−{removeCount}</span> removals
        </span>
        {!showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="ml-auto text-[#0073bb] hover:text-[#00527c] flex items-center gap-1 transition-colors cursor-pointer text-xs"
          >
            <ChevronDown className="w-3 h-3" />
            Show all lines
          </button>
        )}
        {showAll && (
          <button
            onClick={() => setShowAll(false)}
            className="ml-auto text-[#0073bb] hover:text-[#00527c] flex items-center gap-1 transition-colors cursor-pointer text-xs"
          >
            <ChevronUp className="w-3 h-3" />
            Collapse context
          </button>
        )}
      </div>

      {/* Diff lines */}
      <div className="flex-1 overflow-y-auto text-xs font-mono leading-5 p-2">
        {rows.map((row, idx) => {
          if (row.type === 'skip') {
            return (
              <div key={`skip-${idx}`} className="px-4 py-0.5 text-gray-400 bg-gray-50 select-none border-y border-gray-200 text-[11px]">
                @@ …{row.count} unchanged lines…
              </div>
            );
          }
          const { line } = row;
          return (
            <div
              key={`line-${row.idx}`}
              className={`flex items-start px-2 py-0.5 ${
                line.kind === 'add'
                  ? 'bg-emerald-50/80 border-l-2 border-emerald-600 text-emerald-900 font-medium'
                  : line.kind === 'remove'
                  ? 'bg-red-50/80 border-l-2 border-red-500 text-red-800 line-through opacity-75'
                  : 'border-l-2 border-transparent text-gray-700'
              }`}
            >
              <span className={`w-4 shrink-0 text-center select-none font-bold ${
                line.kind === 'add' ? 'text-emerald-700' : line.kind === 'remove' ? 'text-red-700' : 'text-gray-300'
              }`}>
                {line.kind === 'add' ? '+' : line.kind === 'remove' ? '−' : ' '}
              </span>
              <span className="whitespace-pre">
                {line.text || ' '}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const RemediationPanel: React.FC<RemediationPanelProps> = ({
  blastResult,
  currentCode,
  originalCode,
  modifiedNodeLabels,
  affectedNodeLabels,
  onApplyFix,
  onClose,
}) => {
  const [status, setStatus]           = useState<RemediationStatus>('idle');
  const [fixedCode, setFixedCode]     = useState<string>('');
  const [explanation, setExplanation] = useState<string>('');
  const [changes, setChanges]         = useState<string[]>([]);
  const [modelName, setModelName]     = useState<string>('gemini-3.8-flash');
  const [errorMsg, setErrorMsg]       = useState<string>('');
  const [copied, setCopied]           = useState(false);
  const [applied, setApplied]         = useState(false);
  const [visible, setVisible]         = useState(false);
  const hasFetched = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchRemediation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRemediation = useCallback(async () => {
    setStatus('loading');
    setErrorMsg('');
    setFixedCode('');
    setExplanation('');
    setChanges([]);
    setApplied(false);

    try {
      const res = await fetch('/api/ai-remediate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentCode,
          originalCode,
          modifiedNodes: modifiedNodeLabels,
          affectedNodes: affectedNodeLabels,
          riskLevel: blastResult.riskLevel,
          costMultiplier: blastResult.costMultiplier,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setErrorMsg(data.error ?? `Server error ${res.status}`);
        if (data.hint) setErrorMsg((prev) => `${prev}\n\n💡 ${data.hint}`);
        return;
      }

      setFixedCode(data.fixedCode ?? '');
      setExplanation(data.explanation ?? '');
      setChanges(data.changes ?? []);
      if (data.modelUsed) setModelName(data.modelUsed);
      setStatus('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setStatus('error');
      setErrorMsg(msg);
    }
  }, [currentCode, originalCode, modifiedNodeLabels, affectedNodeLabels, blastResult]);

  const handleCopy = useCallback(async () => {
    if (!fixedCode) return;
    await navigator.clipboard.writeText(fixedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [fixedCode]);

  const handleApply = useCallback(() => {
    if (!fixedCode) return;
    onApplyFix(fixedCode);
    setApplied(true);
  }, [fixedCode, onApplyFix]);

  return (
    <div
      className={`
        absolute inset-4 z-50
        flex flex-col rounded-lg border border-gray-300
        bg-white shadow-2xl font-sans
        transition-all duration-200 ease-out overflow-hidden min-h-0 min-w-0
        ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
      `}
    >
      {/* ── Header: Dark Slate AWS Console Style ── */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#232f3e] text-white border-b border-[#16191f] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded bg-[#ec7211] text-white">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-white tracking-tight">AI Infrastructure Remediation</div>
            <div className="text-xs text-gray-300">
              <span className="text-white font-medium">{modelName}</span> · AWS Architecture Auto-Fix Engine
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status === 'success' && !applied && (
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-600 text-white font-semibold">
              Fix Ready
            </span>
          )}
          {applied && (
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-700 text-white font-semibold">
              ✓ Applied
            </span>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white">

        {/* Loading state */}
        {status === 'loading' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
            <RefreshCw className="w-8 h-8 text-[#ec7211] animate-spin" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-900">
                {modelName} is analyzing infrastructure topology…
              </p>
              <p className="text-xs text-gray-500">Scanning blast radius → applying AWS resilience patterns → refactoring HCL</p>
            </div>
            <div className="flex gap-2 text-xs text-gray-400">
              {['Parsing diff', 'Root cause detection', 'Generating fix', 'Validating HCL'].map((s, i) => (
                <span key={s} className="flex items-center gap-1">
                  {i > 0 && <ArrowRight className="w-2.5 h-2.5" />}
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Error state */}
        {status === 'error' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
            <div className="p-3 rounded-full bg-red-100 border border-red-200">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="space-y-2 text-center max-w-sm">
              <p className="text-sm font-semibold text-red-800">Remediation Failed</p>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap text-left bg-gray-50 border border-gray-200 rounded p-3">
                {errorMsg}
              </pre>
            </div>
            <button
              onClick={fetchRemediation}
              className="flex items-center gap-2 px-3 py-1.5 rounded bg-white border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50 shadow-sm transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        )}

        {/* Success state */}
        {status === 'success' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

            {/* Explanation + change list */}
            <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 space-y-2.5 shrink-0">
              <div>
                <div className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1.5">
                  <TerminalSquare className="w-3.5 h-3.5 text-gray-600" />
                  Analysis Summary
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">{explanation}</p>
              </div>

              {changes.length > 0 && (
                <div>
                  <div className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Modifications Applied</div>
                  <ul className="space-y-1">
                    {changes.map((change, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-gray-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{change}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Diff viewer */}
            <div className="flex-1 min-h-0 border-b border-gray-200">
              <div className="h-full flex flex-col">
                <div className="px-4 py-1.5 shrink-0 flex items-center justify-between border-b border-gray-200 bg-gray-100">
                  <span className="text-xs font-semibold text-gray-700">Recommended HCL Changes</span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-2.5 py-0.5 rounded text-xs text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-300 shadow-sm transition-colors cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copied ? 'Copied!' : 'Copy HCL'}</span>
                  </button>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <DiffViewer original={currentCode} fixed={fixedCode} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer / Apply Fix ── */}
      {status === 'success' && (
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-gray-500">
            {applied
              ? '✓ Code applied to editor — visual graph refreshed'
              : 'Review the diff above and apply changes to update the editor.'}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchRemediation}
              className="px-3 py-1.5 rounded text-xs text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 shadow-sm transition-colors cursor-pointer font-medium"
            >
              Regenerate
            </button>
            <button
              onClick={handleApply}
              disabled={applied}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-semibold shadow-sm transition-all cursor-pointer ${
                applied
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                  : 'bg-[#ec7211] hover:bg-[#eb5f07] text-white active:scale-95'
              }`}
            >
              {applied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Fix Applied</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Apply Fix</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
