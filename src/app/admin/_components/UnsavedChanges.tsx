"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";

const LEAVE_MESSAGE =
  "You have unsaved changes. Leave this page and discard them?";

type Registry = { setDirty: (id: string, dirty: boolean) => void };

const UnsavedChangesContext = createContext<Registry | null>(null);

/**
 * Marks the calling form as having unsaved edits while `dirty` is true, so the
 * admin shell can show the floating warning and guard navigation away.
 */
export function useUnsavedChanges(dirty: boolean) {
  const id = useId();
  const registry = useContext(UnsavedChangesContext);
  useEffect(() => {
    if (!registry || !dirty) return;
    registry.setDirty(id, true);
    return () => registry.setDirty(id, false);
  }, [registry, id, dirty]);
}

/** Returns true when a click on `anchor` would navigate this tab to another page. */
function leavesPage(event: MouseEvent, anchor: HTMLAnchorElement) {
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return false;
  }
  if (anchor.hasAttribute("download")) return false;
  const target = anchor.getAttribute("target");
  if (target && target !== "_self") return false;
  // Regions such as the page-copy preview swallow their own link clicks.
  if (anchor.closest("[data-unsaved-guard='off']")) return false;
  const url = new URL(anchor.href, window.location.href);
  if (!["http:", "https:"].includes(url.protocol)) return false;
  return (
    url.origin !== window.location.origin ||
    url.pathname !== window.location.pathname ||
    url.search !== window.location.search
  );
}

/**
 * Tracks unsaved edits across every admin form, shows a floating warning while
 * any remain, and asks before a link click or page unload discards them.
 */
export function UnsavedChangesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [dirtyIds, setDirtyIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const setDirty = useCallback((id: string, dirty: boolean) => {
    setDirtyIds((prev) => {
      if (prev.has(id) === dirty) return prev;
      const next = new Set(prev);
      if (dirty) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);
  const registry = useMemo(() => ({ setDirty }), [setDirty]);

  const count = dirtyIds.size;

  useEffect(() => {
    if (count === 0) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Older browsers only prompt when returnValue is set.
      event.returnValue = "";
    };
    // Capture phase runs before Next's <Link> handler starts a client-side
    // navigation, so declining can still cancel it.
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || !(event.target instanceof Element)) return;
      const anchor = event.target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (!leavesPage(event, anchor)) return;
      if (window.confirm(LEAVE_MESSAGE)) return;
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("click", onClick, true);
    };
  }, [count]);

  return (
    <UnsavedChangesContext.Provider value={registry}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4"
      >
        {count > 0 && (
          <div className="border-ink bg-ink text-paper pointer-events-auto flex items-center gap-2.5 rounded-full border px-4 py-2.5 font-mono text-[11px] tracking-[0.12em] uppercase shadow-[0_18px_36px_-18px_rgba(28,26,23,0.6)]">
            <span
              aria-hidden="true"
              className="bg-clay h-2 w-2 shrink-0 animate-pulse rounded-full motion-reduce:animate-none"
            />
            Unsaved changes
            {count > 1 && (
              <span className="text-ash-2 normal-case">· {count} forms</span>
            )}
          </div>
        )}
      </div>
    </UnsavedChangesContext.Provider>
  );
}
