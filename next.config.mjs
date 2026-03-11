import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // 避免 Turbopack 追踪 venv/.venv 等符号链接导致构建失败（Next 16 已移至根级）
  outputFileTracingRoot: path.join(__dirname),
  outputFileTracingExcludes: {
    '*': ['**/venv/**', '**/.venv/**', '**/ace_gtv/**'],
  },
  trailingSlash: false,
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : undefined,
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
