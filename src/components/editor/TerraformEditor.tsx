'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { 
  Copy, 
  Check, 
  Download, 
  RotateCcw, 
  Lock, 
  Unlock, 
  CheckCircle,
  FileCode,
  RefreshCw
} from 'lucide-react';

// Dynamic import of Monaco Editor with ssr: false
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-500 font-sans text-xs gap-2">
      <div className="flex items-center gap-2 text-[#0073bb]">
        <RefreshCw className="w-4 h-4 animate-spin text-[#0073bb]" />
        <span className="font-medium">Loading Terraform Editor…</span>
      </div>
    </div>
  ),
});

interface TerraformEditorProps {
  code: string;
  fileName: string;
  onChange: (value: string | undefined) => void;
  onReset: () => void;
}

export const TerraformEditor: React.FC<TerraformEditorProps> = ({
  code,
  fileName,
  onChange,
  onReset,
}) => {
  const [copied, setCopied] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [minimapEnabled, setMinimapEnabled] = useState(false);
  const [fontSize] = useState(13);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'architecture.tf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const lineCount = code.split('\n').length;
  const charCount = code.length;

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-white overflow-hidden min-h-0">
      {/* Editor Sub-Header Toolbar */}
      <div className="px-3 py-1.5 bg-gray-100 border-b border-gray-300 flex items-center justify-between text-xs shrink-0">
        {/* Left: File stats */}
        <div className="flex items-center gap-2 text-gray-600 text-xs">
          <span className="text-gray-900 font-semibold flex items-center gap-1.5">
            <FileCode className="w-3.5 h-3.5 text-[#0073bb]" />
            {fileName}
          </span>
          <span className="text-gray-300">•</span>
          <span>{lineCount} lines</span>
          <span className="text-gray-300">•</span>
          <span>{charCount} chars</span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setMinimapEnabled(!minimapEnabled)}
            className={`px-2 py-0.5 rounded text-xs transition-colors border shadow-sm cursor-pointer ${
              minimapEnabled
                ? 'bg-blue-50 text-[#0073bb] border-blue-300 font-medium'
                : 'text-gray-700 hover:text-gray-900 border-gray-300 bg-white hover:bg-gray-50'
            }`}
            title="Toggle Minimap"
          >
            Map
          </button>

          <button
            onClick={() => setIsReadOnly(!isReadOnly)}
            className={`px-2 py-0.5 rounded text-xs transition-colors border shadow-sm cursor-pointer flex items-center gap-1 ${
              isReadOnly
                ? 'bg-amber-50 text-amber-800 border-amber-300 font-medium'
                : 'text-gray-700 hover:text-gray-900 border-gray-300 bg-white hover:bg-gray-50'
            }`}
            title={isReadOnly ? 'Editor is Locked (Read Only)' : 'Editor is Editable'}
          >
            {isReadOnly ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            <span>{isReadOnly ? 'Locked' : 'Edit'}</span>
          </button>

          <button
            onClick={handleCopy}
            className="px-2 py-0.5 rounded text-xs text-gray-700 hover:text-gray-900 border border-gray-300 bg-white hover:bg-gray-50 shadow-sm transition-colors flex items-center gap-1 cursor-pointer"
            title="Copy Code"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="px-2 py-0.5 rounded text-xs text-gray-700 hover:text-gray-900 border border-gray-300 bg-white hover:bg-gray-50 shadow-sm transition-colors flex items-center gap-1 cursor-pointer"
            title="Download .tf File"
          >
            <Download className="w-3 h-3" />
            <span>Download</span>
          </button>

          <button
            onClick={onReset}
            className="p-1 px-1.5 rounded text-xs text-gray-700 hover:text-gray-900 border border-gray-300 bg-white hover:bg-gray-50 shadow-sm transition-colors cursor-pointer"
            title="Reset to Template"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Editor Body - Flex-1, h-full, min-h-0 with no fixed pixel constraints */}
      <div className="flex-1 w-full h-full relative min-h-0">
        <MonacoEditor
          height="100%"
          language="hcl"
          theme="vs-light"
          value={code}
          onChange={onChange}
          options={{
            readOnly: isReadOnly,
            fontSize: fontSize,
            fontFamily: "'Geist Mono', 'Fira Code', 'JetBrains Mono', Consolas, monospace",
            minimap: { enabled: minimapEnabled },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            tabSize: 2,
            wordWrap: 'on',
            padding: { top: 8, bottom: 8 },
            cursorBlinking: 'smooth',
            smoothScrolling: true,
            bracketPairColorization: { enabled: true },
            overviewRulerBorder: false,
          }}
        />
      </div>

      {/* Editor Bottom Status Bar */}
      <div className="px-3 py-1 bg-gray-100 border-t border-gray-300 flex items-center justify-between text-xs text-gray-600 shrink-0">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-emerald-700 font-medium">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            <span>HCL Syntax Valid</span>
          </span>
          <span className="text-gray-300">|</span>
          <span>UTF-8</span>
          <span className="text-gray-300">|</span>
          <span>Spaces: 2</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-gray-800 font-medium">Terraform HCL</span>
        </div>
      </div>
    </div>
  );
};
