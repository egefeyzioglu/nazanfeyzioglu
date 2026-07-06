import Link from "next/link";
import { notFound } from "next/navigation";

import Sidebar from "src/app/_components/Sidebar";
import { formatPrice } from "src/lib/orders";
import { getStripe, stripeConfigured } from "src/server/stripe";

export const dynamic = "force-dynamic";

export const metadata = { title: "Thank you — Nazan Feyzioğlu" };

/**
 * Post-checkout landing page. Reads the session straight from Stripe rather
 * than the orders table, so it renders correctly even if the webhook delivery
 * hasn't landed yet.
 */
export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  if (!stripeConfigured() || !sessionId) notFound();

  const session = await getStripe()
    .checkout.sessions.retrieve(sessionId, { expand: ["line_items"] })
    .catch(() => null);
  if (!session) notFound();

  const paid = session.payment_status !== "unpaid";
  const itemName = session.line_items?.data[0]?.description;
  const email = session.customer_details?.email;

  return (
    <div className="bg-paper text-ink flex min-h-screen flex-col md:flex-row">
      <Sidebar active="prints" />
      <main className="flex-1 px-9 pt-12 pb-24 md:ml-[280px] md:max-w-[1040px] md:min-w-0 md:px-[72px] md:pt-16">
        <div className="text-ash font-mono text-[10.5px] tracking-[0.3em] uppercase">
          Order
        </div>
        <h1 className="mt-[18px] text-[44px] leading-[1.1] font-light tracking-[-0.015em]">
          {paid ? "Thank you" : "Payment processing"}
        </h1>
        <div className="text-mute mt-5 max-w-[560px] text-[17px] leading-[1.6] font-light">
          {itemName && (
            <p>
              {paid ? "Your purchase of " : "Your payment for "}
              <span className="font-spectral italic">{itemName}</span>
              {session.amount_total !== null &&
                ` (${formatPrice(session.amount_total)})`}
              {paid ? " is confirmed." : " is still being processed."}
            </p>
          )}
          <p className="mt-4">
            {paid
              ? email
                ? `A receipt has been sent to ${email}.`
                : "A receipt has been sent to your email address."
              : "You'll receive a receipt by email once the payment settles."}
          </p>
        </div>
        <Link
          href="/"
          className="hover-clay text-stone mt-10 inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] uppercase"
        >
          ← Back to the works
        </Link>
      </main>
    </div>
  );
}
