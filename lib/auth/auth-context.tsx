"use client"

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { User, UserProfile, Session, AuthError, AuthContextType, UserRole } from './types'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // 加载用户会话
  const loadSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
      })

      const result = await response.json()

      if (result.success && result.authenticated && result.user) {
        setUser(result.user)
        setSession(result.session)
        setProfile({
          id: result.user.id,
          full_name: result.user.full_name,
          phone: result.user.phone,
          company: result.user.company,
          position: result.user.position,
          role: result.user.role as UserRole,
        })
      } else {
        setUser(null)
        setSession(null)
        setProfile(null)
      }
    } catch (error) {
      console.error('加载会话失败:', error)
      setUser(null)
      setSession(null)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // 初始化时加载会话
  useEffect(() => {
    loadSession()
  }, [loadSession])

  // 登录
  const signIn = async (email: string, password: string): Promise<{ error: AuthError | null }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      const result = await response.json()

      if (!result.success) {
        return { error: { message: result.error || '登录失败' } }
      }

      // 重新加载会话
      await loadSession()
      return { error: null }
    } catch (error) {
      console.error('登录错误:', error)
      return { error: { message: '登录时发生错误' } }
    }
  }

  // 注册
  const signUp = async (email: string, password: string, fullName?: string, phone?: string): Promise<{ error: AuthError | null }> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password, fullName, phone }),
      })

      const result = await response.json()

      if (!result.success) {
        return { error: { message: result.error || '注册失败' } }
      }

      // 重新加载会话
      await loadSession()
      return { error: null }
    } catch (error) {
      console.error('注册错误:', error)
      return { error: { message: '注册时发生错误' } }
    }
  }

  // 退出登录
  const signOut = async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      console.error('退出登录错误:', error)
    } finally {
      setUser(null)
      setSession(null)
      setProfile(null)
    }
  }

  // 重置密码（暂时返回成功提示，后续可扩展）
  const resetPassword = async (email: string): Promise<{ error: AuthError | null }> => {
    // TODO: 实现密码重置功能
    console.log('密码重置请求:', email)
    return { error: { message: '密码重置功能暂未开放，请联系管理员' } }
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

// 导出类型
export type { UserRole, User, UserProfile, Session, AuthError, AuthContextType }
