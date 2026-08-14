import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  resolveMediaUrls,
  uploadMedia,
  type MediaAsset,
} from "@/lib/admin/data";
import { adminLabel, ghostButton } from "./AdminPage";

/**
 * Image selector used by the product form. Supports direct upload and picking
 * from the shared media library. Values are stored as storage paths.
 */
export function MediaPicker({
  label,
  multiple = false,
  value,
  onChange,
}: {
  label: string;
  multiple?: boolean;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, string | null>>({});
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [library, setLibrary] = useState<MediaAsset[]>([]);
  const [libraryPreviews, setLibraryPreviews] = useState<Record<string, string | null>>({});

  useEffect(() => {
    let cancelled = false;
    void resolveMediaUrls(value).then((map) => {
      if (!cancelled) setPreviews(map);
    });
    return () => {
      cancelled = true;
    };
  }, [value]);

  useEffect(() => {
    if (!libraryOpen) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("media_assets")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60);
      const assets = (data ?? []) as MediaAsset[];
      if (cancelled) return;
      setLibrary(assets);
      const map = await resolveMediaUrls(assets.map((a) => a.path ?? a.url));
      if (!cancelled) setLibraryPreviews(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [libraryOpen]);

  function add(paths: string[]) {
    onChange(multiple ? Array.from(new Set([...value, ...paths])) : paths.slice(0, 1));
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const asset = await uploadMedia(file);
        uploaded.push(asset.path ?? asset.url);
      }
      add(uploaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <span className={adminLabel}>{label}</span>
      <div className="flex flex-wrap gap-3">
        {value.map((path) => (
          <div
            key={path}
            className="group relative size-24 overflow-hidden rounded-lg border border-border bg-secondary"
          >
            {previews[path] ? (
              <img src={previews[path] as string} alt="" className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center text-[9px] text-muted-foreground">
                …
              </div>
            )}
            <button
              type="button"
              aria-label="Remove image"
              onClick={() => onChange(value.filter((v) => v !== path))}
              className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-background/80 text-muted-foreground transition-colors hover:text-destructive"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="grid size-24 place-items-center rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:border-gold/60 hover:text-gold"
        >
          {busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        hidden
        onChange={(e) => void onFiles(e.target.files)}
      />

      <button type="button" className={`${ghostButton} mt-3`} onClick={() => setLibraryOpen(true)}>
        Choose from library
      </button>

      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}

      {libraryOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5">
          <div className="glass max-h-[80vh] w-full max-w-3xl overflow-auto rounded-2xl border border-gold/20 p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg tracking-tight">Media library</h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setLibraryOpen(false)}
                className="text-muted-foreground hover:text-gold"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-5">
              {library.map((asset) => {
                const path = asset.path ?? asset.url;
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => {
                      add([path]);
                      setLibraryOpen(false);
                    }}
                    className="aspect-square overflow-hidden rounded-lg border border-border transition-colors hover:border-gold/60"
                  >
                    {libraryPreviews[path] ? (
                      <img
                        src={libraryPreviews[path] as string}
                        alt={asset.name}
                        className="size-full object-cover"
                      />
                    ) : null}
                  </button>
                );
              })}
              {library.length === 0 ? (
                <p className="col-span-full text-sm text-muted-foreground">
                  No media yet — upload files from the Media Library module.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}