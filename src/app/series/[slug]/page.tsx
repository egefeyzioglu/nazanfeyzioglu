import Link from "next/link";
import { notFound } from "next/navigation";

import ArtImage from "src/app/_components/ArtImage";
import Sidebar from "src/app/_components/Sidebar";
import { imageDimensions } from "src/app/_data/imageDimensions";
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

        <div className="flex flex-col">
          {s.works.map((work, i) => (
            <WorkRow key={work.title} work={work} first={i === 0} />
          ))}
        </div>
      </main>
    </div>
  );
}

/**
 * Portfolio-scale display width for a work's "plate", chosen from the image's
 * intrinsic aspect ratio so landscape pieces read wide and portrait pieces stay
 * a comfortable height rather than towering down the page.
 */
function plateWidth(image: string): number {
  const dim = imageDimensions[image] ?? { w: 1000, h: 1000 };
  const ratio = dim.w / dim.h;
  if (ratio > 1.2) return 600;
  if (ratio < 0.82) return 400;
  return 500;
}

function WorkRow({ work, first }: { work: Work; first: boolean }) {
  const width = plateWidth(work.image);

  return (
    <article className={first ? "pt-12 pb-14 md:pt-14 md:pb-[72px]" : "py-14 md:py-[72px]"}>
      <figure className="m-0 flex flex-col gap-9 md:flex-row md:items-center md:gap-[60px]">
        {/* Framed plate — echoes the hanging pieces on the home rail. */}
        <div
          className="w-full flex-none overflow-hidden bg-panel leading-[0] shadow-[0_22px_38px_-26px_rgba(0,0,0,0.5)]"
          style={{ maxWidth: width }}
        >
          <ArtImage
            src={work.image}
            alt={work.title}
            sizes={`(max-width: 768px) 100vw, ${width}px`}
            priority={first}
          />
        </div>

        {/* Wall label, mounted beside the work */}
        <figcaption className="min-w-0 md:max-w-[320px]">
          <h2 className="font-spectral text-[27px] leading-[1.12] italic">
            {work.title}
          </h2>
          <div className="mt-[10px] font-mono text-[11px] leading-[1.7] tracking-[0.04em] text-stone-2">
            {work.medium}
          </div>

          {work.digital ? (
            <>
              <div className="mt-[16px] flex flex-wrap items-center gap-[9px]">
                <span className="border border-clay-soft px-[9px] py-[5px] font-mono text-[9.5px] tracking-[0.2em] text-clay uppercase">
                  Digital
                </span>
                <span className="border border-line px-[9px] py-[5px] font-mono text-[9.5px] tracking-[0.16em] text-ash uppercase">
                  Original in preparation
                </span>
              </div>
              {work.note && (
                <p className="mt-[14px] max-w-[380px] font-spectral text-[15px] leading-[1.55] text-stone italic">
                  {work.note}
                </p>
              )}
              <div className="mt-[18px] flex items-center gap-[15px] font-mono text-[11px] tracking-[0.14em] uppercase">
                <a
                  href="#"
                  className="hover-clay border-b border-clay-soft pb-[3px] text-clay"
                >
                  Digital edition
                </a>
                <Link href="/contact" className="hover-clay text-stone-2">
                  Commission →
                </Link>
              </div>
            </>
          ) : (
            <div className="mt-[18px] flex items-baseline gap-[13px] font-mono text-[11px] tracking-[0.14em] uppercase">
              <span className="text-stone">{work.price}</span>
              <span className="text-line-2">·</span>
              <a
                href="#"
                className="hover-clay border-b border-clay-soft pb-[3px] text-clay"
              >
                Add to cart
              </a>
            </div>
          )}
        </figcaption>
      </figure>
    </article>
  );
}
