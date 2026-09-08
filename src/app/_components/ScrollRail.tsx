"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Drives the horizontal series rail from the page's own vertical scroll on
 * desktop: a spacer exactly (100vh + horizontal overflow) tall creates the
 * scroll distance, the viewport-height block sticks to the top, and a passive
 * listener maps scrollY 1:1 onto the rail's scrollLeft. Horizontal wheel and
 * trackpad gestures advance the same page position; vertical scrolling,
 * keyboard, scrollbar, and touch retain their native behavior.
 *
 * When there is no horizontal overflow — mobile, few cards, reduced motion,
 * or JS disabled — the spacer collapses, sticky becomes inert, and the rail
 * stays a plain overflow-x-auto scroller.
 */
export default function ScrollRail({
  header,
  children,
}: {
  header: ReactNode;
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(0);

  useEffect(() => {
    const rail = railRef.current;
    const container = containerRef.current;
    if (!rail || !container) return;

    // Tailwind's md breakpoint (48rem), where the rail becomes the full-height
    // desktop layout.
    const desktop = window.matchMedia("(min-width: 48rem)");
    // Respect the user's reduced-motion preference by falling back to the
    // plain native scroller instead of driving scrollLeft from scrollY.
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const shouldDrive = () => desktop.matches && !reducedMotion.matches;

    const update = () => {
      setOverflow(
        shouldDrive() ? Math.max(0, rail.scrollWidth - rail.clientWidth) : 0,
      );
      if (shouldDrive()) rail.scrollLeft = window.scrollY;
    };

    const sync = () => {
      if (shouldDrive()) rail.scrollLeft = window.scrollY;
    };

    const onWheel = (event: WheelEvent) => {
      // Read units first: some browsers adjust deltas when deltaMode is read.
      const deltaMode = event.deltaMode;
      const deltaX = event.deltaX;
      const deltaY = event.deltaY;
      if (
        !shouldDrive() ||
        rail.scrollWidth <= rail.clientWidth ||
        event.ctrlKey ||
        event.defaultPrevented ||
        !event.cancelable ||
        Math.abs(deltaX) <= Math.abs(deltaY)
      ) {
        return;
      }

      // Use the dominant axis so diagonal gestures aren't counted twice.
      // Wheel deltas may be expressed in pixels, lines, or pages.
      const unit =
        deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 16
          : deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? window.innerHeight
            : 1;
      event.preventDefault();
      window.scrollBy({ top: deltaX * unit, behavior: "instant" });
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(rail);
    // The inner track is w-max, so its resize — not the rail's — is what
    // signals a scrollWidth change.
    if (rail.firstElementChild) observer.observe(rail.firstElementChild);

    window.addEventListener("scroll", sync, { passive: true });
    container.addEventListener("wheel", onWheel, { passive: false });
    desktop.addEventListener("change", update);
    reducedMotion.addEventListener("change", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", sync);
      container.removeEventListener("wheel", onWheel);
      desktop.removeEventListener("change", update);
      reducedMotion.removeEventListener("change", update);
    };
  }, []);

  const driven = overflow > 0;

  return (
    <div
      ref={containerRef}
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
