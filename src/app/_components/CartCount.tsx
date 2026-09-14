"use client";

import { useCart } from "src/app/_components/CartProvider";
import { cartCount } from "src/lib/cart";

/** Number of copies in the cart, rendered beside the Cart nav link; hidden when empty. */
export default function CartCount() {
  const { lines, hydrated } = useCart();
  const count = hydrated ? cartCount(lines) : 0;
  if (count === 0) return null;
  return (
    <span
      aria-label={`${count} item${count === 1 ? "" : "s"} in cart`}
      className="bg-clay text-paper ml-1 inline-flex min-w-[18px] items-center justify-center rounded-full px-[5px] py-[1px] font-mono text-[9px] leading-[14px] tracking-normal"
    >
      {count}
    </span>
  );
}
