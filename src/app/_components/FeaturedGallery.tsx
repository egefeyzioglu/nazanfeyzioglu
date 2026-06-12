"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import type { HeroPiece } from "src/app/_data/heroPieces";

type Props = {
  pieces: HeroPiece[];
};

export default function FeaturedGallery({ pieces }: Props) {
  const [selected, setSelected] = useState<HeroPiece | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Translate vertical wheel scrolling into horizontal movement, but only when
  // the row is actually scrollable sideways (i.e. the desktop layout) and the
  // user isn't already scrolling horizontally via a trackpad.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      // deltaY can arrive in lines or pages (common on Linux/Firefox); convert
      // to pixels so each notch moves a meaningful distance.
      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 16;
      else if (e.deltaMode === 2) dy *= el.clientWidth;
      el.scrollLeft += dy;
      e.preventDefault();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

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
      <div
        ref={scrollerRef}
        className="flex flex-col items-center gap-16 px-6 py-16 md:h-screen md:flex-row md:items-start md:gap-[clamp(40px,5vw,96px)] md:overflow-x-auto md:px-[clamp(40px,6vw,96px)] md:pb-0 md:pt-10"
      >
        {pieces.map((piece, i) => (
          <button
            key={piece.src}
            type="button"
            onClick={() => setSelected(piece)}
            className="group flex shrink-0 cursor-pointer flex-col text-left"
          >
            <div className="w-fit overflow-hidden border border-neutral-900/15 bg-white shadow-[0_24px_60px_-32px_rgba(0,0,0,0.45)]">
              <Image
                src={piece.src}
                alt={piece.title}
                width={piece.width}
                height={piece.height}
                sizes="(max-width: 768px) 80vw, 40vw"
                className="block h-auto w-[80vw] max-w-sm object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:scale-[1.02] md:h-[58vh] md:w-auto md:max-w-none"
                priority={i === 0}
              />
            </div>
            <p className="mt-3 font-display text-base italic text-neutral-700 transition-colors group-hover:text-neutral-900">
              {piece.title}
            </p>
          </button>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        onClose={close}
        className="m-0 h-screen max-h-none w-screen max-w-none bg-neutral-50 p-0 text-neutral-900"
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
  piece: HeroPiece;
  onClose: () => void;
}) {
  return (
    <div className="relative flex h-screen w-screen flex-col md:flex-row">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-5 top-5 z-10 flex h-10 w-10 cursor-pointer items-center justify-center text-neutral-400 transition-colors hover:text-neutral-900"
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
      <div className="relative h-[58vh] w-full bg-white md:h-screen md:flex-1">
        <Image
          src={piece.src}
          alt={piece.title}
          fill
          sizes="(max-width: 768px) 100vw, 70vw"
          className="object-contain p-6 md:p-12"
        />
      </div>
      <aside className="flex w-full shrink-0 flex-col gap-6 overflow-y-auto border-t border-neutral-900/10 p-8 md:w-[380px] md:justify-center md:border-l md:border-t-0 md:p-12 lg:w-[440px] lg:p-16">
        <header className="space-y-3">
          <h2 className="font-display text-4xl font-light italic leading-tight md:text-5xl">
            {piece.title}
          </h2>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
            {piece.medium} · {piece.year} · {piece.size}
          </p>
        </header>
        <p className="text-sm leading-relaxed text-neutral-600 md:text-base">
          {piece.blurb}
        </p>
      </aside>
    </div>
  );
}
