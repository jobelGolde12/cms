import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},

  // Disable source maps in production to save memory/CPU
  productionBrowserSourceMaps: false,

  // Strip console logs in production, but keep console.error for diagnostics
  compiler: {
    removeConsole: { exclude: ["error"] },
  },

  // Do not ignore TypeScript errors in production builds
  typescript: {
    ignoreBuildErrors: false,
  },

  // Security headers applied to all routes
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "geolocation=(), microphone=(), camera=()",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
          },
        ],
      },
    ];
  },

  // @react-pdf/renderer must run from node_modules on the server: bundling it
  // (Turbopack/webpack) breaks its internal reconciler/scheduler ESM interop
  // and every PDF route fails with "Cannot read properties of undefined
  // (reading 'S')" inside createRenderer. Also drop the broken
  // optimizePackageImports entry — it forces bundling and was the trigger.
  serverExternalPackages: ["@react-pdf/renderer"],

  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "lodash", "moment"],
  },

  webpack: (config) => {
    // Critical: ignore directories that cause infinite recompiles or OS freezes
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        "**/node_modules",
        "**/.next",
        "**/.git",
        "**/local.db",
        "**/*.db",
        "**/*.pem",
        "**/scripts/seed.mts",
        "**/pnpm-lock.yaml",
        "**/package-lock.json",
        "**/yarn.lock",
        "**/uploads",
        "**/logs",
        "**/public/images",
      ],
    };

    // Ensure symlinks (pnpm/monorepo) are resolved correctly
    config.resolve!.symlinks = true;

    return config;
  },
};

export default nextConfig;
