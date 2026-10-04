'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Node, Edge } from 'reactflow';
import { Header } from './Header';
import { TerraformUploadZone } from '../editor/TerraformUploadZone';
import { TerraformEditor } from '../editor/TerraformEditor';
import { ArchitectureCanvas } from '../canvas/ArchitectureCanvas';
import { BASIC_TERRAFORM_CODE, PRESET_ARCHITECTURES } from '@/data/defaultTerraform';
import { CloudResourceData } from '@/types/cloud-architecture';
import { Code2, Network, RefreshCw } from 'lucide-react';

// ─── IaC Interceptor API Response ────────────────────────────────────────────

interface ParseApiResponse {
  nodes: Node<CloudResourceData>[];
  edges: Edge[];
  meta: {
    resourceCount: number;
    unknownTypes: string[];
    parsedAt?: string;
    hint?: string;
  };
}

type ParseStatus = 'idle' | 'loading' | 'success' | 'error' | 'empty';

// ─── Component ────────────────────────────────────────────────────────────────

export const SplitDashboard: React.FC = () => {
  const [splitRatio, setSplitRatio]           = useState<number>(50);
  const [terraformCode, setTerraformCode]     = useState<string>(BASIC_TERRAFORM_CODE);
  const [currentFileName, setCurrentFileName] = useState<string>('architecture_main.tf');
  const [fileSize, setFileSize]               = useState<number | null>(BASIC_TERRAFORM_CODE.length);
  const [activeMobileTab, setActiveMobileTab] = useState<'editor' | 'canvas'>('editor');

  // Live graph state from IaC Interceptor API
  const [liveNodes, setLiveNodes]             = useState<Node<CloudResourceData>[] | undefined>(undefined);
  const [liveEdges, setLiveEdges]             = useState<Edge[] | undefined>(undefined);
  const [parseStatus, setParseStatus]         = useState<ParseStatus>('idle');
  const [parseError, setParseError]           = useState<string | null>(null);
  const [parseMeta, setParseMeta]             = useState<ParseApiResponse['meta'] | null>(null);

  const containerRef  = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);

  // ── Drag-to-resize divider ──────────────────────────────────────────────────

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct  = ((e.clientX - rect.left) / rect.width) * 100;
    if (pct >= 25 && pct <= 75) setSplitRatio(pct);
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // ── IaC Interceptor: call the API route ────────────────────────────────────

  const callIaCInterceptor = useCallback(async (code: string) => {
    setParseStatus('loading');
    setParseError(null);
    setParseMeta(null);

    try {
      const res = await fetch('/api/parse-terraform', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ code }),
      });

      const data: ParseApiResponse & { error?: string; detail?: string } = await res.json();

      if (!res.ok) {
        setParseStatus('error');
        setParseError(data.error ?? `Server error ${res.status}`);
        return;
      }

      setParseMeta(data.meta);

      if (data.nodes.length === 0) {
        setParseStatus('empty');
        return;
      }

      setLiveNodes(data.nodes);
      setLiveEdges(data.edges);
      setParseStatus('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setParseStatus('error');
      setParseError(msg);
    }
  }, []);

  // ── File / preset handlers ─────────────────────────────────────────────────

  const handleFileUpload = (fileName: string, content: string) => {
    setTerraformCode(content);
    setCurrentFileName(fileName);
    setFileSize(content.length);
    callIaCInterceptor(content);
  };

  const handleSelectPreset = (presetId: string) => {
    const preset = PRESET_ARCHITECTURES.find((p) => p.id === presetId);
    if (preset) {
      setTerraformCode(preset.code);
      setCurrentFileName(preset.fileName);
      setFileSize(preset.code.length);
      callIaCInterceptor(preset.code);
    }
  };

  const handleResetToDefault = () => {
    setTerraformCode(BASIC_TERRAFORM_CODE);
    setCurrentFileName('architecture_main.tf');
    setFileSize(BASIC_TERRAFORM_CODE.length);
    setLiveNodes(undefined);
    setLiveEdges(undefined);
    setParseStatus('idle');
    setParseMeta(null);
  };

  const handleAppendSnippet = (snippet: string) => {
    setTerraformCode((prev) =>
      `${prev.trimEnd()}\n\n# --- APPENDED FROM VISUAL CANVAS ---\n${snippet}\n`
    );
  };

  const handleApplyFix = (fixedCode: string) => {
    setTerraformCode(fixedCode);
    setFileSize(fixedCode.length);
    callIaCInterceptor(fixedCode);
  };

  const handleParseCurrentCode = () => {
    callIaCInterceptor(terraformCode);
  };

  const isLoading = parseStatus === 'loading';

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#f2f3f3] text-gray-800 select-none">
      {/* Top Header */}
      <Header
        splitRatio={splitRatio}
        onSetSplitRatio={setSplitRatio}
        onResetAll={handleResetToDefault}
      />

      {/* IaC Status Bar — AWS Console Alert / Notice banner */}
      {parseStatus !== 'idle' && (
        <div
          className={`px-4 py-1.5 flex items-center gap-3 text-xs border-b shrink-0 ${
            parseStatus === 'loading'
              ? 'bg-blue-50 border-blue-200 text-blue-900'
              : parseStatus === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : parseStatus === 'empty'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <span className={`w-2 h-2 rounded-full shrink-0 ${
            parseStatus === 'loading'  ? 'bg-[#0073bb] animate-pulse' :
            parseStatus === 'success'  ? 'bg-emerald-600'             :
            parseStatus === 'empty'    ? 'bg-amber-600'               :
            'bg-red-600'
          }`} />

          {parseStatus === 'loading' && 'Parsing Terraform configuration and building visual graph…'}

          {parseStatus === 'success' && parseMeta && (
            <>
              <span>Topology generated: </span>
              <span className="font-semibold">{parseMeta.resourceCount} managed resources</span>
              {parseMeta.unknownTypes.length > 0 && (
                <span className="text-gray-500">
                  &nbsp;({parseMeta.unknownTypes.length} unrecognised types skipped)
                </span>
              )}
              <span className="ml-auto text-gray-500">{parseMeta.parsedAt?.split('T')[1]?.split('.')[0]} UTC</span>
            </>
          )}

          {parseStatus === 'empty' && (
            <span>No managed resources found in HCL — check for valid resource blocks</span>
          )}

          {parseStatus === 'error' && (
            <>
              <span className="font-semibold">Parser Error: </span>
              <span>{parseError}</span>
            </>
          )}
        </div>
      )}

      {/* Mobile Tab Switcher */}
      <div className="md:hidden flex border-b border-gray-300 bg-white text-xs">
        <button
          onClick={() => setActiveMobileTab('editor')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition-colors ${
            activeMobileTab === 'editor'
              ? 'text-[#ec7211] border-b-2 border-[#ec7211] bg-gray-50 font-semibold'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>Editor &amp; Upload</span>
        </button>
        <button
          onClick={() => setActiveMobileTab('canvas')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition-colors ${
            activeMobileTab === 'canvas'
              ? 'text-[#ec7211] border-b-2 border-[#ec7211] bg-gray-50 font-semibold'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Network className="w-4 h-4" />
          <span>Architecture Canvas</span>
        </button>
      </div>

      {/* Main Split Screen */}
      <div ref={containerRef} className="flex-1 flex w-full relative overflow-hidden min-h-0">

        {/* LEFT: Upload Zone + Monaco Editor */}
        <div
          style={{ width: `${splitRatio}%` }}
          className={`h-full flex flex-col border-r border-gray-300 bg-white min-w-0 min-h-0 md:flex ${
            activeMobileTab === 'editor' ? 'flex w-full' : 'hidden'
          }`}
        >
          <TerraformUploadZone
            currentFileName={currentFileName}
            fileSize={fileSize}
            onFileUpload={handleFileUpload}
            onSelectPreset={handleSelectPreset}
          />

          {/* Parse Now action bar */}
          <div className="px-3 py-1.5 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-2 shrink-0">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Infrastructure as Code
            </span>
            <button
              onClick={handleParseCurrentCode}
              disabled={isLoading}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold shadow-sm transition-all cursor-pointer ${
                isLoading
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed border border-gray-300'
                  : 'bg-[#ec7211] hover:bg-[#eb5f07] text-white active:scale-95'
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Parsing…</span>
                </>
              ) : (
                <span>Parse &amp; Render Graph</span>
              )}
            </button>
          </div>

          <div className="flex-1 min-h-0 flex flex-col w-full">
            <TerraformEditor
              code={terraformCode}
              fileName={currentFileName}
              onChange={(val) => setTerraformCode(val || '')}
              onReset={handleResetToDefault}
            />
          </div>
        </div>

        {/* Resizable Divider */}
        <div
          onMouseDown={handleMouseDown}
          className="hidden md:flex w-2 hover:w-2.5 bg-gray-200 hover:bg-[#0073bb]/20 border-l border-r border-gray-300 cursor-col-resize items-center justify-center transition-all group z-20 shrink-0 select-none"
          title="Drag to resize panels"
        >
          <div className="w-0.5 h-8 rounded-full bg-gray-400 group-hover:bg-[#0073bb] transition-colors" />
        </div>

        {/* RIGHT: React Flow Canvas */}
        <div
          style={{ width: `${100 - splitRatio}%` }}
          className={`h-full relative flex-1 min-w-0 min-h-0 md:flex ${
            activeMobileTab === 'canvas' ? 'flex w-full' : 'hidden'
          }`}
        >
          <ArchitectureCanvas
            onAppendSnippetToEditor={handleAppendSnippet}
            externalNodes={liveNodes}
            externalEdges={liveEdges}
            isLoading={isLoading}
            currentTerraformCode={terraformCode}
            originalTerraformCode={BASIC_TERRAFORM_CODE}
            onApplyFix={handleApplyFix}
          />
        </div>
      </div>
    </div>
  );
};
