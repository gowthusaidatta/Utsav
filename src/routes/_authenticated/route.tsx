import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({
        to: "/auth",
        search: { mode: "signin", next: location.href },
      });
    }
    return { user: data.user };
  },
  component: () => (
    <div className="min-h-screen bg-background">
      <Header />
      <Outlet />
    </div>
  ),
});
