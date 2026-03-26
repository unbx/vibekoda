"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { useNativeGlyphConnection, useGlyph } from "@use-glyph/sdk-react";
import { Wallet, LogOut, Loader2, AlertTriangle, RotateCcw, Fingerprint } from "lucide-react";

export function WalletButton({ onExposeActions, displayName }: { onExposeActions?: (actions: { connect: () => void; disconnect: () => void }) => void; displayName?: string | null } = {}) {
  const { address, isConnected, isConnecting } = useAccount();
  const { connect: glyphConnect, disconnect: glyphDisconnect } = useNativeGlyphConnection();
  const { login, authenticated } = useGlyph();
  const [error, setError] = useState<string | null>(null);
  const [failCount, setFailCount] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const shortAddr = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null;

  // Step 1: Connect wallet via Glyph popup
  const handleConnect = useCallback(() => {
    setError(null);
    setConnecting(true);
    try {
      glyphConnect();
    } catch (err: any) {
      setError("Connection failed. Please try again.");
      console.warn("[Glyph] Connect error:", err);
      setFailCount((c) => c + 1);
    }
  }, [glyphConnect]);

  // Step 2: Sign in to Glyph (user-initiated click → popup won't be blocked)
  const handleSignIn = useCallback(() => {
    setSigningIn(true);
    try {
      login();
    } catch {
      // ignore — popup may still be opening
    }
    // Reset after a delay if auth doesn't complete
    setTimeout(() => setSigningIn(false), 15000);
  }, [login]);

  // Clear connecting state when wallet connects
  useEffect(() => {
    if (isConnected) {
      setConnecting(false);
      setFailCount(0);
    }
  }, [isConnected]);

  // Clear signing-in state when authenticated
  useEffect(() => {
    if (authenticated) setSigningIn(false);
  }, [authenticated]);

  // Timeout for connecting state (popup closed without completing)
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
    setSigningIn(false);
  }, [glyphDisconnect]);

  // Expose connect/disconnect to parent
  useEffect(() => {
    if (onExposeActions) {
      onExposeActions({ connect: handleConnect, disconnect: handleDisconnect });
    }
  }, [onExposeActions, handleConnect, handleDisconnect]);

  // ── Connected state ──
  if (isConnected && address) {
    const needsSignIn = !displayName && !authenticated;
    return (
      <div className="flex items-center gap-2">
        {/* Address / username pill */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--panel-border)] bg-[var(--primary)]/10 text-xs font-mono text-[var(--primary-light)]">
          <span className={`w-1.5 h-1.5 rounded-full ${displayName ? "bg-green-400" : "bg-amber-400"} animate-pulse`} />
          {displayName || shortAddr}
        </div>

        {/* Step 2: Sign in to resolve username */}
        {needsSignIn && (
          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="btn-otherside-outline flex items-center gap-1.5 px-3 py-1 text-[9px] tracking-[0.1em]"
            title="Sign in to show your Glyph username"
          >
            {signingIn ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Fingerprint className="w-3 h-3" />
            )}
            {signingIn ? "SIGNING..." : "VERIFY GLYPH"}
          </button>
        )}

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

  // ── Disconnected state ──
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
