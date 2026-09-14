"use client";

import { useEffect } from "react";

import { useCart } from "src/app/_components/CartProvider";

/** Empties the cart once a paid checkout lands on the success page. */
export default function ClearCart() {
  const { hydrated, clear } = useCart();
  useEffect(() => {
    if (hydrated) clear();
  }, [hydrated, clear]);
  return null;
}
