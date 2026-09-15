/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import { withSentryConfig } from "@sentry/nextjs/config";

import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  images: {
    // Serve images directly instead of through Vercel's metered Image
    // Optimization endpoint, which returns HTTP 402 once the plan quota is hit.
    unoptimized: true,
  },
};

export default withSentryConfig(config, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: false,
  // Source maps are only uploaded when the Sentry Vercel integration (or a
  // manual SENTRY_AUTH_TOKEN) is present; builds work without any Sentry env.
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  webpack: {
    automaticVercelMonitors: false,
    treeshake: { removeDebugLogging: true },
  },
});
