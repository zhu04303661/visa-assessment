// 用户角色类型
export type UserRole = 'guest' | 'client' | 'admin' | 'super_admin'

// 用户接口
export interface User {
  id: string
  email: string
  full_name?: string
  phone?: string
  company?: string
  position?: string
  role: UserRole
  email_verified: boolean
  created_at?: string
  updated_at?: string
  last_sign_in?: string
}

// 用户资料接口（前端使用）
export interface UserProfile {
  id: string
  full_name?: string
  phone?: string
  company?: string
  position?: string
  role: UserRole
}

// 会话接口
export interface Session {
  id: string
  user_id: string
  expires_at: string
}

// JWT 负载
export interface JWTPayload {
  sub: string  // user_id
  email: string
  role: UserRole
  iat: number
  exp: number
}

// 认证错误
export interface AuthError {
  message: string
  code?: string
}

// 认证上下文类型
export interface AuthContextType {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, fullName?: string, phone?: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  hasRole: (role: UserRole | UserRole[]) => boolean
  isAdmin: () => boolean
  isSuperAdmin: () => boolean
}

// API 响应类型
export interface AuthResponse {
  success: boolean
  message?: string
  error?: string
  user?: User
  session?: Session
}
