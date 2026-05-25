import type { NextConfig } from "next";

/** Capacitor 静态包需要 export；Vercel Web 部署保留 API Routes，勿设置此变量 */
const isMobileStaticExport = process.env.NEXT_BUILD_MODE === "mobile";

const nextConfig: NextConfig = {
  ...(isMobileStaticExport ? { output: "export" as const } : {}),
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
