import posthog from "posthog-js";

const posthogToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

if (!posthogToken || !posthogHost) {
  const variable = !posthogToken
    ? "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN"
    : "NEXT_PUBLIC_POSTHOG_HOST";
  const message = `${variable} is not set, so PostHog analytics are disabled`;
  if (process.env.NODE_ENV === "development") {
    throw new Error(
      `${message}. Add it to .env.local (see .env.example) to enable analytics.`,
    );
  }
  // NEXT_PUBLIC_* values are inlined at build time, so on Vercel the variable
  // must be set for the environment being built (preview and production).
  console.warn(`[posthog] ${message}`);
} else {
  posthog.init(posthogToken, {
    api_host: posthogHost,
    defaults: "2026-05-30",
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
  });
}
