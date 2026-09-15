import "server-only";

import { Resend } from "resend";

import { env } from "src/env";
import {
  carrierLabel,
  formatPrice,
  trackingUrl,
  type OrderItemType,
  type ShippingDetails,
  type TrackingCarrier,
} from "src/lib/orders";

/**
 * Whether transactional email is available. Until RESEND_API_KEY and
 * ORDER_EMAIL_FROM are set, orders are still recorded but no confirmation or
 * seller notification is sent — the same optional-until-configured pattern as
 * Clerk, UploadThing and Stripe.
 */
export function emailConfigured(): boolean {
  return Boolean(env.RESEND_API_KEY && env.ORDER_EMAIL_FROM);
}

let client: Resend | undefined;

/** Lazily constructed Resend client (the key may be unset at import time). */
function getResend(): Resend {
  if (!env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  client ??= new Resend(env.RESEND_API_KEY);
  return client;
}

/** Snapshot of a freshly recorded order, as needed to write the emails. */
export type OrderEmailData = {
  orderId: number;
  stripeCheckoutSessionId: string;
  itemType: OrderItemType;
  itemTitle: string;
  quantity: number;
  unitAmount: number;
  amountTotal: number;
  customerEmail: string | null;
  customerName: string | null;
  shippingAddress: ShippingDetails | null;
  /** The paid checkout exceeded stock and needs a manual refund. */
  oversold: boolean;
};

/** The two messages sent for an order, tracked separately. */
export type OrderEmailKind = "confirmation" | "notification";

export type ShippingEmailData = {
  orderId: number;
  stripeCheckoutSessionId: string;
  itemType: OrderItemType;
  itemTitle: string;
  customerEmail: string;
  customerName: string | null;
  shippingAddress: ShippingDetails | null;
  trackingCarrier: TrackingCarrier | null;
  trackingNumber: string | null;
};

/**
 * Sends whichever of the customer's order confirmation and the seller's
 * new-order notification are still owed for a recorded order. Never throws:
 * the order is already committed, so delivery failures are logged instead.
 * Each message carries an idempotency key derived from the checkout session,
 * so a retried webhook cannot send duplicates.
 *
 * Resolves, per message, whether it is now settled: accepted by Resend, not
 * owed, or (for the confirmation) impossible to send because Stripe gave no
 * customer email. False means it is still owed — delivery failed, email is
 * not configured, or no seller address is configured — and the caller should
 * keep it pending. (The webhook only calls this when email is configured; it
 * settles unconfigured orders itself, since that is not retryable.)
 */
export async function sendOrderEmails(
  order: OrderEmailData,
  content: Record<string, string>,
  owed: Record<OrderEmailKind, boolean>,
): Promise<Record<OrderEmailKind, boolean>> {
  if (!emailConfigured()) return { confirmation: false, notification: false };

  const sellerEmail = env.ORDER_NOTIFICATION_EMAIL ?? content["contact.email"];

  const confirmation = async (): Promise<boolean> => {
    if (!owed.confirmation) return true;
    if (!order.customerEmail) {
      console.warn(
        `Order ${order.orderId} has no customer email; skipping confirmation`,
      );
      return true;
    }
    return deliver(
      "confirmation",
      order.orderId,
      {
        to: order.customerEmail,
        ...(sellerEmail && { replyTo: sellerEmail }),
        subject: order.oversold
          ? `About your order — ${describeItem(order)}`
          : `Order confirmation — ${describeItem(order)}`,
        ...renderCustomerEmail(order, content),
      },
      {
        idempotencyKey: `order-confirmation/${order.stripeCheckoutSessionId}`,
      },
    );
  };

  const notification = async (): Promise<boolean> => {
    if (!owed.notification) return true;
    if (!sellerEmail) {
      // Unlike a missing customer email, this is fixable: leave the
      // notification owed so it goes out once an address is configured.
      console.error(
        `No seller email configured (ORDER_NOTIFICATION_EMAIL or the Contact page email); notification for order ${order.orderId} is still owed`,
      );
      return false;
    }
    return deliver(
      "notification",
      order.orderId,
      {
        to: sellerEmail,
        ...(order.customerEmail && { replyTo: order.customerEmail }),
        subject: `${order.oversold ? "OVERSOLD — " : ""}New order #${order.orderId}: ${describeItem(order)}`,
        ...renderSellerEmail(order),
      },
      {
        idempotencyKey: `order-notification/${order.stripeCheckoutSessionId}`,
      },
    );
  };

  const [confirmed, notified] = await Promise.all([
    confirmation(),
    notification(),
  ]);
  return { confirmation: confirmed, notification: notified };
}

/**
 * Sends the shipping confirmation. Resolves true when Resend accepted it;
 * never throws (failures are logged). Returns false when email is not configured.
 */
export async function sendShippingEmail(
  order: ShippingEmailData,
  content: Record<string, string>,
): Promise<boolean> {
  if (!emailConfigured()) return false;
  const replyTo = env.ORDER_NOTIFICATION_EMAIL ?? content["contact.email"];
  return deliver("shipping confirmation", order.orderId, {
    to: order.customerEmail,
    ...(replyTo && { replyTo }),
    subject: `Your order has shipped — ${describeItem(order)}`,
    ...renderShippingEmail(order),
  });
}

type Message = {
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
};

async function deliver(
  kind: string,
  orderId: number,
  message: Message,
  options?: { idempotencyKey?: string },
): Promise<boolean> {
  const from = env.ORDER_EMAIL_FROM;
  if (!from) return false;
  try {
    const { error } = await getResend().emails.send(
      { from, ...message },
      options,
    );
    if (error) {
      console.error(
        `Resend rejected the order ${kind} for order ${orderId}: ${error.name}: ${error.message}`,
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error(`Failed to send the order ${kind} for order ${orderId}`, err);
    return false;
  }
}

/** Human-readable item line, e.g. "Field Study (original)". */
export function describeItem(
  order: Pick<OrderEmailData, "itemType" | "itemTitle">,
): string {
  switch (order.itemType) {
    case "original":
      return `${order.itemTitle} (original)`;
    case "digital":
      return `${order.itemTitle} (digital edition)`;
    default:
      return order.itemTitle;
  }
}

/** Line items shared by both emails: item, optional shipping, total. */
function summaryLines(order: OrderEmailData): Array<[string, string]> {
  const subtotal = order.unitAmount * order.quantity;
  const shipping = order.amountTotal - subtotal;
  const lines: Array<[string, string]> = [
    [
      describeItem(order),
      order.quantity > 1
        ? `${order.quantity} × ${formatPrice(order.unitAmount)}`
        : formatPrice(order.unitAmount),
    ],
  ];
  if (order.itemType !== "digital") {
    lines.push(["Shipping", shipping > 0 ? formatPrice(shipping) : "Free"]);
  }
  lines.push(["Total", formatPrice(order.amountTotal)]);
  return lines;
}

function formatShipping(shipping: ShippingDetails): string[] {
  const address = shipping.address;
  return [
    shipping.name,
    address?.line1,
    address?.line2,
    [address?.city, address?.state, address?.postal_code]
      .filter((part): part is string => Boolean(part?.trim()))
      .join(", "),
    address?.country,
  ].filter((part): part is string => Boolean(part?.trim()));
}

function renderCustomerEmail(
  order: OrderEmailData,
  content: Record<string, string>,
): Pick<Message, "html" | "text"> {
  const greeting = order.customerName
    ? `Dear ${order.customerName},`
    : "Hello,";
  const intro = order.oversold
    ? `Thank you for your interest in ${describeItem(order)}. Unfortunately it sold out moments before your payment completed, so we are unable to fulfil this order.`
    : `Thank you for your purchase. Your order for ${describeItem(order)} is confirmed.`;
  const paragraphs: string[] = [];
  if (order.oversold) {
    // Don't promise preparation or shipping for an order that is being
    // refunded; the seller email carries the refund instruction.
    paragraphs.push(
      "Your payment will be refunded in full to your original payment method within a few business days. You do not need to do anything.",
    );
  } else if (order.itemType === "print") {
    for (const key of [
      "prints.confirmation.received",
      "prints.confirmation.shipping",
    ]) {
      const value = content[key]?.trim();
      if (value) paragraphs.push(value);
    }
  } else if (order.itemType === "original") {
    paragraphs.push(
      "Your original will be carefully packed and shipped to the address below. You will hear from us once it is on its way.",
    );
  } else {
    paragraphs.push(
      "Your digital edition will be sent to this email address shortly.",
    );
  }
  const shippingLines =
    order.shippingAddress && !order.oversold
      ? formatShipping(order.shippingAddress)
      : [];
  const outro = `Order reference: #${order.orderId}. Simply reply to this email if you have any questions.`;

  const text = [
    greeting,
    "",
    intro,
    "",
    ...paragraphs.flatMap((p) => [p, ""]),
    ...summaryLines(order).map(([label, value]) => `${label}: ${value}`),
    ...(shippingLines.length ? ["", "Shipping to:", ...shippingLines] : []),
    "",
    outro,
    "",
    "Nazan Feyzioğlu",
  ].join("\n");

  const html = layout(
    order.oversold ? "About your order" : "Thank you",
    [
      `<p>${escapeHtml(greeting)}</p>`,
      `<p>${escapeHtml(intro)}</p>`,
      ...paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`),
      summaryTable(order),
      ...(shippingLines.length
        ? [addressBlock("Shipping to", shippingLines)]
        : []),
      `<p>${escapeHtml(outro)}</p>`,
      `<p>Nazan Feyzioğlu</p>`,
    ].join("\n"),
  );
  return { html, text };
}

function renderSellerEmail(
  order: OrderEmailData,
): Pick<Message, "html" | "text"> {
  const customer = [order.customerName, order.customerEmail]
    .filter((part): part is string => Boolean(part))
    .join(" — ");
  const shippingLines = order.shippingAddress
    ? formatShipping(order.shippingAddress)
    : [];
  const adminUrl = env.SITE_URL
    ? `${env.SITE_URL.replace(/\/$/, "")}/admin/orders`
    : null;
  const warning = order.oversold
    ? "This payment exceeded the available stock. Refund it in the Stripe Dashboard and contact the buyer."
    : null;

  const text = [
    `New order #${order.orderId} — ${describeItem(order)}`,
    "",
    ...(warning ? [`OVERSOLD: ${warning}`, ""] : []),
    `Customer: ${customer || "unknown"}`,
    ...summaryLines(order).map(([label, value]) => `${label}: ${value}`),
    ...(shippingLines.length ? ["", "Ship to:", ...shippingLines] : []),
    "",
    `Stripe checkout session: ${order.stripeCheckoutSessionId}`,
    ...(adminUrl ? [`Manage fulfillment: ${adminUrl}`] : []),
  ].join("\n");

  const html = layout(
    `New order #${order.orderId}`,
    [
      ...(warning
        ? [
            `<p style="color:#b42318"><strong>Oversold.</strong> ${escapeHtml(warning)}</p>`,
          ]
        : []),
      `<p><strong>Customer:</strong> ${escapeHtml(customer || "unknown")}</p>`,
      summaryTable(order),
      ...(shippingLines.length ? [addressBlock("Ship to", shippingLines)] : []),
      `<p style="color:#666;font-size:13px">Stripe checkout session: ${escapeHtml(order.stripeCheckoutSessionId)}</p>`,
      ...(adminUrl
        ? [
            `<p><a href="${escapeHtml(adminUrl)}">Manage fulfillment in the admin panel</a></p>`,
          ]
        : []),
    ].join("\n"),
  );
  return { html, text };
}

function renderShippingEmail(
  order: ShippingEmailData,
): Pick<Message, "html" | "text"> {
  const greeting = order.customerName
    ? `Dear ${order.customerName},`
    : "Hello,";
  const item = describeItem(order);
  const intro = `Good news: your order for ${item} is on its way.`;
  let number = order.trackingNumber?.trim() ?? null;
  if (number === "") number = null;
  const carrier = order.trackingCarrier
    ? carrierLabel(order.trackingCarrier)
    : null;
  const url = trackingUrl(order.trackingCarrier, number);
  const shippingLines = order.shippingAddress
    ? formatShipping(order.shippingAddress)
    : [];
  const outro = `Order reference: #${order.orderId}. Simply reply to this email if you have any questions.`;

  const trackingText = number
    ? [
        `Tracking number: ${number}`,
        ...(carrier ? [`Courier: ${carrier}`] : []),
        ...(url ? [`Track your shipment: ${url}`] : []),
      ]
    : ["The courier did not provide a tracking number for this shipment."];

  const text = [
    greeting,
    "",
    intro,
    "",
    ...trackingText,
    ...(shippingLines.length ? ["", "Shipping to:", ...shippingLines] : []),
    "",
    outro,
    "",
    "Nazan Feyzioğlu",
  ].join("\n");

  const html = layout(
    "On its way",
    [
      `<p>${escapeHtml(greeting)}</p>`,
      `<p>${escapeHtml(intro)}</p>`,
      number
        ? `<p>${escapeHtml(`Tracking number: ${number}`)}${carrier ? `<br>${escapeHtml(`Courier: ${carrier}`)}` : ""}</p>`
        : `<p>${escapeHtml("The courier did not provide a tracking number for this shipment.")}</p>`,
      ...(url
        ? [`<p><a href="${escapeHtml(url)}">Track your shipment</a></p>`]
        : []),
      ...(shippingLines.length
        ? [addressBlock("Shipping to", shippingLines)]
        : []),
      `<p>${escapeHtml(outro)}</p>`,
      `<p>Nazan Feyzioğlu</p>`,
    ].join("\n"),
  );
  return { html, text };
}

function addressBlock(label: string, lines: string[]): string {
  return `<p style="margin-bottom:4px"><strong>${escapeHtml(label)}</strong></p><p style="margin-top:0">${lines.map(escapeHtml).join("<br>")}</p>`;
}

function summaryTable(order: OrderEmailData): string {
  const lines = summaryLines(order);
  const rows = lines
    .map(([label, value], index) => {
      const weight = index === lines.length - 1 ? "font-weight:600;" : "";
      return `<tr><td style="padding:6px 0;${weight}">${escapeHtml(label)}</td><td style="padding:6px 0;text-align:right;${weight}">${escapeHtml(value)}</td></tr>`;
    })
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:480px;border-collapse:collapse;margin:16px 0;border-top:1px solid #ddd;border-bottom:1px solid #ddd">${rows}</table>`;
}

function layout(heading: string, body: string): string {
  return `<!doctype html>
<html>
<body style="margin:0;padding:24px;background:#faf9f6;color:#1d1c1a;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.6">
<div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border:1px solid #e6e3dc">
<p style="margin:0 0 8px;font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#8a877f">Nazan Feyzioğlu</p>
<h1 style="margin:0 0 20px;font-size:28px;font-weight:300">${escapeHtml(heading)}</h1>
${body}
</div>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
