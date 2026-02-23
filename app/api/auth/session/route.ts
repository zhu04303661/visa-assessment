import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getBackendUrl } from '@/lib/auth/auth-utils'

export async function GET(request: NextRequest) {
  try {
    // 获取 cookie 中的 token
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({
        success: true,
        authenticated: false,
        user: null,
        session: null,
      })
    }

    // 验证 JWT Token
    const payload = await verifyToken(token)
    if (!payload || !payload.sub) {
      // Token 无效，清除 cookie
      const res = NextResponse.json({
        success: true,
        authenticated: false,
        user: null,
        session: null,
      })
      const isHttps =
        request.headers.get('x-forwarded-proto') === 'https' ||
        (typeof request.nextUrl?.protocol === 'string' && request.nextUrl.protocol === 'https:')
      res.cookies.set('auth_token', '', {
        httpOnly: true,
        secure: isHttps,
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      })
      return res
    }

    const backendUrl = getBackendUrl()

    // 优先用 user-by-id 拉取用户（不依赖后端会话表，登录后立即生效）
    const userResponse = await fetch(`${backendUrl}/api/auth/user-by-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: payload.sub }),
    })
    const userResult = await userResponse.json()

    if (userResult.success && userResult.user) {
      return NextResponse.json({
        success: true,
        authenticated: true,
        user: userResult.user,
        session: { id: payload.sub, user_id: payload.sub, expires_at: payload.exp },
      })
    }

    // 兼容：若 user-by-id 失败则尝试原有 validate-session
    const response = await fetch(`${backendUrl}/api/auth/validate-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const result = await response.json()

    if (result.success && result.valid && result.user) {
      return NextResponse.json({
        success: true,
        authenticated: true,
        user: result.user,
        session: result.session,
      })
    }

    // 会话无效，清除 cookie
    const res = NextResponse.json({
      success: true,
      authenticated: false,
      user: null,
      session: null,
    })
    const isHttps =
      request.headers.get('x-forwarded-proto') === 'https' ||
      (typeof request.nextUrl?.protocol === 'string' && request.nextUrl.protocol === 'https:')
    res.cookies.set('auth_token', '', {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })
    return res
  } catch (error) {
    console.error('获取会话错误:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    )
  }
}
