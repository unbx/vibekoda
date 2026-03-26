"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { LayoutGrid, Copy, Check, ExternalLink, Loader2, RefreshCw, Pencil, Trash2, Upload, Box, AlertCircle } from "lucide-react";

interface MMLObject {
  key: string;
  filename: string;
  url: string;
  shareUrl: string;
  uploadedAt: string | null;
  size: number;
}

export interface GLBAsset {
  url: string;
  filename: string;
  size: number;
}

interface GalleryPanelProps {
  userId: string;
  onLoad: (mmlCode: string) => void;
}

const NAMES_STORAGE_KEY = "vibekoda_gallery_names";

function loadCustomNames(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(NAMES_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveCustomName(key: string, name: string) {
  const names = loadCustomNames();
  names[key] = name;
  localStorage.setItem(NAMES_STORAGE_KEY, JSON.stringify(names));
}

function getDisplayName(obj: MMLObject): string {
  const custom = loadCustomNames()[obj.key];
  if (custom) return custom;
  return obj.filename.replace(/\.mml$/, "").replace(/-/g, " ");
}

function timeAgo(ts: string | null) {
  if (!ts) return "";
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const GLB_STORAGE_KEY = "vibekoda_glb_assets";
const MAX_GLB_SIZE = 20 * 1024 * 1024; // 20 MB

function loadGlbAssets(): GLBAsset[] {
  try {
    return JSON.parse(localStorage.getItem(GLB_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveGlbAsset(asset: GLBAsset) {
  const assets = loadGlbAssets();
  // Prevent duplicates by URL
  if (!assets.find(a => a.url === asset.url)) {
    assets.unshift(asset);
    localStorage.setItem(GLB_STORAGE_KEY, JSON.stringify(assets));
  }
}

function removeGlbAsset(url: string) {
  const assets = loadGlbAssets().filter(a => a.url !== url);
  localStorage.setItem(GLB_STORAGE_KEY, JSON.stringify(assets));
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function GalleryPanel({ userId, onLoad }: GalleryPanelProps) {
  const [objects, setObjects] = useState<MMLObject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  // GLB upload state
  const [glbAssets, setGlbAssets] = useState<GLBAsset[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copiedGlbUrl, setCopiedGlbUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load GLB assets from localStorage on mount
  useEffect(() => {
    setGlbAssets(loadGlbAssets());
  }, []);

  const handleGlbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    e.target.value = "";

    setUploadError(null);

    const name = file.name.toLowerCase();
    if (!name.endsWith(".glb") && !name.endsWith(".gltf")) {
      setUploadError("Only .glb and .gltf files are supported.");
      return;
    }

    if (file.size > MAX_GLB_SIZE) {
      setUploadError(`File too large (${formatSize(file.size)}). Max is 20MB.`);
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", userId);

      const res = await fetch("/api/upload-glb", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Upload failed.");

      const asset: GLBAsset = {
        url: data.url,
        filename: data.filename,
        size: data.size,
      };
      saveGlbAsset(asset);
      setGlbAssets(loadGlbAssets());
    } catch (err: any) {
      setUploadError(err.message || "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopyGlbUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedGlbUrl(url);
    setTimeout(() => setCopiedGlbUrl(null), 2000);
  };

  const handleRemoveGlb = (url: string) => {
    removeGlbAsset(url);
    setGlbAssets(loadGlbAssets());
  };

  const handleUseGlb = (asset: GLBAsset) => {
    // Generate a basic MML object using the model
    const mml = `<m-group>
  <m-model src="${asset.url}" y="0" scale="1">
    <m-attr-anim attr="ry" start="0" end="360" duration="8000" loop="true" easing="linear"></m-attr-anim>
  </m-model>
  <m-light type="point" intensity="2" distance="8" y="3" color="#a855f7"></m-light>
</m-group>`;
    onLoad(mml);
  };

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
    await navigator.clipboard.writeText(obj.url);
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

  const startRename = (obj: MMLObject) => {
    setEditingKey(obj.key);
    setEditValue(getDisplayName(obj));
    setTimeout(() => editInputRef.current?.select(), 50);
  };

  const commitRename = () => {
    if (editingKey && editValue.trim()) {
      saveCustomName(editingKey, editValue.trim());
    }
    setEditingKey(null);
    setEditValue("");
  };

  const handleDelete = async (obj: MMLObject) => {
    if (confirmDeleteKey !== obj.key) {
      setConfirmDeleteKey(obj.key);
      setTimeout(() => setConfirmDeleteKey(prev => prev === obj.key ? null : prev), 3000);
      return;
    }
    setDeletingKey(obj.key);
    setConfirmDeleteKey(null);
    try {
      const res = await fetch("/api/delete-mml", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: obj.key, userId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Delete failed.");
      }
      setObjects(prev => prev.filter(o => o.key !== obj.key));
    } catch (err: any) {
      setError(err.message || "Could not delete object.");
    } finally {
      setDeletingKey(null);
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

      {/* GLB Upload Section */}
      <div className="px-3 pt-3 pb-1 shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Box className="w-3 h-3 text-[var(--accent-pink)]" />
            <span className="font-display-light text-[9px] tracking-[0.15em] text-[var(--text-muted)]">3D MODELS</span>
            {glbAssets.length > 0 && (
              <span className="text-[9px] text-[var(--text-muted)] font-mono">{glbAssets.length}</span>
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-1 px-2 py-1 text-[9px] font-display-light tracking-[0.1em] rounded-lg border border-[var(--accent-pink)]/20 bg-[var(--accent-pink)]/5 text-[var(--accent-pink)] hover:bg-[var(--accent-pink)]/15 hover:border-[var(--accent-pink)]/40 transition-all disabled:opacity-40"
          >
            {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            UPLOAD GLB
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".glb,.gltf"
            onChange={handleGlbUpload}
            className="hidden"
          />
        </div>

        {uploadError && (
          <div className="flex items-center gap-1.5 text-[10px] text-red-400 font-mono">
            <AlertCircle className="w-3 h-3 shrink-0" />
            {uploadError}
          </div>
        )}

        {glbAssets.length > 0 && (
          <div className="space-y-1">
            {glbAssets.map((asset) => (
              <div key={asset.url} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-black/20 border border-white/[0.04]">
                <Box className="w-3 h-3 text-[var(--accent-pink)] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-white truncate">{asset.filename}</p>
                  <p className="text-[9px] text-[var(--text-muted)] font-mono">{formatSize(asset.size)}</p>
                </div>
                <button
                  onClick={() => handleUseGlb(asset)}
                  className="px-2 py-1 text-[9px] font-mono rounded bg-[var(--primary)]/20 hover:bg-[var(--primary)]/40 text-[var(--primary-light)] transition-colors"
                  title="Load as MML object"
                >
                  USE
                </button>
                <button
                  onClick={() => handleCopyGlbUrl(asset.url)}
                  className="p-1 hover:bg-white/5 rounded transition-colors"
                  title="Copy URL"
                >
                  {copiedGlbUrl === asset.url ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-[var(--text-muted)]" />}
                </button>
                <button
                  onClick={() => handleRemoveGlb(asset.url)}
                  className="p-1 hover:bg-red-950/30 rounded transition-colors"
                  title="Remove from list"
                >
                  <Trash2 className="w-3 h-3 text-[var(--text-muted)]" />
                </button>
              </div>
            ))}
          </div>
        )}

        {glbAssets.length === 0 && (
          <p className="text-[9px] text-[var(--text-muted)] font-mono text-center py-1">
            Upload .glb files to use in your MML objects
          </p>
        )}
      </div>

      <div className="mx-3 border-b border-white/[0.04]" />

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
          const displayName = getDisplayName(obj);
          const isEditing = editingKey === obj.key;
          return (
            <div key={obj.key} className="rounded-xl p-3 border border-white/[0.06] hover:border-[var(--primary)]/30 bg-black/20 transition-all">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      ref={editInputRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename();
                        if (e.key === "Escape") { setEditingKey(null); setEditValue(""); }
                      }}
                      className="w-full text-xs font-semibold text-white bg-white/10 border border-[var(--primary)]/50 rounded px-1.5 py-0.5 outline-none focus:border-[var(--primary)]"
                      maxLength={80}
                    />
                  ) : (
                    <div className="flex items-center gap-1 group/name cursor-pointer" onClick={() => startRename(obj)}>
                      <p className="text-xs font-semibold text-white truncate max-w-[180px]" title={`${displayName} — click to rename`}>
                        {displayName}
                      </p>
                      <Pencil className="w-2.5 h-2.5 text-[var(--text-muted)] opacity-0 group-hover/name:opacity-100 transition-opacity shrink-0" />
                    </div>
                  )}
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
                  title="Copy direct MML link"
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
                <button
                  onClick={() => handleDelete(obj)}
                  disabled={deletingKey === obj.key}
                  title={confirmDeleteKey === obj.key ? "Click again to confirm delete" : "Delete object"}
                  className={`p-1.5 border rounded-lg transition-all ${
                    confirmDeleteKey === obj.key
                      ? "bg-red-950/50 border-red-500/40 hover:bg-red-900/50"
                      : "bg-white/5 hover:bg-red-950/30 border-white/[0.06] hover:border-red-500/30"
                  }`}
                >
                  {deletingKey === obj.key ? (
                    <Loader2 className="w-3.5 h-3.5 text-red-400 animate-spin" />
                  ) : (
                    <Trash2 className={`w-3.5 h-3.5 ${confirmDeleteKey === obj.key ? "text-red-400" : "text-[var(--text-muted)]"}`} />
                  )}
                </button>
              </div>
              <a
                href="https://otherside.xyz/mmls"
                target="_blank"
                rel="noreferrer"
                onClick={() => navigator.clipboard.writeText(obj.url)}
                title="Opens Otherside & copies MML link to clipboard"
                className="flex items-center justify-center gap-1.5 w-full mt-1.5 py-1.5 rounded-lg bg-white/5 hover:bg-[var(--primary)]/20 border border-white/[0.06] hover:border-[var(--primary)]/30 text-[10px] text-[var(--text-muted)] hover:text-[var(--primary-light)] transition-all font-mono"
              >
                <ExternalLink className="w-3 h-3" />
                ADD TO INVENTORY
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
