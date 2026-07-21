import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/event-covers/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = (params as { _splat?: string })._splat ?? "";
        if (!path || path.includes("..")) {
          return new Response("Not found", { status: 404 });
        }
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
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
