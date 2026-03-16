import { Suspense } from "react";
import { SharePageClient } from "./SharePageClient";

// key is a catch-all: ["mml", "{userId}", "{filename}.mml"]
export default function SharePage({ params }: { params: { key: string[] } }) {
  const key = params.key.join("/");
  const s3Url = `https://${process.env.S3_BUCKET_NAME || "vibekoda"}.s3.${process.env.AWS_REGION || "us-west-2"}.amazonaws.com/${key}`;
  const filename = params.key[params.key.length - 1] || "";
  const displayName = filename.replace(/\.mml$/, "").replace(/-/g, " ");

  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center text-sm">Loading...</div>}>
      <SharePageClient s3Url={s3Url} displayName={displayName} mmlKey={key} />
    </Suspense>
  );
}

export const dynamic = "force-dynamic";
