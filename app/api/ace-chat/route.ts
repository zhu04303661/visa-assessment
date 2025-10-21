import { NextRequest, NextResponse } from 'next/server'

const ACE_API_BASE_URL = process.env.ACE_API_URL || 'http://localhost:5001'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const action = body.action
    
    // 根据操作类型路由到不同的API端点
    let endpoint = '/api/ace/chat'
    let requestBody = body
    
    switch (action) {
      case 'add_bullet':
        endpoint = '/api/ace/bullets'
        requestBody = {
          section: body.section,
          content: body.content,
          bullet_id: body.bullet_id
        }
        break
      case 'update_bullet':
        endpoint = `/api/ace/bullets/${body.bullet_id}`
        requestBody = {
          content: body.content,
          section: body.section
        }
        break
      case 'delete_bullet':
        endpoint = `/api/ace/bullets/${body.bullet_id}`
        requestBody = {}
        break
      case 'reset_playbook':
        endpoint = '/api/ace/reset-playbook'
        requestBody = {}
        break
      default:
        // 默认聊天操作
        break
    }
    
    // 转发请求到Python ACE服务器
    const response = await fetch(`${ACE_API_BASE_URL}${endpoint}`, {
      method: action === 'delete_bullet' ? 'DELETE' : 
              action === 'update_bullet' ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      throw new Error(`ACE API错误: ${response.status}`)
    }

    const data = await response.json()
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('ACE API错误:', error)
    
    // 返回降级响应
    return NextResponse.json({
      success: false,
      error: 'ACE服务暂时不可用',
      message: '抱歉，操作失败。请稍后重试。',
    }, { status: 503 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    if (action === 'playbook') {
      // 获取知识库状态
      const response = await fetch(`${ACE_API_BASE_URL}/api/ace/playbook`)
      const data = await response.json()
      return NextResponse.json(data)
    }
    
    if (action === 'bullets') {
      // 获取所有知识条目
      const response = await fetch(`${ACE_API_BASE_URL}/api/ace/bullets`)
      const data = await response.json()
      return NextResponse.json(data)
    }
    
    // 默认健康检查
    const response = await fetch(`${ACE_API_BASE_URL}/health`, {
      method: 'GET',
    })

    if (!response.ok) {
      throw new Error(`ACE服务不可用: ${response.status}`)
    }

    const data = await response.json()
    
    return NextResponse.json({
      success: true,
      ace_status: data.status,
      message: 'ACE自我进化代理运行正常'
    })
  } catch (error) {
    console.error('ACE API错误:', error)
    
    return NextResponse.json({
      success: false,
      error: 'ACE服务不可用',
      message: '自我进化功能暂时不可用'
    }, { status: 503 })
  }
}
