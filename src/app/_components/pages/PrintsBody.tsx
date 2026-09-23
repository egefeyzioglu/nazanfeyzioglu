"use client";

import { useState } from "react";

import ArtImage from "src/app/_components/ArtImage";
import PrintDetailModal from "src/app/_components/PrintDetailModal";
import { EditableText } from "src/app/_components/Editable";
import { formatPrice, printShippingCents } from "src/lib/orders";
import { CONTENT_DEFAULTS } from "src/lib/content-keys";
import {
  formatPrintSpec,
  groupPrintVariants,
  getPrintSizes,
  printAnchorId,
  type PrintDimensions,
} from "src/lib/prints";

export type PrintItem = PrintDimensions & {
  id: number;
  parentPrintId?: number | null;
  variants?: PrintItem[];
  title: string;
  image: string;
  imageWidth: number;
  imageHeight: number;
  edition: string;
  priceCents: number | null;
  remaining?: number | null;
};

export type PrintGroup = {
  id: number;
  title: string;
  prints: PrintItem[];
};

/** Renders the compact print catalogue and opens details for the selected print. */
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

      <p className="text-mute mt-4 text-[14px] leading-[1.6]">
        Flat rate shipping within Canada:{" "}
        {formatPrice(printShippingCents(content))} per print order. Free
        shipping on originals within Canada.
      </p>

      {groups
        .map((source) => ({
          ...source,
          prints: groupPrintVariants(source.prints),
        }))
        .map((group) => (
          <section key={group.id}>
            <div className="border-ink mt-12 flex items-baseline gap-[14px] border-b-2 pb-[10px]">
              <div className="font-spectral text-[26px] italic">
                {group.title}
              </div>
              <div className="text-ash-2 font-mono text-[10px] tracking-[0.2em] uppercase">
                {group.prints.length} print
                {group.prints.length === 1 ? "" : "s"}
              </div>
            </div>

            <div className="flex flex-col">
              {group.prints.map((print) => (
                <div
                  key={print.id}
                  id={printAnchorId(print.id)}
                  className="border-line-soft grid scroll-mt-6 grid-cols-[80px_minmax(0,1fr)] items-center gap-5 border-b py-[22px] md:grid-cols-[150px_minmax(0,1fr)_auto] md:gap-[30px]"
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
                      {print.variants.length > 1
                        ? `${print.variants.length} sizes · ${print.variants.map((v) => getPrintSizes(v)?.image).join(" / ")}`
                        : formatPrintSpec(print)}
                      <br />
                      {print.edition}
                    </div>
                  </div>
                  <div className="col-span-2 flex items-center justify-between gap-3 md:col-span-1 md:flex-col md:items-end md:gap-3">
                    <div className="text-right">
                      <span className="font-spectral text-[23px]">
                        {cataloguePrice(print.variants)}
                      </span>
                      {print.variants.length === 1 &&
                        typeof print.remaining === "number" &&
                        print.remaining > 0 &&
                        print.remaining <= 3 && (
                          <div className="text-clay font-mono text-[10px]">
                            {(
                              content["prints.modal.lowStock"] ??
                              CONTENT_DEFAULTS["prints.modal.lowStock"] ??
                              ""
                            ).replaceAll(
                              "{remaining}",
                              String(print.remaining),
                            )}
                          </div>
                        )}
                    </div>
                    {print.variants.every((v) => v.remaining === 0) ? (
                      <span className="border-line text-ash border px-5 py-[11px] font-mono text-[11px] tracking-[0.14em] whitespace-nowrap uppercase">
                        {content["prints.modal.soldOut"] ??
                          CONTENT_DEFAULTS["prints.modal.soldOut"]}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setSelectedPrint(print)}
                      aria-haspopup="dialog"
                      aria-label={`${detailsLabel}: ${print.title}`}
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

function cataloguePrice(variants: PrintItem[]) {
  const prices = variants.flatMap((v) =>
    v.priceCents === null ? [] : [v.priceCents],
  );
  if (prices.length === 0) return "$ —";
  const lowest = Math.min(...prices);
  return `${new Set(prices).size > 1 || prices.length < variants.length ? "From " : ""}${formatPrice(lowest)}`;
}
