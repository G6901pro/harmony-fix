import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Loader2, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage, adminField, goldButton } from "@/components/admin/AdminPage";
import {
  deleteMedia,
  formatBytes,
  resolveMediaUrls,
  uploadMedia,
  type MediaAsset,
} from "@/lib/admin/data";

export const Route = createFileRoute("/admin/media")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Media library · Restricted area" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AdminPage
      module="media"
      eyebrow="Assets"
      title="Media library"
      description="Upload and manage every image used across product pages and campaigns."
    >
      <MediaLibrary />
    </AdminPage>
  ),
});

function MediaLibrary() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [previews, setPreviews] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("media_assets")
      .select("*")
      .order("created_at", { ascending: false });
    if (err) setError(err.message);
    const list = (data ?? []) as MediaAsset[];
    setAssets(list);
    setLoading(false);
    setPreviews(await resolveMediaUrls(list.map((a) => a.path ?? a.url)));
  }

  useEffect(() => {
    void load();
  }, []);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(files)) await uploadMedia(file);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(asset: MediaAsset) {
    if (!window.confirm(`Delete “${asset.name}”?`)) return;
    await deleteMedia(asset);
    void load();
  }

  const filtered = assets.filter((a) =>
    a.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          className={adminField}
          placeholder="Search files"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="button"
          className={goldButton}
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-3.5" />}
          Upload files
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => void onFiles(e.target.files)}
      />

      {error ? <p className="mt-4 text-xs text-destructive">{error}</p> : null}

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="size-6 animate-spin text-gold" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">
          No media yet — upload your first product asset.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((asset) => {
            const key = asset.path ?? asset.url;
            return (
              <figure
                key={asset.id}
                className="overflow-hidden rounded-xl border border-border bg-surface"
              >
                <div className="aspect-square bg-secondary">
                  {previews[key] ? (
                    <img
                      src={previews[key] as string}
                      alt={asset.name}
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  ) : null}
                </div>
                <figcaption className="space-y-2 p-4">
                  <p className="truncate text-sm text-foreground">{asset.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(asset.size_bytes)} · {asset.mime_type ?? "file"}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(previews[key] ?? key);
                        setCopied(asset.id);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[9px] tracking-[0.16em] text-muted-foreground uppercase transition-colors hover:border-gold/60 hover:text-gold"
                    >
                      <Copy className="size-3" /> {copied === asset.id ? "Copied" : "Copy link"}
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${asset.name}`}
                      onClick={() => void remove(asset)}
                      className="grid size-8 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </figcaption>
              </figure>
            );
          })}
        </div>
      )}
    </div>
  );
}