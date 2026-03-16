import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.S3_BUCKET_NAME!;
const PREFIX = process.env.S3_PREFIX || "mml";

export async function POST(req: NextRequest) {
  try {
    // Validate environment
    if (!BUCKET || !process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID) {
      return NextResponse.json(
        { error: "S3 is not configured. Please set AWS credentials in .env.local." },
        { status: 503 }
      );
    }

    const { mmlCode, filename, userId, objectName } = await req.json();

    if (!mmlCode || typeof mmlCode !== "string") {
      return NextResponse.json({ error: "No MML code provided." }, { status: 400 });
    }

    // Sanitize userId to prevent path traversal
    const safeUserId = (userId || "anonymous").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "anonymous";
    const safeObjectName = (objectName || "untitled").replace(/[^a-zA-Z0-9 _-]/g, "").trim().slice(0, 80) || "untitled";

    // Upload raw MML — Otherside expects plain MML tags, not an HTML document wrapper
    const fullContent = mmlCode.trim();

    const fileId = filename || `${randomUUID()}.mml`;
    const key = `${PREFIX}/${safeUserId}/${fileId}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: fullContent,
        ContentType: "text/html",
        // Public access is granted via bucket policy, not ACL
        // (bucket has ACLs disabled - modern recommended setting)
      })
    );

    const publicUrl = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    const shareUrl = `/share/${key}`;

    return NextResponse.json({ url: publicUrl, key, shareUrl, userId: safeUserId, objectName: safeObjectName });
  } catch (err: any) {
    console.error("[S3 Upload Error]", err);
    return NextResponse.json(
      { error: err?.message || "Upload failed." },
      { status: 500 }
    );
  }
}
