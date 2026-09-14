import * as Sentry from "@sentry/nextjs";

import { scrubSentryEvent } from "./src/lib/telemetry-scrub";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  sendDefaultPii: false,
  tracesSampleRate: 0,
  // Never capture local variables: webhook frames hold the raw payload,
  // the signature header and customer details.
  includeLocalVariables: false,
  beforeSend: (event) => scrubSentryEvent(event),
});
