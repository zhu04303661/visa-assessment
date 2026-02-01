import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/auth-utils'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

// 上传目录
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads/resumes'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    let userId = formData.get('userId') as string

    if (!file) {
      return NextResponse.json({ error: '未提供文件' }, { status: 400 })
    }

    // 尝试从 cookie 获取用户 ID
    if (!userId) {
      const token = request.cookies.get('auth_token')?.value
      if (token) {
        const payload = await verifyToken(token)
        if (payload) {
          userId = payload.sub
        }
      }
    }

    // 如果仍然没有用户 ID，使用 'anonymous'
    if (!userId) {
      userId = 'anonymous'
    }

    // 生成唯一的文件名
    const timestamp = Date.now()
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${timestamp}_${safeFileName}`
    const userDir = path.join(UPLOAD_DIR, userId)
    const filePath = path.join(userDir, fileName)

    // 确保目录存在
    if (!existsSync(userDir)) {
      await mkdir(userDir, { recursive: true })
    }

    // 将文件转换为 Buffer 并保存
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    await writeFile(filePath, buffer)

    // 生成文件 URL（相对路径）
    const fileUrl = `/uploads/resumes/${userId}/${fileName}`

    console.log('✅ 文件上传成功:', {
      fileName: file.name,
      filePath,
      fileUrl,
      userId,
    })

    return NextResponse.json({
      success: true,
      message: '文件上传成功',
      fileName: file.name,
      filePath: `${userId}/${fileName}`,
      fileUrl: fileUrl,
      fileRecord: {
        user_id: userId,
        file_name: file.name,
        file_path: filePath,
        file_type: 'resume',
        file_url: fileUrl,
        uploaded_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('上传文件异常:', error)
    return NextResponse.json(
      {
        error: '服务器错误',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
