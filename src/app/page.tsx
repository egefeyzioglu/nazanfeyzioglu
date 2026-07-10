// The public site is not live yet — the homepage is a static coming-soon
// landing that needs no database or environment configuration. The full
// gallery homepage (series rail + sidebar) lives in git history and can be
// restored here when the site launches.
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col bg-paper px-9 py-16 text-ink md:px-[72px]">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="font-mono text-[10.5px] tracking-[0.3em] text-ash uppercase">
          Coming Soon
        </div>

        <h1 className="mt-7 font-spectral text-[44px] leading-[1.08] font-light tracking-[-0.015em] md:text-[68px]">
          Nazan
          <br />
          Feyzioğlu
        </h1>

        <div className="mt-4 font-mono text-[10px] tracking-[0.28em] text-stone-2 uppercase">
          Painter
        </div>

        <div className="mt-12 h-px w-[48px] bg-line-2" />

        <p className="mt-12 max-w-[440px] text-[17px] leading-[1.7] font-light text-mute text-pretty">
          A new home for my work is being prepared. Please check back soon.
        </p>
      </div>

      <footer className="mt-16 text-center font-mono text-[10px] leading-[2] tracking-[0.16em] text-ash uppercase">
        <div>Toronto</div>
      </footer>
    </main>
  );
}
