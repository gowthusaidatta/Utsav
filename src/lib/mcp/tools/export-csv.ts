import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, invalidInput, recordAudit, ok } from "../lib/supabase";
import { toCsv, loadExportResource } from "../lib/exports";

const RESOURCES = ["users","organizations","events","registrations","attendance","teams","certificates","analytics"] as const;

export default defineTool({
  name: "export_csv",
  title: "Export CSV",
  description: "Export a dataset (users, organizations, events, registrations, attendance, teams, certificates, analytics) as CSV. Returns inline text and a base64 payload; rows filtered by RLS.",
  inputSchema: {
    resource: z.enum(RESOURCES),
    event_id: z.string().uuid().optional(),
    organization_id: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(10000).default(5000),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const actor = ctx.getUserId();
    const supabase = supabaseForUser(ctx);
    try {
      const { rows, columns, name } = await loadExportResource(supabase, input.resource, {
        eventId: input.event_id, organizationId: input.organization_id, limit: input.limit,
      });
      const csv = toCsv(rows, columns);
      const filename = `utsav-${input.resource}-${Date.now()}.csv`;
      await recordAudit(supabase, actor, "export.csv", input.resource, input.event_id ?? input.organization_id, { rows: rows.length });
      return ok({
        resource: input.resource,
        name,
        row_count: rows.length,
        filename,
        mime_type: "text/csv",
        csv,
        base64: Buffer.from(csv, "utf8").toString("base64"),
      });
    } catch (e) {
      return invalidInput((e as Error).message);
    }
  },
});
