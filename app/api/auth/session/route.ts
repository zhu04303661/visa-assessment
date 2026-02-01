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
    if (!payload) {
      // Token 无效，清除 cookie
      const res = NextResponse.json({
        success: true,
        authenticated: false,
        user: null,
        session: null,
      })
      res.cookies.set('auth_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      })
      return res
    }

    // 调用后端验证会话并获取用户信息
    const backendUrl = getBackendUrl()
    const response = await fetch(`${backendUrl}/api/auth/validate-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    })

    const result = await response.json()

    if (!result.success || !result.valid) {
      // 会话无效，清除 cookie
      const res = NextResponse.json({
        success: true,
        authenticated: false,
        user: null,
        session: null,
      })
      res.cookies.set('auth_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      })
      return res
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: result.user,
      session: result.session,
    })
  } catch (error) {
    console.error('获取会话错误:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    )
  }
}
