/** @type {import('next').NextConfig} */
const nextConfig = {
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
  // 添加安全头部，但确保不阻止样式加载和文件预览
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
      // 文件预览 API 路由 - 允许 iframe 嵌入
      {
        source: '/api/copywriting/api/files/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
      // 其他路径的安全头部
      {
        source: '/:path((?!api/copywriting/api/files).*)',
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
