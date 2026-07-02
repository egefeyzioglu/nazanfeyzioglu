"use client";

import { useRef, useState } from "react";

import { useUploadThing } from "src/lib/uploadthing";
import { inputCls, labelCls } from "./ui";

export type ImageValue = { image: string; width: number; height: number };

/** Loads an image URL (remote or same-origin path) to read its intrinsic size. */
function readDimensions(src: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () =>
      resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => reject(new Error(`Could not load image: ${src}`));
    img.src = src;
  });
}

/**
 * Artwork image picker: upload a file through UploadThing, or type a path to
 * an image already in /public. Either way the intrinsic dimensions are
 * detected and stored so the site can render without layout shift.
 */
export default function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ImageValue | null;
  onChange: (value: ImageValue) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [manualPath, setManualPath] = useState("");

  const { startUpload, isUploading } = useUploadThing("artworkImage", {
    onClientUploadComplete: (res) => {
      const url = res[0]?.serverData?.url ?? res[0]?.ufsUrl;
      if (url) void applyImage(url);
    },
    onUploadError: (e) => setError(e.message),
  });

  async function applyImage(src: string) {
    setError(null);
    setDetecting(true);
    try {
      const { w, h } = await readDimensions(src);
      onChange({ image: src, width: w, height: h });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read image size");
    } finally {
      setDetecting(false);
    }
  }

  const busy = isUploading || detecting;

  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="flex items-start gap-4">
        <div className="w-[110px] flex-none border border-line bg-panel">
          {value?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value.image}
              alt=""
              className="block h-auto w-full"
            />
          ) : (
            <div className="grid h-[80px] place-items-center font-mono text-[10px] text-ash">
              No image
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void startUpload([file]);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="border border-line px-3 py-2 font-mono text-[11px] tracking-[0.1em] text-stone uppercase hover:border-clay hover:text-clay disabled:opacity-40"
            >
              {isUploading ? "Uploading…" : "Upload image"}
            </button>
            <span className="font-mono text-[10px] text-ash">or path:</span>
            <input
              className={`${inputCls} max-w-[240px] flex-1`}
              placeholder="/design-assets/….jpg"
              value={manualPath}
              onChange={(e) => setManualPath(e.target.value)}
              onBlur={() => {
                if (manualPath.trim()) void applyImage(manualPath.trim());
              }}
            />
          </div>
          {value?.image && (
            <div className="mt-2 truncate font-mono text-[10px] text-ash">
              {value.image} · {value.width} × {value.height}px
            </div>
          )}
          {detecting && (
            <div className="mt-2 font-mono text-[10px] text-ash">
              Reading image size…
            </div>
          )}
          {error && (
            <div className="mt-2 font-mono text-[10px] text-red-700">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
