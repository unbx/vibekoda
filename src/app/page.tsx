"use client";

import { useState } from "react";
import { ChatInterface } from "@/components/ChatInterface";
import { CodeEditor } from "@/components/CodeEditor";
import { ScenePreview } from "@/components/ScenePreview";
import { generateMML, DEMO_MML } from "@/lib/ai";
import type { Message } from "@/lib/ai";
import { AlertCircle, Sun, Moon, Sunset } from "lucide-react";
import { WorldChat } from "@/components/WorldChat";

type LightingPreset = "studio" | "sunset" | "night";

export default function Home() {
  const [mmlCode, setMmlCode] = useState<string>(DEMO_MML);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lighting, setLighting] = useState<LightingPreset>("studio");

  const handleGenerate = async (messages: Message[], apiKey: string, endpoint: string, model: string) => {
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateMML(messages, apiKey, endpoint, model);
      setMmlCode(result.mmlCode);
      
      // Add assistant response to the chat (brief description only)
      const description = result.content.replace(/```[\s\S]*?```/g, '').trim();
      if ((window as any).__addAssistantMessage) {
        (window as any).__addAssistantMessage(description || "Updated the MML object.");
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNewObject = () => {
    setMmlCode(DEMO_MML);
    setError(null);
  };

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--background)]">
      
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-black/20 z-10 w-full shrink-0">
        <div className="flex items-center gap-3">
          <img src="/Hapa-head-emoji.png" alt="VibeKoda" className="w-8 h-8 rounded-lg object-cover shadow-[0_0_15px_rgba(139,92,246,0.5)]" />
          <h1 className="text-lg font-bold tracking-widest text-glow">
            VIBEKODA <span className="text-purple-400">STUDIO</span>
          </h1>
        </div>
        <div className="text-xs text-gray-500 font-mono flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          AGENT_MODE: ACTIVE
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 p-4 gap-4 overflow-hidden">
        
        {/* Left Pane - Generator */}
        <section className="w-1/3 min-w-[350px] max-w-sm shrink-0 flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-black/10 backdrop-blur-xl">
          <ChatInterface onGenerate={handleGenerate} isGenerating={isGenerating} onNewObject={handleNewObject} />
        </section>

        {/* Right Pane - Editor & Preview */}
        <section className="flex-1 flex flex-col gap-4 overflow-hidden min-w-0">
          
          {/* Top Half - Live 3D Preview */}
          <div className="flex-[3] relative rounded-2xl border border-white/5 bg-gradient-to-b from-[#0a0a0f] to-[#030308] overflow-hidden">
            <ScenePreview mmlCode={mmlCode} lighting={lighting} />
            
            {/* Lighting Presets */}
            <div className="absolute top-4 right-4 z-10 flex gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1.5 rounded-lg border border-white/10">
              <button
                onClick={() => setLighting("studio")}
                className={`p-1.5 rounded-md transition-all ${lighting === "studio" ? "bg-purple-600/50 text-white" : "hover:bg-white/10 text-gray-400"}`}
                title="Studio Lighting"
              >
                <Sun className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLighting("sunset")}
                className={`p-1.5 rounded-md transition-all ${lighting === "sunset" ? "bg-orange-600/50 text-white" : "hover:bg-white/10 text-gray-400"}`}
                title="Sunset Lighting"
              >
                <Sunset className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLighting("night")}
                className={`p-1.5 rounded-md transition-all ${lighting === "night" ? "bg-blue-600/50 text-white" : "hover:bg-white/10 text-gray-400"}`}
                title="Night Lighting"
              >
                <Moon className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-red-950/80 border border-red-500/50 p-4 rounded-xl flex items-center gap-3 backdrop-blur-xl w-[90%] max-w-md shadow-[0_0_50px_rgba(239,68,68,0.2)]">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* Bottom Half - Source Code */}
          <div className="flex-[2] min-h-0">
            <CodeEditor code={mmlCode} onChange={setMmlCode} />
          </div>

        </section>
      </div>
      <WorldChat currentMmlDescription={mmlCode} />
    </main>
  );
}
