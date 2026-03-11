"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Users, RefreshCw, Search, Shield, UserCheck, UserX,
  AlertCircle, CheckCircle, XCircle, Edit, Loader2,
  Globe, Eye, Activity, ChevronLeft, ChevronRight,
  Monitor, Smartphone, Tablet, Trash2, MousePointerClick,
  LayoutDashboard, Server, Cpu, Clock, Wifi, WifiOff,
  Database, ChevronDown, ChevronUp, Play, Zap,
  CalendarDays, TrendingUp, X,
} from "lucide-react"
import {
  Bar, BarChart as ReBarChart, CartesianGrid, Cell,
  ComposedChart, Legend, Line, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts"
import { useAuth, type UserRole } from "@/lib/auth/auth-context"
import { AuthDialog } from "@/components/auth-dialog"
import { LogIn } from "lucide-react"

// ==================== Types ====================

interface AdminUser {
  id: string; email: string; fullName: string; phone: string
  company: string; position: string; role: UserRole
  createdAt: string; updatedAt: string; emailConfirmed: boolean; lastSignIn: string | null
}

interface VisitorLog {
  id: string; user_id: string | null; user_email: string | null; user_name: string | null
  ip_address: string; user_agent: string; referer: string; path: string; method: string
  status_code: number | null; device_type: string | null; browser: string | null; os: string | null
  created_at: string
}

interface ActivityLog {
  id: string; user_id: string | null; user_email: string | null; user_name: string | null
  ip_address: string | null; action: string; category: string; target: string | null
  details: Record<string, unknown> | null; path: string | null; created_at: string
}

interface VisitorStats {
  overview: { total_visits: number; unique_ips: number; unique_users: number; unique_sessions: number }
  top_pages: { path: string; count: number }[]
  daily_visits: { date: string; count: number }[]
  top_ips: { ip: string; count: number; last_visit: string }[]
  top_actions: { action: string; count: number }[]
}

interface RouteInfo {
  path: string; methods: string[]; endpoint: string; has_params: boolean
}

interface HealthData {
  status: string; message?: string; timestamp: string
  services?: Record<string, string>
  route_groups?: Record<string, RouteInfo[]>
  total_routes?: number
}

interface EndpointTestResult {
  path: string; status: "ok" | "error" | "checking" | "skipped"
  latency?: number; statusCode?: number; method: string
}

interface PageTrendRow { date: string; path: string; visits: number }
interface DwellStatRow { path: string; avg_duration_ms: number; visits: number }

// ==================== Constants ====================

const TRACKING_API = "/api/copywriting/api/tracking"
const BACKEND_PROXY = "/api/copywriting"

const ROLE_CONFIG: Record<UserRole, { label: string; color: string }> = {
  guest: { label: "游客", color: "bg-gray-500" },
  client: { label: "客户", color: "bg-blue-500" },
  admin: { label: "管理员", color: "bg-purple-500" },
  super_admin: { label: "超级管理员", color: "bg-red-500" },
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  login: { label: "登录", color: "bg-green-100 text-green-800" },
  logout: { label: "退出", color: "bg-orange-100 text-orange-800" },
  register: { label: "注册", color: "bg-blue-100 text-blue-800" },
  navigate: { label: "导航", color: "bg-purple-100 text-purple-800" },
  click: { label: "点击", color: "bg-cyan-100 text-cyan-800" },
  form_submit: { label: "提交表单", color: "bg-yellow-100 text-yellow-800" },
  file_upload: { label: "上传文件", color: "bg-pink-100 text-pink-800" },
  search: { label: "搜索", color: "bg-indigo-100 text-indigo-800" },
  error: { label: "错误", color: "bg-red-100 text-red-800" },
}

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-green-100 text-green-700 border-green-300",
  POST: "bg-blue-100 text-blue-700 border-blue-300",
  PUT: "bg-amber-100 text-amber-700 border-amber-300",
  PATCH: "bg-orange-100 text-orange-700 border-orange-300",
  DELETE: "bg-red-100 text-red-700 border-red-300",
}

const CHART_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"]

function shortPath(p: string) {
  if (p === "/") return "首页"
  return p.replace(/^\//, "").replace(/\//g, " / ").slice(0, 24) || p
}

// ==================== Helpers ====================

function getRoleLabel(role: string | null | undefined) {
  if (!role || !(role in ROLE_CONFIG)) return { label: "未知", color: "bg-gray-400" }
  return ROLE_CONFIG[role as UserRole]
}

function DeviceIcon({ type }: { type: string | null }) {
  if (type === "mobile") return <Smartphone className="h-4 w-4" />
  if (type === "tablet") return <Tablet className="h-4 w-4" />
  return <Monitor className="h-4 w-4" />
}

function fmtDate(s: string) {
  try {
    return new Date(s).toLocaleString("zh-CN", {
      month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
    })
  } catch { return s }
}

function fmtDay(s: string) {
  try { return new Date(s).toLocaleDateString("zh-CN") } catch { return s }
}

function parseReferer(r: string) {
  if (!r) return "-"
  try { return new URL(r).hostname } catch { return r.slice(0, 30) }
}

function svcStatusIcon(status: string, size = "h-4 w-4") {
  if (["healthy", "enabled", "ok"].includes(status))
    return <CheckCircle className={`${size} text-green-500`} />
  if (["unhealthy", "error"].includes(status))
    return <XCircle className={`${size} text-red-500`} />
  if (status === "disabled")
    return <AlertCircle className={`${size} text-gray-400`} />
  if (status === "checking")
    return <RefreshCw className={`${size} animate-spin text-blue-500`} />
  if (status === "skipped")
    return <AlertCircle className={`${size} text-gray-300`} />
  return <AlertCircle className={`${size} text-yellow-500`} />
}

function svcStatusColor(status: string) {
  if (["healthy", "enabled", "ok"].includes(status))
    return "bg-green-50 text-green-800 border-green-200"
  if (["unhealthy", "error"].includes(status))
    return "bg-red-50 text-red-800 border-red-200"
  if (status === "disabled")
    return "bg-gray-50 text-gray-600 border-gray-200"
  return "bg-yellow-50 text-yellow-800 border-yellow-200"
}

function latencyColor(ms: number) {
  if (ms < 100) return "text-green-600"
  if (ms < 500) return "text-yellow-600"
  return "text-red-600"
}

function canAutoTest(route: RouteInfo): boolean {
  return route.methods.includes("GET") && !route.has_params
}

function buildProxyPath(backendPath: string): string {
  return `${BACKEND_PROXY}${backendPath}`
}

// ==================== Page ====================

export default function AdminPage() {
  const { user, profile, loading: authLoading, isAdmin } = useAuth()
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // --- users ---
  const [users, setUsers] = useState<AdminUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userSearch, setUserSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all")
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [newRole, setNewRole] = useState<UserRole>("guest")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [updating, setUpdating] = useState(false)

  // --- visitor stats ---
  const [stats, setStats] = useState<VisitorStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState(false)

  // --- visitor logs ---
  const [visitorLogs, setVisitorLogs] = useState<VisitorLog[]>([])
  const [visitorTotal, setVisitorTotal] = useState(0)
  const [visitorPage, setVisitorPage] = useState(1)
  const [visitorTotalPages, setVisitorTotalPages] = useState(1)
  const [visitorIpFilter, setVisitorIpFilter] = useState("")
  const [visitorPathFilter, setVisitorPathFilter] = useState("")
  const [visitorsLoading, setVisitorsLoading] = useState(false)

  // --- activity logs ---
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [activityTotal, setActivityTotal] = useState(0)
  const [activityPage, setActivityPage] = useState(1)
  const [activityTotalPages, setActivityTotalPages] = useState(1)
  const [activityActionFilter, setActivityActionFilter] = useState("")
  const [activitiesLoading, setActivitiesLoading] = useState(false)

  // --- page trends & dwell ---
  const [pageTrends, setPageTrends] = useState<PageTrendRow[]>([])
  const [dwellStats, setDwellStats] = useState<DwellStatRow[]>([])
  const [trendsLoading, setTrendsLoading] = useState(false)
  const [trendRange, setTrendRange] = useState<"week" | "month" | "all" | "custom">("month")
  const [customDateFrom, setCustomDateFrom] = useState("")
  const [customDateTo, setCustomDateTo] = useState("")
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // --- health ---
  const [healthLoading, setHealthLoading] = useState(false)
  const [healthData, setHealthData] = useState<HealthData | null>(null)
  const [healthError, setHealthError] = useState<string | null>(null)
  const [healthLatency, setHealthLatency] = useState<number | null>(null)
  const [healthLastCheck, setHealthLastCheck] = useState<Date | null>(null)
  const [healthAutoRefresh, setHealthAutoRefresh] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [testResults, setTestResults] = useState<Map<string, EndpointTestResult>>(new Map())
  const [testingAll, setTestingAll] = useState(false)

  const statsDays = (() => {
    if (trendRange === "week") return "7"
    if (trendRange === "month") return "30"
    if (trendRange === "all") return "3650"
    if (trendRange === "custom" && customDateFrom) {
      const from = new Date(customDateFrom)
      const to = customDateTo ? new Date(customDateTo) : new Date()
      const diff = Math.ceil((to.getTime() - from.getTime()) / 86400000)
      return String(Math.max(1, diff))
    }
    return "30"
  })()

  useEffect(() => {
    if (error || success) {
      const t = setTimeout(() => { setError(""); setSuccess("") }, 5000)
      return () => clearTimeout(t)
    }
  }, [error, success])

  // ==================== Data Loaders ====================

  const loadUsers = useCallback(async () => {
    try {
      setUsersLoading(true)
      const res = await fetch("/api/admin/users", { credentials: "include" })
      const data = await res.json()
      if (data.success) setUsers(data.users || [])
      else setError(data.error || "获取用户列表失败")
    } catch (e) { setError(`加载用户失败: ${e}`) }
    finally { setUsersLoading(false) }
  }, [])

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true)
      setStatsError(false)
      const res = await fetch(`${TRACKING_API}/stats?days=${statsDays}`)
      const data = await res.json()
      if (data.success && data.stats) setStats(data.stats)
      else {
        setStatsError(true)
        setStats({ overview: { total_visits: 0, unique_ips: 0, unique_users: 0, unique_sessions: 0 }, top_pages: [], daily_visits: [], top_ips: [], top_actions: [] })
      }
    } catch (e) {
      console.error("加载统计失败:", e)
      setStatsError(true)
      setStats({ overview: { total_visits: 0, unique_ips: 0, unique_users: 0, unique_sessions: 0 }, top_pages: [], daily_visits: [], top_ips: [], top_actions: [] })
    } finally {
      setStatsLoading(false)
    }
  }, [statsDays])

  const loadVisitorLogs = useCallback(async () => {
    try {
      setVisitorsLoading(true)
      const params = new URLSearchParams({ page: String(visitorPage), page_size: "30" })
      if (visitorIpFilter) params.set("ip", visitorIpFilter)
      if (visitorPathFilter) params.set("path", visitorPathFilter)
      const res = await fetch(`${TRACKING_API}/visitors?${params}`)
      const data = await res.json()
      if (data.success) { setVisitorLogs(data.logs); setVisitorTotal(data.total); setVisitorTotalPages(data.total_pages) }
      else { setVisitorLogs([]); setVisitorTotal(0); setVisitorTotalPages(1) }
    } catch (e) { console.error("加载访客日志失败:", e); setVisitorLogs([]); setVisitorTotal(0); setVisitorTotalPages(1) }
    finally { setVisitorsLoading(false) }
  }, [visitorPage, visitorIpFilter, visitorPathFilter])

  const loadActivityLogs = useCallback(async () => {
    try {
      setActivitiesLoading(true)
      const params = new URLSearchParams({ page: String(activityPage), page_size: "30" })
      if (activityActionFilter) params.set("action", activityActionFilter)
      const res = await fetch(`${TRACKING_API}/activities?${params}`)
      const data = await res.json()
      if (data.success) { setActivityLogs(data.logs); setActivityTotal(data.total); setActivityTotalPages(data.total_pages) }
      else { setActivityLogs([]); setActivityTotal(0); setActivityTotalPages(1) }
    } catch (e) { console.error("加载活动日志失败:", e); setActivityLogs([]); setActivityTotal(0); setActivityTotalPages(1) }
    finally { setActivitiesLoading(false) }
  }, [activityPage, activityActionFilter])

  const loadPageTrends = useCallback(async () => {
    try {
      setTrendsLoading(true)
      const res = await fetch(`${TRACKING_API}/page-trends?days=${statsDays}`)
      const data = await res.json()
      if (data.success) {
        setPageTrends(data.trends || [])
        setDwellStats(data.dwell_stats || [])
      }
    } catch (e) { console.error("加载页面趋势失败:", e) }
    finally { setTrendsLoading(false) }
  }, [statsDays])

  const checkHealth = useCallback(async () => {
    setHealthLoading(true)
    setHealthError(null)
    const t0 = Date.now()
    try {
      const res = await fetch("/api/backend-health", { cache: "no-store" })
      setHealthLatency(Date.now() - t0)
      if (res.ok) { setHealthData(await res.json()); setHealthError(null) }
      else { setHealthError(`HTTP ${res.status}: ${res.statusText}`); setHealthData(null) }
    } catch (e) {
      setHealthLatency(Date.now() - t0)
      setHealthError(e instanceof Error ? e.message : "连接失败")
      setHealthData(null)
    } finally { setHealthLoading(false); setHealthLastCheck(new Date()) }
  }, [])

  const testSingleEndpoint = useCallback(async (route: RouteInfo) => {
    const key = `${route.methods[0]}:${route.path}`
    if (!canAutoTest(route)) {
      setTestResults(prev => new Map(prev).set(key, { path: route.path, method: "GET", status: "skipped" }))
      return
    }
    setTestResults(prev => new Map(prev).set(key, { path: route.path, method: "GET", status: "checking" }))
    const proxyPath = buildProxyPath(route.path)
    const t0 = Date.now()
    try {
      const res = await fetch(proxyPath, { cache: "no-store" })
      setTestResults(prev => new Map(prev).set(key, {
        path: route.path, method: "GET", status: res.ok ? "ok" : "error",
        latency: Date.now() - t0, statusCode: res.status,
      }))
    } catch {
      setTestResults(prev => new Map(prev).set(key, {
        path: route.path, method: "GET", status: "error", latency: Date.now() - t0,
      }))
    }
  }, [])

  const testAllEndpoints = useCallback(async () => {
    if (!healthData?.route_groups) return
    setTestingAll(true)
    setTestResults(new Map())

    const allRoutes = Object.values(healthData.route_groups).flat()
    const testable = allRoutes.filter(canAutoTest)

    for (const route of testable) {
      await testSingleEndpoint(route)
      await new Promise(r => setTimeout(r, 100))
    }
    setTestingAll(false)
  }, [healthData, testSingleEndpoint])

  // --- initial + tab-driven loads ---
  useEffect(() => {
    if (profile && isAdmin()) { loadUsers(); loadStats(); loadPageTrends() }
  }, [profile, isAdmin, loadUsers, loadStats, loadPageTrends])

  useEffect(() => { if (activeTab === "visitors") loadVisitorLogs() }, [activeTab, loadVisitorLogs])
  useEffect(() => { if (activeTab === "activities") loadActivityLogs() }, [activeTab, loadActivityLogs])
  useEffect(() => { if (activeTab === "health" && !healthData && !healthError) checkHealth() }, [activeTab, healthData, healthError, checkHealth])
  useEffect(() => {
    if (!healthAutoRefresh) return
    const id = setInterval(checkHealth, 10000)
    return () => clearInterval(id)
  }, [healthAutoRefresh, checkHealth])

  // ==================== User Actions ====================

  const openEditDialog = (u: AdminUser) => { setEditingUser(u); setNewRole(u.role); setIsDialogOpen(true) }

  const handleUpdateRole = async () => {
    if (!editingUser) return
    try {
      setUpdating(true)
      const res = await fetch("/api/admin/users", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ userId: editingUser.id, role: newRole }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "更新失败")
      setSuccess(`已将 ${editingUser.email} 的角色更新为 ${getRoleLabel(newRole).label}`)
      setIsDialogOpen(false); setEditingUser(null); loadUsers()
    } catch (e: any) { setError(e.message || "更新用户角色失败") }
    finally { setUpdating(false) }
  }

  const handleCleanupLogs = async () => {
    if (!confirm("确定要清理90天前的旧日志吗？")) return
    try {
      const res = await fetch(`${TRACKING_API}/cleanup`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ days: 90 }),
      })
      const data = await res.json()
      if (data.success) { setSuccess(`已清理 ${data.visitor_logs_cleaned} 条访客日志和 ${data.activity_logs_cleaned} 条活动日志`); loadStats() }
    } catch (e) { setError(`清理失败: ${e}`) }
  }

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

  // ==================== Derived ====================

  const filteredUsers = users.filter((u) => {
    const s = userSearch.toLowerCase()
    const matchSearch = !s || u.email.toLowerCase().includes(s) || u.fullName.toLowerCase().includes(s) || u.phone.toLowerCase().includes(s)
    return (matchSearch) && (roleFilter === "all" || u.role === roleFilter)
  })

  const userStats = {
    total: users.length,
    guest: users.filter((u) => u.role === "guest").length,
    client: users.filter((u) => u.role === "client").length,
    admin: users.filter((u) => u.role === "admin").length,
    super_admin: users.filter((u) => u.role === "super_admin").length,
  }

  // ==================== Render Helpers ====================

  const routeGroups = healthData?.route_groups ?? {}
  const totalRoutes = healthData?.total_routes ?? 0

  const testSummary = (() => {
    let ok = 0, fail = 0, skip = 0, checking = 0
    testResults.forEach(r => {
      if (r.status === "ok") ok++
      else if (r.status === "error") fail++
      else if (r.status === "skipped") skip++
      else checking++
    })
    return { ok, fail, skip, checking, total: testResults.size }
  })()

  // ==================== Render ====================

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  if (!user || !profile) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <LogIn className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>需要登录</CardTitle>
              <CardDescription>请登录管理员账号以访问管理控制台</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button onClick={() => setShowLoginDialog(true)} className="w-full">登录</Button>
              <Button variant="outline" onClick={() => window.location.href = "/"} className="w-full">返回首页</Button>
            </CardContent>
          </Card>
        </div>
        <AuthDialog open={showLoginDialog} onOpenChange={setShowLoginDialog} defaultMode="login" />
      </>
    )
  }

  if (!isAdmin()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>访问被拒绝</CardTitle>
            <CardDescription>您需要管理员权限才能访问此页面</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => window.location.href = "/"} className="w-full">返回首页</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 md:p-6">
      <div className="container mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <LayoutDashboard className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">管理控制台</h1>
          </div>
          <p className="text-muted-foreground">用户授权 / 角色分配 / 访问监控 / 服务状态</p>
        </div>

        {/* Toasts */}
        {error && <Alert className="mb-4" variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
        {success && <Alert className="mb-4"><CheckCircle className="h-4 w-4" /><AlertDescription>{success}</AlertDescription></Alert>}

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <Card className="border-l-4 border-l-blue-500"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">注册用户</p>
            <p className="text-2xl font-bold">{userStats.total}</p>
          </CardContent></Card>
          <Card className="border-l-4 border-l-amber-500"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">待授权</p>
            <p className="text-2xl font-bold">{userStats.guest}</p>
          </CardContent></Card>
          <Card className="border-l-4 border-l-green-500"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">总访问</p>
            <p className="text-2xl font-bold">{stats?.overview.total_visits.toLocaleString() ?? "-"}</p>
          </CardContent></Card>
          <Card className="border-l-4 border-l-purple-500"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">独立IP</p>
            <p className="text-2xl font-bold">{stats?.overview.unique_ips.toLocaleString() ?? "-"}</p>
          </CardContent></Card>
          <Card className={`border-l-4 ${healthData ? "border-l-emerald-500" : healthError ? "border-l-red-500" : "border-l-gray-300"}`}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium">后端服务</p>
              <p className="text-2xl font-bold">{healthData ? "正常" : healthError ? "异常" : "-"}</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="mb-4 w-max md:w-auto">
              <TabsTrigger value="overview" className="gap-1.5"><Eye className="h-4 w-4" /> <span className="hidden sm:inline">访问</span>概览</TabsTrigger>
              <TabsTrigger value="users" className="gap-1.5"><Users className="h-4 w-4" /> 用户<span className="hidden sm:inline">管理</span></TabsTrigger>
              <TabsTrigger value="visitors" className="gap-1.5"><Globe className="h-4 w-4" /> <span className="hidden sm:inline">访客</span>日志</TabsTrigger>
              <TabsTrigger value="activities" className="gap-1.5"><Activity className="h-4 w-4" /> <span className="hidden sm:inline">活动</span>日志</TabsTrigger>
              <TabsTrigger value="health" className="gap-1.5"><Server className="h-4 w-4" /> 服务<span className="hidden sm:inline">状态</span></TabsTrigger>
            </TabsList>
          </div>

          {/* ===== TAB: 访问概览 ===== */}
          <TabsContent value="overview">
            {/* 时间范围选择器 */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">时间范围：</span>
              <div className="flex rounded-lg border overflow-hidden">
                {([
                  { key: "week", label: "周" },
                  { key: "month", label: "月" },
                  { key: "all", label: "全部" },
                  { key: "custom", label: "自定义" },
                ] as const).map(item => (
                  <button key={item.key}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${trendRange === item.key ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                    onClick={() => { setTrendRange(item.key); setSelectedDate(null) }}
                  >{item.label}</button>
                ))}
              </div>
              {trendRange === "custom" && (
                <div className="flex items-center gap-1.5">
                  <Input type="date" value={customDateFrom} onChange={e => setCustomDateFrom(e.target.value)} className="w-36 h-8 text-xs" />
                  <span className="text-xs text-muted-foreground">至</span>
                  <Input type="date" value={customDateTo} onChange={e => setCustomDateTo(e.target.value)} className="w-36 h-8 text-xs" />
                </div>
              )}
              {selectedDate && (
                <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setSelectedDate(null)}>
                  <CalendarDays className="h-3 w-3" /> {selectedDate} <X className="h-3 w-3" />
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={() => { loadStats(); loadPageTrends() }}><RefreshCw className="h-4 w-4" /></Button>
            </div>

            {stats ? (
              <>
                {/* 概览数字卡 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {[
                    { label: "总访问", val: stats.overview.total_visits },
                    { label: "独立IP", val: stats.overview.unique_ips },
                    { label: "登录用户", val: stats.overview.unique_users },
                    { label: "独立会话", val: stats.overview.unique_sessions },
                  ].map(c => (
                    <Card key={c.label}><CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">{c.label}</p>
                      <p className="text-2xl font-bold">{c.val.toLocaleString()}</p>
                    </CardContent></Card>
                  ))}
                </div>

                {/* 流量趋势组合图 */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      {selectedDate ? `${selectedDate} 页面流量分布` : `流量趋势 — ${({ week: "最近 7 天", month: "最近 30 天", all: "全部", custom: customDateFrom ? `${customDateFrom} 至 ${customDateTo || "今天"}` : "自定义" } as Record<string, string>)[trendRange]}`}
                    </CardTitle>
                    {!selectedDate && stats.daily_visits.length > 0 && (
                      <CardDescription className="text-xs">点击图表上的日期柱可查看该日页面流量详情</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {(statsLoading || trendsLoading) ? (
                      <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                    ) : selectedDate ? (() => {
                      const dayRows = pageTrends.filter(r => r.date === selectedDate)
                      if (dayRows.length === 0) return <p className="text-muted-foreground text-center py-4">该日暂无页面访问数据</p>
                      const sorted = [...dayRows].sort((a, b) => b.visits - a.visits)
                      const pieData = sorted.slice(0, 8).map((r, i) => ({ name: shortPath(r.path), value: r.visits, fill: CHART_COLORS[i % CHART_COLORS.length] }))
                      const rest = sorted.slice(8).reduce((s, r) => s + r.visits, 0)
                      if (rest > 0) pieData.push({ name: "其他", value: rest, fill: "#94a3b8" })
                      const totalDay = sorted.reduce((s, r) => s + r.visits, 0)
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ strokeWidth: 1 }}>
                                {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                              </Pie>
                              <Tooltip formatter={(v: number) => [v, "访问量"]} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div>
                            <div className="text-sm font-medium mb-3">当日总访问：<span className="text-lg font-bold">{totalDay}</span></div>
                            <div className="space-y-1.5">
                              {sorted.map((r, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: i < 8 ? CHART_COLORS[i % CHART_COLORS.length] : "#94a3b8" }} />
                                  <code className="text-xs truncate flex-1">{r.path}</code>
                                  <span className="text-sm font-medium tabular-nums">{r.visits}</span>
                                  <span className="text-[10px] text-muted-foreground w-10 text-right">{(r.visits / totalDay * 100).toFixed(1)}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    })() : stats.daily_visits.length > 0 ? (() => {
                      const pathCounts = new Map<string, number>()
                      pageTrends.forEach(r => pathCounts.set(r.path, (pathCounts.get(r.path) || 0) + r.visits))
                      const top5 = [...pathCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0])

                      const dateMap = new Map<string, Record<string, number>>()
                      stats.daily_visits.forEach(d => {
                        dateMap.set(d.date, { total: d.count })
                      })
                      pageTrends.filter(r => top5.includes(r.path)).forEach(r => {
                        if (!dateMap.has(r.date)) dateMap.set(r.date, { total: 0 })
                        dateMap.get(r.date)![r.path] = r.visits
                      })
                      const chartData = [...dateMap.entries()].sort().map(([date, vals]) => ({ date, ...vals }))

                      return (
                        <ResponsiveContainer width="100%" height={340}>
                          <ComposedChart data={chartData} onClick={(e) => {
                            if (e?.activeLabel) setSelectedDate(e.activeLabel as string)
                          }}>
                            <defs>
                              <linearGradient id="visitGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                            <Tooltip labelFormatter={(v: string) => `日期: ${v}`} contentStyle={{ fontSize: 12 }} />
                            <Legend formatter={(v: string) => v === "total" ? "总访问量" : shortPath(v)} />
                            <Bar dataKey="total" name="total" fill="url(#visitGrad)" stroke="#6366f1" strokeWidth={1} barSize={trendRange === "week" ? 24 : trendRange === "month" ? 12 : 6} opacity={0.7} />
                            {top5.map((p, i) => (
                              <Line key={p} type="monotone" dataKey={p} name={p} stroke={CHART_COLORS[i]} strokeWidth={2} dot={false} />
                            ))}
                          </ComposedChart>
                        </ResponsiveContainer>
                      )
                    })() : <p className="text-muted-foreground text-center py-4">暂无数据</p>}
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 页面平均停留时间 */}
                  <Card>
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> 页面平均停留时间</CardTitle></CardHeader>
                    <CardContent>
                      {trendsLoading ? (
                        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                      ) : dwellStats.length > 0 ? (
                        <ResponsiveContainer width="100%" height={Math.max(200, dwellStats.length * 32)}>
                          <ReBarChart data={dwellStats.map(d => ({
                            path: shortPath(d.path),
                            seconds: Math.round(d.avg_duration_ms / 1000),
                            visits: d.visits,
                          }))} layout="vertical" margin={{ left: 10, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis type="number" tick={{ fontSize: 11 }} unit="s" />
                            <YAxis dataKey="path" type="category" tick={{ fontSize: 11 }} width={110} />
                            <Tooltip formatter={(v: number) => [`${v}s`, "平均停留"]} />
                            <Bar dataKey="seconds" name="平均停留(s)" fill="#10b981" radius={[0, 4, 4, 0]} />
                          </ReBarChart>
                        </ResponsiveContainer>
                      ) : <p className="text-muted-foreground text-center py-4">暂无停留时间数据</p>}
                    </CardContent>
                  </Card>

                  {/* 热门页面 */}
                  <Card>
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><Eye className="h-4 w-4" /> 热门页面</CardTitle></CardHeader>
                    <CardContent>
                      {stats.top_pages.length > 0 ? stats.top_pages.slice(0, 10).map((p, i) => (
                        <div key={i} className="flex justify-between items-center py-0.5">
                          <code className="text-xs truncate flex-1 mr-2">{p.path}</code>
                          <Badge variant="secondary" className="text-xs shrink-0">{p.count}</Badge>
                        </div>
                      )) : <p className="text-muted-foreground text-center py-4">暂无数据</p>}
                    </CardContent>
                  </Card>

                  {/* 活跃IP */}
                  <Card>
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4" /> 活跃IP</CardTitle></CardHeader>
                    <CardContent>
                      {stats.top_ips.length > 0 ? stats.top_ips.slice(0, 10).map((ip, i) => (
                        <div key={i} className="flex justify-between items-center py-0.5">
                          <div><code className="text-xs">{ip.ip}</code><p className="text-[10px] text-muted-foreground">最近: {fmtDate(ip.last_visit)}</p></div>
                          <Badge variant="secondary" className="text-xs shrink-0">{ip.count} 次</Badge>
                        </div>
                      )) : <p className="text-muted-foreground text-center py-4">暂无数据</p>}
                    </CardContent>
                  </Card>

                  {/* 热门操作 */}
                  <Card>
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><MousePointerClick className="h-4 w-4" /> 热门操作</CardTitle></CardHeader>
                    <CardContent>
                      {stats.top_actions.length > 0 ? stats.top_actions.slice(0, 10).map((a, i) => {
                        const info = ACTION_LABELS[a.action] || { label: a.action, color: "bg-gray-100 text-gray-800" }
                        return (<div key={i} className="flex justify-between items-center py-0.5">
                          <Badge className={info.color} variant="secondary">{info.label}</Badge>
                          <span className="text-sm font-medium">{a.count}</span>
                        </div>)
                      }) : <p className="text-muted-foreground text-center py-4">暂无数据</p>}
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : statsError ? (
              <div className="text-center py-12">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-400" />
                <p className="text-muted-foreground mb-3">加载统计数据失败</p>
                <Button variant="outline" size="sm" onClick={loadStats}><RefreshCw className="h-4 w-4 mr-1.5" /> 重试</Button>
              </div>
            ) : (
              <div className="text-center py-12"><RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" /><p className="text-muted-foreground">加载中...</p></div>
            )}
          </TabsContent>

          {/* ===== TAB: 用户管理 ===== */}
          <TabsContent value="users">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              {[
                { label: "总用户", val: userStats.total, icon: <Users className="h-5 w-5 text-primary opacity-20" /> },
                { label: "游客", val: userStats.guest, icon: <UserX className="h-5 w-5 text-gray-500 opacity-20" /> },
                { label: "客户", val: userStats.client, icon: <UserCheck className="h-5 w-5 text-blue-500 opacity-20" /> },
                { label: "管理员", val: userStats.admin, icon: <Shield className="h-5 w-5 text-purple-500 opacity-20" /> },
                { label: "超管", val: userStats.super_admin, icon: <Shield className="h-5 w-5 text-red-500 opacity-20" /> },
              ].map(c => (
                <Card key={c.label}><CardContent className="p-3 flex items-center justify-between">
                  <div><p className="text-xs text-muted-foreground">{c.label}</p><p className="text-xl font-bold">{c.val}</p></div>
                  {c.icon}
                </CardContent></Card>
              ))}
            </div>
            <Card>
              <CardHeader className="border-b pb-4">
                <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
                  <CardTitle className="text-lg">用户列表</CardTitle>
                  <Button variant="outline" size="sm" onClick={loadUsers} disabled={usersLoading} className="gap-1.5">
                    <RefreshCw className={`h-4 w-4 ${usersLoading ? "animate-spin" : ""}`} /> 刷新
                  </Button>
                </div>
                <div className="flex flex-col md:flex-row gap-3 mt-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="搜索邮箱、姓名或电话..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="pl-10" />
                  </div>
                  <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as any)}>
                    <SelectTrigger className="w-full md:w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">所有角色</SelectItem>
                      <SelectItem value="guest">游客</SelectItem>
                      <SelectItem value="client">客户</SelectItem>
                      <SelectItem value="admin">管理员</SelectItem>
                      <SelectItem value="super_admin">超级管理员</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {usersLoading ? (
                  <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">没有找到用户</div>
                ) : (
                  <div className="overflow-x-auto"><Table>
                    <TableHeader><TableRow>
                      <TableHead>邮箱</TableHead><TableHead>姓名</TableHead><TableHead>电话</TableHead>
                      <TableHead>公司</TableHead><TableHead>角色</TableHead><TableHead>注册时间</TableHead>
                      <TableHead>最后登录</TableHead><TableHead className="text-right">操作</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>{filteredUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium text-sm">{u.email}</TableCell>
                        <TableCell className="text-sm">{u.fullName || "-"}</TableCell>
                        <TableCell className="text-sm">{u.phone || "-"}</TableCell>
                        <TableCell className="text-sm">{u.company || "-"}</TableCell>
                        <TableCell><Badge className={`${getRoleLabel(u.role).color} text-white text-xs`}>{getRoleLabel(u.role).label}</Badge></TableCell>
                        <TableCell className="text-xs">{fmtDay(u.createdAt)}</TableCell>
                        <TableCell className="text-xs">{u.lastSignIn ? fmtDate(u.lastSignIn) : "-"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(u)} disabled={u.id === user?.id} className="gap-1.5">
                            <Edit className="h-3.5 w-3.5" /> 授权
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}</TableBody>
                  </Table></div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== TAB: 访客日志 ===== */}
          <TabsContent value="visitors">
            <Card>
              <CardHeader className="border-b pb-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <CardTitle className="text-lg">访客日志 ({visitorTotal.toLocaleString()} 条)</CardTitle>
                  <div className="flex gap-2 flex-wrap">
                    <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="按IP过滤..." value={visitorIpFilter} onChange={(e) => { setVisitorIpFilter(e.target.value); setVisitorPage(1) }} className="pl-8 w-36" /></div>
                    <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="按路径过滤..." value={visitorPathFilter} onChange={(e) => { setVisitorPathFilter(e.target.value); setVisitorPage(1) }} className="pl-8 w-36" /></div>
                    <Button variant="outline" size="sm" onClick={loadVisitorLogs} disabled={visitorsLoading}><Search className="h-4 w-4" /></Button>
                    <Button variant="destructive" size="sm" onClick={handleCleanupLogs}><Trash2 className="h-4 w-4 mr-1" /> 清理</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {visitorsLoading ? (
                  <div className="text-center py-12"><RefreshCw className="h-6 w-6 animate-spin mx-auto" /></div>
                ) : visitorLogs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">暂无访客记录</div>
                ) : (
                  <div className="overflow-x-auto"><Table>
                    <TableHeader><TableRow>
                      <TableHead className="w-32">时间</TableHead><TableHead>IP</TableHead><TableHead>用户</TableHead>
                      <TableHead>路径</TableHead><TableHead>设备</TableHead><TableHead>浏览器</TableHead>
                      <TableHead>系统</TableHead><TableHead>来源</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>{visitorLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs whitespace-nowrap">{fmtDate(log.created_at)}</TableCell>
                        <TableCell><code className="text-xs">{log.ip_address}</code></TableCell>
                        <TableCell>{log.user_email ? <span className="text-xs" title={log.user_email}>{log.user_name || log.user_email.split("@")[0]}</span> : <span className="text-xs text-muted-foreground">匿名</span>}</TableCell>
                        <TableCell><code className="text-xs">{log.path}</code></TableCell>
                        <TableCell><DeviceIcon type={log.device_type} /></TableCell>
                        <TableCell className="text-xs">{log.browser || "-"}</TableCell>
                        <TableCell className="text-xs">{log.os || "-"}</TableCell>
                        <TableCell className="text-xs max-w-[120px] truncate" title={log.referer}>{parseReferer(log.referer)}</TableCell>
                      </TableRow>
                    ))}</TableBody>
                  </Table></div>
                )}
                {visitorTotalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t">
                    <span className="text-sm text-muted-foreground">第 {visitorPage} / {visitorTotalPages} 页</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={visitorPage <= 1} onClick={() => setVisitorPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                      <Button variant="outline" size="sm" disabled={visitorPage >= visitorTotalPages} onClick={() => setVisitorPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== TAB: 活动日志 ===== */}
          <TabsContent value="activities">
            <Card>
              <CardHeader className="border-b pb-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <CardTitle className="text-lg">活动日志 ({activityTotal.toLocaleString()} 条)</CardTitle>
                  <div className="flex gap-2">
                    <Select value={activityActionFilter || "all"} onValueChange={(v) => { setActivityActionFilter(v === "all" ? "" : v); setActivityPage(1) }}>
                      <SelectTrigger className="w-36"><SelectValue placeholder="操作类型" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部操作</SelectItem>
                        <SelectItem value="login">登录</SelectItem><SelectItem value="logout">退出</SelectItem>
                        <SelectItem value="register">注册</SelectItem><SelectItem value="navigate">导航</SelectItem>
                        <SelectItem value="click">点击</SelectItem><SelectItem value="form_submit">提交表单</SelectItem>
                        <SelectItem value="file_upload">上传文件</SelectItem><SelectItem value="search">搜索</SelectItem>
                        <SelectItem value="error">错误</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={loadActivityLogs} disabled={activitiesLoading}><Search className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {activitiesLoading ? (
                  <div className="text-center py-12"><RefreshCw className="h-6 w-6 animate-spin mx-auto" /></div>
                ) : activityLogs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">暂无活动记录</div>
                ) : (
                  <div className="overflow-x-auto"><Table>
                    <TableHeader><TableRow>
                      <TableHead className="w-32">时间</TableHead><TableHead>用户</TableHead><TableHead>操作</TableHead>
                      <TableHead>分类</TableHead><TableHead>目标</TableHead><TableHead>路径</TableHead>
                      <TableHead>IP</TableHead><TableHead>详情</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>{activityLogs.map((log) => {
                      const info = ACTION_LABELS[log.action] || { label: log.action, color: "bg-gray-100 text-gray-800" }
                      return (<TableRow key={log.id}>
                        <TableCell className="text-xs whitespace-nowrap">{fmtDate(log.created_at)}</TableCell>
                        <TableCell>{log.user_email ? <span className="text-xs" title={log.user_email}>{log.user_name || log.user_email.split("@")[0]}</span> : <span className="text-xs text-muted-foreground">匿名</span>}</TableCell>
                        <TableCell><Badge className={info.color} variant="secondary">{info.label}</Badge></TableCell>
                        <TableCell className="text-xs">{log.category}</TableCell>
                        <TableCell className="text-xs max-w-[150px] truncate" title={log.target || ""}>{log.target || "-"}</TableCell>
                        <TableCell><code className="text-xs">{log.path || "-"}</code></TableCell>
                        <TableCell><code className="text-xs">{log.ip_address || "-"}</code></TableCell>
                        <TableCell className="text-xs max-w-[150px] truncate">{log.details ? JSON.stringify(log.details) : "-"}</TableCell>
                      </TableRow>)
                    })}</TableBody>
                  </Table></div>
                )}
                {activityTotalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t">
                    <span className="text-sm text-muted-foreground">第 {activityPage} / {activityTotalPages} 页</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={activityPage <= 1} onClick={() => setActivityPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                      <Button variant="outline" size="sm" disabled={activityPage >= activityTotalPages} onClick={() => setActivityPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== TAB: 服务状态 ===== */}
          <TabsContent value="health">
            {/* 操作栏 */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Button onClick={checkHealth} disabled={healthLoading} size="sm">
                  <RefreshCw className={`h-4 w-4 mr-1.5 ${healthLoading ? "animate-spin" : ""}`} />
                  {healthLoading ? "检查中..." : "刷新状态"}
                </Button>
                <Button variant={healthAutoRefresh ? "default" : "outline"} size="sm" onClick={() => setHealthAutoRefresh(!healthAutoRefresh)}>
                  {healthAutoRefresh ? <Wifi className="h-4 w-4 mr-1.5" /> : <WifiOff className="h-4 w-4 mr-1.5" />}
                  自动刷新 {healthAutoRefresh ? "开" : "关"}
                </Button>
                {healthData?.route_groups && (
                  <Button variant="outline" size="sm" onClick={testAllEndpoints} disabled={testingAll}>
                    <Zap className={`h-4 w-4 mr-1.5 ${testingAll ? "animate-pulse" : ""}`} />
                    {testingAll ? "检测中..." : "检测全部端点"}
                  </Button>
                )}
              </div>
              {healthLastCheck && (
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> 上次检查: {healthLastCheck.toLocaleTimeString()}
                </div>
              )}
            </div>

            {/* 主状态卡片 */}
            <Card className={`mb-6 ${healthData ? "border-green-200" : healthError ? "border-red-200" : ""}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Server className="h-6 w-6 text-blue-600" />
                    <div>
                      <CardTitle>GTV 统一 API 服务</CardTitle>
                      <CardDescription className="text-xs">Flask 后端 (端口 5005)</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {healthLatency !== null && (
                      <span className={`text-sm font-mono ${latencyColor(healthLatency)}`}>{healthLatency}ms</span>
                    )}
                    {healthLoading ? (
                      <Badge variant="outline" className="bg-gray-100"><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> 检查中</Badge>
                    ) : healthData ? (
                      <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="h-3 w-3 mr-1" /> 运行正常</Badge>
                    ) : healthError ? (
                      <Badge className="bg-red-100 text-red-800 border-red-200"><XCircle className="h-3 w-3 mr-1" /> 连接失败</Badge>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {healthError && (
                  <Alert className="mb-4 border-red-200 bg-red-50"><XCircle className="h-4 w-4 text-red-600" /><AlertDescription className="text-red-800">{healthError}</AlertDescription></Alert>
                )}
                {healthData && (
                  <>
                    <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
                      <span className="text-muted-foreground">{healthData.message}</span>
                      {totalRoutes > 0 && <Badge variant="outline">{totalRoutes} 个已注册路由</Badge>}
                    </div>
                    {healthData.services && (
                      <>
                        <Separator className="my-4" />
                        <h3 className="font-medium text-sm mb-3 flex items-center gap-2"><Database className="h-4 w-4" /> 服务组件</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                          {Object.entries(healthData.services).map(([name, status]) => (
                            <div key={name} className={`p-3 rounded-lg border ${svcStatusColor(status)}`}>
                              <div className="flex items-center gap-2">{svcStatusIcon(status)}<span className="font-medium capitalize text-sm">{name.replace(/_/g, " ")}</span></div>
                              <div className="text-xs mt-1 opacity-75">{status}</div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* 检测结果摘要 */}
            {testResults.size > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <Card className="border-l-4 border-l-green-500"><CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">通过</p>
                  <p className="text-xl font-bold text-green-600">{testSummary.ok}</p>
                </CardContent></Card>
                <Card className="border-l-4 border-l-red-500"><CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">失败</p>
                  <p className="text-xl font-bold text-red-600">{testSummary.fail}</p>
                </CardContent></Card>
                <Card className="border-l-4 border-l-gray-300"><CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">跳过 (含参数)</p>
                  <p className="text-xl font-bold text-gray-500">{testSummary.skip}</p>
                </CardContent></Card>
                <Card className="border-l-4 border-l-blue-400"><CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">检测中</p>
                  <p className="text-xl font-bold text-blue-500">{testSummary.checking}</p>
                </CardContent></Card>
              </div>
            )}

            {/* API 路由分组 */}
            {healthData?.route_groups && Object.keys(routeGroups).length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2"><Activity className="h-4 w-4" /> API 路由分组</h3>
                {Object.entries(routeGroups).map(([group, routes]) => {
                  const isOpen = expandedGroups.has(group)
                  const testableCount = routes.filter(canAutoTest).length
                  const groupResults = routes.map(r => testResults.get(`GET:${r.path}`)).filter(Boolean)
                  const okCount = groupResults.filter(r => r?.status === "ok").length
                  const failCount = groupResults.filter(r => r?.status === "error").length

                  return (
                    <Card key={group}>
                      <button
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors rounded-lg"
                        onClick={() => toggleGroup(group)}
                      >
                        <div className="flex items-center gap-3">
                          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          <span className="font-medium text-sm">{group}</span>
                          <Badge variant="outline" className="text-xs">{routes.length} 路由</Badge>
                          {testableCount > 0 && <Badge variant="outline" className="text-xs text-blue-600">{testableCount} 可测</Badge>}
                        </div>
                        <div className="flex items-center gap-2">
                          {okCount > 0 && <Badge className="bg-green-100 text-green-700 text-xs">{okCount} 通过</Badge>}
                          {failCount > 0 && <Badge className="bg-red-100 text-red-700 text-xs">{failCount} 失败</Badge>}
                        </div>
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4">
                          <div className="border rounded-lg overflow-hidden">
                            <Table>
                              <TableHeader><TableRow>
                                <TableHead className="w-16">方法</TableHead>
                                <TableHead>路径</TableHead>
                                <TableHead className="w-28">端点</TableHead>
                                <TableHead className="w-20 text-center">状态</TableHead>
                                <TableHead className="w-20 text-right">延迟</TableHead>
                                <TableHead className="w-16 text-right">操作</TableHead>
                              </TableRow></TableHeader>
                              <TableBody>
                                {routes.map((route, idx) => {
                                  const key = `GET:${route.path}`
                                  const result = testResults.get(key)
                                  return (
                                    <TableRow key={idx}>
                                      <TableCell>
                                        <div className="flex gap-1 flex-wrap">
                                          {route.methods.map(m => (
                                            <span key={m} className={`text-[10px] px-1.5 py-0.5 rounded border font-mono font-medium ${METHOD_COLORS[m] || "bg-gray-100 text-gray-600"}`}>{m}</span>
                                          ))}
                                        </div>
                                      </TableCell>
                                      <TableCell><code className="text-xs">{route.path}</code>
                                        {route.has_params && <span className="text-[10px] text-muted-foreground ml-1">(参数)</span>}
                                      </TableCell>
                                      <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]" title={route.endpoint}>{route.endpoint}</TableCell>
                                      <TableCell className="text-center">
                                        {result ? (
                                          <div className="flex items-center justify-center gap-1">
                                            {svcStatusIcon(result.status, "h-3.5 w-3.5")}
                                            {result.statusCode && <span className={`text-[10px] font-mono ${result.statusCode < 400 ? "text-green-600" : "text-red-600"}`}>{result.statusCode}</span>}
                                          </div>
                                        ) : <span className="text-xs text-muted-foreground">-</span>}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {result?.latency !== undefined ? (
                                          <span className={`text-xs font-mono ${latencyColor(result.latency)}`}>{result.latency}ms</span>
                                        ) : <span className="text-xs text-muted-foreground">-</span>}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {canAutoTest(route) && (
                                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => testSingleEndpoint(route)}
                                            disabled={result?.status === "checking"}>
                                            <Play className="h-3 w-3" />
                                          </Button>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Role Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>用户授权</DialogTitle>
              <DialogDescription>为 <strong>{editingUser?.email}</strong> 分配角色</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {editingUser && (
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>姓名：{editingUser.fullName || "-"}</p>
                  <p>电话：{editingUser.phone || "-"}</p>
                  <p>公司：{editingUser.company || "-"}</p>
                  <p>当前角色：<Badge className={`${getRoleLabel(editingUser.role).color} text-white`}>{getRoleLabel(editingUser.role).label}</Badge></p>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">新角色</label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="guest">游客 — 只能查看公开内容</SelectItem>
                    <SelectItem value="client">客户 — 可访问客户专属功能</SelectItem>
                    <SelectItem value="admin">管理员 — 可管理用户和内容</SelectItem>
                    <SelectItem value="super_admin">超级管理员 — 拥有所有权限</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={updating}>取消</Button>
              <Button onClick={handleUpdateRole} disabled={updating}>
                {updating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />更新中...</> : "确认授权"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
