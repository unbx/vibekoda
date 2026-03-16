import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.S3_BUCKET_NAME!;
const PREFIX = process.env.S3_PREFIX || "mml";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = (searchParams.get("userId") || "anonymous")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 64) || "anonymous";

  if (!BUCKET || !process.env.AWS_REGION) {
    return NextResponse.json({ error: "S3 not configured." }, { status: 503 });
  }

  try {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: `${PREFIX}/${userId}/`,
      })
    );

    const objects = (res.Contents || [])
      .filter(obj => obj.Key && obj.Key.endsWith(".mml"))
      .map(obj => {
        const key = obj.Key!;
        const filename = key.split("/").pop() || key;
        // objectName is stored in the filename as URL-encoded prefix before the UUID
        const url = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
        const shareUrl = `/share/${key}`;
        return {
          key,
          filename,
          url,
          shareUrl,
          uploadedAt: obj.LastModified?.toISOString() ?? null,
          size: obj.Size ?? 0,
        };
      })
      // Most recent first
      .sort((a, b) => (b.uploadedAt ?? "").localeCompare(a.uploadedAt ?? ""));

    return NextResponse.json({ objects });
  } catch (err: any) {
    console.error("[List MML Error]", err);
    return NextResponse.json({ error: err?.message || "Failed to list objects." }, { status: 500 });
  }
}
