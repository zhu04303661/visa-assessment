"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from './client'

export type UserRole = 'guest' | 'client' | 'admin' | 'super_admin'

interface UserProfile {
  id: string
  full_name?: string
  phone?: string
  company?: string
  position?: string
  role: UserRole
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  hasRole: (role: UserRole | UserRole[]) => boolean
  isAdmin: () => boolean
  isSuperAdmin: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // 加载用户资料
  const loadUserProfile = async (userId: string) => {
    // 检查 Supabase 配置
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    
    if (!supabaseUrl || !supabaseAnonKey) {
      // Supabase 未配置，设置默认 profile
      setProfile({
        id: userId,
        role: 'guest',
      })
      return
    }

    try {
      // 设置超时，避免无限等待
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('加载用户资料超时')), 3000)
      })

      const queryPromise = supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      let result: any
      try {
        result = await Promise.race([queryPromise, timeoutPromise])
      } catch (timeoutError) {
        // 超时或查询失败，使用默认 profile
        console.warn('加载用户资料超时或失败，使用默认配置:', timeoutError)
        setProfile({
          id: userId,
          role: 'guest',
        })
        return
      }

      const { data, error } = result

      if (error) {
        // 检查错误类型
        const errorCode = error.code || ''
        const errorMessage = error.message || String(error) || ''
        const errorDetails = error.details || ''
        
        // 如果用户资料不存在（PGRST116 是 PostgREST 的"未找到"错误代码）
        // 或者是因为 RLS 策略导致的权限错误
        const isNotFound = 
          errorCode === 'PGRST116' || 
          errorMessage.includes('No rows') ||
          errorMessage.includes('not found') ||
          errorCode === '42P01' // 表不存在
        
        const isPermissionError = 
          errorCode === '42501' || 
          errorMessage.includes('permission') ||
          errorMessage.includes('policy') ||
          errorMessage.includes('RLS')
        
        // 记录错误信息（仅在开发环境或非权限错误时）
        if (!isNotFound && !isPermissionError) {
          console.warn('加载用户资料时遇到错误:', {
            code: errorCode,
            message: errorMessage,
            details: errorDetails,
            fullError: error,
          })
        }
        
        // 如果是未找到或权限错误，尝试创建默认资料
        if (isNotFound || isPermissionError) {
          // 尝试创建默认的用户资料
          const { data: newProfile, error: insertError } = await supabase
            .from('user_profiles')
            .insert({
              id: userId,
              role: 'guest' as UserRole,
            })
            .select()
            .single()

          if (insertError) {
            // 如果插入也失败，记录警告但继续使用默认值
            const insertErrorCode = insertError.code || ''
            const insertErrorMessage = insertError.message || String(insertError) || ''
            
            console.warn('创建用户资料失败（可能是 RLS 策略问题，请执行 add_user_profile_insert_policy.sql）:', {
              code: insertErrorCode,
              message: insertErrorMessage,
              details: insertError.details || '',
            })
            
            // 设置一个默认的 profile，避免应用崩溃
            setProfile({
              id: userId,
              role: 'guest',
            })
          } else if (newProfile) {
            setProfile({
              id: newProfile.id,
              full_name: newProfile.full_name || undefined,
              phone: newProfile.phone || undefined,
              company: newProfile.company || undefined,
              position: newProfile.position || undefined,
              role: (newProfile.role as UserRole) || 'guest',
            })
          } else {
            // 插入成功但没有返回数据，使用默认值
            setProfile({
              id: userId,
              role: 'guest',
            })
          }
        } else {
          // 其他错误（如网络错误等），使用默认值
          setProfile({
            id: userId,
            role: 'guest',
          })
        }
      } else if (data) {
        // 成功加载数据
        setProfile({
          id: data.id,
          full_name: data.full_name || undefined,
          phone: data.phone || undefined,
          company: data.company || undefined,
          position: data.position || undefined,
          role: (data.role as UserRole) || 'guest',
        })
      } else {
        // 没有错误也没有数据，使用默认值
        setProfile({
          id: userId,
          role: 'guest',
        })
      }
    } catch (err) {
      // 捕获所有异常
      console.error('加载用户资料时发生异常:', err)
      // 设置一个默认的 profile，确保应用可以继续运行
      if (userId) {
        setProfile({
          id: userId,
          role: 'guest',
        })
      }
    }
  }

  useEffect(() => {
    let mounted = true
    
    // 检查 Supabase 配置
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    
    // 如果 Supabase 未配置，直接设置 loading 为 false
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('⚠️ Supabase 环境变量未配置，认证功能将不可用')
      if (mounted) {
        setLoading(false)
        setUser(null)
        setSession(null)
        setProfile(null)
      }
      return
    }

    // 设置超时，确保 loading 状态不会一直为 true
    const timeoutId = setTimeout(() => {
      if (mounted) {
        console.warn('⚠️ 认证初始化超时，继续使用未认证状态')
        setLoading(false)
      }
    }, 5000) // 5秒超时

    // 获取初始会话
    supabase.auth.getSession()
      .then(async ({ data: { session }, error }) => {
        clearTimeout(timeoutId)
        
        if (error) {
          console.warn('获取会话时出错:', error.message)
        }
        
        if (!mounted) return
        
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          try {
            await loadUserProfile(session.user.id)
          } catch (err) {
            console.warn('加载用户资料失败:', err)
            // 即使加载资料失败，也设置 loading 为 false
          }
        } else {
          setProfile(null)
        }
        
        setLoading(false)
      })
      .catch((error) => {
        clearTimeout(timeoutId)
        console.error('获取会话异常:', error)
        if (mounted) {
          setLoading(false)
          setUser(null)
          setSession(null)
          setProfile(null)
        }
      })

    // 监听认证状态变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        try {
          await loadUserProfile(session.user.id)
        } catch (err) {
          console.warn('加载用户资料失败:', err)
        }
      } else {
        setProfile(null)
      }
      
      setLoading(false)
    })

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || '',
        },
      },
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    return { error }
  }

  // 检查用户是否有指定角色
  const hasRole = (role: UserRole | UserRole[]): boolean => {
    if (!profile) return false
    const roles = Array.isArray(role) ? role : [role]
    return roles.includes(profile.role)
  }

  // 检查是否是管理员
  const isAdmin = (): boolean => {
    return hasRole(['admin', 'super_admin'])
  }

  // 检查是否是超级管理员
  const isSuperAdmin = (): boolean => {
    return hasRole('super_admin')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        hasRole,
        isAdmin,
        isSuperAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

