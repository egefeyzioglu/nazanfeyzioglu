import "server-only";

import * as Sentry from "@sentry/nextjs";

import { env } from "src/env";

export type DeploymentEnvironment = "production" | "preview" | "development";

export function deploymentEnvironment(): DeploymentEnvironment {
  return (
    env.VERCEL_ENV ??
    (env.NODE_ENV === "production" ? "production" : "development")
  );
}

export type WebhookFailureStage =
  | "config"
  | "signature"
  | "handler"
  | "lookup"
  | "persist";

export type WebhookFailureContext = {
  stage: WebhookFailureStage;
  environment: DeploymentEnvironment;
  livemode?: boolean;
  eventId?: string;
  eventType?: string;
  checkoutSessionId?: string;
  paymentIntentId?: string;
  itemType?: string;
  itemId?: number;
};

export function reportWebhookFailure(
  err: unknown,
  ctx: WebhookFailureContext,
  level: "error" | "warning" = "error",
): void {
  const message = err instanceof Error ? err.message : String(err);
  const code =
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof err.code === "string"
      ? err.code
      : undefined;
  const log = JSON.stringify({
    tag: "stripe_webhook_failure",
    level,
    message,
    code,
    ...ctx,
  });

  if (level === "warning") {
    console.warn(log);
  } else {
    console.error(log);
  }

  try {
    const tags = withoutUndefined({
      area: "stripe-webhook",
      stage: ctx.stage,
      environment: ctx.environment,
      livemode: ctx.livemode === undefined ? undefined : String(ctx.livemode),
      stripe_event_type: ctx.eventType,
    });
    const options = {
      level,
      tags,
      contexts: {
        stripe: {
          eventId: ctx.eventId,
          eventType: ctx.eventType,
          checkoutSessionId: ctx.checkoutSessionId,
          paymentIntentId: ctx.paymentIntentId,
          itemType: ctx.itemType,
          itemId: ctx.itemId,
        },
      },
    };

    if (level === "warning" && !(err instanceof Error)) {
      Sentry.captureMessage(message, options);
      return;
    }

    Sentry.captureException(err, options);
  } catch {
    // Reporting must never change webhook behaviour or block Stripe retries.
  }
}

function withoutUndefined<T extends Record<string, string | undefined>>(
  value: T,
) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  );
}
