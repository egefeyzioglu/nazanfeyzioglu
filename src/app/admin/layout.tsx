import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { redirect } from "next/navigation";

import { clerkConfigured, getAdminStatus } from "src/server/auth";
import { TRPCReactProvider } from "src/trpc/react";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin — Nazan Feyzioğlu" };

const NAV = [
  { label: "Series", href: "/admin/series" },
  { label: "Prints", href: "/admin/prints" },
  { label: "Exhibitions", href: "/admin/exhibitions" },
  { label: "Page copy", href: "/admin/content" },
];

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-9 text-ink">
      <div className="max-w-[520px]">
        <h1 className="text-[28px] font-light">{title}</h1>
        <div className="mt-4 font-mono text-[12px] leading-[1.9] tracking-[0.04em] text-stone">
          {children}
        </div>
      </div>
    </main>
  );
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!clerkConfigured()) {
    return (
      <Notice title="Admin panel not configured yet">
        Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY in .env
        (from a Clerk application at dashboard.clerk.com), restart the dev
        server, then sign in and set {`{ "role": "admin" }`} in your user&apos;s
        Public metadata in the Clerk dashboard.
      </Notice>
    );
  }

  const { userId, isAdmin } = await getAdminStatus();
  if (!userId) redirect("/sign-in");
  if (!isAdmin) {
    return (
      <Notice title="No admin access">
        You&apos;re signed in, but this account doesn&apos;t have the admin
        role. In the Clerk dashboard, open Users → your user → Metadata and set
        Public metadata to {`{ "role": "admin" }`}, then reload this page.
      </Notice>
    );
  }

  return (
    <TRPCReactProvider>
      <div className="min-h-screen bg-paper text-ink">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-paper px-6 py-4 md:px-10">
          <div className="flex items-baseline gap-8">
            <Link href="/admin" className="font-spectral text-[18px] italic">
              Nazan Feyzioğlu — Admin
            </Link>
            <nav className="flex gap-5 font-mono text-[11px] tracking-[0.12em] uppercase">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="hover-clay text-stone">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-5">
            <Link
              href="/"
              className="hover-clay font-mono text-[11px] tracking-[0.12em] text-stone uppercase"
            >
              View site →
            </Link>
            <UserButton />
          </div>
        </header>
        <main className="mx-auto max-w-[960px] px-6 py-10 md:px-10">
          {children}
        </main>
      </div>
    </TRPCReactProvider>
  );
}
