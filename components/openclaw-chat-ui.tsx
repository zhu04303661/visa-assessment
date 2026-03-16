"use client"

import { useState, useRef, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from "react"
import { useLanguage } from "@/lib/i18n"
import { sessionKeyFor } from "@/lib/chat-sessions"
import {
  Bot, User, Loader2, Send, Cog, Globe, Square, Zap, Shield,
  FileText, GraduationCap, Briefcase, Plane, Building2, Scale,
  Maximize2, Minimize2, Target, PenTool, ScrollText, Search,
  MapPin, Sparkles, ChevronRight, Paperclip, X, Upload, File,
  Image as ImageIcon, Download
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { OpenClawClient } from "@/lib/openclaw-client"
import ReactMarkdown, { Components } from "react-markdown"
import remarkGfm from "remark-gfm"

interface UploadedFile {
  fileName: string
  filePath: string
  fileSize: number
  fileType: string
}

interface PendingFile {
  file: File
  status: "pending" | "uploading" | "done" | "error"
  progress?: number
  result?: UploadedFile
  error?: string
}

interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  toolCalls?: Array<{ name: string; input: string; output?: string }>
  isStreaming?: boolean
  attachments?: UploadedFile[]
}

const IMMIGRATION_SYSTEM_PROMPT = `你是一位资深的英国移民顾问AI助手，名为"惜池移民顾问"。你的职责是帮助用户解答各类英国移民和签证问题。

## 你的专业领域：
1. **GTV签证 (Global Talent Visa)** - Exceptional Talent / Exceptional Promise / Startup Visa
2. **工作签证** - Skilled Worker Visa、Sponsor Licence、Intra-company Transfer
3. **学生签证** - Student Visa、Graduate Visa、研究生留英路径
4. **家庭签证** - Spouse Visa、Parent Visa、家庭团聚
5. **投资移民** - Innovator Founder Visa、投资者路径
6. **永居和入籍** - ILR (Indefinite Leave to Remain)、英国国籍申请
7. **签证材料准备** - 文案撰写、推荐信指导、证据整理

## 你的专业技能（Skills）：
你拥有以下生产级专业技能，每个技能都有完整的工作流程和质量检查工具，请根据用户需求主动使用：

### 1. gtv-assessment（GTV资格评估）
**触发场景**：用户询问GTV资格、打分、是否符合要求
**四阶段流程**：
- 阶段一：信息收集与整理（引导用户提供背景或从简历中提取）
- 阶段二：维度评分（按MC/OC逐项打分，8大评估维度）
- 阶段三：路径推荐与差距分析（Talent/Promise/Startup三条路径对比）
- 阶段四：报告生成与持久化（输出assessment_report.json供其他技能使用）
**工具脚本**：generate_report.py（生成评估报告含雷达图数据）、compare_paths.py（路径对比分析）

### 2. resume-analyzer（简历分析）
**触发场景**：用户提供简历或描述个人背景
**四阶段流程**：
- 阶段一：简历获取与解析（支持PDF/DOCX/纯文本）
- 阶段二：结构化信息提取（教育、经历、技能、成就分维度整理）
- 阶段三：GTV亮点识别与差距分析（按MC/OC标准标注证据亮点）
- 阶段四：报告生成与持久化（输出resume_analysis.json供下游技能使用）
**工具脚本**：parse_resume.py（解析简历）、match_gtv.py（MC/OC亮点匹配）、generate_summary.py（生成报告）

### 3. gtv-copywriting（GTV文案撰写）
**触发场景**：用户需要撰写个人陈述、证据描述、申请信
**聚焦范围**：个人陈述（Personal Statement）、证据描述（Evidence Description）、申请信（Cover Letter）。推荐信由 gtv-recommendation-letter 专门处理。
**四阶段流程**：
- 阶段一：需求确认与素材收集
- 阶段二：框架构建（按GTV评审标准搭建结构）
- 阶段三：初稿撰写（严格控制篇幅：个人陈述2100-2800字，证据描述每份200-500字）
- 阶段四：质量检查与润色
**工具脚本**：check_statement.py（个人陈述质量检查）、check_evidence_desc.py（证据描述质量检查）、word_count.py（中英文字数统计）

### 4. gtv-recommendation-letter（GTV推荐信撰写）
**触发场景**：用户需要撰写GTV推荐信
**四阶段流程**：推荐人信息检索与CV构建 → 证据框架提取 → 构思思路撰写 → 正式推荐信生成
**特色**：支持多封推荐信的跨信差异化控制，身份锚点验证，禁忌词检测

### 5. immigration-strategy（申请策略规划）
**触发场景**：用户询问申请策略、时间规划、材料清单
**能力**：生成个性化的申请路线图、时间表、材料准备清单和改进建议

### 6. uk-immigration-policy（英国移民政策研究）
**触发场景**：用户询问最新政策、规则变化
**能力**：通过浏览器访问gov.uk等官方网站获取实时政策信息

## 技能数据联动：
简历分析(resume-analyzer) → 资格评估(gtv-assessment) → 文案撰写(gtv-copywriting) / 策略规划(immigration-strategy) / 推荐信(gtv-recommendation-letter)
各环节输出的JSON文件可作为下一环节的输入，实现全链路数据流转。

## 回复要求：
- 用中文回复，语气友好专业
- 使用Markdown格式组织回复，善用表格、列表和标题提升可读性
- 提供具体、可操作的建议
- 涉及具体政策时引用最新的移民规则
- 主动询问用户背景以提供更精准的建议
- 当用户问题对应某个技能时，**主动说明你将调用该技能**并按流程执行
- 在技能工作流中，**必须按阶段逐步执行**，每完成一个阶段向用户确认后再继续
- **重要**：在开始执行报告生成（包括评估报告、简历分析、文案撰写等任何耗时较长的生成任务）之前，**必须先提醒用户**：「⏳ 正在为您生成专业报告，预计需要 3-10 分钟，请耐心等待...」

## 文件输出规范（非常重要）：

### 文件保存位置
所有生成的文件**必须保存到统一的输出目录**：\`/home/xichi/workspace/visa-assessment/public/downloads/\`

按以下结构组织：
- 评估报告：\`/home/xichi/workspace/visa-assessment/public/downloads/assessment/\`
- 简历分析：\`/home/xichi/workspace/visa-assessment/public/downloads/resume/\`
- 文案材料：\`/home/xichi/workspace/visa-assessment/public/downloads/copywriting/\`
- 推荐信：\`/home/xichi/workspace/visa-assessment/public/downloads/recommendation/\`
- 策略规划：\`/home/xichi/workspace/visa-assessment/public/downloads/strategy/\`

**保存前先创建目录**：\`mkdir -p /home/xichi/workspace/visa-assessment/public/downloads/assessment/\` 等。

### 文件下载标记
生成文件后，**必须在回复中使用以下标记格式**告知用户可下载：

\`📎[文件显示名称](/home/xichi/workspace/visa-assessment/public/downloads/路径/文件名)\`

示例：
- \`📎[GTV评估报告](/home/xichi/workspace/visa-assessment/public/downloads/assessment/assessment_report.md)\`
- \`📎[评估数据JSON](/home/xichi/workspace/visa-assessment/public/downloads/assessment/assessment_report.json)\`
- \`📎[简历分析报告](/home/xichi/workspace/visa-assessment/public/downloads/resume/resume_report.md)\`
- \`📎[个人陈述初稿](/home/xichi/workspace/visa-assessment/public/downloads/copywriting/personal_statement.md)\`

规则：
1. 文件路径**必须使用上述绝对路径**，不可使用相对路径
2. 保存文件前**先确保目录存在**（用 mkdir -p）
3. 每个生成的文件**都必须**用 📎 标记格式提供下载链接
4. 在回复末尾集中列出所有可下载文件
5. 同时提供 .md 和 .json 版本（如果两者都生成了）
6. 如果运行脚本的 -o 参数指定输出文件，也必须使用上述绝对路径

请根据用户的问题提供专业的移民咨询服务。`

const GTV_WELCOME_MESSAGE = `您好，欢迎找到我们，很高兴为您评估。

请根据个人情况和所属行业领域详细填写以下信息，不适用的情况写"无"即可。

**我们深知您的信息属于重要隐私，我们郑重承诺对所有信息严格保密。**

请依次提供以下信息，我将为您进行专业的 GTV 资格评估：`

const SKILL_ACTIONS = [
  {
    icon: Target,
    label: "GTV资格评估",
    labelEn: "GTV Assessment",
    desc: "系统化评分 · 路径推荐",
    descEn: "Scoring · Path Recommendation",
    prompt: "请使用 gtv-assessment 技能帮我做一次完整的GTV资格评估。请先引导我提供所需的背景信息。",
    welcomeMessage: GTV_WELCOME_MESSAGE,
    displayLabel: "GTV资格评估",
    displayLabelEn: "GTV Assessment",
    color: "text-blue-600",
    bgColor: "hover:bg-blue-50 dark:hover:bg-blue-950/20",
    borderColor: "hover:border-blue-200 dark:hover:border-blue-800",
  },
  {
    icon: FileText,
    label: "简历分析",
    labelEn: "Resume Analysis",
    desc: "亮点识别 · 差距分析",
    descEn: "Highlights · Gap Analysis",
    prompt: "请使用 resume-analyzer 技能帮我分析简历，识别GTV申请相关的亮点和不足。我可以粘贴简历内容给你。",
    color: "text-purple-600",
    bgColor: "hover:bg-purple-50 dark:hover:bg-purple-950/20",
    borderColor: "hover:border-purple-200 dark:hover:border-purple-800",
  },
  {
    icon: PenTool,
    label: "个人陈述撰写",
    labelEn: "Personal Statement",
    desc: "文案撰写 · 质量检查",
    descEn: "Copywriting · Quality Check",
    prompt: "请使用 gtv-copywriting 技能帮我撰写GTV申请的个人陈述(Personal Statement)。请先了解我的背景信息。",
    color: "text-amber-600",
    bgColor: "hover:bg-amber-50 dark:hover:bg-amber-950/20",
    borderColor: "hover:border-amber-200 dark:hover:border-amber-800",
  },
  {
    icon: ScrollText,
    label: "推荐信撰写",
    labelEn: "Recommendation Letter",
    desc: "四阶段流程 · 差异化控制",
    descEn: "4-Phase · Differentiation",
    prompt: "请使用 gtv-recommendation-letter 技能帮我撰写GTV推荐信。请先引导我提供推荐人信息和申请人材料。",
    color: "text-emerald-600",
    bgColor: "hover:bg-emerald-50 dark:hover:bg-emerald-950/20",
    borderColor: "hover:border-emerald-200 dark:hover:border-emerald-800",
  },
  {
    icon: MapPin,
    label: "申请策略规划",
    labelEn: "Strategy Planning",
    desc: "路线图 · 时间表 · 材料清单",
    descEn: "Roadmap · Timeline · Checklist",
    prompt: "请使用 immigration-strategy 技能帮我制定GTV签证的申请策略和时间规划。",
    color: "text-rose-600",
    bgColor: "hover:bg-rose-50 dark:hover:bg-rose-950/20",
    borderColor: "hover:border-rose-200 dark:hover:border-rose-800",
  },
  {
    icon: Search,
    label: "政策查询",
    labelEn: "Policy Research",
    desc: "实时政策 · 规则解读",
    descEn: "Live Policy · Rules",
    prompt: "请使用 uk-immigration-policy 技能帮我查询最新的英国移民政策和GTV签证规则变化。",
    color: "text-cyan-600",
    bgColor: "hover:bg-cyan-50 dark:hover:bg-cyan-950/20",
    borderColor: "hover:border-cyan-200 dark:hover:border-cyan-800",
  },
]

const QUICK_PROMPTS = [
  { label: "我符合GTV吗？", labelEn: "Am I eligible?", prompt: "我想了解自己是否符合GTV全球人才签证的要求，请帮我评估。" },
  { label: "工作签证咨询", labelEn: "Work Visa", prompt: "我想了解英国工作签证(Skilled Worker Visa)的申请要求和流程。" },
  { label: "学生签证", labelEn: "Student Visa", prompt: "我想了解英国学生签证的申请流程以及毕业后的留英路径。" },
  { label: "永居规划", labelEn: "ILR Planning", prompt: "我想了解如何获得英国永居(ILR)，以及不同签证转永居的条件。" },
]

const OC_PORT = process.env.NEXT_PUBLIC_OPENCLAW_GATEWAY_PORT || "18789"
const OC_TOKEN = process.env.NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN || ""

const GATEWAY_URL = typeof window !== "undefined"
  ? window.location.protocol === "https:"
    ? `wss://${window.location.host}/ws/openclaw`
    : `ws://${window.location.hostname === "localhost" ? "127.0.0.1" : window.location.hostname}:${OC_PORT}`
  : `ws://127.0.0.1:${OC_PORT}`

const GATEWAY_TOKEN = OC_TOKEN

export interface OpenClawChatUIHandle {
  sendMessage: (text: string, options?: { welcomeMessage?: string; displayLabel?: string }) => void
}

interface OpenClawChatUIProps {
  sessionId: string | null
  onSessionUpdate?: (info: { messageCount: number; preview: string; title?: string }) => void
}

const OpenClawChatUI = forwardRef<OpenClawChatUIHandle, OpenClawChatUIProps>(function OpenClawChatUI({ sessionId, onSessionUpdate }, ref) {
  const { language } = useLanguage()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected")
  const [activeToolCalls, setActiveToolCalls] = useState<Array<{ name: string; input: string }>>([])
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const clientRef = useRef<OpenClawClient | null>(null)
  const streamingMsgIdRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const currentSessionIdRef = useRef<string | null>(null)
  const titleGeneratedRef = useRef(false)
  const firstUserMsgRef = useRef<string | null>(null)
  const onSessionUpdateRef = useRef(onSessionUpdate)
  onSessionUpdateRef.current = onSessionUpdate

  const currentSessionKey = useMemo(
    () => sessionId ? sessionKeyFor(sessionId) : "agent:main:visa-consultant",
    [sessionId]
  )

  const extractTextContent = useCallback((content: unknown): string => {
    if (typeof content === "string") return content
    if (Array.isArray(content)) {
      return content
        .map(block => {
          if (typeof block === "string") return block
          if (block && typeof block === "object") {
            if (typeof block.text === "string") return block.text
            if (typeof block.content === "string") return block.content
          }
          return ""
        })
        .filter(Boolean)
        .join("\n")
    }
    if (content && typeof content === "object") {
      const obj = content as Record<string, unknown>
      if (typeof obj.text === "string") return obj.text
      if (typeof obj.content === "string") return obj.content
    }
    return ""
  }, [])

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 100)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    const client = new OpenClawClient({
      url: GATEWAY_URL,
      token: GATEWAY_TOKEN,
      sessionKey: currentSessionKey,
      onStatusChange: (status) => {
        setConnectionStatus(status)
      },
      onMessage: (text, done) => {
        const msgId = streamingMsgIdRef.current
        if (!msgId) return

        setMessages(prev => prev.map(m =>
          m.id === msgId
            ? { ...m, content: text, isStreaming: !done }
            : m
        ))

        if (done) {
          streamingMsgIdRef.current = null
          setIsLoading(false)
          setActiveToolCalls([])

          if (!titleGeneratedRef.current && firstUserMsgRef.current) {
            titleGeneratedRef.current = true
            const userMsg = firstUserMsgRef.current
            const assistantMsg = text
            fetch('/api/chat-title', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userMessage: userMsg, assistantMessage: assistantMsg }),
            })
              .then(r => r.json())
              .then(data => {
                if (data.title) {
                  onSessionUpdateRef.current?.({ messageCount: 1, preview: userMsg.slice(0, 50), title: data.title })
                }
              })
              .catch(() => {})
          }
        }

        scrollToBottom()
      },
      onError: (error) => {
        console.error("OpenClaw error:", error)
        setIsLoading(false)
        setActiveToolCalls([])

        if (streamingMsgIdRef.current) {
          setMessages(prev => prev.map(m =>
            m.id === streamingMsgIdRef.current
              ? { ...m, content: m.content || `抱歉，处理出错：${error}`, isStreaming: false }
              : m
          ))
          streamingMsgIdRef.current = null
        }
      },
      onToolCall: (tool) => {
        if (tool.output) {
          setActiveToolCalls(prev => prev.filter(t => t.name !== tool.name))
        } else {
          setActiveToolCalls(prev => [...prev, { name: tool.name, input: tool.input }])
        }

        if (streamingMsgIdRef.current) {
          setMessages(prev => prev.map(m => {
            if (m.id !== streamingMsgIdRef.current) return m
            const existingTools = m.toolCalls || []
            if (tool.output) {
              return {
                ...m,
                toolCalls: existingTools.map(t =>
                  t.name === tool.name && !t.output
                    ? { ...t, output: tool.output }
                    : t
                ),
              }
            }
            return { ...m, toolCalls: [...existingTools, tool] }
          }))
        }
      },
    })

    clientRef.current = client
    client.connect()

    return () => {
      client.disconnect()
      clientRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollToBottom])

  // Switch session: update sessionKey and load history when sessionId changes
  useEffect(() => {
    if (currentSessionIdRef.current === sessionId) return
    currentSessionIdRef.current = sessionId

    const client = clientRef.current
    if (!client) return

    client.updateSessionKey(currentSessionKey)
    setMessages([])
    setPendingFiles([])
    setActiveToolCalls([])
    streamingMsgIdRef.current = null
    setIsLoading(false)
    titleGeneratedRef.current = false
    firstUserMsgRef.current = null

    if (!client.isConnected) return

    setIsLoadingHistory(true)
    client.getHistory(100, currentSessionKey)
      .then(history => {
        if (currentSessionIdRef.current !== sessionId) return
        if (Array.isArray(history) && history.length > 0) {
          const restored: Message[] = history
            .filter(m => m && (m.role === "user" || m.role === "assistant"))
            .map((m, i) => ({
              id: `hist-${i}-${Date.now()}`,
              role: m.role as "user" | "assistant",
              content: extractTextContent(m.content),
              timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
            }))
            .filter(m => m.content.length > 0)
          setMessages(restored)
        }
      })
      .catch(err => {
        console.warn("Failed to load chat history:", err)
      })
      .finally(() => {
        if (currentSessionIdRef.current === sessionId) {
          setIsLoadingHistory(false)
        }
      })
  }, [sessionId, currentSessionKey])

  const handleSend = async (text?: string, options?: { welcomeMessage?: string; displayLabel?: string }) => {
    const messageText = text || inputValue.trim()
    const uploadedFiles = pendingFiles.filter(p => p.status === "done" && p.result).map(p => p.result!)
    if ((!messageText && uploadedFiles.length === 0) || isLoading) return

    let displayContent = options?.displayLabel || messageText
    const attachments = uploadedFiles.length > 0 ? uploadedFiles : undefined

    if (attachments && !messageText) {
      displayContent = attachments.map(f => `[${f.fileName}]`).join(" ")
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: displayContent,
      timestamp: new Date(),
      attachments,
    }

    const newMessages: Message[] = [userMessage]

    if (options?.welcomeMessage) {
      const welcomeMsg: Message = {
        id: `assistant-welcome-${Date.now()}`,
        role: "assistant",
        content: options.welcomeMessage,
        timestamp: new Date(),
        isStreaming: false,
      }
      newMessages.push(welcomeMsg)
    }

    const assistantMsgId = `assistant-${Date.now() + 1}`
    const assistantMessage: Message = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    }
    newMessages.push(assistantMessage)

    streamingMsgIdRef.current = assistantMsgId
    setMessages(prev => [...prev, ...newMessages])
    setInputValue("")
    setPendingFiles([])
    setIsLoading(true)

    if (messages.length === 0 && !titleGeneratedRef.current) {
      firstUserMsgRef.current = displayContent
    }

    try {
      const client = clientRef.current
      if (!client?.isConnected) {
        throw new Error("未连接到AI顾问服务")
      }

      let fullMessage = ""
      if (attachments && attachments.length > 0) {
        const fileInfoBlock = attachments.map(f =>
          `- 文件名: ${f.fileName}\n  服务器路径: ${f.filePath}\n  类型: ${f.fileType}\n  大小: ${formatFileSize(f.fileSize)}`
        ).join("\n")
        const fileInstructions = `\n\n[用户上传了以下文件，请使用对应的工具读取和分析这些文件]\n${fileInfoBlock}\n`
        fullMessage = messageText
          ? `${messageText}${fileInstructions}`
          : `请分析我上传的文件。${fileInstructions}`
      } else {
        fullMessage = messageText
      }

      if (messages.length === 0) {
        fullMessage = `${IMMIGRATION_SYSTEM_PROMPT}\n\n用户问题：${fullMessage}`
      }

      await client.sendMessage(fullMessage)

      const userMsgs = [...messages, userMessage].filter(m => m.role === "user")
      onSessionUpdate?.({
        messageCount: userMsgs.length,
        preview: displayContent.slice(0, 50),
      })
    } catch (error) {
      setMessages(prev => prev.map(m =>
        m.id === assistantMsgId
          ? {
            ...m,
            content: `抱歉，无法处理您的请求。${error instanceof Error ? error.message : "请稍后重试。"}`,
            isStreaming: false,
          }
          : m
      ))
      streamingMsgIdRef.current = null
      setIsLoading(false)
    }
  }

  useImperativeHandle(ref, () => ({
    sendMessage: (text: string, options?: { welcomeMessage?: string; displayLabel?: string }) => handleSend(text, options),
  }))

  const handleStop = async () => {
    try {
      await clientRef.current?.abort()
    } catch {
      // ignore
    }
    setIsLoading(false)
    if (streamingMsgIdRef.current) {
      setMessages(prev => prev.map(m =>
        m.id === streamingMsgIdRef.current
          ? { ...m, isStreaming: false }
          : m
      ))
      streamingMsgIdRef.current = null
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const uploadFile = async (file: File): Promise<UploadedFile> => {
    const formData = new FormData()
    formData.append("file", file)
    const res = await fetch("/api/chat-upload", { method: "POST", body: formData })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "上传失败" }))
      throw new Error(err.error || "上传失败")
    }
    return res.json()
  }

  const handleFilesSelected = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    if (fileArray.length === 0) return

    const newPending: PendingFile[] = fileArray.map(f => ({ file: f, status: "pending" as const }))
    setPendingFiles(prev => [...prev, ...newPending])

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i]
      setPendingFiles(prev => prev.map(p =>
        p.file === file ? { ...p, status: "uploading" as const } : p
      ))
      try {
        const result = await uploadFile(file)
        setPendingFiles(prev => prev.map(p =>
          p.file === file ? { ...p, status: "done" as const, result } : p
        ))
      } catch (err) {
        setPendingFiles(prev => prev.map(p =>
          p.file === file ? { ...p, status: "error" as const, error: err instanceof Error ? err.message : "上传失败" } : p
        ))
      }
    }
  }, [])

  const removePendingFile = (file: File) => {
    setPendingFiles(prev => prev.filter(p => p.file !== file))
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files)
    }
  }, [handleFilesSelected])

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  const getFileIcon = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase() || ""
    if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return ImageIcon
    if (["pdf", "doc", "docx"].includes(ext)) return FileText
    return File
  }

  const FILE_DOWNLOAD_PREFIX = "📎__DOWNLOAD__:"

  const preprocessContent = useCallback((content: string): string => {
    return content.replace(
      /📎\[([^\]]+)\]\(([^)]+)\)/g,
      (_match, name, filePath) => `[${FILE_DOWNLOAD_PREFIX}${name}](${filePath})`
    )
  }, [])

  const markdownComponents: Components = {
    a: ({ href, children }) => {
      const text = String(children || "")
      if (text.startsWith(FILE_DOWNLOAD_PREFIX) && href) {
        const displayName = text.replace(FILE_DOWNLOAD_PREFIX, "")
        const ext = href.split(".").pop()?.toLowerCase() || ""
        const IconComponent = ["pdf", "doc", "docx"].includes(ext) ? FileText
          : ["json", "csv", "xls", "xlsx"].includes(ext) ? File
          : ["png", "jpg", "jpeg", "gif", "webp"].includes(ext) ? ImageIcon
          : FileText

        const handleDownload = () => {
          const url = `/api/chat-download?path=${encodeURIComponent(href)}`
          const a = document.createElement("a")
          a.href = url
          a.download = displayName.includes(".") ? displayName : `${displayName}.${ext}`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
        }

        return (
          <button
            onClick={handleDownload}
            className="not-prose inline-flex items-center gap-1.5 my-1 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors text-sm text-emerald-700 dark:text-emerald-300 cursor-pointer"
          >
            <IconComponent className="h-4 w-4 shrink-0" />
            <span className="font-medium">{displayName}</span>
            <Download className="h-3.5 w-3.5 ml-1 opacity-60" />
          </button>
        )
      }

      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
          {children}
        </a>
      )
    },
    table: ({ children }) => (
      <div className="overflow-x-auto my-3">
        <table className="min-w-full border-collapse border border-gray-200 dark:border-gray-700 text-sm">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-gray-100 dark:bg-gray-800">{children}</thead>
    ),
    th: ({ children }) => (
      <th className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-left font-semibold text-xs">{children}</th>
    ),
    td: ({ children }) => (
      <td className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs">{children}</td>
    ),
    tr: ({ children }) => (
      <tr className="even:bg-gray-50 dark:even:bg-gray-800/50">{children}</tr>
    ),
  }

  const statusColor = connectionStatus === "connected"
    ? "bg-green-500"
    : connectionStatus === "connecting"
      ? "bg-yellow-500 animate-pulse"
      : "bg-red-500"

  const statusText = connectionStatus === "connected"
    ? (language === "en" ? "AI Consultant Online" : "AI顾问已上线")
    : connectionStatus === "connecting"
      ? (language === "en" ? "Connecting..." : "连接中...")
      : (language === "en" ? "Offline" : "离线")

  return (
    <div
      className={`flex flex-col ${isFullscreen ? "fixed inset-0 z-50 bg-background" : "h-full"} relative`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-40 bg-emerald-500/10 border-2 border-dashed border-emerald-500 rounded-lg flex items-center justify-center backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 text-emerald-600">
            <Upload className="h-10 w-10" />
            <span className="text-sm font-medium">
              {language === "en" ? "Drop files here" : "拖放文件到此处"}
            </span>
            <span className="text-xs text-muted-foreground">
              PDF, DOCX, TXT, PNG, JPG...
            </span>
          </div>
        </div>
      )}
      {/* Header status bar */}
      <div className="flex items-center gap-2.5 px-5 py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-b">
        <div className={`w-2.5 h-2.5 rounded-full ${statusColor}`} />
        <span className="text-sm text-muted-foreground">{statusText}</span>
        <div className="ml-auto flex items-center gap-1.5">
          <Badge variant="outline" className="text-xs">
            <Globe className="w-3 h-3 mr-1" />
            OpenClaw
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen
              ? (language === "en" ? "Exit Fullscreen" : "退出全屏")
              : (language === "en" ? "Fullscreen" : "全屏")}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 min-h-0">
        {isLoadingHistory && (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">{language === "en" ? "Loading history..." : "加载历史记录..."}</span>
          </div>
        )}
        {messages.length === 0 && !isLoadingHistory && (
          <div className="flex flex-col items-center h-full space-y-6 py-8 overflow-y-auto">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
              <Bot className="h-8 w-8 text-white" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold">
                {language === "en" ? "Xichi Immigration Consultant" : "惜池移民顾问"}
              </h3>
              <p className="text-base text-muted-foreground max-w-lg">
                {language === "en"
                  ? "Powered by 6 professional AI skills. Choose a skill to start, or ask any question."
                  : "搭载6项专业AI技能，选择技能开始深度服务，或直接提问。"}
              </p>
            </div>

            {/* Skill cards */}
            <div className="w-full max-w-3xl px-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  {language === "en" ? "Professional Skills" : "专业技能"}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {SKILL_ACTIONS.map((skill, i) => (
                  <button
                    key={i}
                    className={`group relative text-left rounded-xl border border-border/60 p-4 transition-all duration-200 ${skill.bgColor} ${skill.borderColor} hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
                    onClick={() => handleSend(skill.prompt, {
                      welcomeMessage: (skill as typeof SKILL_ACTIONS[0]).welcomeMessage,
                      displayLabel: language === "en"
                        ? ((skill as typeof SKILL_ACTIONS[0]).displayLabelEn || skill.labelEn)
                        : ((skill as typeof SKILL_ACTIONS[0]).displayLabel || skill.label),
                    })}
                    disabled={connectionStatus !== "connected"}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg bg-white dark:bg-gray-900 shadow-sm border border-border/40 ${skill.color}`}>
                        <skill.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[15px] leading-tight">
                          {language === "en" ? skill.labelEn : skill.label}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1 leading-snug">
                          {language === "en" ? skill.descEn : skill.desc}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                  </button>
                ))}
              </div>
            </div>

            {/* Quick prompts */}
            <div className="flex flex-wrap justify-center gap-2.5 max-w-3xl">
              {QUICK_PROMPTS.map((q, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="h-8 text-sm rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-950/20 px-4"
                  onClick={() => handleSend(q.prompt)}
                  disabled={connectionStatus !== "connected"}
                >
                  {language === "en" ? q.labelEn : q.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.role === "assistant" && (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Bot className="h-5 w-5 text-white" />
              </div>
            )}
            <div className="flex flex-col max-w-[85%]">
              <div
                className={`rounded-xl px-5 py-3 ${
                  message.role === "user"
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-50 dark:bg-gray-800/80 text-foreground border"
                }`}
              >
                <div className="break-words text-[15px] leading-relaxed">
                  {message.role === "assistant" && message.content ? (
                    <div className="prose dark:prose-invert max-w-none prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-table:my-2.5 prose-pre:my-2.5 prose-hr:my-3 prose-blockquote:my-2.5 prose-code:text-[13px] prose-h2:text-lg prose-h3:text-base">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {preprocessContent(message.content)}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <span className="whitespace-pre-wrap">{message.content}</span>
                  )}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className={`flex flex-wrap gap-1.5 mt-1.5 ${message.role === "user" ? "justify-end" : ""}`}>
                      {message.attachments.map((att, idx) => {
                        const AttIcon = getFileIcon(att.fileName)
                        return (
                          <span key={idx} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                            message.role === "user"
                              ? "bg-emerald-700/50 text-emerald-50"
                              : "bg-gray-200 dark:bg-gray-700 text-muted-foreground"
                          }`}>
                            <AttIcon className="h-3 w-3" />
                            {att.fileName}
                            <span className="opacity-70">({formatFileSize(att.fileSize)})</span>
                          </span>
                        )
                      })}
                    </div>
                  )}
                  {message.isStreaming && !message.content && (
                    <span className="inline-flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-muted-foreground">思考中...</span>
                    </span>
                  )}
                  {message.isStreaming && message.content && (
                    <span className="inline-block w-1.5 h-4 bg-emerald-500 animate-pulse ml-0.5 align-text-bottom" />
                  )}
                </div>

                {/* Tool calls display */}
                {message.toolCalls && message.toolCalls.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
                    {message.toolCalls.map((tool, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Cog className={`h-3 w-3 ${!tool.output ? "animate-spin" : ""}`} />
                        <span className="font-mono">{tool.name}</span>
                        {tool.output && <span className="text-green-600">✓</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className={`text-xs text-muted-foreground mt-1 ${
                message.role === "user" ? "text-right" : "text-left"
              }`}>
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
            {message.role === "user" && (
              <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </div>
            )}
          </div>
        ))}

        {/* Active tool calls indicator */}
        {activeToolCalls.length > 0 && !streamingMsgIdRef.current && (
          <div className="flex gap-3 justify-start">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-2 border">
              <div className="flex items-center gap-2">
                <Cog className="h-4 w-4 animate-spin text-emerald-600" />
                <span className="text-sm text-muted-foreground">
                  {language === "en" ? "Using tools..." : "正在使用工具..."}
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t flex-shrink-0">
        {connectionStatus !== "connected" && (
          <div className="mx-4 mt-3 mb-0 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 rounded px-3 py-2 flex items-center gap-2">
            <Zap className="h-3 w-3" />
            {language === "en"
              ? "Connecting to AI consultant service..."
              : "正在连接AI顾问服务，请稍候..."}
          </div>
        )}
        {/* Skill quick tags (visible during conversation) */}
        {messages.length > 0 && connectionStatus === "connected" && !isLoading && (
          <div className="px-4 pt-2.5 flex gap-1.5 overflow-x-auto scrollbar-none">
            {SKILL_ACTIONS.map((skill, i) => (
              <button
                key={i}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/50 text-xs whitespace-nowrap transition-all ${skill.bgColor} ${skill.borderColor} hover:shadow-sm`}
                onClick={() => handleSend(skill.prompt, {
                  welcomeMessage: (skill as typeof SKILL_ACTIONS[0]).welcomeMessage,
                  displayLabel: language === "en"
                    ? ((skill as typeof SKILL_ACTIONS[0]).displayLabelEn || skill.labelEn)
                    : ((skill as typeof SKILL_ACTIONS[0]).displayLabel || skill.label),
                })}
              >
                <skill.icon className={`h-3 w-3 ${skill.color}`} />
                <span className="text-muted-foreground">{language === "en" ? skill.labelEn : skill.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Pending files preview */}
        {pendingFiles.length > 0 && (
          <div className="px-4 pt-2.5 flex flex-wrap gap-2">
            {pendingFiles.map((pf, idx) => {
              const PfIcon = getFileIcon(pf.file.name)
              return (
                <div
                  key={idx}
                  className={`inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg border text-xs ${
                    pf.status === "error"
                      ? "border-red-300 bg-red-50 dark:bg-red-950/20 text-red-600"
                      : pf.status === "done"
                        ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700"
                        : "border-border bg-muted/50 text-muted-foreground"
                  }`}
                >
                  {pf.status === "uploading" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <PfIcon className="h-3 w-3" />
                  )}
                  <span className="max-w-[120px] truncate">{pf.file.name}</span>
                  <span className="opacity-60">({formatFileSize(pf.file.size)})</span>
                  {pf.status === "error" && (
                    <span className="text-red-500 ml-0.5" title={pf.error}>!</span>
                  )}
                  <button
                    className="ml-0.5 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
                    onClick={() => removePendingFile(pf.file)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <div className="flex items-center gap-2.5 px-5 py-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.gif,.webp,.csv,.xls,.xlsx,.json"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFilesSelected(e.target.files)
              e.target.value = ""
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-muted-foreground hover:text-emerald-600 shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || connectionStatus !== "connected"}
            title={language === "en" ? "Upload file (resume, evidence, etc.)" : "上传文件（简历、证据材料等）"}
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={
              pendingFiles.some(p => p.status === "done")
                ? (language === "en" ? "Add a message for the uploaded file, or send directly..." : "为上传的文件添加说明，或直接发送...")
                : (language === "en" ? "Ask a question, or upload a file..." : "输入问题，或上传文件...")
            }
            disabled={isLoading || connectionStatus !== "connected"}
            className="flex-1 h-11 text-[15px]"
          />
          {isLoading ? (
            <Button onClick={handleStop} size="icon" variant="destructive" className="h-10 w-10">
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={() => handleSend()}
              disabled={(!inputValue.trim() && !pendingFiles.some(p => p.status === "done")) || connectionStatus !== "connected"}
              size="icon"
              className="h-10 w-10 bg-emerald-600 hover:bg-emerald-700"
            >
              <Send className="h-4.5 w-4.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
})

export default OpenClawChatUI
