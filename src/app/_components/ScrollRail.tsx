"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Drives the horizontal series rail from the page's own vertical scroll on
 * desktop: a spacer exactly (100vh + horizontal overflow) tall creates the
 * scroll distance, the viewport-height block sticks to the top, and a passive
 * listener maps scrollY 1:1 onto the rail's scrollLeft. Native scrolling
 * (wheel, trackpad, keyboard, scrollbar, touch) is never intercepted.
 *
 * When there is no horizontal overflow — mobile, few cards, or JS disabled —
 * the spacer collapses, sticky becomes inert, and the rail stays a plain
 * overflow-x-auto scroller.
 */
export default function ScrollRail({
  header,
  children,
}: {
  header: ReactNode;
  children: ReactNode;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(0);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    // Tailwind's md breakpoint (48rem), where the rail becomes the full-height
    // desktop layout.
    const desktop = window.matchMedia("(min-width: 48rem)");

    const update = () => {
      setOverflow(
        desktop.matches ? Math.max(0, rail.scrollWidth - rail.clientWidth) : 0,
      );
      if (desktop.matches) rail.scrollLeft = window.scrollY;
    };

    const sync = () => {
      if (desktop.matches) rail.scrollLeft = window.scrollY;
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(rail);
    // The inner track is w-max, so its resize — not the rail's — is what
    // signals a scrollWidth change.
    if (rail.firstElementChild) observer.observe(rail.firstElementChild);

    window.addEventListener("scroll", sync, { passive: true });
    desktop.addEventListener("change", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", sync);
      desktop.removeEventListener("change", update);
    };
  }, []);

  const driven = overflow > 0;

  return (
    <div
      className="flex flex-auto flex-col"
      style={driven ? { height: `calc(100vh + ${overflow}px)` } : undefined}
    >
      <div className="sticky top-0 flex flex-1 flex-col md:h-screen md:flex-none">
        {header}
        <div
          ref={railRef}
          data-driven={driven || undefined}
          className="nagon-rail flex-1 overflow-x-auto md:min-h-0 md:overflow-y-hidden"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
