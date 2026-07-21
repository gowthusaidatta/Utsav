import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  eventId: string;
  value: string;
  onChange: (url: string) => void;
}

const MAX_MB = 5;
const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export function EventCoverUpload({ eventId, value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  async function upload(file: File) {
    if (!ACCEPT.includes(file.type)) {
      toast.error("Use a JPG, PNG, WebP, or AVIF image");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`Image must be under ${MAX_MB} MB`);
      return;
    }
    setBusy(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Not signed in");
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const safe = `${Date.now()}.${ext.replace(/[^a-z0-9]/gi, "").slice(0, 5)}`;
      const path = `${uid}/${eventId}/${safe}`;
      const { error } = await supabase.storage
        .from("event-covers")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      onChange(`/api/public/event-covers/${path}`);
      toast.success("Cover uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  const isProxy = value.startsWith("/api/public/event-covers/");

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative overflow-hidden rounded-lg border bg-muted">
          <img src={value} alt="Cover" className="aspect-[16/7] w-full object-cover" />
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="absolute right-2 top-2"
            onClick={() => onChange("")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files?.[0];
            if (f) upload(f);
          }}
          className={`flex aspect-[16/7] w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-sm text-muted-foreground transition-colors ${
            drag ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          {busy ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <>
              <Upload className="h-6 w-6" />
              <div>Drag &amp; drop or click to upload</div>
              <div className="text-xs">JPG, PNG, WebP · max {MAX_MB} MB</div>
            </>
          )}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT.join(",")}
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {value ? "Replace" : "Upload cover"}
        </Button>
        {!isProxy && value && (
          <span className="truncate text-xs text-muted-foreground">External URL</span>
        )}
      </div>
    </div>
  );
}
