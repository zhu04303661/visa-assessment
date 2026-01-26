import { NextRequest, NextResponse } from 'next/server'

const DOCUMENT_MANAGEMENT_API_URL = process.env.DOCUMENT_MANAGEMENT_API_URL || 'http://localhost:5003'

async function proxyRequest(request: NextRequest, pathSegments: string[]) {
  const method = request.method
  const body = method !== 'GET' ? await request.text() : undefined
  const searchParams = request.nextUrl.searchParams.toString()
  const path = '/' + pathSegments.join('/')
  const url = `${DOCUMENT_MANAGEMENT_API_URL}${path}${searchParams ? `?${searchParams}` : ''}`

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Document Management API Error:', error)
    return NextResponse.json(
      { success: false, error: 'API请求失败' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path)
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path)
}

