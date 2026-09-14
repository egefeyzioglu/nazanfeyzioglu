"use client";

import { useEffect } from "react";

import { useCart } from "src/app/_components/CartProvider";
import { type PurchasedLine } from "src/lib/cart";

/**
 * On the success page: removes exactly what this checkout session bought from
 * the cart, once. Anything added in another tab or after checkout started is
 * left alone, and reopening the URL later is a no-op.
 */
export default function ReconcileCart({
  sessionId,
  purchased,
}: {
  sessionId: string;
  purchased: PurchasedLine[];
}) {
  const { hydrated, reconcilePurchase } = useCart();
  useEffect(() => {
    if (hydrated) reconcilePurchase(sessionId, purchased);
  }, [hydrated, reconcilePurchase, sessionId, purchased]);
  return null;
}
