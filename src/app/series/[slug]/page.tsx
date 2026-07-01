import Link from "next/link";
import { notFound } from "next/navigation";

import ArtImage from "src/app/_components/ArtImage";
import Sidebar from "src/app/_components/Sidebar";
import { getSeries, series, type Work } from "src/app/_data/series";

export function generateStaticParams() {
  return series.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const s = getSeries(slug);
  return {
    title: s ? `${s.title} — Nazan Feyzioğlu` : "Series — Nazan Feyzioğlu",
  };
}

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const s = getSeries(slug);
  if (!s) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink md:flex-row">
      <Sidebar active="series" />

      <main className="flex-1 px-9 pt-12 pb-24 md:ml-[280px] md:min-w-0 md:max-w-[1040px] md:px-[72px] md:pt-[50px]">
        <Link
          href="/"
          className="hover-clay inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] text-stone uppercase"
        >
          ← All series
        </Link>

        <div className="mt-[34px] border-b border-line pb-7">
          <div className="font-mono text-[10.5px] tracking-[0.3em] text-ash uppercase">
            Series · {s.meta}
          </div>
          <h1 className="mt-[14px] text-[46px] leading-[1.06] font-light tracking-[-0.015em]">
            {s.title}
          </h1>
        </div>

        <div className="mt-[10px] flex flex-col">
          {s.works.map((work) => (
            <WorkRow key={work.title} work={work} />
          ))}
        </div>
      </main>
    </div>
  );
}

function WorkRow({ work }: { work: Work }) {
  return (
    <div className="grid grid-cols-1 items-start gap-8 border-t border-line-soft py-[34px] md:grid-cols-[300px_minmax(0,1fr)] md:gap-[46px]">
      <div className="min-w-0 overflow-hidden leading-[0]">
        <ArtImage
          src={work.image}
          alt={work.title}
          sizes="(max-width: 768px) 100vw, 300px"
        />
      </div>

      <div className="pt-1">
        <div className="font-spectral text-[28px] leading-[1.1] italic">
          {work.title}
        </div>
        <div className="mt-[11px] font-mono text-[11px] tracking-[0.04em] text-stone-2">
          {work.medium}
        </div>

        {work.digital ? (
          <>
            <div className="mt-[18px] flex flex-wrap items-center gap-[9px]">
              <span className="border border-clay-soft px-[9px] py-[5px] font-mono text-[9.5px] tracking-[0.2em] text-clay uppercase">
                Digital
              </span>
              <span className="border border-line px-[9px] py-[5px] font-mono text-[9.5px] tracking-[0.16em] text-ash uppercase">
                Original in preparation
              </span>
            </div>
            {work.note && (
              <div className="mt-[14px] max-w-[330px] font-spectral text-[15px] leading-[1.55] text-stone italic">
                {work.note}
              </div>
            )}
            <div className="mt-5 flex items-center gap-4">
              <a
                href="#"
                className="cart-btn bg-ink px-5 py-[11px] font-mono text-[11px] tracking-[0.14em] text-paper uppercase"
              >
                Digital edition
              </a>
              <Link
                href="/contact"
                className="hover-clay border-b border-clay-soft pb-[3px] font-mono text-[11px] tracking-[0.14em] text-clay uppercase"
              >
                Commission →
              </Link>
            </div>
          </>
        ) : (
          <div className="mt-[22px] flex items-center gap-[18px]">
            <span className="font-spectral text-[23px] text-ink">
              {work.price}
            </span>
            <a
              href="#"
              className="cart-btn bg-ink px-5 py-[11px] font-mono text-[11px] tracking-[0.14em] text-paper uppercase"
            >
              Add to cart
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
