import type { NextConfig } from "next";

// Bundle analyzer setup
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const disableOptimizedImports = process.env.NEXT_DISABLE_OPTIMIZED_IMPORTS === '1';
const disableSplitChunks = process.env.NEXT_DISABLE_SPLIT_CHUNKS === '1';

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    // Enable performance optimizations
    optimizeCss: true,
    optimizePackageImports: disableOptimizedImports ? [] : [
      'lucide-react',
      '@radix-ui/react-icons',
      'recharts',
      'date-fns'
    ],
  },
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true, // Keep disabled for now due to extensive warnings
  },
  
  // Performance optimizations
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev && !disableSplitChunks) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Framework chunk for React/Next.js
            framework: {
              chunks: 'all',
              name: 'framework',
              test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // UI libraries chunk
            ui: {
              name: 'ui',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|class-variance-authority|clsx|tailwind-merge)[\\/]/,
              priority: 30,
            },
            // Charts chunk
            charts: {
              name: 'charts',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](recharts|d3-.*)[\\/]/,
              priority: 25,
            },
            // PDF generation chunk
            pdf: {
              name: 'pdf',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](jspdf|html2canvas)[\\/]/,
              priority: 25,
            },
            // Common libraries chunk
            lib: {
              name: 'lib',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](date-fns|zod|react-hook-form)[\\/]/,
              priority: 20,
            },
            // Default vendor chunk for remaining packages
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /[\\/]node_modules[\\/]/,
              priority: 10,
            },
          },
        },
      };
    }
    
    return config;
  },
  
  // API rewrites for development
  async rewrites() {
    return [
      {
        source: '/python-api/:path*',
        destination: 'http://127.0.0.1:8000/:path*',
      },
    ]
  },
  
  // CORS headers
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ]
  },
};

export default withBundleAnalyzer(nextConfig);
