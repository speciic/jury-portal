import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    'firebase-admin',
    'firebase-admin/app',
    'firebase-admin/auth',
    'firebase-admin/firestore',
  ],
};

export default nextConfig;
