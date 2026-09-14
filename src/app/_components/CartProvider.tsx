"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  addLine,
  CART_STORAGE_KEY,
  parseStoredCart,
  removeLine,
  serializeCart,
  setLineQuantity,
  type CartItemRef,
  type CartLine,
} from "src/lib/cart";

export type CartContextValue = {
  lines: CartLine[];
  /**
   * False until the cart has been read from localStorage after mount. The
   * server render always sees an empty cart, so consumers hide counts and
   * empty states until this flips to avoid a hydration mismatch or a flash of
   * "your cart is empty".
   */
  hydrated: boolean;
  add: (line: CartLine) => void;
  remove: (ref: CartItemRef) => void;
  removeMany: (refs: CartItemRef[]) => void;
  setQuantity: (ref: CartItemRef, quantity: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function readStorage(): CartLine[] {
  try {
    return parseStoredCart(window.localStorage.getItem(CART_STORAGE_KEY));
  } catch {
    // Storage can be unavailable (privacy modes, quota) — treat as empty.
    return [];
  }
}

function writeStorage(lines: CartLine[]) {
  try {
    if (lines.length === 0) {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    } else {
      window.localStorage.setItem(CART_STORAGE_KEY, serializeCart(lines));
    }
  } catch {
    // Persisting is best-effort; the in-memory cart still works this session.
  }
}

/**
 * Holds the shopper's cart in React state, mirrored to localStorage so it
 * survives reloads and is shared across tabs (via the `storage` event).
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Read after mount: the server render cannot see localStorage.
    setLines(readStorage());
    setHydrated(true);

    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === CART_STORAGE_KEY) {
        setLines(readStorage());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((next: (lines: CartLine[]) => CartLine[]) => {
    setLines((current) => {
      const updated = next(current);
      if (updated !== current) writeStorage(updated);
      return updated;
    });
  }, []);

  // Actions are stable across renders so effects can depend on them safely.
  const actions = useMemo(
    () => ({
      add: (line: CartLine) => update((current) => addLine(current, line)),
      remove: (ref: CartItemRef) =>
        update((current) => removeLine(current, ref)),
      removeMany: (refs: CartItemRef[]) =>
        update((current) =>
          refs.reduce((acc, ref) => removeLine(acc, ref), current),
        ),
      setQuantity: (ref: CartItemRef, quantity: number) =>
        update((current) => setLineQuantity(current, ref, quantity)),
      clear: () => update((current) => (current.length === 0 ? current : [])),
    }),
    [update],
  );

  const value = useMemo<CartContextValue>(
    () => ({ lines, hydrated, ...actions }),
    [lines, hydrated, actions],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
