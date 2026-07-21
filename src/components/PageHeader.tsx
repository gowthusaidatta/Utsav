import { useRouter, useLocation, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

/**
 * Resolve a sensible fallback route for a given pathname.
 * Ordered from most-specific to most-generic.
 */
function resolveFallback(pathname: string): string {
  const rules: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
    [/^\/events\/new\/?$/, () => "/events"],
    [/^\/events\/([^/]+)\/manage\/?$/, () => "/events"],
    [/^\/events\/([^/]+)\/registrations\/?$/, (m) => `/events/${m[1]}/manage`],
    [/^\/events\/([^/]+)\/register\/?$/, (m) => `/events/${m[1]}`],
    [/^\/events\/[^/]+\/?$/, () => "/events"],
    [/^\/admin\/organizations\/[^/]+\/?$/, () => "/admin/organizations"],
    [/^\/admin\/users\/[^/]+\/?$/, () => "/admin/users"],
    [/^\/admin\/[^/]+\/?$/, () => "/dashboard"],
    [/^\/my-events\/?$/, () => "/dashboard"],
    [/^\/my-registrations\/?$/, () => "/dashboard"],
    [/^\/delegations\/?$/, () => "/dashboard"],
    [/^\/profile\/.+/, () => "/profile"],
    [/^\/profile\/?$/, () => "/dashboard"],
    [/^\/dashboard\/.+/, () => "/dashboard"],
  ];
  for (const [re, to] of rules) {
    const m = pathname.match(re);
    if (m) return to(m);
  }
  return "/dashboard";
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Override the default fallback route for direct visits. */
  fallback?: string;
  /** Hide the back button (rare — e.g. top-level dashboard). */
  hideBack?: boolean;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  fallback,
  hideBack,
  className,
}: PageHeaderProps) {
  const router = useRouter();
  const navigate = useNavigate();
  const pathname = useLocation({ select: (s) => s.pathname });

  function handleBack() {
    const canGoBack =
      typeof window !== "undefined" &&
      window.history.length > 1 &&
      // TanStack router tracks internal history index; use it when available
      (router.history.length ?? 0) > 1;

    if (canGoBack) {
      router.history.back();
      return;
    }
    const to = fallback ?? resolveFallback(pathname);
    navigate({ to, replace: true });
  }

  return (
    <div
      className={
        "mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between " +
        (className ?? "")
      }
    >
      <div className="flex items-start gap-3 min-w-0">
        {!hideBack && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleBack}
            aria-label="Go back"
            className="-ml-2 mt-0.5 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="ml-1 hidden sm:inline">Back</span>
          </Button>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
