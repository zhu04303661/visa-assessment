import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import path from 'path'

const OPENCLAW_WORKSPACE = '/home/xichi/.openclaw/workspace'
const PROJECT_ROOT = process.cwd()
const DOWNLOADS_DIR = path.join(PROJECT_ROOT, 'public/downloads')

const SEARCH_ROOTS = [
  DOWNLOADS_DIR,
  OPENCLAW_WORKSPACE,
  PROJECT_ROOT,
  '/home/xichi',
  '/tmp',
]

const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.doc', '.docx', '.txt', '.md',
  '.json', '.csv', '.xls', '.xlsx',
  '.png', '.jpg', '.jpeg', '.gif', '.webp',
])

const MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
}

async function findFile(filePath: string): Promise<string | null> {
  if (path.isAbsolute(filePath)) {
    const s = await stat(filePath).catch(() => null)
    if (s?.isFile()) return filePath
  }

  for (const root of SEARCH_ROOTS) {
    const candidate = path.resolve(root, filePath)
    const s = await stat(candidate).catch(() => null)
    if (s?.isFile()) return candidate
  }

  return null
}

function isPathSafe(resolved: string): boolean {
  if (resolved.includes('..')) return false
  return SEARCH_ROOTS.some(root => resolved.startsWith(root))
}

export async function GET(request: NextRequest) {
  try {
    const filePath = request.nextUrl.searchParams.get('path')
    if (!filePath) {
      return NextResponse.json({ error: '缺少 path 参数' }, { status: 400 })
    }

    const resolved = await findFile(filePath)
    if (!resolved) {
      return NextResponse.json(
        { error: '文件不存在', searched: filePath },
        { status: 404 }
      )
    }

    if (!isPathSafe(resolved)) {
      return NextResponse.json({ error: '无权访问该路径' }, { status: 403 })
    }

    const ext = path.extname(resolved).toLowerCase()
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json({ error: `不支持的文件类型: ${ext}` }, { status: 400 })
    }

    const fileStat = await stat(resolved)
    if (fileStat.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: '文件过大' }, { status: 413 })
    }

    const buffer = await readFile(resolved)
    const fileName = path.basename(resolved)
    const contentType = MIME_MAP[ext] || 'application/octet-stream'

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('Chat file download error:', error)
    return NextResponse.json(
      { error: '文件下载失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
