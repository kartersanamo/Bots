import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "framer-motion"],
    /** Lower peak RAM during `next build` on small VPS hosts. */
    webpackMemoryOptimizations: true,
    /** Custom webpack normally disables the worker; keep it for lower main-process RAM. */
    webpackBuildWorker: true,
  },
  /** Fewer parallel chunk requests → fewer HTTP/2 failures behind Cloudflare. */
  webpack: (config, { dev, isServer }) => {
    if (!dev) {
      config.parallelism = 1;
      config.cache = false;
    }
    if (!dev && !isServer && config.optimization) {
      config.optimization.splitChunks = {
        chunks: "all",
        maxInitialRequests: 8,
        maxAsyncRequests: 8,
        cacheGroups: {
          default: false,
          defaultVendors: false,
          framework: {
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            name: "framework",
            chunks: "all",
            priority: 40,
            enforce: true,
          },
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            chunks: "all",
            priority: 30,
            reuseExistingChunk: true,
          },
          common: {
            minChunks: 2,
            priority: 10,
            reuseExistingChunk: true,
          },
        },
      };
    }
    return config;
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' https://cdn.discordapp.com data:",
      "connect-src 'self'",
      "font-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/dashboard/fleet",
        destination: "/dashboard/bots",
        permanent: true,
      },
      {
        source: "/dashboard/bots/:botId/logs",
        destination: "/dashboard/bots/:botId?tab=logs",
        permanent: false,
      },
      {
        source: "/dashboard/bots/:botId/config",
        destination: "/dashboard/bots/:botId?tab=config",
        permanent: false,
      },
      {
        source: "/dashboard/bots/:botId/inbox",
        destination: "/dashboard/bots/:botId?tab=inbox",
        permanent: false,
      },
      {
        source: "/dashboard/bots/:botId/panel",
        destination: "/dashboard/bots/:botId?tab=actions",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
