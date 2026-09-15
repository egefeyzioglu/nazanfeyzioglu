import { timingSafeEqual } from "node:crypto";

/**
 * Whether GET /api/sentry-test may run. Open outside production; production
 * requires the configured token to match the request header exactly.
 */
export function sentryTestAllowed(input: {
  environment: string;
  token: string | undefined;
  provided: string | null;
}): boolean {
  if (input.environment !== "production") return true;
  if (!input.token || !input.provided) return false;
  const a = Buffer.from(input.token);
  const b = Buffer.from(input.provided);
  return a.length === b.length && timingSafeEqual(a, b);
}
