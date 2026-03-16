"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, X, Copy, Check, ExternalLink, Loader2, RefreshCw, Trash2 } from "lucide-react";

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
  const [isOpen, setIsOpen] = useState(false);
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
    if (isOpen) fetchObjects();
  }, [isOpen, fetchObjects]);

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
      setIsOpen(false);
    } catch {
      setError("Could not load MML from S3.");
    }
  };

  return (
    <>
      {/* Toggle button — left side */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className={`fixed left-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1.5 px-2 py-4 rounded-r-xl border border-l-0 transition-all shadow-xl ${
          isOpen
            ? "bg-purple-700/80 border-purple-500/50 text-white"
            : "bg-black/60 border-white/10 text-gray-400 hover:text-white hover:bg-black/80"
        } backdrop-blur-md`}
        title="My Saved Objects"
      >
        <LayoutGrid className="w-4 h-4" />
        <span className="text-[9px] font-mono tracking-wider [writing-mode:vertical-rl] rotate-180 text-center">GALLERY</span>
        {objects.length > 0 && !isOpen && (
          <span className="text-[9px] font-mono text-purple-400">{objects.length}</span>
        )}
      </button>

      {/* Slide-in Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 h-full w-80 z-30 flex flex-col border-r border-white/10 bg-[#090910]/95 backdrop-blur-xl shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-mono text-purple-300 tracking-wider">MY OBJECTS</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={fetchObjects} disabled={isLoading} className="text-gray-500 hover:text-purple-400 transition-colors">
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                </button>
                <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Count */}
            <div className="px-4 py-2 border-b border-white/5 shrink-0">
              <span className="text-[10px] text-gray-600 font-mono">{objects.length} saved object{objects.length !== 1 ? "s" : ""}</span>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {isLoading && (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                </div>
              )}

              {error && (
                <div className="bg-red-950/50 border border-red-500/30 rounded-lg p-3 text-xs text-red-400">{error}</div>
              )}

              {!isLoading && !error && objects.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                  <LayoutGrid className="w-8 h-8 text-gray-700" />
                  <p className="text-xs text-gray-600 font-mono">No saved objects yet.<br/>Hit SAVE after generating!</p>
                </div>
              )}

              {objects.map((obj) => {
                const displayName = obj.filename.replace(/\.mml$/, "").replace(/-/g, " ");
                return (
                  <div key={obj.key} className="glass-panel rounded-xl p-3 border border-white/10 hover:border-purple-500/30 transition-all group">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-xs font-semibold text-white truncate max-w-[150px]" title={displayName}>
                          {displayName}
                        </p>
                        <p className="text-[10px] text-gray-600 font-mono mt-0.5">{timeAgo(obj.uploadedAt)}</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      {/* Load into editor */}
                      <button
                        onClick={() => handleLoad(obj)}
                        className="flex-1 py-1.5 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 rounded-lg text-[10px] text-purple-300 hover:text-white transition-all font-mono"
                      >
                        LOAD
                      </button>
                      {/* Copy share URL */}
                      <button
                        onClick={() => handleCopyUrl(obj)}
                        title="Copy shareable link"
                        className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                      >
                        {copiedKey === obj.key ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                      </button>
                      {/* Open share page */}
                      <a
                        href={obj.shareUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Open share page"
                        className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
