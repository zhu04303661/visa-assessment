import { NextRequest, NextResponse } from 'next/server'
import { Agent } from 'undici'

const COPYWRITING_API_URL = process.env.COPYWRITING_API_URL || 'http://localhost:5005'

const uploadAgent = new Agent({
  headersTimeout: 600_000,
  bodyTimeout: 600_000,
  connectTimeout: 30_000,
})

async function proxyRequest(request: NextRequest, pathSegments: string[]) {
  const method = request.method
  const searchParams = request.nextUrl.searchParams.toString()
  const rawPath = pathSegments.join('/')
  const path = rawPath.startsWith('api/') ? `/${rawPath}` : `/api/${rawPath}`
  const url = `${COPYWRITING_API_URL}${path}${searchParams ? `?${searchParams}` : ''}`

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    let body: string | FormData | undefined

    const contentType = request.headers.get('content-type') || ''
    const isUpload = contentType.includes('multipart/form-data')
    if (isUpload) {
      const formData = await request.formData()
      body = formData as any
      delete headers['Content-Type']
    } else if (method !== 'GET' && method !== 'HEAD') {
      body = await request.text()
    }

    const fetchOptions: any = {
      method,
      headers: body instanceof FormData ? {} : headers,
      body,
    }
    if (isUpload) {
      fetchOptions.dispatcher = uploadAgent
    }

    const response = await fetch(url, fetchOptions)

    // 检查响应类型
    const responseContentType = response.headers.get('content-type') || ''
    
    // 流式响应（SSE）：直接透传
    if (responseContentType.includes('text/event-stream')) {
      return new Response(response.body, {
        status: response.status,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }
    
    // 文件下载或预览：直接返回二进制流
    if (responseContentType.includes('application/zip') || 
        responseContentType.includes('application/octet-stream') ||
        responseContentType.includes('application/pdf') ||
        responseContentType.includes('application/msword') ||
        responseContentType.includes('application/vnd.openxmlformats') ||
        responseContentType.includes('image/')) {
      const arrayBuffer = await response.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      
      const responseHeaders: Record<string, string> = {
        'Content-Type': responseContentType,
        'Content-Length': uint8Array.length.toString(),
        'X-Frame-Options': 'SAMEORIGIN',
        'Access-Control-Allow-Origin': '*',
      }
      
      // 复制 content-disposition
      const contentDisposition = response.headers.get('content-disposition')
      if (contentDisposition) {
        responseHeaders['Content-Disposition'] = contentDisposition
      }
      
      return new Response(uint8Array, { 
        status: response.status,
        headers: responseHeaders 
      })
    }

    // JSON响应：先检查 Content-Type 再解析
    if (responseContentType.includes('application/json')) {
      const data = await response.json()
      return NextResponse.json(data, { status: response.status })
    }

    // 非 JSON 响应（如 HTML 错误页）：返回原始文本和状态
    const text = await response.text()
    return NextResponse.json(
      { success: false, error: `后端返回非JSON响应(${response.status}): ${text.slice(0, 200)}` },
      { status: response.status >= 400 ? response.status : 502 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Copywriting API Error:', error)

    const isTimeout = message.includes('HeadersTimeoutError') ||
      message.includes('UND_ERR_HEADERS_TIMEOUT') ||
      message.includes('aborted')
    const friendlyMsg = isTimeout
      ? '文件上传超时，请检查文件大小或网络后重试'
      : `API请求失败: ${message}`

    return NextResponse.json(
      { success: false, error: friendlyMsg },
      { status: isTimeout ? 504 : 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyRequest(request, path)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyRequest(request, path)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyRequest(request, path)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyRequest(request, path)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyRequest(request, path)
}
