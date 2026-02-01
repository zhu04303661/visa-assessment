import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getBackendUrl } from '@/lib/auth/auth-utils'
import type { UserRole } from '@/lib/auth/types'

// 获取所有用户列表
export async function GET(request: NextRequest) {
  try {
    // 获取 cookie 中的 token
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    // 验证 JWT Token
    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: '认证失败' }, { status: 401 })
    }

    // 检查用户权限
    const userRole = payload.role as UserRole
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    // 调用后端 API 获取用户列表
    const backendUrl = getBackendUrl()
    const response = await fetch(`${backendUrl}/api/auth/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const result = await response.json()

    if (!result.success) {
      return NextResponse.json({ error: result.error || '获取用户列表失败' }, { status: 500 })
    }

    // 格式化用户数据以匹配前端期望的格式
    const formattedUsers = (result.users || []).map((user: any) => ({
      id: user.id,
      email: user.email,
      fullName: user.full_name || '',
      phone: user.phone || '',
      company: user.company || '',
      position: user.position || '',
      role: user.role || 'guest',
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      emailConfirmed: user.email_verified || false,
      lastSignIn: user.last_sign_in || null,
    }))

    return NextResponse.json({
      success: true,
      users: formattedUsers,
    })
  } catch (error) {
    console.error('获取用户列表错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// 更新用户角色
export async function PATCH(request: NextRequest) {
  try {
    // 获取 cookie 中的 token
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    // 验证 JWT Token
    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: '认证失败' }, { status: 401 })
    }

    // 检查当前用户权限
    const currentUserRole = payload.role as UserRole
    if (currentUserRole !== 'admin' && currentUserRole !== 'super_admin') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, role } = body

    if (!userId || !role) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    if (!['guest', 'client', 'admin', 'super_admin'].includes(role)) {
      return NextResponse.json({ error: '无效的角色' }, { status: 400 })
    }

    // 如果要将用户设置为管理员或超级管理员，需要超级管理员权限
    if ((role === 'admin' || role === 'super_admin') && currentUserRole !== 'super_admin') {
      return NextResponse.json({ error: '只有超级管理员可以设置管理员角色' }, { status: 403 })
    }

    // 不能修改自己的角色
    if (userId === payload.sub) {
      return NextResponse.json({ error: '不能修改自己的角色' }, { status: 400 })
    }

    // 调用后端 API 更新用户角色
    const backendUrl = getBackendUrl()
    const response = await fetch(`${backendUrl}/api/auth/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role }),
    })

    const result = await response.json()

    if (!result.success) {
      return NextResponse.json({ error: result.error || '更新用户角色失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '用户角色更新成功',
    })
  } catch (error) {
    console.error('更新用户角色错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
