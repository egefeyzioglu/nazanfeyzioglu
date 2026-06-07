import Link from "next/link";

export default function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-neutral-950/40 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-10">
        <Link
          href="/"
          className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-100"
        >
          Nazan Feyzioglu
        </Link>
        <ul className="flex gap-8 text-xs uppercase tracking-[0.15em] text-neutral-400">
          <li>
            <Link href="#" className="transition-colors hover:text-neutral-100">
              Work
            </Link>
          </li>
          <li>
            <Link href="#" className="transition-colors hover:text-neutral-100">
              About
            </Link>
          </li>
          <li>
            <Link href="#" className="transition-colors hover:text-neutral-100">
              Contact
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
