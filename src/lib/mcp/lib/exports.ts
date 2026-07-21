// pdf-lib and exceljs are dynamically imported inside the functions that use them
// to keep them out of the shared SSR router chunk (they break at module init on
// Cloudflare Workers).

export type Row = Record<string, unknown>;

export function toCsv(rows: Row[], columns?: string[]): string {
  if (rows.length === 0) return (columns ?? []).join(",") + "\n";
  const cols = columns ?? Array.from(
    rows.reduce<Set<string>>((s, r) => { Object.keys(r).forEach((k) => s.add(k)); return s; }, new Set()),
  );
  const esc = (v: unknown) => {
    if (v == null) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [cols.join(",")];
  for (const r of rows) lines.push(cols.map((c) => esc(r[c])).join(","));
  return lines.join("\n") + "\n";
}

export async function toXlsx(rows: Row[], sheetName: string, columns?: string[]): Promise<Buffer> {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName.substring(0, 31) || "Sheet1");
  const cols = columns ?? (rows[0] ? Object.keys(rows[0]) : []);
  ws.columns = cols.map((c) => ({ header: c, key: c, width: Math.min(Math.max(c.length + 2, 12), 40) }));
  ws.getRow(1).font = { bold: true };
  for (const r of rows) {
    const clean: Row = {};
    for (const c of cols) {
      const v = r[c];
      clean[c] = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : v;
    }
    ws.addRow(clean);
  }
  const arr = await wb.xlsx.writeBuffer();
  return Buffer.from(arr);
}

export async function toPdfReport(title: string, subtitle: string, rows: Row[], columns?: string[]): Promise<Buffer> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const cols = columns ?? (rows[0] ? Object.keys(rows[0]) : []);
  const pageW = 792, pageH = 612; // Letter landscape
  const margin = 36;

  let page = pdf.addPage([pageW, pageH]);
  let y = pageH - margin;

  const drawHeader = () => {
    page.drawText(title, { x: margin, y, size: 18, font: bold, color: rgb(0.13, 0.13, 0.15) });
    y -= 22;
    if (subtitle) {
      page.drawText(subtitle, { x: margin, y, size: 10, font, color: rgb(0.35, 0.35, 0.4) });
      y -= 16;
    }
    page.drawText(`Generated ${new Date().toISOString()}`, { x: margin, y, size: 8, font, color: rgb(0.5, 0.5, 0.55) });
    y -= 20;
  };
  drawHeader();

  const colW = (pageW - margin * 2) / Math.max(cols.length, 1);
  // Column headers
  const drawColHeaders = () => {
    page.drawRectangle({ x: margin, y: y - 4, width: pageW - margin * 2, height: 18, color: rgb(0.95, 0.96, 1) });
    cols.forEach((c, i) => {
      page.drawText(String(c).substring(0, Math.max(1, Math.floor(colW / 5))), {
        x: margin + i * colW + 4, y: y + 2, size: 9, font: bold, color: rgb(0.2, 0.2, 0.25),
      });
    });
    y -= 20;
  };
  drawColHeaders();

  const rowHeight = 14;
  for (const r of rows) {
    if (y < margin + rowHeight) {
      page = pdf.addPage([pageW, pageH]);
      y = pageH - margin;
      drawHeader();
      drawColHeaders();
    }
    cols.forEach((c, i) => {
      const v = r[c];
      const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
      page.drawText(s.substring(0, Math.max(1, Math.floor(colW / 5))), {
        x: margin + i * colW + 4, y, size: 8, font, color: rgb(0.15, 0.15, 0.2),
      });
    });
    y -= rowHeight;
  }

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}

/** Load the requested resource. Returns { rows, columns, name } or throws with a friendly message. */
export async function loadExportResource(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  resource: string,
  filter: { eventId?: string; organizationId?: string; limit?: number } = {},
): Promise<{ rows: Row[]; columns: string[]; name: string }> {
  const lim = Math.min(Math.max(filter.limit ?? 5000, 1), 10000);
  const cap = (n: string) => n.charAt(0).toUpperCase() + n.slice(1);
  switch (resource) {
    case "users": {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, created_at")
        .order("created_at", { ascending: false })
        .limit(lim);
      if (error) throw new Error(error.message);
      return { rows: data ?? [], columns: ["id", "email", "full_name", "created_at"], name: "Users" };
    }
    case "organizations": {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, slug, description, created_at")
        .order("created_at", { ascending: false })
        .limit(lim);
      if (error) throw new Error(error.message);
      return { rows: data ?? [], columns: ["id", "name", "slug", "description", "created_at"], name: "Organizations" };
    }
    case "events": {
      let q = supabase
        .from("events")
        .select("id, slug, title, status, start_at, end_at, organization_id, created_at")
        .order("start_at", { ascending: false })
        .limit(lim);
      if (filter.organizationId) q = q.eq("organization_id", filter.organizationId);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return { rows: data ?? [], columns: ["id", "slug", "title", "status", "start_at", "end_at", "organization_id"], name: "Events" };
    }
    case "registrations": {
      let q = supabase
        .from("registrations")
        .select("id, event_id, user_id, team_id, status, created_at")
        .order("created_at", { ascending: false })
        .limit(lim);
      if (filter.eventId) q = q.eq("event_id", filter.eventId);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return { rows: data ?? [], columns: ["id", "event_id", "user_id", "team_id", "status", "created_at"], name: "Registrations" };
    }
    case "attendance": {
      let q = supabase
        .from("registrations")
        .select("id, event_id, user_id, status, checked_in_at, checked_out_at")
        .not("checked_in_at", "is", null)
        .order("checked_in_at", { ascending: false })
        .limit(lim);
      if (filter.eventId) q = q.eq("event_id", filter.eventId);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return { rows: data ?? [], columns: ["id", "event_id", "user_id", "status", "checked_in_at", "checked_out_at"], name: "Attendance" };
    }
    case "teams": {
      let q = supabase
        .from("teams")
        .select("id, event_id, name, leader_user_id, created_at")
        .order("created_at", { ascending: false })
        .limit(lim);
      if (filter.eventId) q = q.eq("event_id", filter.eventId);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return { rows: data ?? [], columns: ["id", "event_id", "name", "leader_user_id", "created_at"], name: "Teams" };
    }
    case "certificates": {
      let q = supabase
        .from("certificates")
        .select("id, event_id, user_id, code, template_key, issued_at, revoked_at")
        .order("issued_at", { ascending: false })
        .limit(lim);
      if (filter.eventId) q = q.eq("event_id", filter.eventId);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return { rows: data ?? [], columns: ["id", "event_id", "user_id", "code", "template_key", "issued_at", "revoked_at"], name: "Certificates" };
    }
    case "analytics": {
      if (!filter.eventId) throw new Error("analytics export requires event_id");
      const [reg, att] = await Promise.all([
        supabase.from("registrations").select("status", { count: "exact" }).eq("event_id", filter.eventId),
        supabase.from("registrations").select("id", { count: "exact" }).eq("event_id", filter.eventId).not("checked_in_at", "is", null),
      ]);
      const total = reg.count ?? 0;
      const attended = att.count ?? 0;
      const byStatus: Record<string, number> = {};
      for (const r of reg.data ?? []) {
        const s = String((r as { status: string }).status);
        byStatus[s] = (byStatus[s] ?? 0) + 1;
      }
      const rows: Row[] = [
        { metric: "total_registrations", value: total },
        { metric: "checked_in", value: attended },
        { metric: "attendance_rate", value: total ? Math.round((attended / total) * 10000) / 100 : 0 },
        ...Object.entries(byStatus).map(([k, v]) => ({ metric: `status_${k}`, value: v })),
      ];
      return { rows, columns: ["metric", "value"], name: "Analytics" };
    }
    default:
      throw new Error(`Unsupported resource: ${resource}. Use users|organizations|events|registrations|attendance|teams|certificates|analytics.`);
  }
  return { rows: [], columns: [], name: cap(resource) };
}
