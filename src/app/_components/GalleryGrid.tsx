"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import type { GalleryPiece } from "src/app/_data/galleryPieces";

type Props = {
  pieces: GalleryPiece[];
};

export default function GalleryGrid({ pieces }: Props) {
  const [selected, setSelected] = useState<GalleryPiece | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (selected && !dialog.open) dialog.showModal();
    if (!selected && dialog.open) dialog.close();
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [selected]);

  const close = () => setSelected(null);

  return (
    <>
      <div className="grid grid-cols-12 gap-[clamp(18px,2.4vw,34px)]">
        {pieces.map((piece, i) => (
          <button
            key={piece.src}
            type="button"
            onClick={() => setSelected(piece)}
            className={`group col-span-12 cursor-pointer text-left ${piece.span} ${
              piece.pushdown ? "md:mt-[clamp(40px,8vh,110px)]" : ""
            }`}
          >
            <div
              className={`relative w-full overflow-hidden bg-warm-bg-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_24px_60px_-28px_rgba(0,0,0,0.7)] ${piece.aspect}`}
            >
              <Image
                src={piece.src}
                alt={piece.title}
                fill
                sizes="(max-width: 880px) 100vw, (max-width: 1280px) 50vw, 40vw"
                className="object-contain transition-transform duration-[1400ms] ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:scale-[1.03]"
                priority={i < 2}
              />
            </div>
            <div className="mt-3.5 flex items-baseline justify-between gap-4">
              <span className="font-display text-lg italic">{piece.title}</span>
              <span className="text-xs tracking-[0.08em] text-warm-text-faint">
                {piece.year}
              </span>
            </div>
            <div className="mt-1 translate-y-1 text-xs text-warm-text-dim opacity-0 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:translate-y-0 group-hover:opacity-100">
              {piece.medium} · {piece.size}
            </div>
          </button>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        onClose={close}
        className="m-0 h-screen max-h-none w-screen max-w-none bg-warm-bg p-0 text-warm-text"
      >
        {selected && <PieceDetail piece={selected} onClose={close} />}
      </dialog>
    </>
  );
}

function PieceDetail({
  piece,
  onClose,
}: {
  piece: GalleryPiece;
  onClose: () => void;
}) {
  return (
    <div className="relative flex h-screen w-screen flex-col md:flex-row">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute cursor-pointer right-5 top-5 z-10 flex h-10 w-10 items-center justify-center text-warm-text-dim transition-colors hover:text-warm-text"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="h-6 w-6"
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <div className="relative h-[58vh] w-full bg-warm-bg-1 md:h-screen md:flex-1">
        <Image
          src={piece.src}
          alt={piece.title}
          fill
          sizes="(max-width: 768px) 100vw, 70vw"
          className="object-contain p-6 md:p-12"
        />
      </div>
      <aside className="flex w-full shrink-0 flex-col gap-6 overflow-y-auto p-8 md:w-[380px] md:justify-center md:p-12 lg:w-[440px] lg:p-16">
        <header className="space-y-3">
          <h2 className="font-display text-4xl font-light italic leading-tight md:text-5xl">
            {piece.title}
          </h2>
          <p className="text-xs uppercase tracking-[0.2em] text-warm-text-faint">
            {piece.medium} · {piece.year} · {piece.size}
          </p>
        </header>
        <p className="text-sm leading-relaxed text-warm-text-dim md:text-base">
          {piece.blurb}
        </p>
      </aside>
    </div>
  );
}
