import { NextRequest, NextResponse } from 'next/server'
import { hashPassword, signToken, getTokenExpiration, isValidEmail, isValidPassword, getBackendUrl } from '@/lib/auth/auth-utils'
import type { UserRole } from '@/lib/auth/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, fullName, phone } = body

    // 验证必填字段
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: '邮箱和密码为必填项' },
        { status: 400 }
      )
    }

    // 验证手机号
    if (!phone || phone.trim().length < 11) {
      return NextResponse.json(
        { success: false, error: '请输入有效的手机号码' },
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

    // 验证密码强度
    const passwordValidation = isValidPassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { success: false, error: passwordValidation.message },
        { status: 400 }
      )
    }

    // 对密码进行哈希
    const passwordHash = await hashPassword(password)

    // 调用后端 API 创建用户
    const backendUrl = getBackendUrl()
    const response = await fetch(`${backendUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        full_name: fullName || null,
        phone: phone || null,
        role: 'guest' as UserRole,
      }),
    })

    const result = await response.json()

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || '注册失败' },
        { status: 400 }
      )
    }

    const user = result.user

    // 生成 JWT Token
    const token = await signToken({
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
    })

    // 计算过期时间
    const expiresAt = getTokenExpiration()

    // 在后端创建会话
    await fetch(`${backendUrl}/api/auth/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: user.id,
        token,
        expires_at: expiresAt.toISOString(),
      }),
    })

    // 创建响应
    const res = NextResponse.json({
      success: true,
      message: '注册成功',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role,
        email_verified: false,
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
    console.error('注册错误:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    )
  }
}
