import { SignIn } from "@clerk/nextjs";

import { clerkConfigured } from "src/server/auth";

export const metadata = { title: "Sign in — Nazan Feyzioğlu" };

export default function SignInPage() {
  if (!clerkConfigured()) {
    return (
      <main className="bg-paper text-ink grid min-h-screen place-items-center px-9">
        <p className="text-stone max-w-[480px] font-mono text-[12px] leading-[1.9] tracking-[0.04em]">
          Sign-in isn&apos;t available yet — set
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY in .env to
          enable the admin panel.
        </p>
      </main>
    );
  }

  return (
    <main className="bg-paper grid min-h-screen place-items-center py-16">
      <SignIn fallbackRedirectUrl="/admin" />
    </main>
  );
}
