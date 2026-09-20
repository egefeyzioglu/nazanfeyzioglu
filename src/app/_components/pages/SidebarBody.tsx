"use client";

import Link from "next/link";
import { useState } from "react";

import { EditableText } from "src/app/_components/Editable";

export type NavKey =
  | "series"
  | "prints"
  | "about"
  | "exhibitions"
  | "contact"
  | "policies";

const NAV: { key: NavKey; label: string; href: string }[] = [
  { key: "series", label: "Series", href: "/" },
  { key: "prints", label: "Prints", href: "/prints" },
  { key: "about", label: "About", href: "/about" },
  { key: "exhibitions", label: "Exhibitions", href: "/exhibitions" },
  { key: "contact", label: "Contact", href: "/contact" },
  { key: "policies", label: "Shipping & returns", href: "/policies" },
];

export default function SidebarBody({
  active,
  content,
}: {
  active: NavKey;
  content: Record<string, string>;
}) {
  const instagram = content["sidebar.instagram"];
  // Mobile-only: the nav and footer are collapsed behind a menu toggle so the
  // page content (e.g. the series gallery) stays above the fold. On md+ the
  // sidebar is always fully expanded and the toggle is hidden.
  const [open, setOpen] = useState(false);
  const collapsedNav = open ? "flex" : "hidden md:flex";
  const collapsedFooter = open ? "block" : "hidden md:block";

  return (
    <aside className="border-line bg-paper z-10 flex flex-col justify-between border-b px-9 py-6 md:fixed md:top-0 md:left-0 md:h-screen md:w-[280px] md:border-r md:border-b-0 md:px-[38px] md:py-[46px]">
      <div>
        <div className="flex items-start justify-between gap-4">
          <Link href="/" className="block flex-1">
            <div className="font-spectral text-[29px] leading-none font-light tracking-[-0.01em]">
              Nazan
              <br />
              Feyzioğlu
            </div>
            <div className="text-stone-2 mt-[13px] font-mono text-[10px] tracking-[0.28em] uppercase">
              Artist
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="site-nav"
            className="hover-clay text-stone -mr-2 px-2 py-1 font-mono text-[11px] tracking-[0.2em] uppercase md:hidden"
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>

        <nav
          id="site-nav"
          className={`${collapsedNav} mt-8 flex-col gap-[2px] md:mt-[60px]`}
        >
          {NAV.map((item) => {
            const isActive = item.key === active;
            return (
              <Link
                key={item.key}
                href={item.href}
                draggable={false}
                aria-current={isActive ? "page" : undefined}
                className={`nav-link flex items-center gap-[11px] py-[9px] font-mono text-[12px] tracking-[0.12em] uppercase ${
                  isActive ? "text-ink" : "text-stone"
                }`}
              >
                {isActive && (
                  <span className="bg-clay inline-block h-[6px] w-[6px] rounded-full" />
                )}
                <EditableText
                  k={`nav.${item.key}`}
                  value={content[`nav.${item.key}`] ?? item.label}
                />
              </Link>
            );
          })}
        </nav>
      </div>

      <div
        className={`${collapsedFooter} text-ash mt-10 font-mono text-[10px] leading-[2] tracking-[0.16em] uppercase md:mt-0`}
      >
        <EditableText
          k="sidebar.location"
          value={content["sidebar.location"] ?? ""}
          as="div"
        />
        <div>Est. 2026</div>
        {instagram && (
          <div className="mt-[14px] flex gap-[14px]">
            <a
              href={`https://instagram.com/${instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover-clay text-stone"
            >
              Instagram
            </a>
          </div>
        )}
      </div>
    </aside>
  );
}
