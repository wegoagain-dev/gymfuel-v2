import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // A self-contained server (server.js plus only the node_modules it needs) for the container image.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  // Loaded from node_modules at runtime instead of being bundled (PGlite ships WASM files).
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
}

export default nextConfig
