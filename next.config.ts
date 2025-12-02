import type { NextConfig } from "next";

// Dynamically enable basePath in environments where the app is served behind a prefix
const computedBasePath = (() => {
  const v = process.env.NEXT_PUBLIC_BASE_PATH?.trim()
  if (v && v !== "/") return v.startsWith("/") ? v : `/${v}`
  return undefined
})()

const nextConfig: NextConfig = {
  ...(computedBasePath ? { basePath: computedBasePath } : {}),
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'standalone',
  // Allow more CPUs for faster compilation
  experimental: {
    cpus: 4,
  },

  // API rewrites for development
  async rewrites() {
    return [
      {
        source: '/python-api/:path*',
        destination: 'http://127.0.0.1:8001/:path*',
      },
    ]
  },
}

export default nextConfig