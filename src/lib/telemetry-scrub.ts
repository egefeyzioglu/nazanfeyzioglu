/**
 * Redaction shared by the structured webhook log line and the Sentry
 * `beforeSend` hooks. Error messages from Stripe and Postgres are useful for
 * diagnosis and normally contain only identifiers, but nothing guarantees
 * that, so every free-text field is bounded and scrubbed before it leaves
 * the process. Pure module: usable from the root-level Sentry config files.
 */

const MAX_MESSAGE_LENGTH = 300;

const PATTERNS: Array<[RegExp, string]> = [
  // Stripe secret, restricted and webhook-signing keys. Object ids such as
  // cs_… / pi_… / evt_… are deliberately kept: they are the alert context.
  [/\b(?:sk|rk|whsec)_[A-Za-z0-9_]+/g, "[redacted-key]"],
  // Database connection strings carry the password.
  [/\bpostgres(?:ql)?:\/\/[^\s"'`]+/gi, "[redacted-dsn]"],
  // Bearer / basic auth material.
  [/\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, "[redacted-auth]"],
  // Customer email addresses.
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]"],
];

/** Bound and redact a free-text telemetry field. */
export function scrubText(value: string): string {
  let out = value;
  for (const [pattern, replacement] of PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out.length > MAX_MESSAGE_LENGTH
    ? `${out.slice(0, MAX_MESSAGE_LENGTH)}…`
    : out;
}

/** Safe one-line description of an unknown thrown value. */
export function describeError(err: unknown): {
  message: string;
  code?: string;
} {
  const message = err instanceof Error ? err.message : String(err);
  const code =
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof err.code === "string"
      ? err.code
      : undefined;
  return { message: scrubText(message), code };
}

/**
 * Sentry `beforeSend`: strip request payloads, headers and user data, and
 * scrub every free-text field. Typed structurally so this file does not
 * depend on the SDK.
 */
type ScrubbableEvent = {
  message?: string;
  request?: {
    url?: string;
    data?: unknown;
    headers?: unknown;
    cookies?: unknown;
    query_string?: unknown;
  };
  user?: unknown;
  exception?: { values?: Array<{ value?: string }> };
  breadcrumbs?: Array<{ message?: string }>;
};

export function scrubSentryEvent<T extends ScrubbableEvent>(event: T): T {
  if (event.request) {
    delete event.request.data;
    delete event.request.headers;
    delete event.request.cookies;
    delete event.request.query_string;
    if (typeof event.request.url === "string") {
      // Query and fragment can carry tokens or addresses; keep the path only.
      event.request.url = event.request.url.replace(/[?#].*$/, "");
    }
  }
  delete event.user;
  if (typeof event.message === "string") {
    event.message = scrubText(event.message);
  }
  for (const value of event.exception?.values ?? []) {
    if (typeof value.value === "string") value.value = scrubText(value.value);
  }
  for (const crumb of event.breadcrumbs ?? []) {
    if (typeof crumb.message === "string") {
      crumb.message = scrubText(crumb.message);
    }
  }
  return event;
}
