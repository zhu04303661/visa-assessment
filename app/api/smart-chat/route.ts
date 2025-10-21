import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { getAIModel, getAIOptions, validateAIConfig } from '@/lib/ai-config'

const ACE_API_BASE_URL = process.env.ACE_API_URL || 'http://localhost:5001'

export async function POST(request: NextRequest) {
  try {
    // 验证AI配置
    const aiConfig = validateAIConfig()
    if (!aiConfig.isValid) {
      return NextResponse.json({
        success: false,
        error: aiConfig.errors.join(', '),
        message: 'AI配置错误，请检查环境变量'
      }, { status: 500 })
    }

    const body = await request.json()
    const { message, context = "", conversationHistory = [], resumeData = null } = body

    if (!message) {
      return NextResponse.json({
        success: false,
        error: '消息不能为空'
      }, { status: 400 })
    }

    // 1. 调用ACE获取知识和推理结果
    const aceResponse = await fetch(`${ACE_API_BASE_URL}/api/ace/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        context: resumeData ? `简历信息：${JSON.stringify(resumeData)}` : context,
        conversationHistory
      }),
    })

    if (!aceResponse.ok) {
      throw new Error(`ACE API错误: ${aceResponse.status}`)
    }

    const aceData = await aceResponse.json()
    
    if (!aceData.success) {
      return NextResponse.json({
        success: false,
        error: 'ACE处理失败',
        message: aceData.error || '知识库处理失败'
      }, { status: 500 })
    }

    // 2. 构建大模型提示词
    const systemPrompt = `你是一个专业的GTV签证评估助手。请基于提供的知识库和推理结果，生成一个贴近用户、逻辑合理且有用的回复。

## 知识库信息：
${JSON.stringify(aceData.knowledge_base, null, 2)}

## ACE推理结果：
${JSON.stringify(aceData.reasoning, null, 2)}

## 用户上下文：
- 问题：${aceData.context?.question || message}
- 背景：${aceData.context?.user_context || '无'}
- 对话历史：${JSON.stringify(aceData.context?.conversation_history || [], null, 2)}

## 回复要求：
1. 基于知识库信息回答用户问题
2. 结合ACE的推理结果提供专业建议
3. 考虑用户的背景和对话历史
4. 回复要贴近用户，逻辑清晰，实用性强
5. 如果涉及评估，请提供具体的分数和建议
6. 如果用户还没有上传简历，请提示他们上传简历以获得更准确的评估
7. 使用中文回复，语气友好专业

请生成回复：`

    // 3. 调用大模型生成最终回复
    const { text } = await generateText({
      model: getAIModel(),
      ...getAIOptions(),
      system: systemPrompt,
      prompt: `用户问题：${message}`
    })

    // 4. 返回结果
    return NextResponse.json({
      success: true,
      message: text,
      ace_data: {
        knowledge_base: aceData.knowledge_base,
        reasoning: aceData.reasoning,
        context: aceData.context
      },
      metadata: {
        timestamp: new Date().toISOString(),
        model_used: process.env.AI_PROVIDER || 'openai'
      }
    })

  } catch (error) {
    console.error('智能聊天API错误:', error)
    
    // 降级处理：如果ACE或大模型失败，返回基础回复
    return NextResponse.json({
      success: false,
      error: '智能聊天服务暂时不可用',
      message: '抱歉，智能聊天功能暂时不可用。请稍后重试或使用传统评估方式。',
      fallback: true
    }, { status: 503 })
  }
}
