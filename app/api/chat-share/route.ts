import { NextRequest, NextResponse } from 'next/server'

function encodeShareToken(sessionId: string): string {
  return Buffer.from(`share:${sessionId}:${Date.now()}`).toString('base64url')
}

function decodeShareToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    const parts = decoded.split(':')
    if (parts[0] !== 'share' || !parts[1]) return null
    return parts[1]
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }
    const token = encodeShareToken(sessionId)
    const origin = request.headers.get('origin') || request.nextUrl.origin
    const shareUrl = `${origin}/chat/share/${token}`
    return NextResponse.json({ token, shareUrl })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }
  const sessionId = decodeShareToken(token)
  if (!sessionId) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }
  return NextResponse.json({ sessionId, sessionKey: `agent:main:visa-${sessionId}` })
}
