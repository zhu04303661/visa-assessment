import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const UPLOAD_DIR = process.env.CHAT_UPLOAD_DIR || './uploads/chat-files'

const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.doc', '.docx', '.txt', '.md',
  '.png', '.jpg', '.jpeg', '.gif', '.webp',
  '.csv', '.xls', '.xlsx', '.json',
])

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: '未提供文件' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `文件过大，最大支持 ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    const ext = path.extname(file.name).toLowerCase()
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: `不支持的文件类型: ${ext}，支持: ${[...ALLOWED_EXTENSIONS].join(', ')}` },
        { status: 400 }
      )
    }

    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).slice(2, 8)
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.\-_\u4e00-\u9fa5]/g, '_')
    const fileName = `${timestamp}_${randomSuffix}_${safeFileName}`

    const dateDir = new Date().toISOString().slice(0, 10)
    const uploadDir = path.join(UPLOAD_DIR, dateDir)

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const filePath = path.join(uploadDir, fileName)
    const arrayBuffer = await file.arrayBuffer()
    await writeFile(filePath, Buffer.from(arrayBuffer))

    const absolutePath = path.resolve(filePath)

    return NextResponse.json({
      success: true,
      fileName: file.name,
      filePath: absolutePath,
      fileSize: file.size,
      fileType: ext,
      mimeType: file.type,
    })
  } catch (error) {
    console.error('Chat file upload error:', error)
    return NextResponse.json(
      { error: '文件上传失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
