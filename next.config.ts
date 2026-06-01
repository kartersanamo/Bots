import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "framer-motion"],
  },
  /** Fewer parallel chunk requests → fewer HTTP/2 failures behind Cloudflare. */
  webpack: (config, { dev, isServer }) => {
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
  async redirects() {
    return [
      {
        source: "/dashboard/fleet",
        destination: "/dashboard/bots",
        permanent: true,
      },
      {
        source: "/dashboard/bots/:botId/logs",
        destination: "/dashboard/bots/:botId?tab=console",
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
