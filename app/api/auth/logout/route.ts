import { NextRequest, NextResponse } from 'next/server'
import { getBackendUrl } from '@/lib/auth/auth-utils'

export async function POST(request: NextRequest) {
  try {
    // 获取 cookie 中的 token
    const token = request.cookies.get('auth_token')?.value

    if (token) {
      // 调用后端 API 删除会话
      const backendUrl = getBackendUrl()
      try {
        await fetch(`${backendUrl}/api/auth/session`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        })
      } catch (e) {
        // 即使后端调用失败，也继续清除 cookie
        console.warn('删除后端会话失败:', e)
      }
    }

    // 创建响应
    const res = NextResponse.json({
      success: true,
      message: '退出登录成功',
    })

    // 清除 cookie
    res.cookies.set('auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })

    return res
  } catch (error) {
    console.error('退出登录错误:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    )
  }
}
