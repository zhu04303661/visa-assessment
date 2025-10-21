import { generateText } from "ai"
import { getAIModel, getAIOptions, validateAIConfig } from "@/lib/ai-config"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
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

export async function POST(request: Request) {
  try {
    // 验证AI配置
    const configValidation = validateAIConfig()
    if (!configValidation.isValid) {
      console.error("AI configuration errors:", configValidation.errors)
      return Response.json(
        { 
          error: "AI configuration error", 
          details: configValidation.errors 
        },
        { status: 500 }
      )
    }

    const { message, conversationHistory, assessmentData } = await request.json()

    if (!message || message.trim().length === 0) {
      return Response.json(
        { error: "Message is required" },
        { status: 400 }
      )
    }

    // 构建系统提示词
    const systemPrompt = `你是一位专业的英国GTV签证评估专家。你的任务是通过对话收集申请人的信息，并逐步进行GTV签证评估。

评估标准：
1. 教育背景 (20分)
2. 行业经验 (25分) 
3. 技术专长 (25分)
4. 成就和影响力 (20分)
5. 未来潜力 (10分)

评估路径：
- Exceptional Talent: 总分80分以上，在领域内有显著成就
- Exceptional Promise: 总分60-79分，有潜力但经验较少

请根据对话内容：
1. 提取和更新相关信息
2. 给出专业的评估建议
3. 询问必要的问题来完善评估
4. 当信息足够时，提供初步评分和路径建议

保持友好、专业的语调，用中文回复。`

    // 构建对话历史
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      {
        role: "system",
        content: systemPrompt
      }
    ]

    // 添加对话历史（最近10条消息）
    const recentHistory = conversationHistory.slice(-10)
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role,
        content: msg.content
      })
    }

    // 添加当前消息
    messages.push({
      role: "user",
      content: message
    })

    // 调用AI
    const { text } = await generateText({
      model: getAIModel(),
      messages,
      ...getAIOptions(),
    })

    // 解析AI回复，提取评估数据
    let updatedAssessmentData = { ...assessmentData }
    let isComplete = false

    // 简单的关键词提取逻辑
    const response = text.toLowerCase()
    
    // 提取姓名
    if (response.includes("姓名") || response.includes("名字")) {
      const nameMatch = message.match(/(?:姓名|名字)[：:]\s*([^\s，,。]+)/i)
      if (nameMatch) {
        updatedAssessmentData.name = nameMatch[1]
      }
    }

    // 提取申请领域
    if (response.includes("领域") || response.includes("专业")) {
      if (message.includes("数字技术") || message.includes("digital")) {
        updatedAssessmentData.field = "Digital Technology"
      } else if (message.includes("艺术") || message.includes("文化") || message.includes("arts")) {
        updatedAssessmentData.field = "Arts & Culture"
      } else if (message.includes("研究") || message.includes("学术") || message.includes("research")) {
        updatedAssessmentData.field = "Research & Academia"
      }
    }

    // 提取经验年限
    const experienceMatch = message.match(/(\d+)\s*年.*经验/i)
    if (experienceMatch) {
      updatedAssessmentData.experience = experienceMatch[1]
    }

    // 计算评分（基于收集到的信息）
    let score = 0
    if (updatedAssessmentData.name) score += 5
    if (updatedAssessmentData.field) score += 10
    if (updatedAssessmentData.experience) {
      const years = parseInt(updatedAssessmentData.experience)
      if (years >= 10) score += 25
      else if (years >= 5) score += 20
      else if (years >= 2) score += 15
      else score += 10
    }

    // 根据对话长度和内容质量调整评分
    const conversationLength = conversationHistory.length
    if (conversationLength > 5) score += 10
    if (conversationLength > 10) score += 15

    // 确定推荐路径
    let pathway = ""
    if (score >= 80) {
      pathway = "Exceptional Talent"
    } else if (score >= 60) {
      pathway = "Exceptional Promise"
    }

    updatedAssessmentData.currentScore = Math.min(score, 100)
    if (pathway) {
      updatedAssessmentData.pathway = pathway
    }

    // 判断是否完成评估
    if (updatedAssessmentData.name && 
        updatedAssessmentData.field && 
        updatedAssessmentData.experience && 
        score >= 50) {
      isComplete = true
    }

    return Response.json({
      message: text,
      assessmentData: updatedAssessmentData,
      isComplete
    })

  } catch (error) {
    console.error("Chat assessment error:", error)
    
    // 返回fallback响应
    const fallbackResponse = "抱歉，我遇到了一些技术问题。请稍后重试，或者您可以尝试使用传统的简历上传方式进行评估。"
    
    return Response.json({
      message: fallbackResponse,
      assessmentData: {},
      isComplete: false
    })
  }
}
