import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: [
    '@tournament/api-contracts',
    '@tournament/shared',
    '@tournament/validation',
  ],
};

export default nextConfig;
