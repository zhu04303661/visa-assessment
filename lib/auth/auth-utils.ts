import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import type { JWTPayload, UserRole } from './types'

// JWT 密钥 - 从环境变量获取，或使用默认值（仅开发环境）
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
const JWT_EXPIRES_IN = '7d' // Token 有效期
const SALT_ROUNDS = 10

// 将密钥转换为 Uint8Array
const getSecretKey = () => new TextEncoder().encode(JWT_SECRET)

/**
 * 生成 JWT Token
 */
export async function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(getSecretKey())
  
  return token
}

/**
 * 验证 JWT Token
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey())
    return payload as unknown as JWTPayload
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

/**
 * 对密码进行哈希
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * 验证密码
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * 计算 Token 过期时间
 */
export function getTokenExpiration(): Date {
  const now = new Date()
  now.setDate(now.getDate() + 7) // 7天后过期
  return now
}

/**
 * 从请求头获取 Token
 */
export function getTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null
  
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  
  return null
}

/**
 * 验证邮箱格式
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 验证密码强度
 */
export function isValidPassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 6) {
    return { valid: false, message: '密码长度至少为6位' }
  }
  return { valid: true }
}

/**
 * 获取后端 API 基础 URL
 */
export function getBackendUrl(): string {
  return process.env.BACKEND_API_URL || 'http://localhost:5005'
}
