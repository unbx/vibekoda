"use client";

import { useState, useEffect, useCallback } from "react";
import { ChatInterface } from "@/components/ChatInterface";
import { CodeEditor } from "@/components/CodeEditor";
import { ScenePreview } from "@/components/ScenePreview";
import { GalleryPanel } from "@/components/GalleryPanel";
import { WorldChat } from "@/components/WorldChat";
import { generateMML, DEMO_MML } from "@/lib/ai";
import type { Message } from "@/lib/ai";
import { AlertCircle, Sun, Moon, Sunset } from "lucide-react";
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
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--background)]">

      {/* ═══════ HEADER — Otherside minimal nav ═══════ */}
      <header className="relative z-40 h-14 flex items-center justify-between px-5 border-b border-white/[0.06] bg-[var(--background)] shrink-0">
        {/* Left: Logo */}
        <div className="flex items-center gap-2.5">
          <img
            src="/Hapa-head-emoji.png"
            alt="VibeKoda"
            className="w-7 h-7 rounded-md object-cover animate-pulse-glow"
          />
          <h1 className="font-display text-sm tracking-[0.15em] text-white">
            VIBEKODA<span className="text-[var(--primary-light)] ml-1">STUDIO</span>
          </h1>
        </div>

        {/* Right: Wallet + Status */}
        <div className="flex items-center gap-4">
          <WalletButton />
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="font-display-light text-[9px] tracking-[0.15em] text-[var(--text-muted)]">
              AGENT ACTIVE
            </span>
          </div>
        </div>
      </header>

      {/* ═══════ MAIN WORKSPACE — Non-overlapping split layout ═══════ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ─── Left Pane: Chat/Builder ─── */}
        <section className="w-[340px] min-w-[300px] max-w-[400px] shrink-0 flex flex-col overflow-hidden border-r border-white/[0.06] bg-[var(--panel-bg)]">
          <ChatInterface onGenerate={handleGenerate} isGenerating={isGenerating} onNewObject={handleNewObject} />
        </section>

        {/* ─── Right Pane: Preview + Code ─── */}
        <section className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* Top: Live 3D Preview */}
          <div className="flex-[3] relative overflow-hidden">
            <ScenePreview mmlCode={mmlCode} lighting={lighting} />

            {/* Lighting Presets — top-right overlay */}
            <div className="absolute top-4 right-4 z-10 flex gap-1 bg-[var(--panel-bg)] backdrop-blur-xl px-2 py-1.5 rounded-full border border-[var(--panel-border)]">
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

            {/* Error toast */}
            {error && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-red-950/80 border border-red-500/30 p-4 rounded-2xl flex items-center gap-3 backdrop-blur-xl w-[90%] max-w-md shadow-[0_0_40px_rgba(239,68,68,0.15)]">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* Bottom: Code Editor */}
          <div className="flex-[2] min-h-0 border-t border-white/[0.06]">
            <CodeEditor code={mmlCode} onChange={setMmlCode} userId={userId} />
          </div>

        </section>
      </div>

      {/* Hidden helpers */}
      <GlyphUserSync onAddress={handleWalletAddress} />
      <GalleryPanel userId={userId} onLoad={handleLoadFromGallery} />
      <WorldChat currentMmlDescription={mmlCode} />
    </main>
  );
}
