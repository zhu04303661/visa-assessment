import { NextRequest, NextResponse } from 'next/server'
import { comparePassword, signToken, getTokenExpiration, isValidEmail, getBackendUrl } from '@/lib/auth/auth-utils'
import type { UserRole } from '@/lib/auth/types'

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

    // 调用后端 API 获取用户
    const backendUrl = getBackendUrl()
    const response = await fetch(`${backendUrl}/api/auth/user-by-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: email.toLowerCase() }),
    })

    const result = await response.json()

    if (!result.success || !result.user) {
      return NextResponse.json(
        { success: false, error: '邮箱或密码错误' },
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

    // 在后端创建会话并更新最后登录时间
    await Promise.all([
      fetch(`${backendUrl}/api/auth/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          token,
          expires_at: expiresAt.toISOString(),
        }),
      }),
      fetch(`${backendUrl}/api/auth/update-last-sign-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: user.id }),
      }),
    ])

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

    // 设置 HTTP-only cookie
    res.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
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
