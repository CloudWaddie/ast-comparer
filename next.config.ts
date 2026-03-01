import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/ast-comparer",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
