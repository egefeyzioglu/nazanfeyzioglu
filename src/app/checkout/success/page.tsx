import Link from "next/link";
import { notFound } from "next/navigation";

import ReconcileCart from "src/app/_components/ReconcileCart";
import SidebarBody from "src/app/_components/pages/SidebarBody";
import { CONTENT_DEFAULTS } from "src/lib/content-keys";
import { formatPrice } from "src/lib/orders";
import {
  listSessionLineItems,
  purchasedLines,
} from "src/server/checkout-lines";
import { getStripe, stripeConfigured } from "src/server/stripe";
import { getContent } from "src/server/queries";

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

  const stripeData = await Promise.all([
    getStripe().checkout.sessions.retrieve(sessionId),
    listSessionLineItems(sessionId),
  ]).catch(() => null);
  if (!stripeData) notFound();
  const [session, lines] = stripeData;
  const content = await getContent().catch(() => CONTENT_DEFAULTS);

  const paid = session.payment_status !== "unpaid";
  const purchased = purchasedLines(session, lines).map((line) => ({
    itemType: line.itemType,
    id: line.itemId,
    quantity: line.quantity,
  }));
  const hasPrint = purchased.some((line) => line.itemType === "print");
  const email = session.customer_details?.email;

  return (
    <div className="bg-paper text-ink flex min-h-screen flex-col md:flex-row">
      {paid && <ReconcileCart sessionId={session.id} purchased={purchased} />}
      <SidebarBody active={hasPrint ? "prints" : "series"} content={content} />
      <main className="flex-1 px-9 pt-12 pb-24 md:ml-[280px] md:max-w-[1040px] md:min-w-0 md:px-[72px] md:pt-16">
        <div className="text-ash font-mono text-[10.5px] tracking-[0.3em] uppercase">
          Order
        </div>
        <h1 className="mt-[18px] text-[44px] leading-[1.1] font-light tracking-[-0.015em]">
          {paid ? "Thank you" : "Payment processing"}
        </h1>
        <div className="text-mute mt-5 max-w-[560px] text-[17px] leading-[1.6] font-light">
          {paid && hasPrint && (
            <>
              <p className="whitespace-pre-line">
                {content["prints.confirmation.received"]}
              </p>
              <p className="mt-4 whitespace-pre-line">
                {content["prints.confirmation.shipping"]}
              </p>
            </>
          )}
          {lines.length > 0 && (
            <div className="mt-4">
              <p>
                {paid ? "Your purchase" : "Your payment"}
                {session.amount_total !== null &&
                  ` of ${formatPrice(session.amount_total)}`}
                {paid ? " is confirmed:" : " is still being processed:"}
              </p>
              <ul className="mt-2 list-none p-0">
                {lines.map((line) => (
                  <li key={line.id}>
                    <span className="font-spectral italic">
                      {line.description}
                    </span>
                    {(line.quantity ?? 1) > 1 && ` × ${line.quantity}`}
                  </li>
                ))}
              </ul>
            </div>
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
