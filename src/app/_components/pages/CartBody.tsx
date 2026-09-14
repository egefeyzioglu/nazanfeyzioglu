"use client";

import Link from "next/link";
import posthog from "posthog-js";
import { useState } from "react";

import ArtImage from "src/app/_components/ArtImage";
import { useCart } from "src/app/_components/CartProvider";
import {
  cartLineKey,
  cartShippingCents,
  cartSubtotalCents,
  type CartItemRef,
  type CartLine,
} from "src/lib/cart";
import { formatPrice, maxQuantityForType } from "src/lib/orders";

/** Shape of an error response from POST /api/checkout. */
type CheckoutError = {
  error?: string;
  /** Lines the server rejected (sold out, unpriced, deleted) — removed from the cart. */
  unavailable?: CartItemRef[];
  /** Lines whose quantity exceeded what is left — reduced to the server's cap. */
  adjustments?: (CartItemRef & { quantity: number })[];
};

const FALLBACK_ERROR = "Something went wrong — please try again";

/** Cart page: line editing, totals, and the hand-off to Stripe Checkout. */
export default function CartBody({
  checkoutEnabled,
}: {
  checkoutEnabled: boolean;
}) {
  const cart = useCart();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = cartSubtotalCents(cart.lines);
  const shipping = cartShippingCents(cart.lines);
  const physical = cart.lines.some((l) => l.itemType !== "digital");

  async function checkout() {
    setPending(true);
    setError(null);
    const items = cart.lines.map(({ itemType, id, quantity }) => ({
      itemType,
      id,
      quantity,
    }));
    try {
      posthog.capture(
        "checkout_started",
        {
          items: items.map((i) => ({
            item_type: i.itemType,
            item_id: i.id,
            quantity: i.quantity,
          })),
          line_count: items.length,
          subtotal: subtotal,
        },
        // The page navigates to Stripe right after; don't leave this in
        // the batch queue.
        { send_instantly: true },
      );

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-POSTHOG-DISTINCT-ID": posthog.get_distinct_id(),
          "X-POSTHOG-SESSION-ID": posthog.get_session_id(),
        },
        body: JSON.stringify({ items, cancelPath: "/cart" }),
      });
      const data = (await res.json()) as CheckoutError & { url?: string };
      if (!res.ok || !data.url) {
        if (data.unavailable?.length) cart.removeMany(data.unavailable);
        for (const adjustment of data.adjustments ?? []) {
          cart.setQuantity(adjustment, adjustment.quantity);
        }
        throw new Error(data.error ?? FALLBACK_ERROR);
      }
      window.location.assign(data.url);
    } catch (err) {
      posthog.captureException(err);
      setError(err instanceof Error ? err.message : FALLBACK_ERROR);
      setPending(false);
    }
  }

  return (
    <main className="flex-1 px-9 pt-12 pb-24 md:ml-[280px] md:max-w-[1040px] md:min-w-0 md:px-[72px] md:pt-16">
      <div className="text-ash font-mono text-[10.5px] tracking-[0.3em] uppercase">
        Cart
      </div>
      <h1 className="mt-[18px] text-[44px] leading-[1.1] font-light tracking-[-0.015em]">
        Your cart
      </h1>

      {!cart.hydrated ? null : cart.lines.length === 0 ? (
        <div className="text-mute mt-5 max-w-[560px] text-[17px] leading-[1.6] font-light">
          <p>Your cart is empty.</p>
          <div className="mt-8 flex flex-wrap gap-6 font-mono text-[11px] tracking-[0.16em] uppercase">
            <Link href="/prints" className="hover-clay text-stone">
              Browse prints →
            </Link>
            <Link href="/" className="hover-clay text-stone">
              Browse series →
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid gap-12 md:grid-cols-[minmax(0,1fr)_260px] md:gap-[60px]">
          <ul className="m-0 flex list-none flex-col p-0">
            {cart.lines.map((line) => (
              <CartRow
                key={cartLineKey(line)}
                line={line}
                disabled={pending}
                onQuantity={(quantity) => cart.setQuantity(line, quantity)}
                onRemove={() => cart.remove(line)}
              />
            ))}
          </ul>

          <aside className="md:sticky md:top-16 md:self-start">
            <dl className="border-line m-0 border-t font-mono text-[11px] tracking-[0.06em]">
              <SummaryRow label="Subtotal" value={formatPrice(subtotal)} />
              {physical && (
                <SummaryRow
                  label="Shipping (Canada)"
                  value={shipping === 0 ? "Free" : formatPrice(shipping)}
                />
              )}
              <SummaryRow
                label="Total"
                value={formatPrice(subtotal + shipping)}
                emphasis
              />
            </dl>

            {checkoutEnabled ? (
              <button
                type="button"
                disabled={pending}
                onClick={checkout}
                className="cart-btn bg-ink text-paper mt-6 w-full cursor-pointer px-6 py-4 font-mono text-[12px] tracking-[0.14em] uppercase disabled:cursor-default disabled:opacity-60"
              >
                {pending ? "Redirecting…" : "Checkout"}
              </button>
            ) : (
              <Link
                href="/contact"
                className="cart-btn bg-ink text-paper mt-6 block w-full px-6 py-4 text-center font-mono text-[12px] tracking-[0.14em] uppercase"
              >
                Inquire to purchase
              </Link>
            )}
            {error && (
              <p
                role="alert"
                className="mt-3 font-mono text-[10px] text-red-700"
              >
                {error}
              </p>
            )}
            <p className="text-ash mt-3 text-center font-mono text-[10px] leading-[1.7]">
              Secure payment via Stripe.
              {physical && " Shipping within Canada only."}
            </p>
          </aside>
        </div>
      )}
    </main>
  );
}

function CartRow({
  line,
  disabled,
  onQuantity,
  onRemove,
}: {
  line: CartLine;
  disabled: boolean;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  const max = maxQuantityForType(line.itemType);
  const typeLabel =
    line.itemType === "print"
      ? "Print"
      : line.itemType === "original"
        ? "Original"
        : "Digital edition";

  return (
    <li className="border-line-soft grid grid-cols-[80px_minmax(0,1fr)] items-center gap-5 border-b py-[22px] md:grid-cols-[110px_minmax(0,1fr)_auto] md:gap-[30px]">
      <Link href={line.href} className="leading-[0]">
        <ArtImage
          src={line.image}
          alt={line.title}
          sizes="(max-width: 768px) 80px, 110px"
          width={line.imageWidth}
          height={line.imageHeight}
        />
      </Link>
      <div className="min-w-0">
        <div className="text-ash font-mono text-[9.5px] tracking-[0.2em] uppercase">
          {typeLabel}
        </div>
        <div className="font-spectral mt-1 text-[22px] italic">
          <Link href={line.href} className="hover-clay">
            {line.title}
          </Link>
        </div>
        {line.detail && (
          <div className="text-stone-2 mt-[6px] font-mono text-[11px] leading-[1.7] tracking-[0.04em]">
            {line.detail}
          </div>
        )}
        <div className="text-stone mt-2 font-mono text-[11px]">
          {formatPrice(line.unitPriceCents)}
          {line.quantity > 1 && ` × ${line.quantity}`}
        </div>
      </div>
      <div className="col-span-2 flex items-center justify-between gap-4 md:col-span-1 md:flex-col md:items-end">
        {max > 1 ? (
          <label className="text-stone flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] uppercase">
            Qty
            <select
              value={line.quantity}
              disabled={disabled}
              onChange={(event) => onQuantity(Number(event.target.value))}
              className="border-line-2 bg-paper text-ink border px-2 py-1 font-mono text-[11px]"
            >
              {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span className="text-ash font-mono text-[10px] tracking-[0.16em] uppercase">
            One of one
          </span>
        )}
        <div className="flex items-center gap-4">
          <span className="font-spectral text-[20px]">
            {formatPrice(line.unitPriceCents * line.quantity)}
          </span>
          <button
            type="button"
            disabled={disabled}
            onClick={onRemove}
            aria-label={`Remove ${line.title} from cart`}
            className="hover-clay text-ash cursor-pointer bg-transparent p-0 font-mono text-[10px] tracking-[0.16em] uppercase disabled:cursor-default"
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}

function SummaryRow({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`border-line flex items-baseline justify-between gap-4 border-b py-3 ${
        emphasis ? "text-ink" : "text-stone"
      }`}
    >
      <dt className="tracking-[0.16em] uppercase">{label}</dt>
      <dd
        className={`m-0 ${emphasis ? "font-spectral text-[20px] tracking-normal" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
