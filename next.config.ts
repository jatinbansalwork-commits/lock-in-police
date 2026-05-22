import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  transpilePackages: ["@tensorflow/tfjs", "@tensorflow-models/coco-ssd"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals as unknown[]), "@tensorflow/tfjs"];
    }
    return config;
  },
};

export default nextConfig;
