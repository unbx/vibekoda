"use client";

import { Copy, Check, TerminalSquare, CloudUpload, Link, Loader2, ExternalLink } from "lucide-react";
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
    <div className="flex flex-col h-full w-full glass-panel rounded-xl overflow-hidden border border-white/10 relative">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/40 border-b border-white/5">
        <div className="flex items-center gap-2">
          <TerminalSquare className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-medium text-purple-200 tracking-wider">MML_OUTPUT.HTML</span>
        </div>
        <div className="flex items-center gap-1">
          {/* Save to S3 */}
          <button
            onClick={handleSaveToS3}
            disabled={isSaving || !code.trim()}
            title="Save to S3 and get a hosted URL"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 rounded-lg text-xs text-purple-300 transition-all hover:text-white disabled:opacity-40 font-mono"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CloudUpload className="w-3.5 h-3.5" />
            )}
            {isSaving ? "Saving..." : "SAVE"}
          </button>

          {/* Copy raw MML */}
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
            title="Copy MML code"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
          </button>
        </div>
      </div>

      {/* Hosted URL banner */}
      {(hostedUrl || saveError) && (
        <div className={`px-4 py-2.5 border-b flex items-center gap-2 ${hostedUrl ? "bg-green-950/40 border-green-500/20" : "bg-red-950/40 border-red-500/20"}`}>
          {hostedUrl ? (
            <>
              <Link className="w-3.5 h-3.5 text-green-400 shrink-0" />
              <p className="text-xs text-green-300 font-mono truncate flex-1" title={hostedUrl}>{hostedUrl}</p>
              <button onClick={handleCopyUrl} title="Copy URL" className="shrink-0">
                {urlCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-green-500 hover:text-green-300" />}
              </button>
              <a href={hostedUrl} target="_blank" rel="noreferrer" className="shrink-0 text-green-500 hover:text-green-300">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </>
          ) : (
            <p className="text-xs text-red-400 font-mono">{saveError}</p>
          )}
        </div>
      )}

      {/* Code area */}
      <div className="flex-1 p-4 bg-[#0a0a0f] relative group">
        <textarea
          value={code}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-full bg-transparent text-purple-200 font-mono text-sm resize-none focus:outline-none"
          spellCheck="false"
        />
        <div className="absolute inset-0 pointer-events-none rounded-b-xl transition-opacity duration-500 opacity-0 group-hover:opacity-100 shadow-[inset_0_0_50px_rgba(139,92,246,0.1)]"></div>
      </div>
    </div>
  );
}
