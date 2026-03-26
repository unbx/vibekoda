"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { useNativeGlyphConnection, useGlyph } from "@use-glyph/sdk-react";
import { Wallet, LogOut, Loader2, AlertTriangle, RotateCcw } from "lucide-react";

export function WalletButton({ onExposeActions, displayName }: { onExposeActions?: (actions: { connect: () => void; disconnect: () => void }) => void; displayName?: string | null } = {}) {
  const { address, isConnected, isConnecting } = useAccount();
  const { connect: glyphConnect, disconnect: glyphDisconnect } = useNativeGlyphConnection();
  const { authenticated } = useGlyph();
  const [error, setError] = useState<string | null>(null);
  const [failCount, setFailCount] = useState(0);
  const [connecting, setConnecting] = useState(false);

  const shortAddr = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null;

  const handleConnect = useCallback(() => {
    setError(null);
    setConnecting(true);
    try {
      // Opens a single Glyph popup that handles wallet + auth together
      glyphConnect();
    } catch (err: any) {
      setError("Connection failed. Please try again.");
      console.warn("[Glyph] Connect error:", err);
      setFailCount((c) => c + 1);
    }
  }, [glyphConnect]);

  // Clear connecting state when wallet connects or auth completes
  useEffect(() => {
    if (isConnected || authenticated) {
      setConnecting(false);
      setFailCount(0);
    }
  }, [isConnected, authenticated]);

  // Also clear connecting after a timeout (in case popup was closed without completing)
  useEffect(() => {
    if (!connecting) return;
    const timer = setTimeout(() => setConnecting(false), 30000);
    return () => clearTimeout(timer);
  }, [connecting]);

  const handleDisconnect = useCallback(() => {
    try {
      glyphDisconnect();
    } catch {
      // ignore
    }
    setError(null);
    setFailCount(0);
  }, [glyphDisconnect]);

  // Expose connect/disconnect to parent
  useEffect(() => {
    if (onExposeActions) {
      onExposeActions({ connect: handleConnect, disconnect: handleDisconnect });
    }
  }, [onExposeActions, handleConnect, handleDisconnect]);

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--panel-border)] bg-[var(--primary)]/10 text-xs font-mono text-[var(--primary-light)]">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          {displayName || shortAddr}
        </div>
        <button
          onClick={handleDisconnect}
          className="p-1.5 hover:bg-white/5 rounded-full transition-colors text-[var(--text-muted)] hover:text-white"
          title="Disconnect"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleConnect}
        disabled={connecting || isConnecting}
        className="btn-otherside-outline flex items-center gap-2 px-4 py-1.5 text-[10px] tracking-[0.12em]"
      >
        {connecting || isConnecting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Wallet className="w-3.5 h-3.5" />
        )}
        {connecting || isConnecting ? "CONNECTING..." : "CONNECT GLYPH"}
      </button>
      {error && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-950/50 border border-amber-500/20 text-[10px] text-amber-300">
          <AlertTriangle className="w-3 h-3" />
          <span>{error}</span>
        </div>
      )}
      {failCount > 0 && !connecting && !error && (
        <button
          onClick={() => { setError(null); setFailCount(0); }}
          title="Reset"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/[0.08] text-[10px] text-[var(--text-secondary)] hover:text-white transition-all"
        >
          <RotateCcw className="w-3 h-3" />
          <span>RESET</span>
        </button>
      )}
    </div>
  );
}
