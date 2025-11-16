import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 在 API 路由中使用 service role key（如果可用）或 anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// 创建 Supabase 客户端（优先使用 service role key）
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// 用户角色类型
export type UserRole = 'guest' | 'client' | 'admin' | 'super_admin'

// 获取所有用户列表
export async function GET(request: NextRequest) {
  try {
    // 从请求头获取认证token
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // 创建用于验证用户身份的客户端（使用 anon key）
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const authClient = createClient(supabaseUrl, supabaseAnonKey)
    
    // 验证用户身份并获取用户信息
    const { data: { user }, error: authError } = await authClient.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: '认证失败' }, { status: 401 })
    }

    // 检查用户是否有管理员权限（使用 service role key 客户端绕过 RLS）
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: '无法获取用户信息' }, { status: 403 })
    }

    const userRole = profile.role as UserRole
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    // 获取所有用户及其角色信息
    // 注意：由于 Supabase RLS 限制，我们需要使用 service role key 或者调整查询方式
    // 这里先获取 user_profiles，然后通过 auth.admin.listUsers() 获取用户信息
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (profilesError) {
      console.error('获取用户资料失败:', profilesError)
      return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 })
    }

    // 尝试获取所有认证用户信息（需要 service role key）
    let authUsersMap = new Map()
    try {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        // 使用 service role key 可以访问 admin API
        const { data: { users: authUsers }, error: authUsersError } = await supabase.auth.admin.listUsers()
        if (!authUsersError && authUsers) {
          authUsersMap = new Map(authUsers.map((u: any) => [u.id, u]))
        }
      }
    } catch (err) {
      console.warn('无法获取认证用户信息（可能需要 service role key）:', err)
    }

    // 合并用户资料和认证信息
    const formattedUsers = (profiles || []).map((profile: any) => {
      const authUser = authUsersMap.get(profile.id)
      return {
        id: profile.id,
        email: authUser?.email || '',
        fullName: profile.full_name || '',
        phone: profile.phone || '',
        company: profile.company || '',
        position: profile.position || '',
        role: profile.role || 'guest',
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
        emailConfirmed: !!authUser?.email_confirmed_at,
        lastSignIn: authUser?.last_sign_in_at || null,
      }
    })

    return NextResponse.json({ 
      success: true, 
      users: formattedUsers 
    })
  } catch (error) {
    console.error('获取用户列表错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// 更新用户角色
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // 创建用于验证用户身份的客户端
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const authClient = createClient(supabaseUrl, supabaseAnonKey)
    
    const { data: { user }, error: authError } = await authClient.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: '认证失败' }, { status: 401 })
    }

    // 检查当前用户权限
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !currentUserProfile) {
      return NextResponse.json({ error: '无法获取用户信息' }, { status: 403 })
    }

    const currentUserRole = currentUserProfile.role as UserRole
    if (currentUserRole !== 'admin' && currentUserRole !== 'super_admin') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    // 只有超级管理员可以修改管理员角色
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
    if (userId === user.id) {
      return NextResponse.json({ error: '不能修改自己的角色' }, { status: 400 })
    }

    // 更新用户角色
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ 
        role: role as UserRole,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('更新用户角色失败:', error)
      return NextResponse.json({ error: '更新用户角色失败' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: '用户角色更新成功',
      user: data 
    })
  } catch (error) {
    console.error('更新用户角色错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

