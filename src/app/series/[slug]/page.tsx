import Link from "next/link";
import { notFound } from "next/navigation";

import ArtImage from "src/app/_components/ArtImage";
import BuyButton from "src/app/_components/BuyButton";
import Sidebar from "src/app/_components/Sidebar";
import { formatPrice } from "src/lib/orders";
import { getSeriesBySlug } from "src/server/queries";
import { type works } from "src/server/db/schema";
import { stripeConfigured } from "src/server/stripe";

export const dynamic = "force-dynamic";

type Work = typeof works.$inferSelect;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const s = await getSeriesBySlug(slug);
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
  const s = await getSeriesBySlug(slug);
  if (!s) notFound();

  const meta = `${s.works.length} work${s.works.length === 1 ? "" : "s"}${
    s.statusNote ? ` · ${s.statusNote}` : ""
  }`;
  const checkoutEnabled = stripeConfigured();

  return (
    <div className="bg-paper text-ink flex min-h-screen flex-col md:flex-row">
      <Sidebar active="series" />

      <main className="flex-1 px-9 pt-12 pb-24 md:ml-[280px] md:max-w-[1040px] md:min-w-0 md:px-[72px] md:pt-[50px]">
        <Link
          href="/"
          className="hover-clay text-stone inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] uppercase"
        >
          ← All series
        </Link>

        <div className="border-line mt-[34px] border-b pb-7">
          <div className="text-ash font-mono text-[10.5px] tracking-[0.3em] uppercase">
            Series · {meta}
          </div>
          <h1 className="mt-[14px] text-[46px] leading-[1.06] font-light tracking-[-0.015em]">
            {s.title}
          </h1>
        </div>

        <div className="flex flex-col">
          {s.works.map((work, i) => (
            <WorkRow
              key={work.id}
              work={work}
              first={i === 0}
              slug={slug}
              checkoutEnabled={checkoutEnabled}
            />
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
function plateWidth(work: Work): number {
  const ratio = work.imageWidth / work.imageHeight;
  if (ratio > 1.2) return 600;
  if (ratio < 0.82) return 400;
  return 500;
}

function WorkRow({
  work,
  first,
  slug,
  checkoutEnabled,
}: {
  work: Work;
  first: boolean;
  slug: string;
  checkoutEnabled: boolean;
}) {
  const width = plateWidth(work);

  return (
    <article
      className={
        first ? "pt-12 pb-14 md:pt-14 md:pb-[72px]" : "py-14 md:py-[72px]"
      }
    >
      <figure className="m-0 flex flex-col gap-9 md:flex-row md:items-center md:gap-[60px]">
        {/* Framed plate — echoes the hanging pieces on the home rail. */}
        <div
          className="bg-panel w-full flex-none overflow-hidden leading-[0] shadow-[0_22px_38px_-26px_rgba(0,0,0,0.5)]"
          style={{ maxWidth: width }}
        >
          <ArtImage
            src={work.image}
            alt={work.title}
            sizes={`(max-width: 768px) 100vw, ${width}px`}
            priority={first}
            width={work.imageWidth}
            height={work.imageHeight}
          />
        </div>

        {/* Wall label, mounted beside the work */}
        <figcaption className="min-w-0 md:max-w-[320px]">
          <h2 className="font-spectral text-[27px] leading-[1.12] italic">
            {work.title}
          </h2>
          <div className="text-stone-2 mt-[10px] font-mono text-[11px] leading-[1.7] tracking-[0.04em]">
            {work.medium}
          </div>

          {work.digital ? (
            <>
              <div className="mt-[16px] flex flex-wrap items-center gap-[9px]">
                <span className="border-clay-soft text-clay border px-[9px] py-[5px] font-mono text-[9.5px] tracking-[0.2em] uppercase">
                  Digital
                </span>
                <span className="border-line text-ash border px-[9px] py-[5px] font-mono text-[9.5px] tracking-[0.16em] uppercase">
                  Original in preparation
                </span>
              </div>
              {work.note && (
                <p className="font-spectral text-stone mt-[14px] max-w-[380px] text-[15px] leading-[1.55] italic">
                  {work.note}
                </p>
              )}
              <div className="mt-[18px] flex items-center gap-[15px] font-mono text-[11px] tracking-[0.14em] uppercase">
                {checkoutEnabled && work.digitalPriceCents !== null ? (
                  <BuyButton
                    itemType="digital"
                    id={work.id}
                    cancelPath={`/series/${slug}`}
                    className="hover-clay border-clay-soft text-clay cursor-pointer border-0 border-b bg-transparent p-0 pb-[3px] font-mono text-[11px] tracking-[0.14em] uppercase disabled:cursor-default disabled:opacity-60"
                  >
                    Digital edition · {formatPrice(work.digitalPriceCents)}
                  </BuyButton>
                ) : (
                  <Link
                    href="/contact"
                    className="hover-clay border-clay-soft text-clay border-b pb-[3px]"
                  >
                    Digital edition
                  </Link>
                )}
                <Link href="/contact" className="hover-clay text-stone-2">
                  Commission →
                </Link>
              </div>
            </>
          ) : (
            <div className="mt-[18px] flex items-baseline gap-[13px] font-mono text-[11px] tracking-[0.14em] uppercase">
              <span className="text-stone">{work.price}</span>
              <span className="text-line-2">·</span>
              <Link
                href="/contact"
                className="hover-clay border-clay-soft text-clay border-b pb-[3px]"
              >
                Inquire
              </Link>
            </div>
          )}
        </figcaption>
      </figure>
    </article>
  );
}
