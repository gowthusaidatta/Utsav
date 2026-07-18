import { defineTool, type ToolDefinition } from "@lovable.dev/mcp-js";
import { unauthenticated, notImplemented } from "../lib/supabase";

function pending(name: string, title: string, description: string, phase: string): ToolDefinition {
  return defineTool({
    name,
    title,
    description: `${description} (Not yet available — ships in ${phase}.)`,
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: async (_i, ctx) => {
      if (!ctx.isAuthenticated()) return unauthenticated();
      return notImplemented(`${name} requires the ${phase} module, which is not yet deployed. This tool is registered so clients can discover the roadmap; it becomes functional once ${phase} ships.`);
    },
  });
}

// Phase 4: Media Management (Supabase Storage buckets not yet provisioned)
export const uploadImage = pending("upload_image", "Upload image", "Upload an image (event cover, org logo, avatar).", "Phase 4 (Media Management)");
export const uploadVideo = pending("upload_video", "Upload video", "Upload a video asset.", "Phase 4 (Media Management)");
export const uploadDocument = pending("upload_document", "Upload document", "Upload a document (rules, brochure, etc.).", "Phase 4 (Media Management)");
export const deleteMedia = pending("delete_media", "Delete media", "Delete a media asset by id.", "Phase 4 (Media Management)");
export const listMedia = pending("list_media", "List media", "List media assets for an event or organization.", "Phase 4 (Media Management)");

// Phase 6: Reports (server-side PDF/Excel generation not yet wired)
export const exportExcel = pending("export_excel", "Export Excel", "Export registrations/attendance to XLSX.", "Phase 6 (Reports)");
export const exportCsv = pending("export_csv", "Export CSV", "Export registrations/attendance to CSV.", "Phase 6 (Reports)");
export const exportPdf = pending("export_pdf", "Export PDF report", "Generate a PDF summary report.", "Phase 6 (Reports)");

// Phase 7: Certificates & Notifications
export const generateCertificate = pending("generate_certificate", "Generate certificate", "Issue a certificate for a checked-in attendee.", "Phase 7 (Certificates)");
export const verifyCertificate = pending("verify_certificate", "Verify certificate", "Verify a certificate by its public code.", "Phase 7 (Certificates)");
export const downloadCertificate = pending("download_certificate", "Download certificate", "Fetch a signed certificate download URL.", "Phase 7 (Certificates)");
export const sendNotification = pending("send_notification", "Send notification", "Send an immediate notification.", "Phase 7 (Notifications)");
export const scheduleNotification = pending("schedule_notification", "Schedule notification", "Schedule a notification for later delivery.", "Phase 7 (Notifications)");
export const notificationHistory = pending("notification_history", "Notification history", "List notifications sent/scheduled.", "Phase 7 (Notifications)");
