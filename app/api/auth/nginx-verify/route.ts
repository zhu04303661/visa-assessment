import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/auth-utils'

/**
 * Nginx auth_request 子请求验证端点
 * 200 → 已认证，Nginx 放行
 * 401 → 未认证，Nginx 拒绝并跳转登录页
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return new NextResponse(null, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || !payload.sub) {
      return new NextResponse(null, { status: 401 })
    }

    return new NextResponse(null, { status: 200 })
  } catch {
    return new NextResponse(null, { status: 401 })
  }
}
