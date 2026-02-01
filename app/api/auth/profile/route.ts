import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getBackendUrl } from '@/lib/auth/auth-utils'

// 获取当前用户资料
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: '认证失败' }, { status: 401 })
    }

    const backendUrl = getBackendUrl()
    const response = await fetch(`${backendUrl}/api/auth/user-by-id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: payload.sub }),
    })

    const result = await response.json()

    if (!result.success) {
      return NextResponse.json({ error: result.error || '获取用户信息失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      user: result.user,
    })
  } catch (error) {
    console.error('获取用户资料错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// 更新用户资料
export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: '认证失败' }, { status: 401 })
    }

    const body = await request.json()
    const { full_name, phone, company, position } = body

    const backendUrl = getBackendUrl()
    const response = await fetch(`${backendUrl}/api/auth/users/${payload.sub}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        full_name,
        phone,
        company,
        position,
      }),
    })

    const result = await response.json()

    if (!result.success) {
      return NextResponse.json({ error: result.error || '更新失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '资料更新成功',
    })
  } catch (error) {
    console.error('更新用户资料错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
