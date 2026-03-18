import { Suspense } from "react";
import { SharePageClient } from "./SharePageClient";

// key is a catch-all: ["mml", "{userId}", "{filename}.mml"]
export default async function SharePage({ params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const keyPath = key.join("/");
  const s3Url = `https://${process.env.S3_BUCKET_NAME || "vibekoda"}.s3.${process.env.AWS_REGION || "us-west-2"}.amazonaws.com/${keyPath}`;
  const filename = key[key.length - 1] || "";
  const displayName = filename.replace(/\.mml$/, "").replace(/-/g, " ");

  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center text-sm">Loading...</div>}>
      <SharePageClient s3Url={s3Url} displayName={displayName} mmlKey={keyPath} />
    </Suspense>
  );
}

export const dynamic = "force-dynamic";
