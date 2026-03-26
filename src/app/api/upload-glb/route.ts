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
const GLB_PREFIX = "glb"; // s3://vibekoda/glb/{userId}/{filename}
const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

export async function POST(req: NextRequest) {
  try {
    if (!BUCKET || !process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID) {
      return NextResponse.json(
        { error: "S3 is not configured." },
        { status: 503 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    // Validate file type
    const name = file.name.toLowerCase();
    if (!name.endsWith(".glb") && !name.endsWith(".gltf")) {
      return NextResponse.json(
        { error: "Only .glb and .gltf files are supported." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_SIZE / (1024 * 1024)}MB.` },
        { status: 400 }
      );
    }

    const safeUserId = (userId || "anonymous")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 64) || "anonymous";

    // Sanitize filename: keep alphanumeric, dashes, underscores, dots
    const safeName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 100);

    const fileId = `${randomUUID()}-${safeName}`;
    const key = `${GLB_PREFIX}/${safeUserId}/${fileId}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: name.endsWith(".gltf")
          ? "model/gltf+json"
          : "model/gltf-binary",
      })
    );

    const publicUrl = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    return NextResponse.json({
      url: publicUrl,
      key,
      filename: safeName,
      size: file.size,
    });
  } catch (err: any) {
    console.error("[GLB Upload Error]", err);
    return NextResponse.json(
      { error: err?.message || "Upload failed." },
      { status: 500 }
    );
  }
}
