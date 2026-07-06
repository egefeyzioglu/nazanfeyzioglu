"use client";

import { useState, type ReactNode } from "react";

export default function BuyButton({
  itemType,
  id,
  cancelPath,
  className,
  children,
}: {
  itemType: "print" | "digital";
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
            const res = await fetch("/api/checkout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
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
