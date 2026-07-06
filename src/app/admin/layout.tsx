import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { redirect } from "next/navigation";

import AdminNav from "src/app/admin/_components/AdminNav";
import {
  clerkConfigured,
  devBypassActive,
  getAdminStatus,
} from "src/server/auth";
import { TRPCReactProvider } from "src/trpc/react";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin — Nazan Feyzioğlu" };

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-9 text-ink">
      <div className="w-full max-w-[520px] rounded-xl border border-line bg-white p-8 shadow-[0_1px_2px_rgba(28,26,23,0.04),0_18px_36px_-28px_rgba(28,26,23,0.32)]">
        <h1 className="font-spectral text-[26px] font-light tracking-[-0.01em]">
          {title}
        </h1>
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
  const bypass = devBypassActive();

  if (!clerkConfigured() && !bypass) {
    return (
      <Notice title="Admin panel not configured yet">
        Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY in .env
        (from a Clerk application at dashboard.clerk.com), restart the dev
        server, then sign in and set {`{ "role": "admin" }`} in your user&apos;s
        Public metadata in the Clerk dashboard. For local development before
        Clerk is set up, you can instead set ADMIN_DEV_BYPASS=1 in .env.
      </Notice>
    );
  }

  if (!bypass) {
    const { userId, isAdmin } = await getAdminStatus();
    if (!userId) redirect("/sign-in");
    if (!isAdmin) {
      return (
        <Notice title="No admin access">
          You&apos;re signed in, but this account doesn&apos;t have the admin
          role. In the Clerk dashboard, open Users → your user → Metadata and
          set Public metadata to {`{ "role": "admin" }`}, then reload this
          page.
        </Notice>
      );
    }
  }

  return (
    <TRPCReactProvider>
      <div className="min-h-screen bg-paper text-ink">
        <header className="sticky top-0 z-20 border-b border-line bg-paper/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1040px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-3.5 md:px-10">
            <div className="flex flex-wrap items-center gap-x-7 gap-y-2">
              <Link
                href="/admin"
                className="flex items-baseline gap-2 whitespace-nowrap"
              >
                <span className="font-spectral text-[18px] italic tracking-tight">
                  Nazan Feyzioğlu
                </span>
                <span className="font-mono text-[9.5px] tracking-[0.22em] text-ash uppercase">
                  Admin
                </span>
              </Link>
              <AdminNav />
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="hover-clay font-mono text-[11px] tracking-[0.12em] text-stone uppercase"
              >
                View site →
              </Link>
              {bypass ? (
                <span className="rounded-full border border-clay-soft bg-clay/5 px-2.5 py-1 font-mono text-[9.5px] tracking-[0.14em] text-clay uppercase">
                  Dev mode
                </span>
              ) : (
                <UserButton />
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1040px] px-6 py-10 md:px-10">
          {children}
        </main>
      </div>
    </TRPCReactProvider>
  );
}
