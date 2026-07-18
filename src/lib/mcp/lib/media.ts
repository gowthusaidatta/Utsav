import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
export const MAX_DOC_BYTES = 25 * 1024 * 1024;

export const IMAGE_MIME = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml", "image/avif",
]);
export const VIDEO_MIME = new Set([
  "video/mp4", "video/webm", "video/quicktime", "video/x-matroska",
]);
export const DOC_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain", "text/csv", "text/markdown",
]);

export function decodeBase64(data: string): Buffer {
  const cleaned = data.replace(/^data:[^;]+;base64,/, "");
  return Buffer.from(cleaned, "base64");
}

export function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

/** Basic magic-byte sniff — catches the common bait-and-switch. */
export function detectMagicMime(buf: Buffer): string | null {
  if (buf.length < 4) return null;
  const b = buf;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "image/gif";
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "application/pdf";
  if (b[0] === 0x50 && b[1] === 0x4b) return "application/zip"; // docx/xlsx/pptx wrap
  if (b.length > 11 && b.slice(4, 8).toString() === "ftyp") return "video/mp4";
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return "video/webm";
  if (b.slice(0, 4).toString() === "RIFF" && b.slice(8, 12).toString() === "WEBP") return "image/webp";
  return null;
}

/**
 * Virus/malware scanning hook. In production this can call ClamAV, VirusTotal,
 * or a dedicated scanning service. For now it heuristically flags executable
 * signatures and always returns a status the caller can act on.
 */
export function scanBuffer(buf: Buffer): "clean" | "infected" | "skipped" {
  if (buf.length === 0) return "skipped";
  const b = buf.slice(0, 4);
  // Windows PE, ELF, Mach-O, shell scripts
  if (b[0] === 0x4d && b[1] === 0x5a) return "infected";
  if (b[0] === 0x7f && b[1] === 0x45 && b[2] === 0x4c && b[3] === 0x46) return "infected";
  if ((b[0] === 0xcf && b[1] === 0xfa) || (b[0] === 0xfe && b[1] === 0xed)) return "infected";
  const head = buf.slice(0, 32).toString("utf8");
  if (head.startsWith("#!/")) return "infected";
  return "clean";
}

export type UploadArgs = {
  supabase: SupabaseClient;
  actorId: string;
  bucket: string;
  key: string;
  buffer: Buffer;
  contentType: string;
};

export async function uploadToBucket({ supabase, bucket, key, buffer, contentType }: UploadArgs) {
  return supabase.storage.from(bucket).upload(key, buffer, {
    contentType,
    upsert: false,
  });
}

export async function signedDownloadUrl(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  expiresIn = 3600,
) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) return { url: null as string | null, error };
  return { url: data.signedUrl, error: null };
}

export function extForMime(mime: string, fallback = "bin"): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
    "image/svg+xml": "svg", "image/avif": "avif",
    "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "text/plain": "txt", "text/csv": "csv", "text/markdown": "md",
  };
  return map[mime] ?? fallback;
}
