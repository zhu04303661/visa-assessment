"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Users,
  RefreshCw,
  Search,
  Shield,
  UserCheck,
  UserX,
  AlertCircle,
  CheckCircle,
  Edit,
  Loader2,
} from "lucide-react"
import { useAuth } from "@/lib/supabase/auth-context"
import { useLanguage } from "@/lib/i18n"
import { Navbar } from "@/components/navbar"
import type { UserRole } from "@/lib/supabase/auth-context"

interface User {
  id: string
  email: string
  fullName: string
  phone: string
  company: string
  position: string
  role: UserRole
  createdAt: string
  updatedAt: string
  emailConfirmed: boolean
  lastSignIn: string | null
}

const roleLabels: Record<UserRole, { label: string; color: string }> = {
  guest: { label: "游客", color: "bg-gray-500" },
  client: { label: "客户", color: "bg-blue-500" },
  admin: { label: "管理员", color: "bg-purple-500" },
  super_admin: { label: "超级管理员", color: "bg-red-500" },
}

// 获取角色标签，如果角色不存在则返回默认值
const getRoleLabel = (role: string | null | undefined): { label: string; color: string } => {
  if (!role || !(role in roleLabels)) {
    return { label: "未知", color: "bg-gray-400" }
  }
  return roleLabels[role as UserRole]
}

export default function UserManagementPage() {
  const router = useRouter()
  const { user, session, profile, loading: authLoading, isAdmin } = useAuth()
  const { language } = useLanguage()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterRole, setFilterRole] = useState<UserRole | "all">("all")
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [newRole, setNewRole] = useState<UserRole>("guest")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [updating, setUpdating] = useState(false)

  // 权限检查
  useEffect(() => {
    if (!authLoading) {
      if (!user || !session) {
        router.push("/")
        return
      }
      if (!isAdmin()) {
        setError("您没有权限访问此页面")
        router.push("/")
      }
    }
  }, [user, session, authLoading, isAdmin, router])

  // 加载用户列表
  const loadUsers = async () => {
    if (!session) return

    try {
      setLoading(true)
      setError("")

      const response = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "获取用户列表失败")
      }

      if (data.success) {
        setUsers(data.users || [])
      } else {
        throw new Error(data.error || "获取用户列表失败")
      }
    } catch (err: any) {
      console.error("加载用户列表错误:", err)
      setError(err.message || "加载用户列表失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session && isAdmin()) {
      loadUsers()
    }
  }, [session, isAdmin])

  // 更新用户角色
  const handleUpdateRole = async () => {
    if (!editingUser || !session) return

    try {
      setUpdating(true)
      setError("")

      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: editingUser.id,
          role: newRole,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "更新用户角色失败")
      }

      if (data.success) {
        setSuccess("用户角色更新成功")
        setIsDialogOpen(false)
        setEditingUser(null)
        loadUsers()
        setTimeout(() => setSuccess(""), 3000)
      } else {
        throw new Error(data.error || "更新用户角色失败")
      }
    } catch (err: any) {
      console.error("更新用户角色错误:", err)
      setError(err.message || "更新用户角色失败")
      setTimeout(() => setError(""), 5000)
    } finally {
      setUpdating(false)
    }
  }

  // 打开编辑对话框
  const openEditDialog = (user: User) => {
    setEditingUser(user)
    setNewRole(user.role)
    setIsDialogOpen(true)
  }

  // 过滤用户
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = filterRole === "all" || u.role === filterRole
    return matchesSearch && matchesRole
  })

  // 统计信息
  const stats = {
    total: users.length,
    guest: users.filter((u) => u.role === "guest").length,
    client: users.filter((u) => u.role === "client").length,
    admin: users.filter((u) => u.role === "admin").length,
    super_admin: users.filter((u) => u.role === "super_admin").length,
  }

  if (authLoading || !isAdmin()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">用户管理</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            管理系统用户，分配用户角色和权限
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

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">总用户数</p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                </div>
                <Users className="h-8 w-8 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">游客</p>
                  <p className="text-3xl font-bold">{stats.guest}</p>
                </div>
                <UserX className="h-8 w-8 text-gray-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">客户</p>
                  <p className="text-3xl font-bold">{stats.client}</p>
                </div>
                <UserCheck className="h-8 w-8 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">管理员</p>
                  <p className="text-3xl font-bold">{stats.admin}</p>
                </div>
                <Shield className="h-8 w-8 text-purple-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">超级管理员</p>
                  <p className="text-3xl font-bold">{stats.super_admin}</p>
                </div>
                <Shield className="h-8 w-8 text-red-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 操作栏 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <CardTitle>用户列表</CardTitle>
              <div className="flex gap-2 w-full md:w-auto">
                <Button
                  onClick={loadUsers}
                  variant="outline"
                  disabled={loading}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  刷新
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* 搜索和过滤 */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索邮箱、姓名或电话..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterRole} onValueChange={(v) => setFilterRole(v as any)}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有角色</SelectItem>
                  <SelectItem value="guest">游客</SelectItem>
                  <SelectItem value="client">客户</SelectItem>
                  <SelectItem value="admin">管理员</SelectItem>
                  <SelectItem value="super_admin">超级管理员</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 用户表格 */}
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">加载中...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-muted-foreground">没有找到用户</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>邮箱</TableHead>
                      <TableHead>姓名</TableHead>
                      <TableHead>电话</TableHead>
                      <TableHead>公司</TableHead>
                      <TableHead>角色</TableHead>
                      <TableHead>邮箱验证</TableHead>
                      <TableHead>注册时间</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.email}</TableCell>
                        <TableCell>{u.fullName || "-"}</TableCell>
                        <TableCell>{u.phone || "-"}</TableCell>
                        <TableCell>{u.company || "-"}</TableCell>
                        <TableCell>
                          <Badge
                            className={`${getRoleLabel(u.role).color} text-white`}
                          >
                            {getRoleLabel(u.role).label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {u.emailConfirmed ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(u)}
                            disabled={u.id === user?.id}
                            className="gap-2"
                          >
                            <Edit className="h-4 w-4" />
                            编辑
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 编辑角色对话框 */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>编辑用户角色</DialogTitle>
              <DialogDescription>
                为 <strong>{editingUser?.email}</strong> 分配新的角色
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">角色</label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="guest">游客</SelectItem>
                    <SelectItem value="client">客户</SelectItem>
                    <SelectItem value="admin">管理员</SelectItem>
                    <SelectItem value="super_admin">超级管理员</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {newRole === "guest" && "默认角色，只能查看公开内容"}
                  {newRole === "client" && "客户角色，可以访问客户专属功能"}
                  {newRole === "admin" && "管理员角色，可以管理用户和内容"}
                  {newRole === "super_admin" && "超级管理员角色，拥有所有权限"}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={updating}
              >
                取消
              </Button>
              <Button onClick={handleUpdateRole} disabled={updating}>
                {updating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    更新中...
                  </>
                ) : (
                  "确认更新"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

