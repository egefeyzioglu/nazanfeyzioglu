"use client";

import posthog from "posthog-js";
import { useState, type ReactNode } from "react";

export default function BuyButton({
  itemType,
  id,
  cancelPath,
  className,
  children,
}: {
  itemType: "print" | "digital" | "original";
  id: number;
  cancelPath: string;
  className?: string;
  children: ReactNode;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-start gap-2 md:items-end">
      <button
        type="button"
        className={className}
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(null);

          try {
            posthog.capture(
              "checkout_started",
              { item_type: itemType, item_id: id },
              // The page navigates to Stripe right after; don't leave this in
              // the batch queue.
              { send_instantly: true },
            );

            const res = await fetch("/api/checkout", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-POSTHOG-DISTINCT-ID": posthog.get_distinct_id(),
                "X-POSTHOG-SESSION-ID": posthog.get_session_id(),
              },
              body: JSON.stringify({ itemType, id, cancelPath }),
            });
            const data = (await res.json()) as {
              url?: string;
              error?: string;
            };

            if (!res.ok || !data.url) {
              throw new Error(
                data.error ?? "Something went wrong — please try again",
              );
            }

            window.location.assign(data.url);
          } catch (err) {
            posthog.captureException(err);
            setError(
              err instanceof Error
                ? err.message
                : "Something went wrong — please try again",
            );
            setPending(false);
          }
        }}
      >
        {pending ? "Redirecting…" : children}
      </button>
      {error && (
        <p role="alert" className="font-mono text-[10px] text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
