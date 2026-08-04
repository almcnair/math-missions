// Image upload endpoint for the Authoring Studio.
//
// POST multipart/form-data:
//   - missionId: string   (required, used to scope the upload directory)
//   - file:      File     (required, image/* only, capped at 10 MB)
//
// Returns: { url: string, width?: number, height?: number }
//
// Storage today: files land in public/mission-images/<missionId>/... and are
// served by Next at /mission-images/<missionId>/<filename>. When Supabase
// Storage comes online, swap saveMissionImage() in storage.ts \u2014 the URL
// shape stays the same from the editor's point of view.

import { NextRequest, NextResponse } from "next/server";
import { saveMissionImage } from "@/lib/author/storage";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const missionId = form.get("missionId");
  const file = form.get("file");

  if (typeof missionId !== "string" || !missionId) {
    return NextResponse.json({ error: "missionId is required" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type}` },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (${file.size} bytes, max ${MAX_BYTES})` },
      { status: 400 }
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  try {
    const { url } = await saveMissionImage(missionId, file.name || "upload", bytes);
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
