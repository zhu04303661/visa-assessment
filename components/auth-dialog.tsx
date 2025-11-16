"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/supabase/auth-context"
import { useLanguage } from "@/lib/i18n"
import { Loader2, Mail, Lock, User } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultMode?: "login" | "register"
}

export function AuthDialog({ open, onOpenChange, defaultMode = "login" }: AuthDialogProps) {
  const { t, language } = useLanguage()
  const { signIn, signUp, resetPassword, loading: authLoading } = useAuth()
  const [mode, setMode] = useState<"login" | "register" | "forgot">(defaultMode)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)
    setIsLoading(true)

    try {
      if (mode === "login") {
        const { error } = await signIn(email, password)
        if (error) {
          setError(
            language === "en"
              ? error.message || "Invalid email or password"
              : error.message || "邮箱或密码错误"
          )
        } else {
          onOpenChange(false)
          setEmail("")
          setPassword("")
        }
      } else if (mode === "register") {
        const { error } = await signUp(email, password, fullName)
        if (error) {
          setError(
            language === "en"
              ? error.message || "Registration failed"
              : error.message || "注册失败"
          )
        } else {
          setSuccessMessage(
            language === "en"
              ? "Registration successful! Please check your email to verify your account."
              : "注册成功！请检查您的邮箱以验证账户。"
          )
          setTimeout(() => {
            setMode("login")
            setEmail("")
            setPassword("")
            setFullName("")
            setSuccessMessage(null)
          }, 2000)
        }
      } else if (mode === "forgot") {
        const { error } = await resetPassword(email)
        if (error) {
          setError(
            language === "en"
              ? error.message || "Failed to send reset email"
              : error.message || "发送重置邮件失败"
          )
        } else {
          setSuccessMessage(
            language === "en"
              ? "Password reset email sent! Please check your inbox."
              : "密码重置邮件已发送！请检查您的收件箱。"
          )
          setTimeout(() => {
            setMode("login")
            setEmail("")
            setSuccessMessage(null)
          }, 3000)
        }
      }
    } catch (err) {
      setError(
        language === "en"
          ? "An unexpected error occurred"
          : "发生意外错误"
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleModeSwitch = (newMode: "login" | "register" | "forgot") => {
    setMode(newMode)
    setError(null)
    setSuccessMessage(null)
    setEmail("")
    setPassword("")
    setFullName("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "login"
              ? language === "en"
                ? "Sign In"
                : "登录"
              : mode === "register"
              ? language === "en"
                ? "Create Account"
                : "注册账户"
              : language === "en"
              ? "Reset Password"
              : "重置密码"}
          </DialogTitle>
          <DialogDescription>
            {mode === "login"
              ? language === "en"
                ? "Enter your credentials to access your account"
                : "输入您的凭据以访问您的账户"
              : mode === "register"
              ? language === "en"
                ? "Create a new account to get started"
                : "创建新账户以开始使用"
              : language === "en"
              ? "Enter your email to receive a password reset link"
              : "输入您的邮箱以接收密码重置链接"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          {mode === "register" && (
            <div className="space-y-2">
              <Label htmlFor="fullName">
                {language === "en" ? "Full Name" : "姓名"}
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder={language === "en" ? "John Doe" : "张三"}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">
              {language === "en" ? "Email" : "邮箱"}
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder={language === "en" ? "you@example.com" : "you@example.com"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-9"
              />
            </div>
          </div>

          {mode !== "forgot" && (
            <div className="space-y-2">
              <Label htmlFor="password">
                {language === "en" ? "Password" : "密码"}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder={language === "en" ? "••••••••" : "••••••••"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pl-9"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || authLoading}
            >
              {isLoading || authLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {language === "en" ? "Processing..." : "处理中..."}
                </>
              ) : mode === "login" ? (
                language === "en" ? "Sign In" : "登录"
              ) : mode === "register" ? (
                language === "en" ? "Create Account" : "注册"
              ) : (
                language === "en" ? "Send Reset Link" : "发送重置链接"
              )}
            </Button>

            <div className="flex flex-col gap-2 w-full text-sm">
              {mode === "login" && (
                <>
                  <button
                    type="button"
                    onClick={() => handleModeSwitch("forgot")}
                    className="text-left text-muted-foreground hover:text-foreground underline"
                  >
                    {language === "en" ? "Forgot password?" : "忘记密码？"}
                  </button>
                  <div className="text-center text-muted-foreground">
                    {language === "en" ? "Don't have an account? " : "还没有账户？ "}
                    <button
                      type="button"
                      onClick={() => handleModeSwitch("register")}
                      className="text-primary hover:underline font-medium"
                    >
                      {language === "en" ? "Sign up" : "立即注册"}
                    </button>
                  </div>
                </>
              )}

              {mode === "register" && (
                <div className="text-center text-muted-foreground">
                  {language === "en" ? "Already have an account? " : "已有账户？ "}
                  <button
                    type="button"
                    onClick={() => handleModeSwitch("login")}
                    className="text-primary hover:underline font-medium"
                  >
                    {language === "en" ? "Sign in" : "立即登录"}
                  </button>
                </div>
              )}

              {mode === "forgot" && (
                <button
                  type="button"
                  onClick={() => handleModeSwitch("login")}
                  className="text-center text-muted-foreground hover:text-foreground underline"
                >
                  {language === "en" ? "Back to sign in" : "返回登录"}
                </button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

