import { SignIn } from "@clerk/nextjs";

import { clerkConfigured } from "src/server/auth";

export const metadata = { title: "Sign in — Nazan Feyzioğlu" };

export default function SignInPage() {
  if (!clerkConfigured()) {
    return (
      <main className="grid min-h-screen place-items-center bg-paper px-9 text-ink">
        <p className="max-w-[480px] font-mono text-[12px] leading-[1.9] tracking-[0.04em] text-stone">
          Sign-in isn&apos;t available yet — set
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY in .env to
          enable the admin panel.
        </p>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-paper py-16">
      <SignIn fallbackRedirectUrl="/admin" />
    </main>
  );
}
