import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 사용법 설명영상(정적 페이지): public/guide/index.html 을 /guide 주소로 연다
  async rewrites() {
    return [
      { source: "/guide", destination: "/guide/index.html" },
      { source: "/guide/", destination: "/guide/index.html" },
    ];
  },
};

export default nextConfig;
