"use client";

import { useState, useEffect, useCallback } from "react";
import { ChatInterface } from "@/components/ChatInterface";
import { CodeEditor } from "@/components/CodeEditor";
import { ScenePreview } from "@/components/ScenePreview";
import { GalleryPanel } from "@/components/GalleryPanel";
import { WorldChat } from "@/components/WorldChat";
import { generateMML, DEMO_MML } from "@/lib/ai";
import type { Message } from "@/lib/ai";
import {
  AlertCircle, Sun, Moon, Sunset,
  MessageSquare, Code2, ChevronDown, ChevronUp,
  Menu, X, Layers, Globe,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const WalletButton = dynamic(
  () => import("@/components/WalletButton").then(m => ({ default: m.WalletButton })),
  { ssr: false, loading: () => null }
);
const GlyphUserSync = dynamic(
  () => import("@/components/GlyphUserSync").then(m => ({ default: m.GlyphUserSync })),
  { ssr: false, loading: () => null }
);

type LightingPreset = "studio" | "sunset" | "night";

function generateUserId(): string {
  const key = "vibekoda_user_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export default function Home() {
  const [mmlCode, setMmlCode] = useState<string>(DEMO_MML);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lighting, setLighting] = useState<LightingPreset>("studio");
  const [localUserId, setLocalUserId] = useState<string>("");
  const [walletAddress, setWalletAddress] = useState<string | undefined>();
  const userId = walletAddress || localUserId;

  // Panel visibility
  const [chatOpen, setChatOpen] = useState(true);
  const [codeOpen, setCodeOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleWalletAddress = useCallback((addr: string | undefined) => {
    setWalletAddress(addr);
  }, []);

  useEffect(() => {
    setLocalUserId(generateUserId());
  }, []);

  const handleGenerate = async (messages: Message[], apiKey: string, endpoint: string, model: string) => {
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateMML(messages, apiKey, endpoint, model);
      setMmlCode(result.mmlCode);
      const description = result.content.replace(/```[\s\S]*?```/g, "").trim();
      if ((window as any).__addAssistantMessage) {
        (window as any).__addAssistantMessage(description || "Updated the MML object.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNewObject = () => {
    setMmlCode(DEMO_MML);
    setError(null);
  };

  const handleLoadFromGallery = (code: string) => {
    setMmlCode(code);
    setError(null);
  };

  return (
    <main className="relative flex h-screen w-screen flex-col overflow-hidden bg-[var(--background)]">

      {/* ═══════ HEADER — Otherside minimal nav ═══════ */}
      <header className="relative z-40 h-14 flex items-center justify-between px-5 border-b border-white/[0.06] bg-[var(--background)]/80 backdrop-blur-xl shrink-0">
        {/* Left: Menu + tools */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-white transition-colors"
          >
            {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            <span className="font-display-light text-[11px] tracking-[0.2em]">MENU</span>
          </button>
        </div>

        {/* Center: Logo */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2.5">
          <img
            src="/Hapa-head-emoji.png"
            alt="VibeKoda"
            className="w-7 h-7 rounded-md object-cover animate-pulse-glow"
          />
          <h1 className="font-display text-sm tracking-[0.15em] text-white">
            VIBEKODA<span className="text-[var(--primary-light)] ml-1">STUDIO</span>
          </h1>
        </div>

        {/* Right: Wallet */}
        <div className="flex items-center gap-3">
          <WalletButton />
        </div>
      </header>

      {/* ═══════ MAIN CANVAS AREA ═══════ */}
      <div className="relative flex-1 overflow-hidden">

        {/* Full-screen 3D Preview */}
        <div className="absolute inset-0">
          <ScenePreview mmlCode={mmlCode} lighting={lighting} />
        </div>

        {/* ─── Lighting Controls (top-right overlay) ─── */}
        <div className="absolute top-4 right-4 z-40 flex gap-1 bg-[var(--panel-bg)] backdrop-blur-xl px-2 py-1.5 rounded-full border border-[var(--panel-border)]">
          {([
            { key: "studio" as const, icon: Sun, label: "Studio" },
            { key: "sunset" as const, icon: Sunset, label: "Sunset" },
            { key: "night" as const, icon: Moon, label: "Night" },
          ]).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setLighting(key)}
              className={`p-2 rounded-full transition-all ${
                lighting === key
                  ? "bg-[var(--primary)]/30 text-white"
                  : "hover:bg-white/5 text-[var(--text-muted)]"
              }`}
              title={`${label} Lighting`}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        {/* ─── Panel Toggle Buttons (top-left overlay) ─── */}
        <div className="absolute top-4 left-4 z-40 flex gap-2">
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className={`flex items-center gap-2 px-3 py-2 rounded-full border transition-all backdrop-blur-xl ${
              chatOpen
                ? "bg-[var(--primary)]/20 border-[var(--primary)]/30 text-white"
                : "bg-[var(--panel-bg)] border-[var(--panel-border)] text-[var(--text-muted)] hover:text-white hover:border-[var(--primary)]/30"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="font-display-light text-[10px] tracking-[0.15em]">BUILDER</span>
          </button>
          <button
            onClick={() => setCodeOpen(!codeOpen)}
            className={`flex items-center gap-2 px-3 py-2 rounded-full border transition-all backdrop-blur-xl ${
              codeOpen
                ? "bg-[var(--primary)]/20 border-[var(--primary)]/30 text-white"
                : "bg-[var(--panel-bg)] border-[var(--panel-border)] text-[var(--text-muted)] hover:text-white hover:border-[var(--primary)]/30"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span className="font-display-light text-[10px] tracking-[0.15em]">CODE</span>
          </button>
        </div>

        {/* ─── Error Toast ─── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 bg-red-950/80 border border-red-500/30 p-4 rounded-2xl flex items-center gap-3 backdrop-blur-xl max-w-md shadow-[0_0_40px_rgba(239,68,68,0.15)]"
            >
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-red-200 text-sm">{error}</p>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 ml-2">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════ CHAT PANEL — Left overlay ═══════ */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ x: -400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -400, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="absolute top-0 left-0 bottom-0 z-30 w-[380px] max-w-[85vw] flex flex-col pointer-events-none"
            >
              <div className="m-3 mt-14 mb-3 flex-1 flex flex-col overflow-hidden rounded-2xl glass-panel pointer-events-auto">
                <ChatInterface onGenerate={handleGenerate} isGenerating={isGenerating} onNewObject={handleNewObject} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════ CODE PANEL — Bottom slide-up ═══════ */}
        <AnimatePresence>
          {codeOpen && (
            <motion.div
              initial={{ y: 400, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 400, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 z-30 h-[45%] max-h-[400px]"
            >
              <div className="mx-3 mb-3 h-full flex flex-col rounded-2xl glass-panel overflow-hidden">
                {/* Code panel drag handle */}
                <div className="flex items-center justify-center py-1.5 cursor-pointer" onClick={() => setCodeOpen(false)}>
                  <div className="w-10 h-1 rounded-full bg-white/10" />
                </div>
                <CodeEditor code={mmlCode} onChange={setMmlCode} userId={userId} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════ MENU DROPDOWN ═══════ */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-0 left-0 z-50 m-3 mt-2 glass-panel rounded-2xl p-2 min-w-[200px]"
            >
              <button
                onClick={() => { setChatOpen(!chatOpen); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="font-display-light text-[11px] tracking-[0.12em]">{chatOpen ? "HIDE BUILDER" : "SHOW BUILDER"}</span>
              </button>
              <button
                onClick={() => { setCodeOpen(!codeOpen); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-all"
              >
                <Code2 className="w-4 h-4" />
                <span className="font-display-light text-[11px] tracking-[0.12em]">{codeOpen ? "HIDE CODE" : "SHOW CODE"}</span>
              </button>
              <div className="h-px bg-white/5 my-1" />
              <button
                onClick={() => { setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-all"
              >
                <Layers className="w-4 h-4" />
                <span className="font-display-light text-[11px] tracking-[0.12em]">GALLERY</span>
              </button>
              <button
                onClick={() => { setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-all"
              >
                <Globe className="w-4 h-4" />
                <span className="font-display-light text-[11px] tracking-[0.12em]">WORLD CHAT</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══════ BOTTOM BAR — Otherside style ═══════ */}
      <footer className="relative z-40 h-10 flex items-center justify-center gap-3 border-t border-white/[0.06] bg-[var(--background)]/80 backdrop-blur-xl shrink-0">
        <span className="font-display-light text-[10px] tracking-[0.2em] text-[var(--text-muted)]">
          CURRENTLY VIEWING:
        </span>
        <div className="flex gap-1.5">
          <span className="btn-otherside text-[10px] px-4 py-1 tracking-[0.15em]">
            STUDIO
          </span>
          <button className="btn-otherside-outline text-[10px] px-4 py-1 tracking-[0.15em]">
            GALLERY
          </button>
        </div>
        <div className="absolute right-4 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="font-display-light text-[9px] tracking-[0.15em] text-[var(--text-muted)]">
            AGENT ACTIVE
          </span>
        </div>
      </footer>

      {/* Hidden helpers */}
      <GlyphUserSync onAddress={handleWalletAddress} />
      <GalleryPanel userId={userId} onLoad={handleLoadFromGallery} />
      <WorldChat currentMmlDescription={mmlCode} />
    </main>
  );
}
