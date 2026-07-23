"use client";

import { Button } from "src/app/admin/_components/ui";
import {
  formatPrice,
  type FulfillmentStatus,
  type PaymentStatus,
  type ShippingDetails,
} from "src/lib/orders";
import { api } from "src/trpc/react";

export default function AdminOrdersPage() {
  const utils = api.useUtils();
  const list = api.orders.list.useQuery();
  const setFulfillment = api.orders.setFulfillment.useMutation({
    onSuccess: () => void utils.orders.list.invalidate(),
  });

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

  const orders = list.data ?? [];

  return (
    <div>
      <h1 className="text-[28px] font-light">Orders</h1>
      <p className="text-stone mt-2 font-mono text-[11px] leading-[1.8]">
        Fulfillment is tracked here; receipts, refunds and payouts live in the
        Stripe Dashboard.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {orders.map((order) => {
          const createdDate = order.createdAt.toLocaleDateString("en-CA", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
          const createdTime = order.createdAt.toLocaleTimeString("en-CA", {
            hour: "numeric",
            minute: "2-digit",
          });

          return (
            <article
              key={order.id}
              className="border-line border bg-white/40 p-5"
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
                  <FulfillmentChip status={order.fulfillmentStatus} />
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

              <div className="mt-5 flex flex-wrap items-center gap-4">
                {order.fulfillmentStatus === "pending" && (
                  <Button
                    disabled={
                      setFulfillment.isPending &&
                      setFulfillment.variables?.id === order.id
                    }
                    onClick={() =>
                      setFulfillment.mutate({
                        id: order.id,
                        fulfillmentStatus: "fulfilled",
                      })
                    }
                  >
                    Mark fulfilled
                  </Button>
                )}
                {order.fulfillmentStatus === "fulfilled" && (
                  <Button
                    variant="ghost"
                    disabled={
                      setFulfillment.isPending &&
                      setFulfillment.variables?.id === order.id
                    }
                    onClick={() =>
                      setFulfillment.mutate({
                        id: order.id,
                        fulfillmentStatus: "pending",
                      })
                    }
                  >
                    Mark pending
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
              {setFulfillment.error &&
                setFulfillment.variables?.id === order.id && (
                  <p className="mt-3 font-mono text-[11px] text-red-700">
                    {setFulfillment.error.message}
                  </p>
                )}
            </article>
          );
        })}
        {orders.length === 0 && (
          <p className="text-ash font-mono text-[11px]">No orders yet.</p>
        )}
      </div>
    </div>
  );
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

function FulfillmentChip({ status }: { status: FulfillmentStatus }) {
  const cls = {
    pending: "border-clay-soft text-clay",
    fulfilled: "border-line text-stone",
    oversold: "border-red-700 text-red-700",
  }[status];
  return (
    <span
      className={`border px-2 py-1 font-mono text-[9.5px] tracking-[0.14em] uppercase ${cls}`}
    >
      {status === "oversold" ? "OVERSOLD — refund in Stripe" : status}
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
