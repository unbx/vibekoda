"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { useGlyph } from "@use-glyph/sdk-react";
import { Wallet, LogOut, Loader2, AlertTriangle, RotateCcw, UserCheck } from "lucide-react";

export function WalletButton({ onExposeActions, displayName }: { onExposeActions?: (actions: { connect: () => void; disconnect: () => void }) => void; displayName?: string | null } = {}) {
  const { address, isConnected, isConnecting } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { login, authenticated } = useGlyph();
  const [error, setError] = useState<string | null>(null);
  const [failCount, setFailCount] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const shortAddr = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null;

  const handleConnect = useCallback(async () => {
    setError(null);
    setConnecting(true);
    try {
      // Try to find an injected connector (MetaMask, Brave Wallet, etc.)
      // Fall back to the first available connector
      const connector = connectors.find((c) => c.type === "injected") || connectors[0];
      if (!connector) {
        setError("No wallet found. Install MetaMask or another wallet extension.");
        setConnecting(false);
        setFailCount((c) => c + 1);
        return;
      }
      await connectAsync({ connector });
      setFailCount(0);
    } catch (err: any) {
      const msg = err?.message?.toLowerCase() || "";
      if (msg.includes("rejected") || msg.includes("denied") || msg.includes("cancelled")) {
        // User rejected — not really an error
      } else if (msg.includes("no provider") || msg.includes("not found")) {
        setError("No wallet found. Install MetaMask or another wallet extension.");
      } else {
        setError("Connection failed. Please try again.");
      }
      console.warn("[Wallet] Connect error:", err);
      setFailCount((c) => c + 1);
    } finally {
      setConnecting(false);
    }
  }, [connectAsync, connectors]);

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnectAsync();
    } catch {
      // ignore
    }
    setError(null);
    setFailCount(0);
  }, [disconnectAsync]);

  // Expose connect/disconnect to parent
  useEffect(() => {
    if (onExposeActions) {
      onExposeActions({ connect: handleConnect, disconnect: handleDisconnect });
    }
  }, [onExposeActions, handleConnect, handleDisconnect]);

  const handleGlyphSignIn = useCallback(() => {
    setSigningIn(true);
    try {
      login();
    } catch {
      // ignore — popup may still open
    }
    // Reset after a delay (Privy popup is async)
    setTimeout(() => setSigningIn(false), 3000);
  }, [login]);

  // Auto-clear signing-in state when authenticated
  useEffect(() => {
    if (authenticated) setSigningIn(false);
  }, [authenticated]);

  if (isConnected && address) {
    const needsGlyphSignIn = !displayName && !authenticated;
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--panel-border)] bg-[var(--primary)]/10 text-xs font-mono text-[var(--primary-light)]">
          <span className={`w-1.5 h-1.5 rounded-full ${displayName ? "bg-green-400" : "bg-amber-400"} animate-pulse`} />
          {displayName || shortAddr}
        </div>
        {needsGlyphSignIn && (
          <button
            onClick={handleGlyphSignIn}
            disabled={signingIn}
            className="btn-otherside-outline flex items-center gap-1.5 px-3 py-1 text-[9px] tracking-[0.1em]"
            title="Sign in to Glyph to show your username"
          >
            {signingIn ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <UserCheck className="w-3 h-3" />
            )}
            {signingIn ? "SIGNING IN..." : "SIGN IN TO GLYPH"}
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
        {connecting || isConnecting ? "CONNECTING..." : "CONNECT WALLET"}
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
