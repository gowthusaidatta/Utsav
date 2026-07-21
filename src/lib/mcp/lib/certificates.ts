import { createHmac, randomBytes } from "node:crypto";

function certSecret(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_URL ?? "utsav-cert";
}

export function newCertificateCode(): string {
  // UTV-XXXXXXXX (base32-ish, unambiguous chars)
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const raw = randomBytes(10);
  let out = "";
  for (const byte of raw) out += alphabet[byte % alphabet.length];
  return `UTV-${out.substring(0, 4)}-${out.substring(4, 10)}`;
}

export function signCertificate(code: string): string {
  return createHmac("sha256", certSecret()).update(code).digest("hex");
}

export function verifySignature(code: string, hash: string): boolean {
  const expected = signCertificate(code);
  if (expected.length !== hash.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ hash.charCodeAt(i);
  return diff === 0;
}

export type CertificateInput = {
  recipientName: string;
  eventTitle: string;
  eventDate?: string;
  role?: string;
  code: string;
  verifyUrl: string;
  template?: "default" | "participation" | "winner";
};

export async function generateCertificatePdf(input: CertificateInput): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]); // A4 landscape
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvB = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const indigo = rgb(0.31, 0.27, 0.9); // #4F46E5-ish
  const orange = rgb(0.98, 0.45, 0.09); // #F97316
  const ink = rgb(0.11, 0.13, 0.19);
  const muted = rgb(0.45, 0.48, 0.55);

  // Border
  page.drawRectangle({ x: 20, y: 20, width: 802, height: 555, borderColor: indigo, borderWidth: 2 });
  page.drawRectangle({ x: 28, y: 28, width: 786, height: 539, borderColor: orange, borderWidth: 0.5 });

  // Wordmark
  page.drawText("UTSAV", { x: 60, y: 530, size: 20, font: helvB, color: indigo });
  page.drawText("Enterprise Event Platform", { x: 60, y: 512, size: 9, font: helv, color: muted });

  // Title
  const title = input.template === "winner" ? "Certificate of Achievement" : "Certificate of Participation";
  const titleW = helvB.widthOfTextAtSize(title, 32);
  page.drawText(title, { x: (842 - titleW) / 2, y: 430, size: 32, font: helvB, color: ink });

  // Recipient
  page.drawText("This is proudly presented to", { x: 0, y: 390, size: 12, font: italic, color: muted, maxWidth: 842 });
  const nameW = helvB.widthOfTextAtSize(input.recipientName, 34);
  page.drawText(input.recipientName, { x: (842 - nameW) / 2, y: 340, size: 34, font: helvB, color: indigo });
  page.drawLine({ start: { x: 250, y: 330 }, end: { x: 592, y: 330 }, thickness: 0.5, color: muted });

  // Body
  const body1 = input.template === "winner"
    ? `for outstanding achievement at`
    : `for successfully participating in`;
  const w1 = helv.widthOfTextAtSize(body1, 14);
  page.drawText(body1, { x: (842 - w1) / 2, y: 295, size: 14, font: helv, color: ink });

  const eventW = helvB.widthOfTextAtSize(input.eventTitle, 20);
  page.drawText(input.eventTitle, { x: (842 - eventW) / 2, y: 265, size: 20, font: helvB, color: ink });

  if (input.eventDate) {
    const dW = helv.widthOfTextAtSize(input.eventDate, 12);
    page.drawText(input.eventDate, { x: (842 - dW) / 2, y: 240, size: 12, font: helv, color: muted });
  }
  if (input.role) {
    const rW = italic.widthOfTextAtSize(`Role: ${input.role}`, 11);
    page.drawText(`Role: ${input.role}`, { x: (842 - rW) / 2, y: 222, size: 11, font: italic, color: muted });
  }

  // QR code
  const qrDataUrl = await QRCode.toDataURL(input.verifyUrl, { margin: 0, width: 160 });
  const qrPng = await pdf.embedPng(qrDataUrl);
  page.drawImage(qrPng, { x: 60, y: 60, width: 90, height: 90 });
  page.drawText("Scan to verify", { x: 60, y: 46, size: 8, font: helv, color: muted });
  page.drawText(input.code, { x: 60, y: 34, size: 8, font: helvB, color: ink });

  // Signature line
  page.drawLine({ start: { x: 620, y: 90 }, end: { x: 780, y: 90 }, thickness: 0.6, color: muted });
  page.drawText("Utsav Organizer", { x: 640, y: 74, size: 10, font: helvB, color: ink });
  page.drawText("Authorized signatory", { x: 640, y: 60, size: 8, font: helv, color: muted });

  // Footer
  page.drawText(`Verify at ${input.verifyUrl}`, { x: 60, y: 20, size: 7, font: helv, color: muted });

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}

/** Basic {{var}} substitution for template bodies. */
export function fillTemplate(tpl: string, vars: Record<string, unknown>): string {
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k: string) => {
    const parts = k.split(".");
    let cur: unknown = vars;
    for (const p of parts) {
      if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[p];
      } else { return ""; }
    }
    return cur == null ? "" : String(cur);
  });
}
