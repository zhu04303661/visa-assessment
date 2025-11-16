"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
  ArrowLeft,
} from "lucide-react"
import { useAuth } from "@/lib/supabase/auth-context"
import { useLanguage } from "@/lib/i18n"
import { Navbar } from "@/components/navbar"
import { supabase } from "@/lib/supabase/client"
import Link from "next/link"

const roleLabels: Record<string, { label: string; color: string }> = {
  guest: { label: "游客", color: "bg-gray-500" },
  client: { label: "客户", color: "bg-blue-500" },
  admin: { label: "管理员", color: "bg-purple-500" },
  super_admin: { label: "超级管理员", color: "bg-red-500" },
}

// 获取角色标签，如果角色不存在则返回默认值
const getRoleLabelSafe = (role: string | null | undefined): { label: string; color: string } => {
  if (!role || !(role in roleLabels)) {
    return { label: "未知", color: "bg-gray-400" }
  }
  return roleLabels[role]
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, session, profile, loading: authLoading } = useAuth()
  const { language } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    company: "",
    position: "",
  })

  // 加载用户资料
  useEffect(() => {
    if (!authLoading) {
      if (!user || !session) {
        router.push("/")
        return
      }
      
      if (profile) {
        setFormData({
          fullName: profile.full_name || "",
          phone: profile.phone || "",
          company: profile.company || "",
          position: profile.position || "",
        })
      }
      setLoading(false)
    }
  }, [user, session, profile, authLoading, router])

  // 保存用户资料
  const handleSave = async () => {
    if (!user || !session) return

    try {
      setSaving(true)
      setError("")
      setSuccess("")

      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({
          full_name: formData.fullName || null,
          phone: formData.phone || null,
          company: formData.company || null,
          position: formData.position || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (updateError) {
        throw new Error(updateError.message || "更新资料失败")
      }

      setSuccess(language === "en" ? "Profile updated successfully" : "资料更新成功")
      setTimeout(() => setSuccess(""), 3000)
    } catch (err: any) {
      console.error("更新用户资料错误:", err)
      setError(err.message || (language === "en" ? "Failed to update profile" : "更新资料失败"))
      setTimeout(() => setError(""), 5000)
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user || !session) {
    return null
  }

  const roleInfo = getRoleLabelSafe(profile?.role)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            {language === "en" ? "Back to Home" : "返回首页"}
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <User className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">
              {language === "en" ? "Profile" : "个人资料"}
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            {language === "en"
              ? "Manage your personal information and account settings"
              : "管理您的个人信息和账户设置"}
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：用户信息卡片 */}
          <Card>
            <CardHeader>
              <div className="flex flex-col items-center text-center space-y-4">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="text-2xl">
                    {user.email?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">
                    {profile?.full_name || user.email?.split("@")[0] || "User"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
                </div>
                <Badge className={`${roleInfo.color} text-white`}>
                  {roleInfo.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
                {profile?.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{profile.phone}</span>
                  </div>
                )}
                {profile?.company && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building className="h-4 w-4" />
                    <span>{profile.company}</span>
                  </div>
                )}
                {profile?.position && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    <span>{profile.position}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 右侧：编辑表单 */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>
                {language === "en" ? "Edit Profile" : "编辑资料"}
              </CardTitle>
              <CardDescription>
                {language === "en"
                  ? "Update your personal information"
                  : "更新您的个人信息"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">
                  {language === "en" ? "Email" : "邮箱"}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  {language === "en"
                    ? "Email cannot be changed"
                    : "邮箱无法修改"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">
                  {language === "en" ? "Full Name" : "姓名"}
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder={language === "en" ? "Enter your full name" : "请输入您的姓名"}
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  {language === "en" ? "Phone" : "电话"}
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder={language === "en" ? "Enter your phone number" : "请输入您的电话号码"}
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">
                  {language === "en" ? "Company" : "公司"}
                </Label>
                <Input
                  id="company"
                  type="text"
                  placeholder={language === "en" ? "Enter your company name" : "请输入您的公司名称"}
                  value={formData.company}
                  onChange={(e) =>
                    setFormData({ ...formData, company: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">
                  {language === "en" ? "Position" : "职位"}
                </Label>
                <Input
                  id="position"
                  type="text"
                  placeholder={language === "en" ? "Enter your position" : "请输入您的职位"}
                  value={formData.position}
                  onChange={(e) =>
                    setFormData({ ...formData, position: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>
                  {language === "en" ? "Role" : "角色"}
                </Label>
                <div className="flex items-center gap-2">
                  <Badge className={`${roleInfo.color} text-white`}>
                    {roleInfo.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {language === "en"
                      ? "Role cannot be changed here. Contact administrator for role changes."
                      : "角色无法在此修改。如需更改角色，请联系管理员。"}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={saving}
                >
                  {language === "en" ? "Cancel" : "取消"}
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {language === "en" ? "Saving..." : "保存中..."}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {language === "en" ? "Save" : "保存"}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

