import "server-only";

import { after } from "next/server";
import { PostHog } from "posthog-node";

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

// Configuration is validated once at module load, so a missing variable is
// noticed when a route first imports this helper — never after a Stripe
// session or database write has already happened.
if (!token || !host) {
  const variable = !token
    ? "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN"
    : "NEXT_PUBLIC_POSTHOG_HOST";
  const message = `${variable} is not set, so server-side PostHog events are not sent`;
  if (process.env.NODE_ENV === "development") {
    throw new Error(
      `${message}. Add it to .env.local (see .env.example) to enable analytics.`,
    );
  }
  console.warn(`[posthog] ${message}`);
}

/**
 * One client per server instance. Events are queued in memory and flushed
 * after the response has been sent (see scheduleFlush), so telemetry never
 * delays a request or turns a completed write into a failed response.
 */
const client =
  token && host
    ? new PostHog(token, {
        host,
        flushAt: 20,
        flushInterval: 0,
        requestTimeout: 5_000,
      })
    : null;

function scheduleFlush(posthog: PostHog) {
  const flush = () =>
    posthog.flush().catch((err: unknown) => {
      console.error("[posthog] flush failed", err);
    });
  try {
    // Keeps the serverless function alive until the flush finishes, without
    // blocking the response.
    after(flush);
  } catch {
    // Outside a request scope (e.g. scripts): flush in the background.
    void flush();
  }
}

/** Records a server-side event. Never throws; failures are logged. */
export function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): void {
  if (!client) return;
  try {
    client.capture({ distinctId, event, properties });
    scheduleFlush(client);
  } catch (err) {
    console.error("[posthog] capture failed", err);
  }
}

/**
 * Records a server-side error. Only the error's type and, when present, a
 * code or status are sent — never the original message, stack or causes,
 * which can echo request input (e.g. unknown keys in tRPC validation errors).
 */
export function captureServerException(
  error: unknown,
  distinctId: string,
): void {
  if (!client) return;
  try {
    const summary = summarizeError(error);
    const safe = new Error(summary.message);
    safe.name = summary.name;
    client.captureException(safe, distinctId, {
      error_name: summary.name,
      ...(summary.code && { error_code: summary.code }),
    });
    scheduleFlush(client);
  } catch (err) {
    console.error("[posthog] exception capture failed", err);
  }
}

function summarizeError(error: unknown): {
  name: string;
  code?: string;
  message: string;
} {
  if (!(error instanceof Error)) {
    return { name: "NonError", message: "Non-error value thrown" };
  }
  const name = error.name || error.constructor.name || "Error";
  const code = readStringField(error, "code") ?? readStringField(error, "type");
  const status = readNumberField(error, "statusCode");
  const parts = [name];
  if (code) parts.push(code);
  if (status !== undefined) parts.push(`HTTP ${status}`);
  return { name, code, message: parts.join(" · ") };
}

function readStringField(obj: object, key: string): string | undefined {
  const value = (obj as Record<string, unknown>)[key];
  return typeof value === "string" && value.length <= 64 ? value : undefined;
}

function readNumberField(obj: object, key: string): number | undefined {
  const value = (obj as Record<string, unknown>)[key];
  return typeof value === "number" ? value : undefined;
}
