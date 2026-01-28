"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Server, 
  Database, 
  Cpu,
  Clock,
  Activity,
  Wifi,
  WifiOff
} from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

interface ServiceStatus {
  name: string
  status: 'healthy' | 'unhealthy' | 'disabled' | 'unknown'
  latency?: number
  message?: string
}

interface HealthData {
  status: string
  message: string
  timestamp: string
  services: Record<string, string>
  endpoints: Record<string, string>
}

interface EndpointStatus {
  path: string
  status: 'ok' | 'error' | 'checking'
  latency?: number
  statusCode?: number
}

export default function HealthPage() {
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [backendHealth, setBackendHealth] = useState<HealthData | null>(null)
  const [backendError, setBackendError] = useState<string | null>(null)
  const [backendLatency, setBackendLatency] = useState<number | null>(null)
  const [endpointStatuses, setEndpointStatuses] = useState<EndpointStatus[]>([])
  const [autoRefresh, setAutoRefresh] = useState(false)

  // 检查后端健康状态
  const checkBackendHealth = useCallback(async () => {
    setChecking(true)
    setBackendError(null)
    
    const startTime = Date.now()
    
    try {
      const response = await fetch('/api/copywriting/health', {
        method: 'GET',
        cache: 'no-store',
      })
      
      const latency = Date.now() - startTime
      setBackendLatency(latency)
      
      if (response.ok) {
        const data = await response.json()
        setBackendHealth(data)
        setBackendError(null)
      } else {
        setBackendError(`HTTP ${response.status}: ${response.statusText}`)
        setBackendHealth(null)
      }
    } catch (error) {
      setBackendLatency(Date.now() - startTime)
      setBackendError(error instanceof Error ? error.message : '连接失败')
      setBackendHealth(null)
    } finally {
      setChecking(false)
      setLastCheck(new Date())
      setLoading(false)
    }
  }, [])

  // 检查各个端点
  const checkEndpoints = useCallback(async () => {
    if (!backendHealth?.endpoints) return
    
    const endpoints = Object.entries(backendHealth.endpoints).map(([name, path]) => ({
      name,
      path: path.replace('/*', '').replace('/*/extraction/*', '/test/extraction/status').replace('/*/framework/*', '/test/framework')
    }))
    
    // 测试几个关键端点
    const testEndpoints = [
      { path: '/api/copywriting/health', name: 'health' },
      { path: '/api/copywriting/projects', name: 'projects' },
      { path: '/api/copywriting/material-collection/categories', name: 'categories' },
    ]
    
    const statuses: EndpointStatus[] = testEndpoints.map(e => ({
      path: e.path,
      status: 'checking' as const
    }))
    setEndpointStatuses(statuses)
    
    for (let i = 0; i < testEndpoints.length; i++) {
      const endpoint = testEndpoints[i]
      const startTime = Date.now()
      
      try {
        const response = await fetch(endpoint.path, {
          method: 'GET',
          cache: 'no-store',
        })
        
        statuses[i] = {
          path: endpoint.path,
          status: response.ok ? 'ok' : 'error',
          latency: Date.now() - startTime,
          statusCode: response.status
        }
      } catch {
        statuses[i] = {
          path: endpoint.path,
          status: 'error',
          latency: Date.now() - startTime
        }
      }
      
      setEndpointStatuses([...statuses])
    }
  }, [backendHealth])

  // 初始检查
  useEffect(() => {
    checkBackendHealth()
  }, [checkBackendHealth])

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return
    
    const interval = setInterval(() => {
      checkBackendHealth()
    }, 10000) // 每10秒刷新
    
    return () => clearInterval(interval)
  }, [autoRefresh, checkBackendHealth])

  // 获取服务状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'enabled':
      case 'ok':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'unhealthy':
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'disabled':
        return <AlertCircle className="h-5 w-5 text-gray-400" />
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
    }
  }

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'enabled':
      case 'ok':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'unhealthy':
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'disabled':
        return 'bg-gray-100 text-gray-600 border-gray-200'
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
  }

  // 获取延迟颜色
  const getLatencyColor = (latency: number) => {
    if (latency < 100) return 'text-green-600'
    if (latency < 500) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* 标题 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Activity className="h-8 w-8 text-blue-600" />
              服务健康检查
            </h1>
            <p className="text-muted-foreground mt-2">
              监控后端API服务的运行状态和响应时间
            </p>
          </div>

          {/* 操作栏 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button 
                onClick={() => {
                  checkBackendHealth()
                  checkEndpoints()
                }}
                disabled={checking}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
                {checking ? '检查中...' : '刷新状态'}
              </Button>
              
              <Button
                variant={autoRefresh ? "default" : "outline"}
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                {autoRefresh ? <Wifi className="h-4 w-4 mr-2" /> : <WifiOff className="h-4 w-4 mr-2" />}
                自动刷新 {autoRefresh ? '开' : '关'}
              </Button>
            </div>
            
            {lastCheck && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                上次检查: {lastCheck.toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* 主状态卡片 */}
          <Card className={`mb-6 ${backendHealth ? 'border-green-200' : backendError ? 'border-red-200' : ''}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Server className="h-6 w-6 text-blue-600" />
                  <div>
                    <CardTitle>GTV统一API服务</CardTitle>
                    <CardDescription>http://localhost:5005</CardDescription>
                  </div>
                </div>
                
                {loading ? (
                  <Badge variant="outline" className="bg-gray-100">
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    检查中
                  </Badge>
                ) : backendHealth ? (
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    运行正常
                  </Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-800 border-red-200">
                    <XCircle className="h-3 w-3 mr-1" />
                    连接失败
                  </Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent>
              {backendError && (
                <Alert className="mb-4 border-red-200 bg-red-50">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    {backendError}
                  </AlertDescription>
                </Alert>
              )}
              
              {backendLatency !== null && (
                <div className="flex items-center gap-2 mb-4">
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">响应时间:</span>
                  <span className={`font-mono font-medium ${getLatencyColor(backendLatency)}`}>
                    {backendLatency}ms
                  </span>
                </div>
              )}
              
              {backendHealth && (
                <>
                  <div className="text-sm text-muted-foreground mb-4">
                    {backendHealth.message}
                  </div>
                  
                  <Separator className="my-4" />
                  
                  {/* 服务组件状态 */}
                  <div className="mb-6">
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      服务组件
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(backendHealth.services).map(([name, status]) => (
                        <div 
                          key={name}
                          className={`p-3 rounded-lg border ${getStatusColor(status)}`}
                        >
                          <div className="flex items-center gap-2">
                            {getStatusIcon(status)}
                            <span className="font-medium capitalize">
                              {name.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="text-xs mt-1 opacity-75">
                            {status}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* API端点 */}
                  <div>
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      API端点
                    </h3>
                    <div className="space-y-2">
                      {Object.entries(backendHealth.endpoints).map(([name, path]) => (
                        <div 
                          key={name}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              {name}
                            </Badge>
                            <code className="text-sm text-muted-foreground">
                              {path}
                            </code>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 端点测试结果 */}
          {endpointStatuses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  端点响应测试
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {endpointStatuses.map((endpoint, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {endpoint.status === 'checking' ? (
                          <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                        ) : (
                          getStatusIcon(endpoint.status)
                        )}
                        <code className="text-sm">{endpoint.path}</code>
                      </div>
                      <div className="flex items-center gap-3">
                        {endpoint.statusCode && (
                          <Badge variant="outline" className={endpoint.statusCode === 200 ? 'text-green-600' : 'text-red-600'}>
                            {endpoint.statusCode}
                          </Badge>
                        )}
                        {endpoint.latency !== undefined && (
                          <span className={`text-sm font-mono ${getLatencyColor(endpoint.latency)}`}>
                            {endpoint.latency}ms
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <Button 
                  variant="outline" 
                  className="mt-4 w-full"
                  onClick={checkEndpoints}
                  disabled={!backendHealth}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  测试端点
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 快捷操作 */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">快捷操作</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">健康检查命令</h4>
                  <code className="text-sm bg-gray-200 px-2 py-1 rounded block">
                    curl http://localhost:5005/health
                  </code>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">查看服务日志</h4>
                  <code className="text-sm bg-gray-200 px-2 py-1 rounded block">
                    tail -f ace_gtv/logs/api_server.log
                  </code>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">启动服务</h4>
                  <code className="text-sm bg-gray-200 px-2 py-1 rounded block">
                    ./start_backend.sh --background
                  </code>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">停止服务</h4>
                  <code className="text-sm bg-gray-200 px-2 py-1 rounded block">
                    pkill -f api_server.py
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
