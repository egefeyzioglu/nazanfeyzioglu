"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { adminSections } from "./navigation";

export default function AdminNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const current = adminSections
    .flatMap((section) => section.items)
    .find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    );

  function navLink(label: string, href: string) {
    const active =
      pathname === href ||
      (href !== "/admin" && pathname.startsWith(`${href}/`));
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setOpen(false)}
        aria-current={active ? "page" : undefined}
        className={`focus-visible:outline-clay flex min-h-11 items-center rounded-md px-3 py-2 font-mono text-[12px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${active ? "bg-clay/12 text-clay" : "text-stone hover:text-ink hover:bg-white"}`}
      >
        {label}
      </Link>
    );
  }

  return (
    <nav aria-label="Admin navigation">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="admin-navigation"
        onClick={() => setOpen(!open)}
        className="border-line flex min-h-11 w-full items-center justify-between gap-3 rounded-md border bg-white px-3 text-left font-mono text-[12px] lg:hidden"
      >
        <span>{current?.label ?? "Overview"}</span>
        <span className="text-clay">{open ? "Close menu" : "Menu +"}</span>
      </button>
      <div
        id="admin-navigation"
        className={`${open ? "block" : "hidden"} pt-3 lg:block lg:pt-0`}
      >
        {navLink("Overview", "/admin")}
        {adminSections.map((section) => (
          <div key={section.label} className="mt-6">
            <h2 className="text-ash mb-2 px-3 font-mono text-[10px] tracking-[0.12em] uppercase">
              {section.label}
            </h2>
            <div className="space-y-1">
              {section.items.map((item) => navLink(item.label, item.href))}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}
