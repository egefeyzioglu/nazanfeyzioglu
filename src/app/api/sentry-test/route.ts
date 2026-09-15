import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { env } from "src/env";
import { sentryTestAllowed } from "src/lib/sentry-test-guard";
import {
  deploymentEnvironment,
  reportWebhookFailure,
} from "src/server/observability";

export const dynamic = "force-dynamic";

const MODES = ["webhook", "throw"] as const;
type Mode = (typeof MODES)[number];

/**
 * Manual Sentry smoke test. Sends a synthetic event through the same pipeline
 * as real webhook failures so the DSN, environment tag, scrubbing and alert
 * rules can be verified end to end.
 *
 * Disabled (404) unless SENTRY_DSN is set. Outside production it is open;
 * in production the request must carry `x-sentry-test-token` matching
 * SENTRY_TEST_TOKEN.
 *
 *   GET /api/sentry-test               -> reportWebhookFailure(), 200
 *   GET /api/sentry-test?mode=throw    -> unhandled error, 500 via onRequestError
 */
export async function GET(req: Request) {
  const environment = deploymentEnvironment();
  if (!env.SENTRY_DSN) {
    return NextResponse.json(
      {
        error: `SENTRY_DSN is not set for the ${environment} environment; add it in Vercel and redeploy`,
      },
      { status: 404 },
    );
  }
  if (
    !sentryTestAllowed({
      environment,
      token: env.SENTRY_TEST_TOKEN,
      provided: req.headers.get("x-sentry-test-token"),
    })
  ) {
    return new NextResponse(null, { status: 404 });
  }

  const modeParam = new URL(req.url).searchParams.get("mode") ?? "webhook";
  if (!isMode(modeParam)) {
    return NextResponse.json(
      { error: `mode must be one of ${MODES.join(", ")}` },
      { status: 400 },
    );
  }

  const testId = `sentry-test-${Date.now().toString(36)}`;

  if (modeParam === "throw") {
    // Exercises Next's onRequestError hook (Sentry.captureRequestError).
    throw new Error(`Sentry test: unhandled route error (${testId})`);
  }

  reportWebhookFailure(
    new Error(`Sentry test: synthetic webhook failure (${testId})`),
    {
      stage: "handler",
      environment,
      livemode: false,
      eventId: testId,
      eventType: "sentry.test",
    },
  );
  // Serverless functions may freeze before the SDK's background send fires.
  const flushed = await Sentry.flush(2000);

  return NextResponse.json({
    ok: true,
    testId,
    environment,
    flushed,
    hint: `Search Sentry for "${testId}" or filter on area:stripe-webhook stripe_event_type:sentry.test`,
  });
}

function isMode(value: string): value is Mode {
  return (MODES as readonly string[]).includes(value);
}
