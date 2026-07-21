import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";

interface Props {
  token: string;
  title?: string;
  subtitle?: string;
  size?: number;
}

export function RegistrationQR({ token, title, subtitle, size = 240 }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(token, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: size * 2,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token, size]);

  function download() {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `utsav-pass-${token.slice(0, 8)}.png`;
    a.click();
  }

  function print() {
    if (!dataUrl) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>Utsav pass</title>
      <style>body{font-family:system-ui;text-align:center;padding:40px}img{width:340px;height:340px}h1{margin:12px 0 4px}p{color:#64748b}</style>
      </head><body>
      <h1>${title ?? "Utsav Pass"}</h1>
      <p>${subtitle ?? ""}</p>
      <img src="${dataUrl}" alt="Registration QR" />
      <p style="margin-top:16px;font-size:12px">Present this QR at the event check-in desk</p>
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 200);
  }

  return (
    <div className="inline-flex flex-col items-center gap-3 rounded-lg border bg-card p-4">
      {dataUrl ? (
        <img src={dataUrl} alt="Registration QR" style={{ width: size, height: size }} />
      ) : (
        <div style={{ width: size, height: size }} className="animate-pulse rounded bg-muted" />
      )}
      {(title || subtitle) && (
        <div className="text-center">
          {title && <div className="text-sm font-semibold">{title}</div>}
          {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
        </div>
      )}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={download} disabled={!dataUrl}>
          <Download className="mr-2 h-4 w-4" /> Download
        </Button>
        <Button size="sm" variant="outline" onClick={print} disabled={!dataUrl}>
          <Printer className="mr-2 h-4 w-4" /> Print
        </Button>
      </div>
    </div>
  );
}
