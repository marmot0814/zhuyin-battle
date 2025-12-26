import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  output: 'export',
  basePath: '/zhuyin-battle',
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: 'https://neighbors-kate-surgeon-practices.trycloudflare.com',
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: '666977153196-esbi7r0o0flbv82mrjn87m0m29so5chl.apps.googleusercontent.com',
  },
  // 暫時跳過動態路由頁面
  // 等到實際需要使用時再處理
};

export default nextConfig;
