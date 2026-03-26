import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
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

export async function POST(req: NextRequest) {
  try {
    if (!BUCKET || !process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID) {
      return NextResponse.json(
        { error: "S3 is not configured." },
        { status: 503 }
      );
    }

    const { key, userId } = await req.json();

    if (!key || typeof key !== "string") {
      return NextResponse.json({ error: "No key provided." }, { status: 400 });
    }

    // Sanitize userId
    const safeUserId = (userId || "anonymous")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 64) || "anonymous";

    // Security: ensure the key belongs to this user's prefix
    const expectedPrefix = `${PREFIX}/${safeUserId}/`;
    if (!key.startsWith(expectedPrefix)) {
      return NextResponse.json(
        { error: "Unauthorized: key does not belong to this user." },
        { status: 403 }
      );
    }

    await s3.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );

    return NextResponse.json({ success: true, key });
  } catch (err: any) {
    console.error("[S3 Delete Error]", err);
    return NextResponse.json(
      { error: err?.message || "Delete failed." },
      { status: 500 }
    );
  }
}
