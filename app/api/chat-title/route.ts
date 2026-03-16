import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = process.env.ENNCLOUD_BASE_URL || 'http://test-router.aicpp-dev1.enncloud.cn/v1'
const API_KEY = process.env.ENNCLOUD_API_KEY || ''
const MODEL = process.env.ENNCLOUD_MODEL || 'glm-4.6-no-think'

export async function POST(request: NextRequest) {
  try {
    const { userMessage, assistantMessage } = await request.json()

    if (!userMessage) {
      return NextResponse.json({ error: 'Missing userMessage' }, { status: 400 })
    }

    const truncatedUser = userMessage.slice(0, 500)
    const truncatedAssistant = (assistantMessage || '').slice(0, 500)

    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: '你是一个标题生成器。根据用户的对话内容，生成一个简洁的中文标题（10字以内）。只输出标题本身，不要引号、标点或任何额外内容。',
          },
          {
            role: 'user',
            content: `用户说：${truncatedUser}\n\n助手回答：${truncatedAssistant}\n\n请为这段对话生成一个简洁的中文标题。`,
          },
        ],
        max_tokens: 30,
        temperature: 0.3,
      }),
    })

    if (!res.ok) {
      console.error('Title generation failed:', res.status, await res.text())
      return NextResponse.json({ title: userMessage.slice(0, 20) })
    }

    const data = await res.json()
    const title = data.choices?.[0]?.message?.content?.trim() || userMessage.slice(0, 20)

    return NextResponse.json({ title: title.slice(0, 30) })
  } catch (error) {
    console.error('Title generation error:', error)
    return NextResponse.json({ title: '新对话' })
  }
}
