"use client";

import { Copy, Check, CloudUpload, Link, Loader2, ExternalLink } from "lucide-react";
import { useState } from "react";

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  userId?: string;
  headerSlot?: boolean; // when true, render only the action buttons (for external header)
}

export function CodeEditorActions({ code, userId }: { code: string; userId?: string }) {
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hostedUrl, setHostedUrl] = useState<string | null>(null);
  const [urlCopied, setUrlCopied] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToS3 = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!code.trim()) return;
    setIsSaving(true);
    setSaveError(null);
    setHostedUrl(null);

    try {
      const res = await fetch("/api/upload-mml", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mmlCode: code, userId: userId || "anonymous" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || "Upload failed.");
      } else {
        setHostedUrl(data.url);
      }
    } catch {
      setSaveError("Network error. Could not reach upload API.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyUrl = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hostedUrl) return;
    await navigator.clipboard.writeText(hostedUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  return (
    <>
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleSaveToS3}
          disabled={isSaving || !code.trim()}
          title="Save to S3 and get a hosted URL"
          className="btn-otherside-outline flex items-center gap-1.5 px-3 py-1.5 text-[10px] disabled:opacity-30"
        >
          {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CloudUpload className="w-3 h-3" />}
          {isSaving ? "SAVING..." : "SAVE"}
        </button>
        <button
          onClick={handleCopy}
          className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
          title="Copy MML code"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
        </button>
      </div>

      {/* Hosted URL / error banner — renders inline after buttons' parent */}
      {(hostedUrl || saveError) && (
        <div className={`absolute left-0 right-0 top-full px-4 py-2 border-b flex items-center gap-2 z-10 ${
          hostedUrl ? "bg-green-950/30 border-green-500/15" : "bg-red-950/30 border-red-500/15"
        }`}>
          {hostedUrl ? (
            <>
              <Link className="w-3 h-3 text-green-400 shrink-0" />
              <p className="text-[11px] text-green-300 font-mono truncate flex-1" title={hostedUrl}>{hostedUrl}</p>
              <button onClick={handleCopyUrl} title="Copy URL" className="shrink-0">
                {urlCopied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-green-500 hover:text-green-300" />}
              </button>
              <a href={hostedUrl} target="_blank" rel="noreferrer" className="shrink-0 text-green-500 hover:text-green-300">
                <ExternalLink className="w-3 h-3" />
              </a>
            </>
          ) : (
            <p className="text-[11px] text-red-400 font-mono">{saveError}</p>
          )}
        </div>
      )}
    </>
  );
}

export function CodeEditor({ code, onChange }: CodeEditorProps) {
  return (
    <div className="flex-1 p-4 bg-black/30 min-h-0 h-full">
      <textarea
        value={code}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-full bg-transparent text-[var(--primary-light)] font-mono text-xs resize-none focus:outline-none leading-relaxed"
        spellCheck="false"
      />
    </div>
  );
}
