import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable Turbopack (Next 15+ default, enforce for speed)
  turbopack: true,

  // Disable source maps in production to save memory/CPU
  productionBrowserSourceMaps: false,

  // Strip all console logs in production
  compiler: {
    removeConsole: {
      production: true,
    },
  },

  // Ignore TypeScript errors that block watch/dev server (set true only if they cause hangs)
  typescript: {
    ignoreBuildErrors: true,
  },

  // ESLint should not block the dev/build process
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Optimize heavy imports (tree-shakeable libs)
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@react-pdf/renderer",
      "recharts",
      "lodash",
      "moment",
      "@mui/material",
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
        "**/public/images", // if you store large images in repo
      ],
    };

    // Ensure symlinks (pnpm/monorepo) are resolved correctly
    config.resolve.symlinks = true;

    return config;
  },
};

export default nextConfig;
