import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string

    if (!file) {
      return NextResponse.json({ error: '未提供文件' }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json({ error: '未提供用户ID' }, { status: 400 })
    }

    // 生成唯一的文件名
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop() || 'txt'
    const fileName = `${userId}/${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filePath = `resumes/${fileName}`

    // 将文件转换为 ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()

    // 上传到 Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(filePath, arrayBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (uploadError) {
      console.error('文件上传失败:', uploadError)
      return NextResponse.json(
        { error: '文件上传失败', details: uploadError.message },
        { status: 500 }
      )
    }

    // 获取文件的公共 URL
    const { data: urlData } = supabase.storage
      .from('resumes')
      .getPublicUrl(filePath)

    // 保存文件记录到 uploaded_files 表
    const { data: fileRecord, error: recordError } = await supabase
      .from('uploaded_files')
      .insert({
        user_id: userId,
        file_name: file.name,
        file_path: filePath,
        file_type: 'resume',
        file_url: urlData.publicUrl,
        bucket_name: 'resumes',
        uploaded_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (recordError) {
      console.warn('保存文件记录失败（文件已上传）:', recordError)
      // 文件已上传成功，即使记录失败也返回成功
    }

    return NextResponse.json({
      success: true,
      message: '文件上传成功',
      fileName: file.name,
      filePath: filePath,
      fileUrl: urlData.publicUrl,
      fileRecord: fileRecord,
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

