"use client";

import { useState } from "react";

import ArtImage from "src/app/_components/ArtImage";
import PrintDetailModal from "src/app/_components/PrintDetailModal";
import { EditableText } from "src/app/_components/Editable";
import { formatPrice } from "src/lib/orders";
import { CONTENT_DEFAULTS } from "src/lib/content-keys";

export type PrintItem = {
  id: number;
  title: string;
  image: string;
  imageWidth: number;
  imageHeight: number;
  spec: string;
  edition: string;
  priceCents: number | null;
  remaining?: number | null;
};

export type PrintGroup = {
  id: number;
  title: string;
  prints: PrintItem[];
};

export default function PrintsBody({
  groups,
  content,
  checkoutEnabled,
}: {
  groups: PrintGroup[];
  content: Record<string, string>;
  checkoutEnabled: boolean;
}) {
  const [selectedPrint, setSelectedPrint] = useState<PrintItem | null>(null);
  const detailsLabel =
    content["prints.modal.viewDetails"] ??
    CONTENT_DEFAULTS["prints.modal.viewDetails"];

  return (
    <main className="flex-1 px-9 pt-12 pb-24 md:ml-[280px] md:max-w-[1040px] md:min-w-0 md:px-[72px] md:pt-16">
      <div className="text-ash font-mono text-[10.5px] tracking-[0.3em] uppercase">
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
        allowLinks
        className="text-mute mt-5 mb-[6px] max-w-[560px] text-[17px] leading-[1.6] font-light text-pretty"
      />

      {groups.map((group) => (
        <section key={group.id}>
          <div className="border-ink mt-12 flex items-baseline gap-[14px] border-b-2 pb-[10px]">
            <div className="font-spectral text-[26px] italic">
              {group.title}
            </div>
            <div className="text-ash-2 font-mono text-[10px] tracking-[0.2em] uppercase">
              {group.prints.length} print{group.prints.length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="flex flex-col">
            {group.prints.map((print) => (
              <div
                key={print.id}
                className="border-line-soft grid grid-cols-[80px_minmax(0,1fr)] items-center gap-5 border-b py-[22px] md:grid-cols-[150px_minmax(0,1fr)_auto] md:gap-[30px]"
              >
                <button
                  type="button"
                  onClick={() => setSelectedPrint(print)}
                  aria-label={`${detailsLabel}: ${print.title}`}
                  aria-haspopup="dialog"
                  className="cursor-pointer leading-[0]"
                >
                  <ArtImage
                    src={print.image}
                    alt={print.title}
                    sizes="(max-width: 768px) 80px, 150px"
                    width={print.imageWidth}
                    height={print.imageHeight}
                  />
                </button>
                <div>
                  <div className="font-spectral text-[24px] italic">
                    <button
                      type="button"
                      onClick={() => setSelectedPrint(print)}
                      aria-haspopup="dialog"
                      className="hover-clay cursor-pointer text-left"
                    >
                      {print.title}
                    </button>
                  </div>
                  <div className="text-stone-2 mt-[9px] font-mono text-[11px] leading-[1.8] tracking-[0.04em]">
                    {print.spec}
                    <br />
                    {print.edition}
                  </div>
                </div>
                <div className="col-span-2 flex items-center justify-between gap-3 md:col-span-1 md:flex-col md:items-end md:gap-3">
                  <div className="text-right">
                    <span className="font-spectral text-[23px]">
                      {print.priceCents === null
                        ? "$ —"
                        : formatPrice(print.priceCents)}
                    </span>
                    {typeof print.remaining === "number" &&
                      print.remaining > 0 &&
                      print.remaining <= 3 && (
                        <div className="text-clay font-mono text-[10px]">
                          Only {print.remaining} left
                        </div>
                      )}
                  </div>
                  {print.remaining === 0 ? (
                    <span className="border-line text-ash border px-5 py-[11px] font-mono text-[11px] tracking-[0.14em] whitespace-nowrap uppercase">
                      {content["prints.modal.soldOut"] ??
                        CONTENT_DEFAULTS["prints.modal.soldOut"]}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setSelectedPrint(print)}
                    aria-haspopup="dialog"
                    className="cart-btn bg-ink text-paper cursor-pointer px-5 py-[11px] font-mono text-[11px] tracking-[0.14em] whitespace-nowrap uppercase"
                  >
                    {detailsLabel}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {selectedPrint && (
        <PrintDetailModal
          key={selectedPrint.id}
          content={content}
          print={selectedPrint}
          checkoutEnabled={checkoutEnabled}
          onClose={() => setSelectedPrint(null)}
        />
      )}
    </main>
  );
}
