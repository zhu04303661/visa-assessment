"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth, type UserRole } from "@/lib/auth/auth-context"
import { useLanguage } from "@/lib/i18n"
import { Loader2, ShieldAlert, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AuthDialog } from "@/components/auth-dialog"

interface AuthGuardProps {
  children: React.ReactNode
  /**
   * 需要登录才能访问（任何已登录用户）
   */
  requireAuth?: boolean
  /**
   * 允许访问的角色列表
   * 如果为空或未设置，则只检查是否登录
   */
  allowedRoles?: UserRole[]
  /**
   * 权限不足时的重定向路径（默认显示提示而非重定向）
   */
  redirectTo?: string
  /**
   * 未登录时的提示信息
   */
  loginMessage?: string
  /**
   * 权限不足时的提示信息
   */
  unauthorizedMessage?: string
}

export function AuthGuard({
  children,
  requireAuth = true,
  allowedRoles,
  redirectTo,
  loginMessage,
  unauthorizedMessage,
}: AuthGuardProps) {
  const router = useRouter()
  const { user, profile, loading } = useAuth()
  const { language } = useLanguage()
  const [showAuthDialog, setShowAuthDialog] = useState(false)

  const defaultLoginMessage = language === "en"
    ? "Please sign in to access this page"
    : "请登录以访问此页面"

  const defaultUnauthorizedMessage = language === "en"
    ? "You don't have permission to access this page"
    : "您没有权限访问此页面"

  // 检查用户是否有权限
  const hasPermission = (): boolean => {
    if (!requireAuth) return true
    if (!user) return false
    
    // 超级管理员可以访问所有页面
    if (profile?.role === 'super_admin') return true
    
    // 如果没有指定角色限制，只需要登录即可
    if (!allowedRoles || allowedRoles.length === 0) return true
    
    // 检查用户角色是否在允许列表中
    return allowedRoles.includes(profile?.role as UserRole)
  }

  useEffect(() => {
    if (!loading && requireAuth && !user && redirectTo) {
      router.push(redirectTo)
    }
  }, [loading, requireAuth, user, redirectTo, router])

  // 加载中
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // 未登录
  if (requireAuth && !user) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <LogIn className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>
                {language === "en" ? "Authentication Required" : "需要登录"}
              </CardTitle>
              <CardDescription>
                {loginMessage || defaultLoginMessage}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Button onClick={() => setShowAuthDialog(true)} className="w-full">
                {language === "en" ? "Sign In" : "登录"}
              </Button>
              <Button variant="outline" onClick={() => router.push("/")} className="w-full">
                {language === "en" ? "Back to Home" : "返回首页"}
              </Button>
            </CardContent>
          </Card>
        </div>
        <AuthDialog
          open={showAuthDialog}
          onOpenChange={setShowAuthDialog}
          defaultMode="login"
        />
      </>
    )
  }

  // 权限不足
  if (!hasPermission()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>
              {language === "en" ? "Access Denied" : "访问被拒绝"}
            </CardTitle>
            <CardDescription>
              {unauthorizedMessage || defaultUnauthorizedMessage}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button variant="outline" onClick={() => router.push("/")} className="w-full">
              {language === "en" ? "Back to Home" : "返回首页"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              {language === "en"
                ? "If you believe this is an error, please contact an administrator."
                : "如果您认为这是一个错误，请联系管理员。"}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 有权限，渲染子组件
  return <>{children}</>
}
