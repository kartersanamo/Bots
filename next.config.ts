import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "framer-motion"],
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
