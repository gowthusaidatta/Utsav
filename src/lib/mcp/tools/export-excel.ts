import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, invalidInput, internalError, recordAudit, ok, adminClient } from "../lib/supabase";
import { toXlsx, loadExportResource } from "../lib/exports";
import { signedDownloadUrl } from "../lib/media";

const RESOURCES = ["users","organizations","events","registrations","attendance","teams","certificates","analytics"] as const;

export default defineTool({
  name: "export_excel",
  title: "Export Excel (XLSX)",
  description: "Export a dataset to an XLSX workbook. Uploads to the private exports bucket and returns a signed download URL (valid 1 hour).",
  inputSchema: {
    resource: z.enum(RESOURCES),
    event_id: z.string().uuid().optional(),
    organization_id: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(10000).default(5000),
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
      const buf = await toXlsx(rows, name, columns);
      const filename = `utsav-${input.resource}-${Date.now()}.xlsx`;
      const key = `${actor}/${filename}`;
      const admin = await adminClient();
      const up = await admin.storage.from("exports").upload(key, buf, {
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: true,
      });
      if (up.error) return internalError(`Upload failed: ${up.error.message}`);
      const { url } = await signedDownloadUrl(admin, "exports", key, 3600);

      await recordAudit(supabase, actor, "export.excel", input.resource, input.event_id ?? input.organization_id, { rows: rows.length });
      return ok({
        resource: input.resource, name, row_count: rows.length, filename,
        mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        download_url: url, expires_in: 3600, size_bytes: buf.length,
      });
    } catch (e) {
      return invalidInput((e as Error).message);
    }
  },
});
