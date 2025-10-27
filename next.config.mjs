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
  experimental: {
    // 允许在开发时从指定来源访问 Next 静态资源
    allowedDevOrigins: [
      process.env.NEXT_PUBLIC_DEV_ORIGIN || 'http://0.0.0.0:3000'
    ]
  }
}

export default nextConfig
