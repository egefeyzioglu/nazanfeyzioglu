"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef } from "react";

import BuyButton from "src/app/_components/BuyButton";
import PrintDetails from "src/app/_components/PrintDetails";
import type { PrintItem } from "src/app/_components/pages/PrintsBody";
import { formatPrice } from "src/lib/orders";

export default function PrintDetailModal({
  print,
  checkoutEnabled,
  onClose,
}: {
  print: PrintItem;
  checkoutEnabled: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (trigger instanceof HTMLElement) trigger.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={(event) => {
        if (!event.currentTarget.open) onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onClose();
      }}
      className="bg-paper text-ink fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-[1100px] overflow-y-auto border-0 p-0 shadow-2xl backdrop:bg-black/30 backdrop:backdrop-blur-md"
    >
      <button
        type="button"
        autoFocus
        onClick={onClose}
        aria-label="Close print details"
        className="bg-paper text-ink absolute top-3 right-3 z-10 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-[28px] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <span aria-hidden="true">×</span>
      </button>
      <div className="grid md:grid-cols-[1.1fr_1fr]">
        <div className="flex items-center justify-center bg-black/[0.03] px-8 py-16 md:p-12">
          <Image
            src={print.image}
            alt={print.title}
            width={print.imageWidth}
            height={print.imageHeight}
            sizes="(max-width: 768px) 90vw, 550px"
            className="h-auto max-h-[45dvh] w-auto max-w-full object-contain shadow-sm md:max-h-[70dvh]"
          />
        </div>
        <div className="px-7 py-9 md:px-10 md:py-14">
          <div className="text-ash font-mono text-[10px] tracking-[0.2em] uppercase">
            Fine art prints
          </div>
          <h2
            id={titleId}
            className="mt-3 text-[36px] leading-[1.15] font-light italic"
          >
            {print.title}
          </h2>
          <div className="border-line mt-6 border-b pb-6">
            <p className="text-[28px]">
              {print.priceCents === null
                ? "Price on request"
                : formatPrice(print.priceCents)}
            </p>
            {typeof print.remaining === "number" &&
              print.remaining > 0 &&
              print.remaining <= 3 && (
                <p className="text-clay mt-1 font-mono text-[11px]">
                  Only {print.remaining} left
                </p>
              )}
          </div>
          <div className="py-4">
            <PrintDetails spec={print.spec} />
          </div>
          <div className="mt-5 [&>div]:items-stretch">
            {print.remaining === 0 ? (
              <button
                type="button"
                disabled
                className="border-line text-ash w-full border px-6 py-4 font-mono text-[12px] tracking-[0.14em] uppercase"
              >
                Sold out
              </button>
            ) : checkoutEnabled && print.priceCents !== null ? (
              <>
                <BuyButton
                  itemType="print"
                  id={print.id}
                  cancelPath="/prints"
                  className="cart-btn bg-ink text-paper w-full cursor-pointer px-6 py-4 font-mono text-[12px] tracking-[0.14em] uppercase disabled:cursor-default disabled:opacity-60"
                >
                  Add to cart
                </BuyButton>
                <p className="text-ash mt-3 text-center font-mono text-[10px]">
                  Continue to secure checkout
                </p>
              </>
            ) : (
              <Link
                href="/contact"
                className="cart-btn bg-ink text-paper block w-full px-6 py-4 text-center font-mono text-[12px] tracking-[0.14em] uppercase"
              >
                Inquire about this print
              </Link>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}
