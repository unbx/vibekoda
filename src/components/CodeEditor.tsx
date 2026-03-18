"use client";

import { Copy, Check, Code2, CloudUpload, Link, Loader2, ExternalLink } from "lucide-react";
import { useState } from "react";

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  userId?: string;
}

export function CodeEditor({ code, onChange, userId }: CodeEditorProps) {
  const [copied, setCopied] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hostedUrl, setHostedUrl] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyUrl = async () => {
    if (!hostedUrl) return;
    await navigator.clipboard.writeText(hostedUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  const handleSaveToS3 = async () => {
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

  return (
    <div className="flex flex-col h-full w-full overflow-hidden relative">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          <Code2 className="w-3.5 h-3.5 text-[var(--primary)]" />
          <span className="font-display-light text-[10px] tracking-[0.2em] text-[var(--primary-light)]">MML_OUTPUT.HTML</span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Save to S3 */}
          <button
            onClick={handleSaveToS3}
            disabled={isSaving || !code.trim()}
            title="Save to S3 and get a hosted URL"
            className="btn-otherside-outline flex items-center gap-1.5 px-3 py-1.5 text-[10px] disabled:opacity-30"
          >
            {isSaving ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <CloudUpload className="w-3 h-3" />
            )}
            {isSaving ? "SAVING..." : "SAVE"}
          </button>

          {/* Copy raw MML */}
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
            title="Copy MML code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
          </button>
        </div>
      </div>

      {/* Hosted URL banner */}
      {(hostedUrl || saveError) && (
        <div className={`px-4 py-2 border-b flex items-center gap-2 ${
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

      {/* Code area */}
      <div className="flex-1 p-4 bg-black/30 relative group min-h-0">
        <textarea
          value={code}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-full bg-transparent text-[var(--primary-light)] font-mono text-xs resize-none focus:outline-none leading-relaxed"
          spellCheck="false"
        />
      </div>
    </div>
  );
}
