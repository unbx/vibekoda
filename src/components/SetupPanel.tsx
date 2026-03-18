"use client";

import { useState, useEffect, useRef } from "react";
import { Settings, X, Check, AlertCircle, Wallet, Bot, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SetupPanelProps {
  glyphConnected: boolean;
  glyphUsername: string | null;
  walletAddress?: string;
  onConnectGlyph?: () => void;
}

const AI_SETTINGS_KEY = "vibekoda_ai_settings";

function loadAiSettings(): { provider: string; apiKey: string; endpoint: string; model: string } | null {
  try {
    return JSON.parse(localStorage.getItem(AI_SETTINGS_KEY) || "null");
  } catch {
    return null;
  }
}

export function SetupPanel({ glyphConnected, glyphUsername, walletAddress }: SetupPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [aiSettings, setAiSettings] = useState<{ provider: string; apiKey: string; endpoint: string; model: string } | null>(null);
  const [showKey, setShowKey] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Load settings on open
  useEffect(() => {
    if (isOpen) {
      setAiSettings(loadAiSettings());
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const hasApiKey = !!aiSettings?.apiKey;
  const allConfigured = glyphConnected && hasApiKey;

  const providerLabel = aiSettings?.provider === "openai"
    ? "OpenAI"
    : aiSettings?.provider === "anthropic"
    ? "Anthropic"
    : aiSettings?.provider === "custom"
    ? "Custom"
    : null;

  const maskedKey = aiSettings?.apiKey
    ? `${aiSettings.apiKey.slice(0, 6)}${"*".repeat(8)}${aiSettings.apiKey.slice(-4)}`
    : "";

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-full transition-all ${
          isOpen
            ? "bg-[var(--primary)]/20 text-[var(--primary-light)]"
            : "hover:bg-white/5 text-[var(--text-muted)] hover:text-white"
        }`}
        title="Setup"
      >
        <Settings className="w-4 h-4" />
        {/* Status dot */}
        {!allConfigured && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-[300px] bg-[#0c0a14] rounded-2xl border border-[var(--panel-border)] shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <h3 className="font-display-light text-[10px] tracking-[0.2em] text-[var(--primary-light)]">SETUP</h3>
              <button onClick={() => setIsOpen(false)} className="text-[var(--text-muted)] hover:text-white transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Glyph Wallet Status */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Wallet className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span className="font-display-light text-[9px] tracking-[0.15em] text-[var(--text-muted)]">GLYPH WALLET</span>
                </div>
                {glyphConnected ? (
                  <div className="flex items-center gap-2 bg-green-950/20 border border-green-500/15 rounded-xl px-3 py-2.5">
                    <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-green-300 font-semibold truncate">
                        {glyphUsername || walletAddress?.slice(0, 6) + "..." + walletAddress?.slice(-4)}
                      </p>
                      <p className="text-[10px] text-green-400/60 font-mono">Connected</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-amber-950/20 border border-amber-500/15 rounded-xl px-3 py-2.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <div>
                      <p className="text-xs text-amber-300">Not connected</p>
                      <p className="text-[10px] text-amber-400/60 font-mono">Needed for saving, chat, and identity</p>
                    </div>
                  </div>
                )}
              </div>

              {/* AI Provider Status */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Bot className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span className="font-display-light text-[9px] tracking-[0.15em] text-[var(--text-muted)]">AI PROVIDER</span>
                </div>
                {hasApiKey ? (
                  <div className="flex items-center gap-2 bg-green-950/20 border border-green-500/15 rounded-xl px-3 py-2.5">
                    <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-green-300 font-semibold">{providerLabel}: {aiSettings?.model}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <p className="text-[10px] text-green-400/60 font-mono truncate">
                          {showKey ? aiSettings?.apiKey : maskedKey}
                        </p>
                        <button onClick={() => setShowKey(!showKey)} className="text-green-400/40 hover:text-green-400 transition-colors shrink-0">
                          {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-amber-950/20 border border-amber-500/15 rounded-xl px-3 py-2.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <div>
                      <p className="text-xs text-amber-300">Not configured</p>
                      <p className="text-[10px] text-amber-400/60 font-mono">Needed to generate MML objects</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Tip */}
              <div className="text-[10px] text-[var(--text-muted)] font-mono leading-relaxed border-t border-white/[0.06] pt-3">
                {!glyphConnected && !hasApiKey && "Connect Glyph and add your API key in the Object Builder settings to get started."}
                {!glyphConnected && hasApiKey && "Connect Glyph using the button in the header to save objects and chat."}
                {glyphConnected && !hasApiKey && "Open the settings gear in Object Builder to add your API key."}
                {allConfigured && "You're all set! Start building MML objects for the Otherside."}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
