import { useRouter, useLocation, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Resolve a sensible fallback route for a given pathname when there is no
 * browser history to return to (e.g. deep-link / direct visit).
 */
export function resolveFallback(pathname: string): string {
  const rules: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
    [/^\/events\/new\/?$/, () => "/events"],
    [/^\/events\/([^/]+)\/manage\/?$/, () => "/events"],
    [/^\/events\/([^/]+)\/registrations\/?$/, (m) => `/events/${m[1]}/manage`],
    [/^\/events\/([^/]+)\/register\/?$/, (m) => `/events/${m[1]}`],
    [/^\/events\/[^/]+\/?$/, () => "/events"],
    [/^\/events\/?$/, () => "/"],
    [/^\/admin\/organizations\/[^/]+\/?$/, () => "/admin/organizations"],
    [/^\/admin\/users\/[^/]+\/?$/, () => "/admin/users"],
    [/^\/admin\/.+/, () => "/dashboard"],
    [/^\/my-events\/?$/, () => "/dashboard"],
    [/^\/my-registrations\/?$/, () => "/dashboard"],
    [/^\/delegations\/?$/, () => "/dashboard"],
    [/^\/profile\/.+/, () => "/profile"],
    [/^\/profile\/?$/, () => "/dashboard"],
    [/^\/dashboard\/.+/, () => "/dashboard"],
    [/^\/dashboard\/?$/, () => "/"],
  ];
  for (const [re, to] of rules) {
    const m = pathname.match(re);
    if (m) return to(m);
  }
  return "/";
}

/** Routes that should NOT show a back button. */
const HIDE_ON = [
  /^\/$/,
  /^\/auth\/?$/,
  /^\/reset-password\/?$/,
  /^\/verify\/.+/,
  /^\/dashboard\/?$/,
  /^\/\.well-known\//,
  /^\/\.lovable\//,
];

export function BackBar({ className }: { className?: string }) {
  const router = useRouter();
  const navigate = useNavigate();
  const pathname = useLocation({ select: (s) => s.pathname });

  if (HIDE_ON.some((re) => re.test(pathname))) return null;

  function handleBack() {
    const hasHistory =
      typeof window !== "undefined" && window.history.length > 1;
    if (hasHistory) {
      router.history.back();
      return;
    }
    navigate({ to: resolveFallback(pathname), replace: true });
  }

  return (
    <div
      className={
        "border-b bg-background/60 backdrop-blur-sm " + (className ?? "")
      }
    >
      <div className="container mx-auto flex h-11 items-center px-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleBack}
          aria-label="Go back"
          className="-ml-2 h-8 gap-1 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>
      </div>
    </div>
  );
}

export default BackBar;
