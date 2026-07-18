import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, invalidInput, internalError, recordAudit, ok, adminClient } from "../lib/supabase";
import { toPdfReport, loadExportResource } from "../lib/exports";
import { signedDownloadUrl } from "../lib/media";

const RESOURCES = ["users","organizations","events","registrations","attendance","teams","certificates","analytics"] as const;

export default defineTool({
  name: "export_pdf",
  title: "Export PDF report",
  description: "Generate a tabular PDF report for a dataset. Uploads to the private exports bucket and returns a signed download URL.",
  inputSchema: {
    resource: z.enum(RESOURCES),
    event_id: z.string().uuid().optional(),
    organization_id: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(2000).default(500),
    title: z.string().max(120).optional(),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const actor = ctx.getUserId()!;
    const supabase = supabaseForUser(ctx);
    try {
      const { rows, columns, name } = await loadExportResource(supabase, input.resource, {
        eventId: input.event_id, organizationId: input.organization_id, limit: input.limit,
      });
      const title = input.title ?? `Utsav — ${name}`;
      const subtitle = input.event_id ? `Event ${input.event_id}` : input.organization_id ? `Organization ${input.organization_id}` : "";
      const buf = await toPdfReport(title, subtitle, rows, columns);
      const filename = `utsav-${input.resource}-${Date.now()}.pdf`;
      const key = `${actor}/${filename}`;
      const admin = await adminClient();
      const up = await admin.storage.from("exports").upload(key, buf, { contentType: "application/pdf", upsert: true });
      if (up.error) return internalError(`Upload failed: ${up.error.message}`);
      const { url } = await signedDownloadUrl(admin, "exports", key, 3600);
      await recordAudit(supabase, actor, "export.pdf", input.resource, input.event_id ?? input.organization_id, { rows: rows.length });
      return ok({
        resource: input.resource, name, row_count: rows.length, filename,
        mime_type: "application/pdf",
        download_url: url, expires_in: 3600, size_bytes: buf.length,
      });
    } catch (e) {
      return invalidInput((e as Error).message);
    }
  },
});
