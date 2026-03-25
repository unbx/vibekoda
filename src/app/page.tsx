"use client";

import { useState, useEffect, useCallback } from "react";
import { ChatInterface } from "@/components/ChatInterface";
import { CodeEditor, CodeEditorActions } from "@/components/CodeEditor";
import { ScenePreview } from "@/components/ScenePreview";
import { GalleryPanel } from "@/components/GalleryPanel";
import { WorldChat } from "@/components/WorldChat";
import { generateMML, generateMMLDemo, DEMO_MML } from "@/lib/ai";
import type { Message, DemoUsage } from "@/lib/ai";
import { SetupPanel } from "@/components/SetupPanel";
import { AlertCircle, Lightbulb, Moon, Sunset, Hammer, LayoutGrid, ChevronDown, ChevronUp, ChevronLeft, Radio } from "lucide-react";
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
type LeftTab = "build" | "gallery";
type MobilePanel = "viewer" | "builder" | "chat";

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
  const [glyphUsername, setGlyphUsername] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<LeftTab>("build");
  const [codeCollapsed, setCodeCollapsed] = useState(false);
  const [isLeftOpen, setIsLeftOpen] = useState(true);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("viewer");
  const [glyphActions, setGlyphActions] = useState<{ connect: () => void; disconnect: () => void } | null>(null);
  const userId = glyphUsername || walletAddress || localUserId;
  const glyphConnected = !!walletAddress;

  const handleGlyphActions = useCallback((actions: { connect: () => void; disconnect: () => void }) => {
    setGlyphActions(actions);
  }, []);

  const handleWalletAddress = useCallback((addr: string | undefined) => {
    setWalletAddress(addr);
  }, []);

  const handleGlyphUsername = useCallback((name: string | null) => {
    setGlyphUsername(name);
  }, []);

  useEffect(() => {
    setLocalUserId(generateUserId());
  }, []);

  const handleGenerate = async (
    messages: Message[],
    apiKey: string,
    endpoint: string,
    model: string,
    demoOpts?: { conversationId: string; isNewGeneration: boolean }
  ) => {
    setIsGenerating(true);
    setError(null);
    try {
      let result: { content: string; mmlCode: string; demo?: DemoUsage };

      if (demoOpts) {
        // DEMO mode — route through server-side proxy
        result = await generateMMLDemo(
          messages,
          userId,
          demoOpts.conversationId,
          demoOpts.isNewGeneration
        );
      } else {
        // BYO Agent mode — direct API call
        result = await generateMML(messages, apiKey, endpoint, model);
      }

      setMmlCode(result.mmlCode);
      const description = result.content.replace(/```[\s\S]*?```/g, "").trim();
      if ((window as any).__addAssistantMessage) {
        (window as any).__addAssistantMessage(description || "Updated the MML object.");
      }
      // Pass demo usage back for UI tracking
      if (result.demo && (window as any).__updateDemoUsage) {
        (window as any).__updateDemoUsage(result.demo);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
      // Re-throw so ChatInterface can detect exhaustion errors
      throw err;
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
    setLeftTab("build");
  };

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--background)]">

      {/* ═══════ HEADER — Otherside minimal nav ═══════ */}
      <header className="relative z-40 h-10 lg:h-14 flex items-center justify-between px-3 lg:px-5 border-b border-white/[0.06] bg-[var(--background)] shrink-0">
        {/* Left: Logo */}
        <div className="flex items-center gap-2.5">
          <img
            src="/Hapa-head-emoji.png"
            alt="Hapa"
            className="w-7 h-7 rounded-md object-cover animate-pulse-glow"
          />
          <h1 className="font-display text-sm tracking-[0.15em] text-white">
            VIBEKODA<span className="text-[var(--primary-light)] ml-1 hidden sm:inline">STUDIO</span>
          </h1>
        </div>

        {/* Right: Wallet + Setup + Status */}
        <div className="flex items-center gap-3">
          <WalletButton onExposeActions={handleGlyphActions} />
          <SetupPanel
            glyphConnected={glyphConnected}
            glyphUsername={glyphUsername}
            walletAddress={walletAddress}
            onConnectGlyph={glyphActions?.connect}
            onDisconnectGlyph={glyphActions?.disconnect}
            onOpenAiSettings={() => { setLeftTab("build"); setTimeout(() => (window as any).__openAiSettings?.(), 100); }}
          />
          <div className="hidden lg:flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="font-display-light text-[9px] tracking-[0.15em] text-[var(--text-muted)]">
              AGENT ACTIVE
            </span>
          </div>
        </div>
      </header>

      {/* ═══════ MAIN WORKSPACE — Non-overlapping split layout ═══════ */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

        {/* ─── Left Pane: Build/Gallery with pill toggle (collapsible) ─── */}
        <section
          className={`shrink-0 flex-col border-r border-white/[0.06] bg-[var(--panel-bg)] transition-all overflow-hidden ${
            mobilePanel === "builder" ? "flex flex-1" : "hidden"
          } lg:flex lg:flex-initial ${
            isLeftOpen ? "lg:w-[340px] lg:min-w-[300px] lg:max-w-[400px]" : "lg:w-10"
          }`}
        >
          {!isLeftOpen ? (
            <button
              onClick={() => setIsLeftOpen(true)}
              className="hidden lg:flex flex-col items-center justify-center gap-2 h-full w-full py-4 text-[var(--text-secondary)] hover:text-white hover:bg-[var(--primary)]/5 transition-colors"
              title="Open Object Builder"
            >
              <Hammer className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span className="text-[9px] font-display-light tracking-[0.15em] [writing-mode:vertical-rl] rotate-180">
                OBJECT BUILDER
              </span>
            </button>
          ) : (
            <>
              {/* Content area */}
              <div className="flex-1 overflow-hidden">
                {leftTab === "build" ? (
                  <ChatInterface onGenerate={handleGenerate} isGenerating={isGenerating} onNewObject={handleNewObject} userId={userId} />
                ) : (
                  <GalleryPanel userId={userId} onLoad={handleLoadFromGallery} />
                )}
              </div>

              {/* Pill toggle at bottom */}
              <div className="shrink-0 border-t border-white/[0.06] px-4 py-2.5 flex items-center">
                <button
                  onClick={() => setIsLeftOpen(false)}
                  className="text-[var(--text-muted)] hover:text-white transition-colors mr-2"
                  title="Collapse panel"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <div className="flex-1 flex justify-center">
                  <div className="flex bg-black/40 rounded-full p-0.5 border border-white/[0.06]">
                    <button
                      onClick={() => setLeftTab("build")}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] tracking-[0.12em] font-display-light transition-all ${
                        leftTab === "build"
                          ? "bg-[var(--primary)] text-white shadow-lg"
                          : "text-[var(--text-muted)] hover:text-white"
                      }`}
                    >
                      <Hammer className="w-3 h-3" />
                      BUILD
                    </button>
                    <button
                      onClick={() => setLeftTab("gallery")}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] tracking-[0.12em] font-display-light transition-all ${
                        leftTab === "gallery"
                          ? "bg-[var(--primary)] text-white shadow-lg"
                          : "text-[var(--text-muted)] hover:text-white"
                      }`}
                    >
                      <LayoutGrid className="w-3 h-3" />
                      GALLERY
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        {/* ─── Right Pane: Preview + Code ─── */}
        <section className={`flex-1 flex-col overflow-hidden min-w-0 ${mobilePanel === "viewer" ? "flex" : "hidden"} lg:flex`}>

          {/* Top: Live 3D Preview */}
          <div className={`relative overflow-hidden ${codeCollapsed ? "flex-1" : "flex-[3]"}`}>
            <ScenePreview mmlCode={mmlCode} lighting={lighting} />

            {/* Lighting Presets — top-right overlay */}
            <div className="absolute top-4 right-4 z-10 flex gap-1 bg-[var(--panel-bg)] backdrop-blur-xl px-2 py-1.5 rounded-full border border-[var(--panel-border)]">
              {([
                { key: "studio" as const, icon: Lightbulb, label: "Studio" },
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

            {/* Error toast */}
            {error && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-red-950/80 border border-red-500/30 p-4 rounded-2xl flex items-center gap-3 backdrop-blur-xl w-[90%] max-w-md shadow-[0_0_40px_rgba(239,68,68,0.15)]">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* Bottom: Code Editor — collapsible */}
          <div className={`border-t border-white/[0.06] flex flex-col ${codeCollapsed ? "" : "flex-[2] min-h-0"}`}>
            {/* Always-visible header bar */}
            <div className="relative flex items-center justify-between px-4 py-2.5 shrink-0 cursor-pointer hover:bg-white/[0.02] transition-colors" onClick={() => setCodeCollapsed(c => !c)}>
              <div className="flex items-center gap-2">
                {codeCollapsed ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                <span className="font-mono text-[10px] text-[var(--text-muted)] opacity-60">&lt;/&gt;</span>
                <span className="font-display-light text-[10px] tracking-[0.2em] text-[var(--primary-light)]">MML CODE</span>
              </div>
              <CodeEditorActions code={mmlCode} userId={userId} glyphConnected={glyphConnected} />
            </div>
            {/* Expandable code area */}
            {!codeCollapsed && (
              <div className="flex-1 min-h-0 overflow-hidden">
                <CodeEditor code={mmlCode} onChange={setMmlCode} userId={userId} />
              </div>
            )}
          </div>

        </section>

        {/* ─── Right Pane: World Chat (non-overlapping) ─── */}
        <div className={`${mobilePanel === "chat" ? "flex flex-1 flex-col" : "hidden"} lg:flex lg:flex-initial lg:shrink-0`}>
          <WorldChat
            currentMmlDescription={mmlCode}
            glyphUsername={glyphUsername}
            glyphConnected={glyphConnected}
          />
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="lg:hidden shrink-0 flex border-t border-white/[0.06] bg-[var(--panel-bg)]">
        <button
          onClick={() => setMobilePanel("builder")}
          className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[9px] font-display-light tracking-[0.12em] transition-colors ${
            mobilePanel === "builder" ? "text-[var(--primary-light)]" : "text-[var(--text-muted)]"
          }`}
        >
          <Hammer className="w-4 h-4" />
          BUILD
        </button>
        <button
          onClick={() => setMobilePanel("viewer")}
          className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[9px] font-display-light tracking-[0.12em] transition-colors ${
            mobilePanel === "viewer" ? "text-[var(--primary-light)]" : "text-[var(--text-muted)]"
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          PREVIEW
        </button>
        <button
          onClick={() => setMobilePanel("chat")}
          className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[9px] font-display-light tracking-[0.12em] transition-colors ${
            mobilePanel === "chat" ? "text-[var(--primary-light)]" : "text-[var(--text-muted)]"
          }`}
        >
          <Radio className="w-4 h-4" />
          CHAT
        </button>
      </nav>

      {/* Hidden helpers */}
      <GlyphUserSync onAddress={handleWalletAddress} onUsername={handleGlyphUsername} />
    </main>
  );
}
