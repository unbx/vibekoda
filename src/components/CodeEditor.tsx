"use client";

import { Copy, Check, CloudUpload, Loader2 } from "lucide-react";
import { useState } from "react";

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  userId?: string;
  headerSlot?: boolean; // when true, render only the action buttons (for external header)
}

export function CodeEditorActions({ code, userId, glyphConnected, onSaved }: { code: string; userId?: string; glyphConnected?: boolean; onSaved?: () => void }) {
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedToGallery, setSavedToGallery] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [glyphNudge, setGlyphNudge] = useState(false);

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
    setSavedToGallery(false);

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
        setSavedToGallery(true);
        setTimeout(() => setSavedToGallery(false), 10000);
        onSaved?.();
        if (!glyphConnected) {
          setGlyphNudge(true);
          setTimeout(() => setGlyphNudge(false), 8000);
        }
      }
    } catch {
      setSaveError("Network error. Could not reach upload API.");
    } finally {
      setIsSaving(false);
    }
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

      {/* Save feedback banner */}
      {(savedToGallery || saveError || glyphNudge) && (
        <div className="absolute left-0 right-0 top-full z-10 flex flex-col">
          {(savedToGallery || saveError) && (
            <div className={`px-4 py-2 border-b flex items-center gap-2 ${
              savedToGallery ? "bg-green-950/30 border-green-500/15" : "bg-red-950/30 border-red-500/15"
            }`}>
              {savedToGallery ? (
                <>
                  <Check className="w-3 h-3 text-green-400 shrink-0" />
                  <p className="text-[11px] text-green-300 font-mono">SAVED TO GALLERY</p>
                </>
              ) : (
                <p className="text-[11px] text-red-400 font-mono">{saveError}</p>
              )}
            </div>
          )}
          {glyphNudge && (
            <div className="px-4 py-2 border-b bg-amber-950/20 border-amber-500/15 flex items-center gap-2">
              <p className="text-[10px] text-amber-300 font-mono">Connect Glyph to save under your account</p>
            </div>
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
