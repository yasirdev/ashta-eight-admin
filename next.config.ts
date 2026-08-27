import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Read from the SAME env var as src/lib/client.ts so config + client can't
  // drift. Build-time inlined. Defaults to "" for local dev — production builds
  // MUST set NEXT_PUBLIC_BASE_PATH=/admin (see .env.example).
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
};

export default nextConfig;
