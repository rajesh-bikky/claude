import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Resolves its binary path via __dirname at runtime, which breaks if the
  // bundler rewrites module paths. Keep it as a plain require() instead of
  // bundling it.
  serverExternalPackages: ["ffmpeg-static"],
};

export default nextConfig;
