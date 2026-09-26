import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},

  // Disable source maps in production to save memory/CPU
  productionBrowserSourceMaps: false,

  // Strip all console logs in production
  compiler: {
    removeConsole: true,
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

  // Optimize heavy imports (tree-shakeable libs)
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@react-pdf/renderer",
      "recharts",
      "lodash",
      "moment",
    ],
  },

  webpack: (config, { isServer }) => {
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
