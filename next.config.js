/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  images: {
    // Serve images directly instead of through Vercel's metered Image
    // Optimization endpoint, which returns HTTP 402 once the plan quota is hit.
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "picsum.photos" }],
  },
};

export default config;
