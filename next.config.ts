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

  // API rewrites for development - uses env var or defaults to localhost
  async rewrites() {
    const pythonApiUrl = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://127.0.0.1:8313';
    return [
      {
        source: '/python-api/:path*',
        destination: `${pythonApiUrl}/:path*`,
      },
    ]
  },
}

export default nextConfig