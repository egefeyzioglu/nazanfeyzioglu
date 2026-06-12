import Link from "next/link";

const links = [
  { href: "/art", label: "Art" },
  { href: "/about", label: "About" },
  { href: "#", label: "Contact" },
];

export default function HomeSidebar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-6 border-b border-neutral-900/10 bg-neutral-50/80 px-6 py-4 backdrop-blur-md md:inset-y-0 md:right-auto md:left-0 md:w-56 md:flex-col md:items-start md:justify-start md:gap-12 md:border-b-0 md:border-r md:px-8 md:py-10 lg:w-64">
      <Link
        href="/"
        className="whitespace-nowrap font-display text-lg italic tracking-tight text-neutral-900 md:text-xl"
      >
        Nazan Feyzioglu
      </Link>
      <nav>
        <ul className="flex gap-6 text-xs uppercase tracking-[0.18em] text-neutral-500 md:flex-col md:gap-4">
          {links.map((link) => (
            <li key={link.label}>
              <Link
                href={link.href}
                className="transition-colors hover:text-neutral-900"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
