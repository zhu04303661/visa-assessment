import { NextRequest, NextResponse } from 'next/server'
import { comparePassword, signToken, getTokenExpiration, isValidEmail, getBackendUrl } from '@/lib/auth/auth-utils'
import type { UserRole } from '@/lib/auth/types'

/** 后端 user-by-email 返回的用户（含 password_hash） */
interface BackendUser {
  id: string
  email: string
  password_hash: string
  full_name?: string | null
  phone?: string | null
  company?: string | null
  position?: string | null
  role: string
  email_verified?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // 验证必填字段
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: '邮箱和密码为必填项' },
        { status: 400 }
      )
    }

    // 验证邮箱格式
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: '邮箱格式不正确' },
        { status: 400 }
      )
    }

    // 调用后端 API 获取用户（带超时，避免代理返回 HTML 502）
    const backendUrl = getBackendUrl()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)
    let response: Response
    try {
      response = await fetch(`${backendUrl}/api/auth/user-by-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase() }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
    } catch (fetchError) {
      clearTimeout(timeoutId)
      const msg = fetchError instanceof Error ? fetchError.message : String(fetchError)
      console.error('登录错误: 无法连接认证服务', fetchError)
      return NextResponse.json(
        { success: false, error: '无法连接认证服务，请确认后端已启动（' + msg + '）' },
        { status: 503 }
      )
    }

    let result: { success?: boolean; user?: BackendUser; error?: string }
    try {
      result = await response.json()
    } catch {
      return NextResponse.json(
        { success: false, error: '认证服务返回格式异常，请稍后重试' },
        { status: 502 }
      )
    }

    if (!result.success || !result.user) {
      return NextResponse.json(
        { success: false, error: result.error || '邮箱或密码错误' },
        { status: 401 }
      )
    }

    const user = result.user

    // 验证密码
    const passwordValid = await comparePassword(password, user.password_hash)
    if (!passwordValid) {
      return NextResponse.json(
        { success: false, error: '邮箱或密码错误' },
        { status: 401 }
      )
    }

    // 生成 JWT Token
    const token = await signToken({
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
    })

    // 计算过期时间
    const expiresAt = getTokenExpiration()

    // 在后端创建会话并更新最后登录时间（失败不影响登录，前端会话校验改由 user-by-id 支持）
    try {
      await Promise.all([
        fetch(`${backendUrl}/api/auth/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            token,
            expires_at: expiresAt.toISOString(),
          }),
        }),
        fetch(`${backendUrl}/api/auth/update-last-sign-in`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id }),
        }),
      ])
    } catch (e) {
      console.warn('后端会话/最后登录更新失败，继续完成登录:', e)
    }

    // 创建响应
    const res = NextResponse.json({
      success: true,
      message: '登录成功',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        company: user.company,
        position: user.position,
        role: user.role,
        email_verified: user.email_verified,
      },
    })

    // 仅在实际使用 HTTPS 时设置 secure，否则 HTTP 下浏览器不会保存 cookie
    const isHttps =
      process.env.VERCEL_URL?.startsWith('https') ||
      request.headers.get('x-forwarded-proto') === 'https' ||
      (typeof request.nextUrl?.protocol === 'string' && request.nextUrl.protocol === 'https:')
    res.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 天
      path: '/',
    })

    return res
  } catch (error) {
    console.error('登录错误:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    )
  }
}
