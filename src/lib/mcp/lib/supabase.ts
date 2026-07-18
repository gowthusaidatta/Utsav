import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

/**
 * Per-request Supabase client that forwards the caller's OAuth bearer token,
 * so Row-Level Security runs as the signed-in Utsav user.
 */
export function supabaseForUser(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

/** Standard error envelopes — never leak provider internals. */
export function unauthenticated() {
  return errorEnvelope("UNAUTHENTICATED", "Sign in required.");
}
export function forbidden(reason = "You do not have permission for this action.") {
  return errorEnvelope("FORBIDDEN", reason);
}
export function notFound(resource = "Resource") {
  return errorEnvelope("NOT_FOUND", `${resource} not found.`);
}
export function invalidInput(msg: string) {
  return errorEnvelope("INVALID_INPUT", msg);
}
export function conflict(msg: string) {
  return errorEnvelope("CONFLICT", msg);
}
export function internalError(msg = "Something went wrong.") {
  return errorEnvelope("INTERNAL", msg);
}
export function notImplemented(msg: string) {
  return errorEnvelope("NOT_IMPLEMENTED", msg);
}

export function errorEnvelope(code: string, message: string, extra?: Record<string, unknown>) {
  const payload = { error: { code, message, ...(extra ?? {}) } };
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload) }],
    structuredContent: payload,
    isError: true as const,
  };
}

/** Standard success envelope. */
export function ok<T>(data: T) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: data as unknown as Record<string, unknown>,
  };
}

/** Map PostgREST/DB errors to standard codes without leaking internals. */
export function mapDbError(err: { message?: string; code?: string; details?: string } | null | undefined) {
  if (!err) return internalError();
  const c = err.code;
  if (c === "PGRST116" || c === "P0002") return notFound();
  if (c === "23505") return conflict("Resource already exists.");
  if (c === "23503") return invalidInput("Referenced resource does not exist.");
  if (c === "42501" || c === "PGRST301") return forbidden();
  if (c === "23514") return invalidInput("Value violates a constraint.");
  return errorEnvelope("DB_ERROR", "Database request failed.");
}

/** Record an audit log entry as the caller. Best-effort; never throws. */
export async function recordAudit(
  supabase: SupabaseClient,
  actorId: string | undefined,
  action: string,
  resourceType?: string,
  resourceId?: string,
  metadata?: Record<string, unknown>,
) {
  try {
    await supabase.from("audit_logs").insert({
      actor_user_id: actorId ?? null,
      action,
      resource_type: resourceType ?? null,
      resource_id: resourceId ?? null,
      metadata: { ...(metadata ?? {}), source: "mcp" },
    });
  } catch { /* audit is best-effort */ }
}

/** Check a global role via SECURITY DEFINER RPC. */
export async function hasGlobalRole(supabase: SupabaseClient, userId: string | undefined, role: string) {
  if (!userId) return false;
  const { data } = await supabase.rpc("has_global_role", { _uid: userId, _role: role });
  return Boolean(data);
}

/** Check a scoped permission via the app-wide `can()` RPC. */
export async function can(
  supabase: SupabaseClient,
  userId: string | undefined,
  action: string,
  eventId?: string | null,
) {
  if (!userId) return false;
  const { data } = await supabase.rpc("can", { _uid: userId, _action: action, _event: eventId ?? null });
  return Boolean(data);
}

/** Lazy-load the admin client. ONLY use after authorizing the caller server-side. */
export async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
