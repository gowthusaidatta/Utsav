import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { scanCheckIn } from "@/lib/attendance.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { ScanLine, CheckCircle2, XCircle, Keyboard } from "lucide-react";
import { toast } from "sonner";
import { ClientOnly } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/scan")({
  head: () => ({ meta: [{ title: "QR Scanner — Utsav" }, { name: "robots", content: "noindex" }] }),
  component: ScanPage,
});

type ScanResult = Awaited<ReturnType<ReturnType<typeof useServerFn<typeof scanCheckIn>>>>;

function ScanPage() {
  const doScan = useServerFn(scanCheckIn);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [manual, setManual] = useState("");
  const [scanning, setScanning] = useState(false);
  const lastTokenRef = useRef<{ token: string; at: number } | null>(null);

  async function submitToken(token: string, method: "qr_camera" | "manual" | "qr_scanner") {
    if (!token) return;
    // Dedupe: same token within 3s ignored
    const now = Date.now();
    if (lastTokenRef.current && lastTokenRef.current.token === token && now - lastTokenRef.current.at < 3000) return;
    lastTokenRef.current = { token, at: now };
    try {
      const res = await doScan({ data: { token, method } });
      setLastResult(res);
      if (res.ok) toast.success("Checked in ✓");
      else if (res.reason === "already_checked_in") toast.warning("Already checked in");
      else toast.error(`Invalid: ${res.reason}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <main className="container mx-auto max-w-3xl px-4 py-6">
      <PageHeader
        icon={<ScanLine className="h-5 w-5" />}
        breadcrumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Scanner" }]}
        title="Attendance scanner"
        subtitle="Scan participant QR codes or enter tokens manually to record attendance."
      />

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Camera</CardTitle>
            <Button size="sm" variant={scanning ? "destructive" : "default"} onClick={() => setScanning((s) => !s)}>
              {scanning ? "Stop" : "Start camera"}
            </Button>
          </CardHeader>
          <CardContent>
            <ClientOnly fallback={<div className="aspect-video rounded bg-muted" />}>
              {scanning ? <QrScanner onDecoded={(t) => submitToken(t, "qr_camera")} /> : (
                <div className="flex aspect-video items-center justify-center rounded border-2 border-dashed text-sm text-muted-foreground">
                  Camera stopped
                </div>
              )}
            </ClientOnly>
            <p className="mt-2 text-xs text-muted-foreground">
              Works with device camera, external webcams, and connected USB QR readers (they emit keystrokes — use manual field).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Keyboard className="h-4 w-4" /> Manual / USB scanner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitToken(manual.trim(), "manual");
                setManual("");
              }}
              className="space-y-2"
            >
              <Label htmlFor="tok">Token or scanned code</Label>
              <Input
                id="tok"
                autoFocus
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="Paste or scan here"
              />
              <Button type="submit" size="sm">Verify & check in</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <ResultCard result={lastResult} />
      </div>
    </main>
  );
}

function ResultCard({ result }: { result: ScanResult | null }) {
  if (!result) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Awaiting scan…
        </CardContent>
      </Card>
    );
  }
  const p = result.profile as { full_name?: string | null; email?: string | null; college?: string | null; department?: string | null; avatar_url?: string | null } | null;
  const ok = result.ok;
  return (
    <Card className={ok ? "border-emerald-500/40" : "border-destructive/40"}>
      <CardContent className="flex items-center gap-4 py-6">
        <div className={`flex h-14 w-14 items-center justify-center rounded-full ${ok ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"}`}>
          {ok ? <CheckCircle2 className="h-8 w-8" /> : <XCircle className="h-8 w-8" />}
        </div>
        <div className="flex-1">
          <div className="text-lg font-semibold">
            {ok ? "Checked in" : result.reason === "already_checked_in" ? "Already checked in" : `Rejected: ${result.reason}`}
          </div>
          {p && (
            <div className="mt-1 text-sm">
              <div className="font-medium">{p.full_name ?? "Unknown"}</div>
              <div className="text-muted-foreground">
                {p.email}
                {p.college ? ` · ${p.college}` : ""}
                {p.department ? ` · ${p.department}` : ""}
              </div>
            </div>
          )}
          {result.event_title && <Badge variant="outline" className="mt-2">{result.event_title}</Badge>}
          {"checked_in_at" in result && result.checked_in_at && (
            <div className="mt-1 text-xs text-muted-foreground">At {new Date(result.checked_in_at).toLocaleString()}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function QrScanner({ onDecoded }: { onDecoded: (token: string) => void }) {
  const elId = "utsav-qr-reader";
  useEffect(() => {
    let scanner: { stop: () => Promise<void>; clear: () => void } | null = null;
    let cancelled = false;
    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;
      const inst = new Html5Qrcode(elId);
      scanner = inst as unknown as { stop: () => Promise<void>; clear: () => void };
      try {
        await inst.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded) => onDecoded(decoded),
          () => {},
        );
      } catch (e) {
        toast.error("Camera unavailable: " + (e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
      if (scanner) {
        scanner.stop().catch(() => {}).finally(() => scanner?.clear());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div id={elId} className="aspect-video overflow-hidden rounded bg-black" />;
}
