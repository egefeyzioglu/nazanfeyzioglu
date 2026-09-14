"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { useCart } from "src/app/_components/CartProvider";
import { cartLineKey, type CartLine } from "src/lib/cart";
import { maxQuantityForType } from "src/lib/orders";

/**
 * Adds an item to the cart and confirms with a link to it. Single-copy items
 * (originals, digital editions) that are already in the cart show "In cart"
 * instead of adding again. Quantity for prints is adjusted on the cart page.
 */
export default function AddToCartButton({
  line,
  className,
  children,
  inCartLabel = "In cart",
  viewCartLabel = "View cart →",
}: {
  /** The item to add; `quantity` is always one per click. */
  line: Omit<CartLine, "quantity">;
  className?: string;
  children: ReactNode;
  inCartLabel?: string;
  viewCartLabel?: string;
}) {
  const cart = useCart();
  const [added, setAdded] = useState(false);
  const existing = cart.lines.find((l) => cartLineKey(l) === cartLineKey(line));
  const atCap =
    cart.hydrated &&
    existing !== undefined &&
    existing.quantity >= maxQuantityForType(line.itemType);

  return (
    <div className="flex flex-col items-start gap-2 md:items-end">
      <button
        type="button"
        className={className}
        disabled={atCap}
        onClick={() => {
          cart.add({ ...line, quantity: 1 });
          setAdded(true);
        }}
      >
        {atCap ? inCartLabel : children}
      </button>
      {(added || atCap) && (
        <Link
          href="/cart"
          role="status"
          className="hover-clay text-stone font-mono text-[10px] tracking-[0.16em] uppercase"
        >
          {added ? `Added · ${viewCartLabel}` : viewCartLabel}
        </Link>
      )}
    </div>
  );
}
