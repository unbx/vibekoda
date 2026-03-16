"use client";

import { useEffect, useState } from "react";
import { Copy, Check, ExternalLink, Loader2 } from "lucide-react";
import Image from "next/image";

interface Props {
  s3Url: string;
  displayName: string;
  mmlKey: string;
}

export function SharePageClient({ s3Url, displayName, mmlKey }: Props) {
  const [mmlCode, setMmlCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedS3, setCopiedS3] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  useEffect(() => {
    fetch(s3Url)
      .then(res => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.text();
      })
      .then(setMmlCode)
      .catch(() => setError("Could not load this MML object. It may have been deleted."));
  }, [s3Url]);

  const copyS3 = async () => {
    await navigator.clipboard.writeText(s3Url);
    setCopiedS3(true);
    setTimeout(() => setCopiedS3(false), 2000);
  };

  const copyShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  return (
    <main className="min-h-screen bg-[#08080f] text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <Image src="/Hapa-head-emoji.png" alt="VibeKoda" width={32} height={32} className="rounded-lg" />
        <span className="text-sm font-bold tracking-widest">VIBEKODA <span className="text-purple-400">STUDIO</span></span>
        <a href="/" className="ml-auto text-xs text-gray-600 hover:text-purple-400 transition-colors">← Open Studio</a>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold capitalize">{displayName || "MML Object"}</h1>
          <p className="text-sm text-gray-500 mt-1 font-mono">{mmlKey}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={copyS3}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 rounded-xl text-sm text-purple-300 hover:text-white transition-all font-mono"
          >
            {copiedS3 ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            {copiedS3 ? "Copied!" : "Copy MML URL"}
          </button>
          <button
            onClick={copyShare}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-gray-300 hover:text-white transition-all font-mono"
          >
            {copiedShare ? <Check className="w-4 h-4 text-green-400" /> : <ExternalLink className="w-4 h-4" />}
            {copiedShare ? "Copied!" : "Copy Share Link"}
          </button>
          <a
            href={`https://www.otherside.xyz/mmls`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-gray-400 hover:text-white transition-all font-mono"
          >
            <ExternalLink className="w-4 h-4" />
            Add to Otherside
          </a>
        </div>

        {/* MML Code */}
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-black/40 border-b border-white/5">
            <span className="text-xs text-purple-300 font-mono tracking-wider">MML SOURCE</span>
          </div>
          <div className="p-4 bg-[#0a0a0f] max-h-96 overflow-y-auto">
            {error && <p className="text-red-400 text-sm">{error}</p>}
            {!mmlCode && !error && (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            )}
            {mmlCode && (
              <pre className="text-purple-200 font-mono text-sm whitespace-pre-wrap break-all">
                {mmlCode}
              </pre>
            )}
          </div>
        </div>

        {/* How to use */}
        <div className="rounded-2xl border border-white/10 p-5 bg-white/2">
          <h2 className="text-sm font-semibold text-purple-300 mb-3 tracking-wider font-mono">HOW TO USE IN OTHERSIDE</h2>
          <ol className="space-y-2 text-sm text-gray-400">
            <li>1. Copy the <strong className="text-white">MML URL</strong> above</li>
            <li>2. Go to <a href="https://www.otherside.xyz/mmls" target="_blank" rel="noreferrer" className="text-purple-400 hover:underline">otherside.xyz/mmls</a></li>
            <li>3. Paste the URL and click <strong className="text-white">Add MML</strong></li>
            <li>4. Place it in your Vibe Maker world ✨</li>
          </ol>
        </div>
      </div>
    </main>
  );
}
