"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, type DragEvent } from "react";

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 10v1a7 7 0 01-14 0v-1M12 18v3M8 21h8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 5v14M5 12l7-7 7 7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function UploadDropzone() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const upload = useCallback(
    async (file: File) => {
      setBusy(true);
      setError(null);
      const form = new FormData();
      form.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const raw = await res.text();
        let data: { id?: string; error?: string };
        try {
          data = JSON.parse(raw) as { id?: string; error?: string };
        } catch {
          throw new Error(
            !res.ok
              ? raw.slice(0, 200) || `Upload failed (${res.status})`
              : "Invalid server response",
          );
        }
        if (!res.ok) {
          throw new Error(data.error ?? `Upload failed (${res.status})`);
        }
        if (data.id) {
          router.push(`/calls/${data.id}`);
          router.refresh();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setBusy(false);
      }
    },
    [router],
  );

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (
        f &&
        (f.type.startsWith("audio/") || /\.(mp3|wav|m4a|webm|ogg)$/i.test(f.name))
      ) {
        void upload(f);
      }
    },
    [upload],
  );

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDrop={onDrop}
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br from-accent/[0.12] via-surface-muted/40 to-surface-muted/20 p-px shadow-xl shadow-black/25 transition ${
        dragOver ? "border-accent/60 ring-2 ring-accent/30" : "border-white/[0.08]"
      }`}
    >
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
      <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-positive/5 blur-3xl" />
      <div className="relative rounded-[15px] bg-surface/80 px-6 py-10 sm:px-10 sm:py-12">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/20 text-accent ring-1 ring-accent/30">
            {busy ? (
              <span className="h-7 w-7 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
            ) : (
              <MicIcon className="h-7 w-7" />
            )}
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">
            Import audio
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
            {busy ? "Processing your call…" : "Drop a file or browse"}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            Transcription, scoring, sentiment, discovery coverage, and follow-ups run automatically after
            upload.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {["MP3", "WAV", "WebM", "M4A"].map((fmt) => (
              <span
                key={fmt}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-ink-muted"
              >
                {fmt}
              </span>
            ))}
          </div>
          <input
            type="file"
            accept="audio/*,.mp3,.wav,.webm,.m4a"
            className="sr-only"
            id="audio-upload"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = "";
            }}
          />
          <label
            htmlFor="audio-upload"
            className={`mt-8 inline-flex cursor-pointer items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition ${
              busy
                ? "pointer-events-none cursor-wait bg-white/5 text-ink-muted"
                : "bg-accent text-white shadow-lg shadow-accent/25 hover:bg-accent/90 hover:shadow-accent/35"
            }`}
          >
            {!busy && <ArrowUpIcon className="h-4 w-4 opacity-90" />}
            {busy ? "Please wait…" : "Choose audio file"}
          </label>
          <p className="mt-4 text-xs text-ink-muted/80">You can also drag and drop onto this card.</p>
        </div>
        {error ? (
          <p className="mt-6 text-center text-sm text-negative" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
