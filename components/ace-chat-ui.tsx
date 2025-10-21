"use client"

import { useState, useRef, useEffect } from "react"
import { useLanguage } from "@/lib/i18n"
import { Bot, User, Loader2, Send, Brain, TrendingUp, BookOpen, Upload, FileText, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Message {
  id: string
  type: "text"
  content: {
    text: string
  }
  user: {
    avatar: string
    name: string
  }
  timestamp?: Date
  score?: number
  reasoning?: string
  evolutionInsights?: any
}

interface AssessmentData {
  name?: string
  field?: string
  experience?: string
  education?: string
  achievements?: string[]
  currentScore?: number
  pathway?: string
}

interface ResumeData {
  name?: string
  email?: string
  phone?: string
  experience?: string
  education?: string
  skills?: string[]
  achievements?: string[]
  projects?: string[]
  languages?: string[]
  certifications?: string[]
  summary?: string
}

interface PlaybookStats {
  total_bullets: number
  helpful_bullets: number
  harmful_bullets: number
  sections: { [section: string]: number }
}

export default function ACEChatUIComponent() {
  const { t } = useLanguage()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [assessmentData, setAssessmentData] = useState<AssessmentData>({})
  const [isAssessmentComplete, setIsAssessmentComplete] = useState(false)
  const [playbookStats, setPlaybookStats] = useState<PlaybookStats | null>(null)
  const [aceStatus, setAceStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking')
  const [resumeData, setResumeData] = useState<ResumeData | null>(null)
  const [isResumeUploaded, setIsResumeUploaded] = useState(false)
  const [isAnalyzingResume, setIsAnalyzingResume] = useState(false)
  const [showResumeConfirmation, setShowResumeConfirmation] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 100)
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 检查ACE服务状态
  useEffect(() => {
    checkACEStatus()
  }, [])

  // 初始化欢迎消息
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: "welcome",
        type: "text",
        content: {
          text: "🤖 欢迎使用GTV ACE自我进化评估系统！\n\n我是您的智能评估助手，具备自我学习和进化能力。我会根据每次对话不断优化我的知识库，为您提供更准确的GTV签证评估建议。\n\n为了给您提供最准确的评估，建议您：\n1. 📄 上传您的简历（PDF或Word格式）- 系统将自动分析并推荐最适合的GTV签证类型\n2. 或者直接告诉我您的专业背景、工作经验和具体问题\n\n请选择您喜欢的方式开始评估！"
        },
        user: {
          avatar: "🧠",
          name: "ACE智能代理"
        },
        timestamp: new Date()
      }
      setMessages([welcomeMessage])
    }
  }, [])

  const checkACEStatus = async () => {
    try {
      const response = await fetch('/api/ace-chat')
      if (response.ok) {
        setAceStatus('connected')
      } else {
        setAceStatus('disconnected')
      }
    } catch (error) {
      setAceStatus('disconnected')
    }
  }

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "text",
      content: {
        text: inputValue.trim()
      },
      user: {
        avatar: "👤",
        name: "You"
      },
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)
    
    setTimeout(() => scrollToBottom(), 50)

    try {
      // 使用新的智能聊天API
      const response = await fetch("/api/smart-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: inputValue.trim(),
          context: "",
          conversationHistory: messages.map(msg => ({
            role: msg.user.name === "You" ? "user" : "assistant",
            content: msg.content.text,
            timestamp: msg.timestamp
          })),
          resumeData: resumeData
        }),
      })

      const data = await response.json()
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "text",
        content: {
          text: data.message || "处理失败"
        },
        user: {
          avatar: "🧠",
          name: "智能助手"
        },
        timestamp: new Date(),
        score: data.ace_data?.reasoning?.score,
        reasoning: data.ace_data?.reasoning?.ace_reasoning,
        evolutionInsights: data.ace_data?.knowledge_base?.evolution_insights
      }

      setMessages(prev => [...prev, assistantMessage])
      
      // 从ACE数据中提取评估信息
      if (data.ace_data?.reasoning?.assessment_data) {
        setAssessmentData(prev => ({ ...prev, ...data.ace_data.reasoning.assessment_data }))
      }

      if (data.ace_data?.knowledge_base?.playbook_stats) {
        setPlaybookStats(data.ace_data.knowledge_base.playbook_stats)
      }

      if (data.ace_data?.reasoning?.score && data.ace_data.reasoning.score >= 80) {
        setIsAssessmentComplete(true)
      }
      
      setTimeout(() => scrollToBottom(), 100)
    } catch (error) {
      console.error("Error sending message:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "text",
        content: {
          text: "抱歉，处理您的请求时出现了问题。请稍后重试。"
        },
        user: {
          avatar: "🧠",
          name: "ACE智能代理"
        },
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      
      setTimeout(() => scrollToBottom(), 100)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const resetAssessment = () => {
    setMessages([])
    setAssessmentData({})
    setIsAssessmentComplete(false)
    setPlaybookStats(null)
    setResumeData(null)
    setIsResumeUploaded(false)
    setShowResumeConfirmation(false)
  }

  const handleResumeUpload = async (file: File) => {
    if (!file) return

    setIsAnalyzingResume(true)
    
    try {
      const formData = new FormData()
      formData.append('resume', file)

      const response = await fetch('/api/analyze-resume', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        setResumeData(data.analysis)
        setIsResumeUploaded(true)
        setShowResumeConfirmation(true)
        
        // 添加系统消息
        const systemMessage: Message = {
          id: Date.now().toString(),
          type: "text",
          content: {
            text: `📄 简历分析完成！我已经从您的简历中提取了以下信息，请确认是否正确：\n\n**基本信息：**\n- 姓名：${data.analysis.name || '未提供'}\n- 邮箱：${data.analysis.email || '未提供'}\n- 电话：${data.analysis.phone || '未提供'}\n\n**专业背景：**\n- 工作经验：${data.analysis.experience || '未提供'}\n- 教育背景：${data.analysis.education || '未提供'}\n- 技能：${data.analysis.skills?.join(', ') || '未提供'}\n\n**成就与项目：**\n- 主要成就：${data.analysis.achievements?.join(', ') || '未提供'}\n- 项目经验：${data.analysis.projects?.join(', ') || '未提供'}\n\n请确认这些信息是否准确，然后我们可以进行GTV签证评估。`
          },
          user: {
            avatar: "🧠",
            name: "智能助手"
          },
          timestamp: new Date()
        }

        setMessages(prev => [...prev, systemMessage])
        setTimeout(() => scrollToBottom(), 100)
      } else {
        throw new Error(data.error || '简历分析失败')
      }
    } catch (error) {
      console.error('简历分析失败:', error)
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: "text",
        content: {
          text: "抱歉，简历分析失败。请确保上传的是PDF或Word文档，然后重试。"
        },
        user: {
          avatar: "🧠",
          name: "智能助手"
        },
        timestamp: new Date()
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsAnalyzingResume(false)
    }
  }

  const confirmResumeData = async () => {
    if (resumeData) {
      // 将简历数据转换为评估数据
      setAssessmentData({
        name: resumeData.name,
        field: resumeData.skills?.[0] || '技术',
        experience: resumeData.experience,
        education: resumeData.education,
        achievements: resumeData.achievements,
        currentScore: 0
      })

      setShowResumeConfirmation(false)
      
      // 添加确认消息
      const confirmMessage: Message = {
        id: Date.now().toString(),
        type: "text",
        content: {
          text: "✅ 信息已确认！正在基于您的简历信息进行GTV签证自动分析..."
        },
        user: {
          avatar: "🧠",
          name: "智能助手"
        },
        timestamp: new Date()
      }

      setMessages(prev => [...prev, confirmMessage])
      setTimeout(() => scrollToBottom(), 100)

      // 自动进行GTV签证分析
      await performAutoAssessment()
    }
  }

  const performAutoAssessment = async () => {
    if (!resumeData) return

    setIsLoading(true)
    
    try {
      // 构建自动分析提示
      const analysisPrompt = `基于以下简历信息，请自动分析并推荐最适合的GTV签证类型：

简历信息：
- 姓名：${resumeData.name}
- 经验：${resumeData.experience}
- 教育：${resumeData.education}
- 技能：${resumeData.skills?.join(', ')}
- 成就：${resumeData.achievements?.join(', ')}

请分析并推荐最适合的GTV签证类型（Exceptional Talent、Exceptional Promise或Startup Visa），并提供详细的评估理由、分数和建议。`

      const response = await fetch("/api/smart-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: analysisPrompt,
          context: "",
          conversationHistory: messages.map(msg => ({
            role: msg.user.name === "You" ? "user" : "assistant",
            content: msg.content.text,
            timestamp: msg.timestamp
          })),
          resumeData: resumeData
        }),
      })

      const data = await response.json()
      
      const analysisMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "text",
        content: {
          text: data.message || "分析完成"
        },
        user: {
          avatar: "🧠",
          name: "智能助手"
        },
        timestamp: new Date(),
        score: data.ace_data?.reasoning?.score,
        reasoning: data.ace_data?.reasoning?.ace_reasoning,
        evolutionInsights: data.ace_data?.knowledge_base?.evolution_insights
      }

      setMessages(prev => [...prev, analysisMessage])
      
      if (data.ace_data?.reasoning?.assessment_data) {
        setAssessmentData(prev => ({ ...prev, ...data.ace_data.reasoning.assessment_data }))
      }
      if (data.ace_data?.knowledge_base?.playbook_stats) {
        setPlaybookStats(data.ace_data.knowledge_base.playbook_stats)
      }
      if (data.ace_data?.reasoning?.score && data.ace_data.reasoning.score >= 80) {
        setIsAssessmentComplete(true)
      }
      
      setTimeout(() => scrollToBottom(), 100)
    } catch (error) {
      console.error('自动分析失败:', error)
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "text",
        content: {
          text: "抱歉，自动分析过程中出现错误。请稍后重试或直接告诉我您的问题。"
        },
        user: {
          avatar: "🧠",
          name: "智能助手"
        },
        timestamp: new Date()
      }

      setMessages(prev => [...prev, errorMessage])
      setTimeout(() => scrollToBottom(), 100)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleResumeUpload(file)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* ACE状态指示器 */}
      <div className="flex items-center gap-2 p-2 bg-gray-50 border-b">
        <div className={`w-2 h-2 rounded-full ${
          aceStatus === 'connected' ? 'bg-green-500' : 
          aceStatus === 'disconnected' ? 'bg-red-500' : 'bg-yellow-500'
        }`} />
        <span className="text-sm text-gray-600">
          {aceStatus === 'connected' ? 'ACE自我进化代理已连接' : 
           aceStatus === 'disconnected' ? 'ACE代理离线' : '检查连接中...'}
        </span>
        {playbookStats && (
          <Badge variant="outline" className="ml-auto">
            <Brain className="w-3 h-3 mr-1" />
            {playbookStats.total_bullets} 知识条目
          </Badge>
        )}
      </div>

      {/* 聊天消息区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.user.name === "You" ? "justify-end" : "justify-start"
            }`}
          >
            {message.user.name === "ACE智能代理" && (
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Brain className="h-4 w-4 text-purple-600" />
              </div>
            )}
            <div className="flex flex-col max-w-[80%]">
              <div
                className={`rounded-lg px-4 py-2 ${
                  message.user.name === "You"
                    ? "bg-blue-600 text-white"
                    : "bg-purple-50 text-gray-900 border border-purple-200"
                }`}
              >
                <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {message.content.text}
                </div>
                
                {/* 显示评分和推理 */}
                {message.score !== undefined && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-3 w-3 text-green-600" />
                      <span className="text-xs font-medium">评估得分: {message.score}/100</span>
                    </div>
                    {message.score > 0 && (
                      <Progress value={message.score} className="h-1 mb-1" />
                    )}
                  </div>
                )}
                
                {/* 显示进化洞察 */}
                {message.evolutionInsights && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="flex items-center gap-1 mb-1">
                      <BookOpen className="h-3 w-3 text-blue-600" />
                      <span className="text-xs font-medium">知识库更新</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      新增 {message.evolutionInsights.new_bullets_added || 0} 个知识条目
                    </div>
                  </div>
                )}
              </div>
              <p className={`text-xs text-gray-500 mt-1 ${
                message.user.name === "You" ? "text-right" : "text-left"
              }`}>
                {message.timestamp?.toLocaleTimeString()}
              </p>
            </div>
            {message.user.name === "You" && (
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-gray-600" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Brain className="h-4 w-4 text-purple-600" />
            </div>
            <div className="bg-purple-50 rounded-lg px-4 py-2 border border-purple-200">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">ACE代理正在思考和学习...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 简历确认对话框 */}
      {showResumeConfirmation && resumeData && (
        <div className="p-4 border-t bg-blue-50">
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p className="font-medium">请确认简历信息：</p>
              <div className="text-sm space-y-1">
                <p><strong>姓名：</strong>{resumeData.name || '未提供'}</p>
                <p><strong>经验：</strong>{resumeData.experience || '未提供'}</p>
                <p><strong>教育：</strong>{resumeData.education || '未提供'}</p>
                <p><strong>技能：</strong>{resumeData.skills?.join(', ') || '未提供'}</p>
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={confirmResumeData}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  确认信息
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowResumeConfirmation(false)}>
                  重新上传
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* 输入区域 */}
      <div className="border-t p-4 flex-shrink-0">
        <div className="flex gap-2 mb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzingResume}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {isAnalyzingResume ? "分析中..." : "上传简历"}
          </Button>
          {isResumeUploaded && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              简历已上传
            </Badge>
          )}
        </div>
        
        <div className="flex gap-2 max-w-[80%]">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isResumeUploaded ? "基于您的简历信息，我可以为您进行GTV签证评估..." : "请先上传简历，或直接告诉我您的问题..."}
            disabled={isLoading || isAnalyzingResume}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading || isAnalyzingResume}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  )
}
