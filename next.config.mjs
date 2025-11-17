/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // 确保静态资源正确加载
  compress: true,
  poweredByHeader: false,
  // 生产环境优化
  productionBrowserSourceMaps: false,
  // 静态资源配置
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : undefined,
  experimental: {
    // 允许在开发时从指定来源访问 Next 静态资源
    allowedDevOrigins: [
      process.env.NEXT_PUBLIC_DEV_ORIGIN || 'http://0.0.0.0:3000',
      'http://8.155.147.19',
      'http://localhost:80',
      'http://0.0.0.0:80'
    ],
  },
  // 添加安全头部，但确保不阻止样式加载
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },
}

export default nextConfig
