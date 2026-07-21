import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "i.pravatar.cc" },
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "http", hostname: "localhost", port: "3001", pathname: "/storage/**" },
    ],
    dangerouslyAllowLocalIP: true,
  },
};

export default nextConfig;
