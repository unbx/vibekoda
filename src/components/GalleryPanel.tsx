"use client";

import { useState, useEffect, useCallback } from "react";
import { LayoutGrid, Copy, Check, ExternalLink, Loader2, RefreshCw } from "lucide-react";

interface MMLObject {
  key: string;
  filename: string;
  url: string;
  shareUrl: string;
  uploadedAt: string | null;
  size: number;
}

interface GalleryPanelProps {
  userId: string;
  onLoad: (mmlCode: string) => void;
}

function timeAgo(ts: string | null) {
  if (!ts) return "";
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function GalleryPanel({ userId, onLoad }: GalleryPanelProps) {
  const [objects, setObjects] = useState<MMLObject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchObjects = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/list-mml?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load gallery.");
      setObjects(data.objects || []);
    } catch (err: any) {
      setError(err.message || "Could not load gallery.");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchObjects();
  }, [fetchObjects]);

  const handleCopyUrl = async (obj: MMLObject) => {
    const fullShareUrl = `${window.location.origin}${obj.shareUrl}`;
    await navigator.clipboard.writeText(fullShareUrl);
    setCopiedKey(obj.key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleLoad = async (obj: MMLObject) => {
    try {
      const res = await fetch(obj.url);
      const code = await res.text();
      onLoad(code);
    } catch {
      setError("Could not load MML from S3.");
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-3.5 h-3.5 text-[var(--primary)]" />
          <span className="font-display-light text-[10px] tracking-[0.2em] text-[var(--primary-light)]">MY OBJECTS</span>
          <span className="text-[10px] text-[var(--text-muted)] font-mono">{objects.length}</span>
        </div>
        <button onClick={fetchObjects} disabled={isLoading} className="text-[var(--text-muted)] hover:text-[var(--primary-light)] transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 text-[var(--primary)] animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-red-950/50 border border-red-500/30 rounded-lg p-3 text-xs text-red-400">{error}</div>
        )}

        {!isLoading && !error && objects.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-center">
            <LayoutGrid className="w-8 h-8 text-gray-700" />
            <p className="text-xs text-[var(--text-muted)] font-mono">No saved objects yet.<br/>Hit SAVE after generating!</p>
          </div>
        )}

        {objects.map((obj) => {
          const displayName = obj.filename.replace(/\.mml$/, "").replace(/-/g, " ");
          return (
            <div key={obj.key} className="rounded-xl p-3 border border-white/[0.06] hover:border-[var(--primary)]/30 bg-black/20 transition-all">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-xs font-semibold text-white truncate max-w-[200px]" title={displayName}>
                    {displayName}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">{timeAgo(obj.uploadedAt)}</p>
                </div>
              </div>
              <div className="flex gap-1.5 mt-2">
                <button
                  onClick={() => handleLoad(obj)}
                  className="flex-1 py-1.5 bg-[var(--primary)]/20 hover:bg-[var(--primary)]/40 border border-[var(--primary)]/30 rounded-lg text-[10px] text-[var(--primary-light)] hover:text-white transition-all font-mono"
                >
                  LOAD
                </button>
                <button
                  onClick={() => handleCopyUrl(obj)}
                  title="Copy shareable link"
                  className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/[0.06] rounded-lg transition-colors"
                >
                  {copiedKey === obj.key ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                </button>
                <a
                  href={obj.shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Open share page"
                  className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/[0.06] rounded-lg transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
