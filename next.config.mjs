/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage — replace with project hostname once known, wildcard is OK for dev.
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/**" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb", // photo uploads
    },
  },
};

export default nextConfig;
