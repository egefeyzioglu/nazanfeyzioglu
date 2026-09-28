"use client";

import { useState } from "react";

import { Button, cardCls, PageHeader } from "src/app/admin/_components/ui";
import FulfillDialog, {
  type FulfillDialogOrder,
} from "src/app/admin/orders/FulfillDialog";
import {
  carrierLabel,
  effectiveFulfillment,
  formatPrice,
  trackingUrl,
  type EffectiveFulfillment,
  type OrderItemType,
  type PaymentStatus,
  type ShippingDetails,
} from "src/lib/orders";
import { api } from "src/trpc/react";

type ShippingEmailOutcome =
  | "sent"
  | "already_sent"
  | "failed"
  | "not_configured"
  | "no_customer_email"
  | "not_applicable";

/** Admin order list with type filters, payment/fulfillment chips and fulfillment controls. */
export default function AdminOrdersPage() {
  const [filter, setFilter] = useState<OrderItemType | "all">("all");
  const [fulfillDialogOrder, setFulfillDialogOrder] =
    useState<FulfillDialogOrder | null>(null);
  const [shippingEmailStatus, setShippingEmailStatus] = useState<
    Record<number, ShippingEmailOutcome>
  >({});
  const utils = api.useUtils();
  const list = api.orders.list.useQuery();
  const setFulfillment = api.orders.setFulfillment.useMutation({
    onSuccess: () => void utils.orders.list.invalidate(),
  });
  const resendShippingEmail = api.orders.resendShippingEmail.useMutation({
    onSuccess: () => void utils.orders.list.invalidate(),
  });

  const markFulfilled = async (
    order: FulfillDialogOrder,
    input: {
      trackingCarrier: FulfillDialogOrder["trackingCarrier"];
      trackingNumber: string | null;
    },
  ) => {
    try {
      const result = await setFulfillment.mutateAsync({
        id: order.id,
        fulfillmentStatus: "fulfilled",
        ...input,
      });
      setShippingEmailStatus((prev) => ({
        ...prev,
        [result.order.id]: result.shippingEmail,
      }));
      setFulfillDialogOrder(null);
    } catch {
      // React Query exposes the message next to the failed order/dialog.
    }
  };

  const resendShipping = async (id: number) => {
    try {
      const result = await resendShippingEmail.mutateAsync({ id });
      setShippingEmailStatus((prev) => ({
        ...prev,
        [result.order.id]: result.shippingEmail,
      }));
    } catch {
      // React Query exposes the message below the failed order.
    }
  };

  if (list.isLoading) {
    return <p className="text-ash font-mono text-[11px]">Loading…</p>;
  }
  if (list.error) {
    return (
      <p className="font-mono text-[11px] text-red-700">
        Failed to load: {list.error.message}
      </p>
    );
  }

  const allOrders = list.data ?? [];
  const visibleOrders = allOrders.filter(
    (order) => filter === "all" || order.itemType === filter,
  );

  return (
    <div>
      <PageHeader
        eyebrow="Store management"
        title="Orders"
        description="Manage fulfillment and shipping here. Receipts, refunds and payouts are available in the Stripe Dashboard."
      />

      <div className="mt-6 flex flex-wrap gap-2" aria-label="Filter orders">
        {(
          [
            ["all", "All"],
            ["original", "Originals"],
            ["print", "Prints"],
            ["digital", "Digital editions"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={`border-line min-h-11 rounded-full border px-3 py-2 font-mono text-[11px] ${filter === value ? "bg-ink text-paper" : "text-stone"}`}
          >
            {label} (
            {
              allOrders.filter(
                (order) => value === "all" || order.itemType === value,
              ).length
            }
            )
          </button>
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-3">
        {visibleOrders.map((order) => {
          const createdDate = order.createdAt.toLocaleDateString("en-CA", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
          const createdTime = order.createdAt.toLocaleTimeString("en-CA", {
            hour: "numeric",
            minute: "2-digit",
          });
          const fulfillment = effectiveFulfillment(order);
          const isPhysical = order.itemType !== "digital";
          const trackingHref = trackingUrl(
            order.trackingCarrier,
            order.trackingNumber,
          );
          const shippingOutcome = shippingEmailStatus[order.id];
          const shippedDate = order.shippedEmailSentAt?.toLocaleDateString(
            "en-CA",
            {
              year: "numeric",
              month: "short",
              day: "numeric",
            },
          );

          return (
            <article
              key={order.id}
              className={`${cardCls} min-w-0 p-4 break-words sm:p-5`}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-ash font-mono text-[10.5px] tracking-[0.12em] uppercase">
                    {createdDate} · {createdTime}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <h2 className="font-spectral text-[20px] italic">
                      {order.itemTitle}
                    </h2>
                    <Chip>{order.itemType}</Chip>
                  </div>
                  <div className="text-stone mt-2 font-mono text-[11px] leading-[1.8]">
                    {order.quantity} × {formatPrice(order.unitAmount)} · total{" "}
                    {formatPrice(order.amountTotal)}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <PaymentChip status={order.paymentStatus} />
                  <FulfillmentChip status={fulfillment} />
                </div>
              </div>

              <div className="text-stone mt-4 grid grid-cols-1 gap-3 font-mono text-[11px] leading-[1.8] md:grid-cols-2">
                <div>
                  <div>{order.customerName ?? "No customer name"}</div>
                  {order.customerEmail ? (
                    <a
                      href={`mailto:${order.customerEmail}`}
                      className="hover-clay border-line border-b"
                    >
                      {order.customerEmail}
                    </a>
                  ) : (
                    <div className="text-ash">No customer email</div>
                  )}
                </div>
                {order.shippingAddress && (
                  <div>{formatShipping(order.shippingAddress)}</div>
                )}
              </div>

              {fulfillment === "fulfilled" && isPhysical && (
                <div className="border-line-soft text-stone mt-4 border-t pt-4 font-mono text-[11px] leading-[1.8]">
                  {(order.trackingCarrier ?? order.trackingNumber) && (
                    <div>
                      {order.trackingCarrier && (
                        <span>{carrierLabel(order.trackingCarrier)}</span>
                      )}
                      {order.trackingCarrier && order.trackingNumber && (
                        <span> · </span>
                      )}
                      {order.trackingNumber && (
                        <span>{order.trackingNumber}</span>
                      )}
                      {trackingHref && (
                        <>
                          <span> · </span>
                          <a
                            href={trackingHref}
                            target="_blank"
                            rel="noreferrer"
                            className="hover-clay border-line border-b"
                          >
                            Track shipment →
                          </a>
                        </>
                      )}
                    </div>
                  )}
                  {shippedDate && (
                    <div className="text-ash">
                      Shipping email sent {shippedDate}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-4">
                {fulfillment === "pending" && (
                  <Button
                    disabled={
                      setFulfillment.isPending &&
                      setFulfillment.variables?.id === order.id
                    }
                    onClick={() =>
                      order.itemType === "digital"
                        ? void markFulfilled(order, {
                            trackingCarrier: null,
                            trackingNumber: null,
                          })
                        : setFulfillDialogOrder(order)
                    }
                  >
                    Mark fulfilled
                  </Button>
                )}
                {fulfillment === "fulfilled" && (
                  <Button
                    variant="ghost"
                    disabled={
                      setFulfillment.isPending &&
                      setFulfillment.variables?.id === order.id
                    }
                    onClick={() =>
                      void setFulfillment
                        .mutateAsync({
                          id: order.id,
                          fulfillmentStatus: "pending",
                        })
                        .then((result) =>
                          setShippingEmailStatus((prev) => ({
                            ...prev,
                            [result.order.id]: result.shippingEmail,
                          })),
                        )
                        .catch(() => {
                          // React Query exposes the message below the failed order.
                        })
                    }
                  >
                    Mark pending
                  </Button>
                )}
                {fulfillment === "fulfilled" &&
                  isPhysical &&
                  order.customerEmail &&
                  !order.shippedEmailSentAt && (
                    <Button
                      variant="ghost"
                      disabled={
                        resendShippingEmail.isPending &&
                        resendShippingEmail.variables?.id === order.id
                      }
                      onClick={() => void resendShipping(order.id)}
                    >
                      Send shipping email
                    </Button>
                  )}
                {order.stripePaymentIntentId && (
                  <a
                    href={`https://dashboard.stripe.com/payments/${order.stripePaymentIntentId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover-clay text-stone font-mono text-[11px] tracking-[0.12em] uppercase"
                  >
                    View in Stripe →
                  </a>
                )}
              </div>
              <ShippingStatusLine
                outcome={shippingOutcome}
                email={order.customerEmail}
              />
              {setFulfillment.error &&
                setFulfillment.variables?.id === order.id && (
                  <p className="mt-3 font-mono text-[11px] text-red-700">
                    {setFulfillment.error.message}
                  </p>
                )}
              {resendShippingEmail.error &&
                resendShippingEmail.variables?.id === order.id && (
                  <p className="mt-3 font-mono text-[11px] text-red-700">
                    {resendShippingEmail.error.message}
                  </p>
                )}
            </article>
          );
        })}
        {visibleOrders.length === 0 && (
          <p className="text-ash font-mono text-[11px]">
            No orders in this category yet.
          </p>
        )}
      </div>
      {fulfillDialogOrder && (
        <FulfillDialog
          order={fulfillDialogOrder}
          pending={
            setFulfillment.isPending &&
            setFulfillment.variables?.id === fulfillDialogOrder.id
          }
          error={
            setFulfillment.error &&
            setFulfillment.variables?.id === fulfillDialogOrder.id
              ? setFulfillment.error.message
              : null
          }
          onClose={() => setFulfillDialogOrder(null)}
          onFulfill={(input) => markFulfilled(fulfillDialogOrder, input)}
        />
      )}
    </div>
  );
}

function ShippingStatusLine({
  outcome,
  email,
}: {
  outcome: ShippingEmailOutcome | undefined;
  email: string | null;
}) {
  const text = {
    sent: email ? `Shipping confirmation sent to ${email}` : null,
    already_sent: "Shipping confirmation was already sent",
    failed: "Shipping confirmation could not be sent — retry below",
    not_configured: "Email is not configured; no confirmation was sent",
    no_customer_email: "No customer email on this order",
    not_applicable: null,
  }[outcome ?? "not_applicable"];
  return text ? (
    <p className="text-stone mt-3 font-mono text-[11px]">{text}</p>
  ) : null;
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="border-line text-stone border px-2 py-1 font-mono text-[9.5px] tracking-[0.14em] uppercase">
      {children}
    </span>
  );
}

function PaymentChip({ status }: { status: PaymentStatus }) {
  const cls =
    status === "paid"
      ? "border-line text-stone"
      : "border-red-700 text-red-700";
  return (
    <span
      className={`border px-2 py-1 font-mono text-[9.5px] tracking-[0.14em] uppercase ${cls}`}
    >
      {status}
    </span>
  );
}

/** Status chip for the order's effective fulfillment state, including "no action required". */
function FulfillmentChip({ status }: { status: EffectiveFulfillment }) {
  const { cls, label } = {
    pending: { cls: "border-clay-soft text-clay", label: "pending" },
    fulfilled: { cls: "border-line text-stone", label: "fulfilled" },
    oversold: {
      cls: "border-red-700 text-red-700",
      label: "OVERSOLD — refund in Stripe",
    },
    no_action: { cls: "border-line text-ash", label: "no action required" },
  }[status];
  return (
    <span
      className={`border px-2 py-1 font-mono text-[9.5px] tracking-[0.14em] uppercase ${cls}`}
    >
      {label}
    </span>
  );
}

function formatShipping(shipping: ShippingDetails): string {
  const address = shipping.address;
  return [
    shipping.name,
    address?.line1,
    address?.line2,
    address?.city,
    address?.state,
    address?.postal_code,
    address?.country,
  ]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(", ");
}
