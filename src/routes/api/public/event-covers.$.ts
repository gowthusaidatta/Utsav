import { createFileRoute } from "@tanstack/react-router";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/api/public/event-covers/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = (params as { _splat?: string })._splat ?? "";
        if (!path || path.includes("..")) {
          return new Response("Not found", { status: 404 });
        }

        // Path format: {userId}/{eventId}/{filename}
        const segments = path.split("/");
        const eventId = segments[1];
        if (!eventId || !UUID_RE.test(eventId)) {
          return new Response("Not found", { status: 404 });
        }

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        // Only serve covers for events that are actually publicly visible.
        const { data: ev } = await supabaseAdmin
          .from("events")
          .select("id, status, visibility, deleted_at, cover_image_url")
          .eq("id", eventId)
          .maybeSingle();
        if (
          !ev ||
          ev.deleted_at ||
          ev.status !== "published" ||
          ev.visibility !== "public"
        ) {
          return new Response("Not found", { status: 404 });
        }
        // Ensure the requested path matches the event's actual cover, so a
        // stale or guessed path for the same event id can't leak other files.
        if (!ev.cover_image_url || !ev.cover_image_url.endsWith(path)) {
          return new Response("Not found", { status: 404 });
        }

        const { data, error } = await supabaseAdmin.storage
          .from("event-covers")
          .createSignedUrl(path, 60 * 60);
        if (error || !data?.signedUrl) {
          return new Response("Not found", { status: 404 });
        }
        return Response.redirect(data.signedUrl, 302);
      },
    },
  },
});
