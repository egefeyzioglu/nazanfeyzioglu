import Image from "next/image";

import Navbar from "src/app/_components/Navbar";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-warm-bg font-hanken text-warm-text">
      <Navbar />
      <main className="mx-auto max-w-[1200px] px-[clamp(22px,4.4vw,64px)] pb-[clamp(80px,12vh,140px)] pt-[clamp(120px,18vh,180px)]">
        <div className="grid grid-cols-1 items-center gap-[clamp(28px,5vw,72px)] md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-warm-bg-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_24px_60px_-28px_rgba(0,0,0,0.7)]">
              <Image
                src="https://picsum.photos/seed/nazan-portrait/900/1200"
                alt="Portrait of Nazan Feyzioglu"
                fill
                sizes="(max-width: 768px) 100vw, 40vw"
                className="object-cover"
                priority
              />
            </div>
          </div>
          <div className="space-y-6 md:col-span-7">
            <header className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-warm-text-faint">
                About
              </p>
              <h1 className="font-display text-[clamp(34px,4.4vw,60px)] font-light italic leading-tight">
                Nazan Feyzioglu
              </h1>
            </header>
            <div className="space-y-4 text-sm leading-relaxed text-warm-text-dim md:text-base">
              <p>
                Nazan Feyzioglu is a painter whose work moves between figuration
                and abstraction, drawn to quiet interiors, weathered surfaces,
                and the slow accumulation of light. Her practice is rooted in
                observation — a way of looking that lingers, returns, and
                rearranges.
              </p>
              <p>
                Working primarily in oil and mixed media, she builds compositions
                in long, deliberate passes, letting earlier layers continue to
                breathe through the surface. The result is a body of work that
                feels both immediate and remembered.
              </p>
              <p>
                She lives and works in Istanbul, with selected works exhibited
                in group and solo shows across Europe.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
