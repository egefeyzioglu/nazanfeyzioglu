import Image from "next/image";

import type { HeroPiece } from "src/app/_data/heroPieces";

type Props = {
  piece: HeroPiece;
  priority: boolean;
  showScrollHint: boolean;
};

export default function HeroSection({ piece, priority, showScrollHint }: Props) {
  return (
    <section className="snap-section relative flex h-screen w-full items-center justify-center px-6 pb-16 pt-24 md:px-12 md:pb-12 md:pt-28">
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col items-center gap-6 md:flex-row md:gap-10">
        <div className="relative h-[50vh] w-full md:h-full md:max-h-[75vh] md:flex-1">
          <Image
            src={piece.src}
            alt={piece.title}
            fill
            sizes="(max-width: 768px) 100vw, 65vw"
            className="object-contain object-center"
            priority={priority}
          />
        </div>
        <aside className="w-full shrink-0 space-y-5 md:w-72 lg:w-80">
          <header className="space-y-1">
            <h2 className="text-3xl font-light tracking-tight text-neutral-50 md:text-4xl">
              {piece.title}
            </h2>
            <p className="text-xs uppercase tracking-[0.15em] text-neutral-500">
              {piece.medium} · {piece.year}
            </p>
          </header>
          <p className="text-sm leading-relaxed text-neutral-400">
            {piece.blurb}
          </p>
        </aside>
      </div>
      {showScrollHint && <ScrollHint />}
    </section>
  );
}

function ScrollHint() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 flex flex-col items-center gap-2 text-neutral-500">
      <span className="text-[10px] uppercase tracking-[0.3em]">
        <span className="[@media(pointer:coarse)]:hidden">Scroll</span>
        <span className="hidden [@media(pointer:coarse)]:inline">Swipe</span>
      </span>
      <svg
        className="animate-scroll-hint h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
}
