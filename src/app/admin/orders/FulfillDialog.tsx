"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Button, Field, inputCls } from "src/app/admin/_components/ui";
import { TRACKING_CARRIERS, type TrackingCarrier } from "src/lib/orders";

export type FulfillDialogOrder = {
  id: number;
  itemTitle: string;
  customerEmail: string | null;
  trackingCarrier: TrackingCarrier | null;
  trackingNumber: string | null;
};

/** Collects optional courier details before a physical order is marked shipped. */
export default function FulfillDialog({
  order,
  pending,
  error,
  onClose,
  onFulfill,
}: {
  order: FulfillDialogOrder;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onFulfill: (input: {
    trackingCarrier: TrackingCarrier | null;
    trackingNumber: string | null;
  }) => Promise<void>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [trackingCarrier, setTrackingCarrier] = useState<TrackingCarrier | "">(
    order.trackingCarrier ?? "",
  );
  const [trackingNumber, setTrackingNumber] = useState(
    order.trackingNumber ?? "",
  );
  const blankTracking = trackingNumber.trim() === "";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (trigger instanceof HTMLElement) trigger.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={(event) => {
        if (!event.currentTarget.open) onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onClose();
      }}
      className="bg-paper text-ink fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-[560px] overflow-y-auto border-0 p-0 shadow-2xl backdrop:bg-black/30 backdrop:backdrop-blur-md"
    >
      <form
        className="p-6 md:p-8"
        onSubmit={async (event) => {
          event.preventDefault();
          const number = trackingNumber.trim();
          await onFulfill({
            trackingCarrier: trackingCarrier === "" ? null : trackingCarrier,
            trackingNumber: number === "" ? null : number,
          });
        }}
      >
        <div className="text-ash font-mono text-[10px] tracking-[0.2em] uppercase">
          Fulfillment
        </div>
        <h2
          id={titleId}
          className="font-spectral mt-3 text-[28px] leading-tight font-light"
        >
          Mark order #{order.id} fulfilled
        </h2>
        <p className="text-stone mt-2 font-mono text-[11px] leading-[1.8]">
          {order.itemTitle}
        </p>

        <div className="mt-6 grid gap-4">
          <Field label="Courier">
            <select
              className={inputCls}
              value={trackingCarrier}
              disabled={pending}
              onChange={(event) =>
                setTrackingCarrier(
                  event.currentTarget.value as TrackingCarrier | "",
                )
              }
            >
              <option value="">— none —</option>
              {TRACKING_CARRIERS.map((carrier) => (
                <option key={carrier.id} value={carrier.id}>
                  {carrier.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tracking number">
            <input
              className={inputCls}
              value={trackingNumber}
              maxLength={128}
              disabled={pending}
              onChange={(event) => setTrackingNumber(event.currentTarget.value)}
            />
          </Field>
        </div>

        {blankTracking && (
          <p className="text-clay mt-4 font-mono text-[11px] leading-[1.7]">
            No tracking number entered. The customer will be emailed that the
            order shipped without tracking details.
          </p>
        )}
        {error && (
          <p className="mt-4 font-mono text-[11px] text-red-700">{error}</p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="submit" disabled={pending}>
            {blankTracking ? "Mark fulfilled anyway" : "Mark fulfilled"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
        <p className="text-ash mt-4 font-mono text-[10.5px] leading-[1.7]">
          {order.customerEmail
            ? "The customer will receive a shipping confirmation email."
            : "This order has no customer email, so no confirmation can be sent."}
        </p>
      </form>
    </dialog>
  );
}
