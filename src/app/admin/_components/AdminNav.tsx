"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { label: "Series", href: "/admin/series" },
  { label: "Prints", href: "/admin/prints" },
  { label: "Exhibitions", href: "/admin/exhibitions" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Pages", href: "/admin/pages" },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap items-center gap-1">
      {NAV.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 font-mono text-[11px] tracking-[0.12em] uppercase transition-colors ${
              active
                ? "bg-clay/12 text-clay"
                : "text-stone hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
