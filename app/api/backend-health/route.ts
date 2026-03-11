import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.COPYWRITING_API_URL || 'http://localhost:5005'

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/health`, { cache: 'no-store' })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { status: 'error', message: `无法连接后端服务: ${message}` },
      { status: 502 }
    )
  }
}
