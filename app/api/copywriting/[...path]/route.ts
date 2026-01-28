import { NextRequest, NextResponse } from 'next/server'

const COPYWRITING_API_URL = process.env.COPYWRITING_API_URL || 'http://localhost:5005'

async function proxyRequest(request: NextRequest, pathSegments: string[]) {
  const method = request.method
  const searchParams = request.nextUrl.searchParams.toString()
  const path = '/' + pathSegments.join('/')
  const url = `${COPYWRITING_API_URL}${path}${searchParams ? `?${searchParams}` : ''}`

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    let body: string | FormData | undefined

    // 处理multipart/form-data (文件上传)
    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      body = formData as any
      delete headers['Content-Type'] // 让fetch自动设置boundary
    } else if (method !== 'GET' && method !== 'HEAD') {
      body = await request.text()
    }

    const response = await fetch(url, {
      method,
      headers: body instanceof FormData ? {} : headers,
      body,
    })

    // 检查响应类型，如果是文件下载或预览则直接返回二进制流
    const responseContentType = response.headers.get('content-type') || ''
    if (responseContentType.includes('application/zip') || 
        responseContentType.includes('application/octet-stream') ||
        responseContentType.includes('application/pdf') ||
        responseContentType.includes('application/msword') ||
        responseContentType.includes('application/vnd.openxmlformats') ||
        responseContentType.includes('image/')) {
      // 文件下载/预览：直接返回二进制流
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

    // JSON响应
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Copywriting API Error:', error)
    return NextResponse.json(
      { success: false, error: 'API请求失败' },
      { status: 500 }
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
