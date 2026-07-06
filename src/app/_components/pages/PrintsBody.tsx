"use client";

import Link from "next/link";

import ArtImage from "src/app/_components/ArtImage";
import { EditableText } from "src/app/_components/Editable";

export type PrintItem = {
  id: number;
  title: string;
  image: string;
  imageWidth: number;
  imageHeight: number;
  spec: string;
  edition: string;
  price: string | null;
};

export type PrintGroup = {
  id: number;
  title: string;
  prints: PrintItem[];
};

export default function PrintsBody({
  groups,
  content,
}: {
  groups: PrintGroup[];
  content: Record<string, string>;
}) {
  return (
    <main className="flex-1 px-9 pt-12 pb-24 md:ml-[280px] md:min-w-0 md:max-w-[1040px] md:px-[72px] md:pt-16">
      <div className="font-mono text-[10.5px] tracking-[0.3em] text-ash uppercase">
        Prints
      </div>
      <EditableText
        k="prints.heading"
        value={content["prints.heading"] ?? ""}
        as="h1"
        className="mt-[18px] text-[44px] leading-[1.1] font-light tracking-[-0.015em]"
      />
      <EditableText
        k="prints.intro"
        value={content["prints.intro"] ?? ""}
        as="p"
        className="mt-5 mb-[6px] max-w-[560px] text-[17px] leading-[1.6] font-light text-mute text-pretty"
      />

      {groups.map((group) => (
        <section key={group.id}>
          <div className="mt-12 flex items-baseline gap-[14px] border-b-2 border-ink pb-[10px]">
            <div className="font-spectral text-[26px] italic">
              {group.title}
            </div>
            <div className="font-mono text-[10px] tracking-[0.2em] text-ash-2 uppercase">
              {group.prints.length} print{group.prints.length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="flex flex-col">
            {group.prints.map((print) => (
              <div
                key={print.id}
                className="grid grid-cols-[80px_minmax(0,1fr)] items-center gap-5 border-b border-line-soft py-[22px] md:grid-cols-[150px_minmax(0,1fr)_auto] md:gap-[30px]"
              >
                <div className="leading-[0]">
                  <ArtImage
                    src={print.image}
                    alt={print.title}
                    sizes="(max-width: 768px) 80px, 150px"
                    width={print.imageWidth}
                    height={print.imageHeight}
                  />
                </div>
                <div>
                  <div className="font-spectral text-[24px] italic">
                    {print.title}
                  </div>
                  <div className="mt-[9px] font-mono text-[11px] leading-[1.8] tracking-[0.04em] text-stone-2">
                    {print.spec}
                    <br />
                    {print.edition}
                  </div>
                </div>
                <div className="col-span-2 flex items-center justify-between gap-3 md:col-span-1 md:flex-col md:items-end md:gap-3">
                  <span className="font-spectral text-[23px]">
                    {print.price ?? "$ —"}
                  </span>
                  <a
                    href="#"
                    className="cart-btn bg-ink px-5 py-[11px] font-mono text-[11px] tracking-[0.14em] whitespace-nowrap text-paper uppercase"
                  >
                    Add to cart
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      <p className="mt-10 font-mono text-[11px] leading-[1.9] tracking-[0.04em] text-ash">
        Paper stock, print sizes, edition counts and pricing to be confirmed.
        <br />
        For originals, see the{" "}
        <Link href="/" className="border-b border-clay-soft text-clay">
          Series
        </Link>{" "}
        — or{" "}
        <Link href="/contact" className="border-b border-clay-soft text-clay">
          get in touch
        </Link>
        .
      </p>
    </main>
  );
}
