"use client";

import Link from "next/link";

import { EditableText } from "src/app/_components/Editable";

export type NavKey = "series" | "prints" | "about" | "exhibitions" | "contact";

const NAV: { key: NavKey; label: string; href: string }[] = [
  { key: "series", label: "Series", href: "/" },
  { key: "prints", label: "Prints", href: "/prints" },
  { key: "about", label: "About", href: "/about" },
  { key: "exhibitions", label: "Exhibitions", href: "/exhibitions" },
  { key: "contact", label: "Contact", href: "/contact" },
];

export default function SidebarBody({
  active,
  content,
}: {
  active: NavKey;
  content: Record<string, string>;
}) {
  const instagram = content["sidebar.instagram"];

  return (
    <aside className="z-10 flex flex-col justify-between border-b border-line bg-paper px-9 py-10 md:fixed md:top-0 md:left-0 md:h-screen md:w-[280px] md:border-r md:border-b-0 md:px-[38px] md:py-[46px]">
      <div>
        <Link href="/" className="block">
          <div className="font-spectral text-[29px] leading-none font-light tracking-[-0.01em]">
            Nazan
            <br />
            Feyzioğlu
          </div>
          <div className="mt-[13px] font-mono text-[10px] tracking-[0.28em] text-stone-2 uppercase">
            Painter
          </div>
        </Link>

        <nav className="mt-12 flex flex-col gap-[2px] md:mt-[60px]">
          {NAV.map((item) => {
            const isActive = item.key === active;
            return (
              <Link
                key={item.key}
                href={item.href}
                draggable={false}
                className={`nav-link flex items-center gap-[11px] py-[9px] font-mono text-[12px] tracking-[0.12em] uppercase ${
                  isActive ? "text-ink" : "text-stone"
                }`}
              >
                {isActive && (
                  <span className="inline-block h-[6px] w-[6px] rounded-full bg-clay" />
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

      <div className="mt-10 font-mono text-[10px] leading-[2] tracking-[0.16em] text-ash uppercase md:mt-0">
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
