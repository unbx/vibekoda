"use client";

import { useState, useRef, useEffect } from "react";
import { Settings, CheckCircle2, Sparkles, Loader2, Plus, User, Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Message } from "@/lib/ai";

interface ChatInterfaceProps {
  onGenerate: (messages: Message[], apiKey: string, endpoint: string, model: string) => Promise<void>;
  isGenerating: boolean;
  onNewObject: () => void;
}

interface ChatBubble {
  role: "user" | "assistant";
  text: string;
}

export function ChatInterface({ onGenerate, isGenerating, onNewObject }: ChatInterfaceProps) {
  const [prompt, setPrompt] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [provider, setProvider] = useState<"openai" | "anthropic" | "custom">("openai");
  const [apiKey, setApiKey] = useState("");
  const [endpoint, setEndpoint] = useState("https://api.openai.com/v1/chat/completions");
  const [model, setModel] = useState("gpt-4o-mini");
  const [chatHistory, setChatHistory] = useState<ChatBubble[]>([]);
  const [messageHistory, setMessageHistory] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleProviderChange = (newProvider: "openai" | "anthropic" | "custom") => {
    setProvider(newProvider);
    if (newProvider === "openai") {
      setEndpoint("https://api.openai.com/v1/chat/completions");
      setModel("gpt-4o-mini");
    } else if (newProvider === "anthropic") {
      setEndpoint("https://api.anthropic.com/v1/messages");
      setModel("claude-opus-4-6");
    } else {
      setEndpoint("");
      setModel("");
    }
  };

  const handleNewObject = () => {
    setChatHistory([]);
    setMessageHistory([]);
    onNewObject();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    const userMessage = prompt.trim();
    setPrompt("");

    // Add user bubble
    setChatHistory(prev => [...prev, { role: "user", text: userMessage }]);

    // Build messages for the API
    const newMessages: Message[] = [...messageHistory, { role: "user", content: userMessage }];
    setMessageHistory(newMessages);

    await onGenerate(newMessages, apiKey, endpoint, model);
  };

  // Called from parent after successful generation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Expose a way to add assistant messages from parent
  const addAssistantMessage = (text: string) => {
    setChatHistory(prev => [...prev, { role: "assistant", text }]);
    setMessageHistory(prev => [...prev, { role: "assistant", content: text }]);
  };

  // Expose addAssistantMessage via ref-like pattern on window 
  useEffect(() => {
    (window as any).__addAssistantMessage = addAssistantMessage;
    return () => { delete (window as any).__addAssistantMessage; };
  });

  return (
    <div className="flex flex-col h-full w-full relative">
      {/* Header with New Object button */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/20 shrink-0">
        <span className="text-xs font-mono text-purple-300 tracking-wider">OBJECT BUILDER</span>
        <button
          onClick={handleNewObject}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 rounded-lg text-xs text-purple-300 transition-all hover:text-white"
        >
          <Plus className="w-3 h-3" /> New Object
        </button>
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute z-30 top-14 left-4 right-4 bg-[#0d0d14] p-5 rounded-xl border border-purple-500/30 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-purple-300 flex items-center gap-2">
                <Settings className="w-4 h-4" /> Bring Your Own Agent
              </h3>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">API Provider</label>
                <select 
                  value={provider}
                  onChange={(e) => handleProviderChange(e.target.value as any)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors appearance-none"
                >
                  <option value="openai">OpenAI (Default)</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="custom">Custom Endpoint (OpenClaw, Local, etc.)</option>
                </select>
              </div>
              
              <div>
                <label className="text-xs flex items-center justify-between text-gray-400 mb-1">
                  <span>API Key</span>
                  {provider !== 'custom' && <span className="text-[10px] text-purple-400/50">Stored locally only</span>}
                </label>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={provider === 'openai' ? "sk-proj-..." : provider === 'anthropic' ? "sk-ant-..." : "API Key"} 
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Endpoint URL</label>
                <input 
                  type="text" 
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Model Name</label>
                {provider === "custom" ? (
                  <input 
                    type="text" 
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g., local-model-name"
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                  />
                ) : (
                  <select 
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors appearance-none"
                  >
                    {provider === "openai" && (
                      <optgroup label="OpenAI Models">
                        <option value="gpt-4o-mini">gpt-4o-mini (Fast, Default)</option>
                        <option value="gpt-4o">gpt-4o (Most Capable)</option>
                        <option value="gpt-4-turbo">gpt-4-turbo</option>
                      </optgroup>
                    )}
                    {provider === "anthropic" && (
                      <optgroup label="Anthropic Models">
                        <option value="claude-opus-4-6">Claude Opus 4.6 (Most Capable)</option>
                        <option value="claude-sonnet-4-6">Claude Sonnet 4.6 (Balanced)</option>
                        <option value="claude-haiku-4-5">Claude Haiku 4.5 (Fastest)</option>
                      </optgroup>
                    )}
                  </select>
                )}
              </div>
            </div>
            <button 
              onClick={() => setShowSettings(false)}
              className="w-full mt-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> Save Settings
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {chatHistory.length === 0 && (
          <div className="glass-panel p-5 rounded-2xl rounded-tl-sm w-11/12 max-w-md self-start relative">
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 shadow-[0_0_10px_rgba(139,92,246,0.4)]">
              <img src="/Hapa-head-emoji.png" alt="VibeKoda" className="w-full h-full object-cover" />
            </div>
            <p className="text-sm text-gray-300 leading-relaxed font-light z-10 relative">
              Hey creator! I'm your <span className="text-purple-400 font-semibold text-glow">VibeKoda</span> 🔮
              <br/><br/>
              Tell me what you want to build for the Otherside and I'll craft the MML. Keep chatting to refine it — I'll remember everything. Hit <span className="text-purple-400 font-medium">New Object</span> when you're ready for something fresh. ✨
            </p>
          </div>
        )}
        
        {chatHistory.map((msg, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-start gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 mt-1 shadow-[0_0_8px_rgba(139,92,246,0.4)]">
                <img src="/Hapa-head-emoji.png" alt="VibeKoda" className="w-full h-full object-cover" />
              </div>
            )}
            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-purple-600/30 text-purple-100 rounded-br-sm' 
                : 'bg-white/5 text-gray-300 rounded-bl-sm border border-white/5'
            }`}>
              {msg.text}
            </div>
            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-1">
                <User className="w-3.5 h-3.5 text-gray-400" />
              </div>
            )}
          </motion.div>
        ))}
        
        {isGenerating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2"
          >
            <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 shadow-[0_0_8px_rgba(139,92,246,0.4)]">
              <img src="/Hapa-head-emoji.png" alt="VibeKoda" className="w-full h-full object-cover" />
            </div>
            <div className="bg-white/5 border border-white/5 px-4 py-2.5 rounded-2xl rounded-bl-sm">
              <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-4 border-t border-white/10 bg-black/20 shrink-0">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <button 
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={`absolute left-3 p-2 rounded-full transition-colors ${apiKey ? 'text-purple-400 hover:bg-purple-900/30' : 'text-gray-500 hover:text-white hover:bg-white/10'}`}
            title="Agent Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={apiKey ? (chatHistory.length > 0 ? "Refine this object..." : "Create a neon palm tree...") : "Configure API settings first!"}
            disabled={isGenerating}
            className="w-full bg-black/40 border border-white/10 focus:border-purple-500/50 rounded-full py-3 pl-12 pr-14 text-sm text-white focus:outline-none transition-all placeholder:text-gray-600"
          />
          
          <button 
            type="submit"
            disabled={!prompt.trim() || isGenerating}
            className="absolute right-2 p-2 bg-purple-600 text-white rounded-full hover:bg-purple-500 disabled:opacity-50 disabled:hover:bg-purple-600 transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_20px_rgba(139,92,246,0.5)]"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
