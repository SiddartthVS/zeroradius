'use client';

import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileCode, 
  AlertCircle, 
  FileCheck
} from 'lucide-react';
import { PRESET_ARCHITECTURES } from '@/data/defaultTerraform';

interface TerraformUploadZoneProps {
  currentFileName: string;
  fileSize: number | null;
  onFileUpload: (fileName: string, content: string) => void;
  onSelectPreset: (presetId: string) => void;
}

export const TerraformUploadZone: React.FC<TerraformUploadZoneProps> = ({
  currentFileName,
  fileSize,
  onFileUpload,
  onSelectPreset,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const processFile = (file: File) => {
    setErrorMessage(null);

    const validExtensions = ['.tf', '.hcl', '.tfvars', '.txt'];
    const isTerraform = validExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!isTerraform) {
      setErrorMessage(
        `File "${file.name}" may not be a Terraform file. Accepted: .tf, .hcl, .tfvars`
      );
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content !== undefined) {
        onFileUpload(file.name, content);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 2500);
      }
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read uploaded file.');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processFile(file);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="p-3 border-b border-gray-300 bg-white">
      {/* Drag & Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative group cursor-pointer rounded-lg border-2 border-dashed p-3 transition-all duration-200 text-center flex flex-col items-center justify-center gap-1.5 ${
          isDragging
            ? 'border-[#0073bb] bg-blue-50/50 shadow-sm'
            : uploadSuccess
            ? 'border-emerald-500 bg-emerald-50/40'
            : 'border-gray-300 hover:border-[#0073bb] bg-gray-50/60 hover:bg-white'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".tf,.hcl,.tfvars,.txt"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Drop icon or success indicator */}
        <div className="flex items-center justify-center">
          {uploadSuccess ? (
            <div className="p-1.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300">
              <FileCheck className="w-4 h-4" />
            </div>
          ) : (
            <div
              className={`p-1.5 rounded-full border transition-all ${
                isDragging
                  ? 'bg-blue-100 text-[#0073bb] border-blue-300'
                  : 'bg-white text-gray-500 border-gray-300 group-hover:text-[#0073bb] group-hover:border-blue-300 shadow-sm'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-gray-800">
            {isDragging ? (
              <span className="text-[#0073bb]">Drop Terraform file to upload</span>
            ) : uploadSuccess ? (
              <span className="text-emerald-700">Terraform file loaded successfully</span>
            ) : (
              <span>
                Drop <span className="text-gray-900 font-bold">.tf</span> file here, or{' '}
                <span className="text-[#0073bb] underline hover:text-[#00527c]">
                  browse
                </span>
              </span>
            )}
          </p>
          <p className="text-[11px] text-gray-500">
            Accepts Terraform HCL configurations (.tf, .hcl, .tfvars)
          </p>
        </div>

        {/* Active Loaded File Pill */}
        <div className="mt-0.5 flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-white border border-gray-300 text-xs text-gray-700 shadow-sm">
          <FileCode className="w-3.5 h-3.5 text-[#0073bb]" />
          <span className="font-medium text-gray-800">{currentFileName}</span>
          {fileSize !== null && (
            <span className="text-gray-400 text-[10px]">({formatFileSize(fileSize)})</span>
          )}
        </div>
      </div>

      {/* Error notification if wrong file type */}
      {errorMessage && (
        <div className="mt-2 p-2 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Quick Template Presets Bar */}
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-gray-500 font-medium">Sample Stacks:</span>
        <div className="flex items-center gap-1.5">
          {PRESET_ARCHITECTURES.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset.id)}
              className="px-2 py-0.5 rounded bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 hover:text-[#0073bb] transition-colors shadow-sm text-xs truncate max-w-[130px] cursor-pointer"
              title={preset.description}
            >
              {preset.name.split(':')[0]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
