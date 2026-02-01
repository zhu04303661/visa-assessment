"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Navbar } from "@/components/navbar"
import { useAuth } from "@/lib/auth/auth-context"
import { useLanguage } from "@/lib/i18n"
import {
  User,
  Mail,
  Phone,
  Building,
  Briefcase,
  Shield,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react"

const roleLabels: Record<string, { label: string; color: string }> = {
  guest: { label: "游客", color: "bg-gray-500" },
  client: { label: "客户", color: "bg-blue-500" },
  admin: { label: "管理员", color: "bg-purple-500" },
  super_admin: { label: "超级管理员", color: "bg-red-500" },
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const { language } = useLanguage()
  
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [company, setCompany] = useState("")
  const [position, setPosition] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // 权限检查
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/")
    }
  }, [user, authLoading, router])

  // 初始化表单数据
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "")
      setPhone(user.phone || "")
      setCompany(user.company || "")
      setPosition(user.position || "")
    }
  }, [user])

  // 保存个人资料
  const handleSave = async () => {
    try {
      setSaving(true)
      setError("")
      setSuccess("")

      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          full_name: fullName,
          phone,
          company,
          position,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "保存失败")
      }

      setSuccess(language === "en" ? "Profile updated successfully" : "个人资料更新成功")
      setTimeout(() => setSuccess(""), 3000)
      
      // 刷新页面以获取最新数据
      window.location.reload()
    } catch (err: any) {
      console.error("保存个人资料错误:", err)
      setError(err.message || "保存失败")
      setTimeout(() => setError(""), 5000)
    } finally {
      setSaving(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const roleInfo = roleLabels[user.role] || { label: "未知", color: "bg-gray-400" }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <User className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">
              {language === "en" ? "Profile" : "个人资料"}
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            {language === "en" 
              ? "View and update your personal information" 
              : "查看和更新您的个人信息"}
          </p>
        </div>

        {/* 消息提示 */}
        {error && (
          <Alert className="mb-4" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* 账户信息卡片 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {language === "en" ? "Account Information" : "账户信息"}
            </CardTitle>
            <CardDescription>
              {language === "en" 
                ? "Your account details (read-only)" 
                : "您的账户详情（只读）"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">
                  {language === "en" ? "Email" : "邮箱"}
                </Label>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{user.email}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">
                  {language === "en" ? "Role" : "角色"}
                </Label>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <Badge className={`${roleInfo.color} text-white`}>
                    {roleInfo.label}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">
                  {language === "en" ? "User ID" : "用户ID"}
                </Label>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <span className="text-sm font-mono">{user.id}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">
                  {language === "en" ? "Email Verified" : "邮箱验证"}
                </Label>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  {user.email_verified ? (
                    <Badge className="bg-green-500 text-white">
                      {language === "en" ? "Verified" : "已验证"}
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      {language === "en" ? "Not Verified" : "未验证"}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 个人信息编辑卡片 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {language === "en" ? "Personal Information" : "个人信息"}
            </CardTitle>
            <CardDescription>
              {language === "en" 
                ? "Update your personal details" 
                : "更新您的个人详情"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label htmlFor="phone">
                  {language === "en" ? "Phone Number" : "手机号码"}
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="13800138000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company">
                  {language === "en" ? "Company" : "公司"}
                </Label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="company"
                    type="text"
                    placeholder={language === "en" ? "Company Name" : "公司名称"}
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">
                  {language === "en" ? "Position" : "职位"}
                </Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="position"
                    type="text"
                    placeholder={language === "en" ? "Job Title" : "职位名称"}
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {language === "en" ? "Saving..." : "保存中..."}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {language === "en" ? "Save Changes" : "保存更改"}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
