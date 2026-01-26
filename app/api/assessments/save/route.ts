import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId,
      applicantName,
      applicantEmail,
      applicantPhone,
      field,
      resumeText,
      resumeFileName,
      resumeFileUrl,
      additionalInfo,
      assessmentData,
      overallScore,
      eligibilityLevel,
      gtvPathway,
    } = body

    console.log('📝 [API] 收到保存评估数据请求:', {
      hasUserId: !!userId,
      userId: userId || 'anonymous',
      applicantEmail,
      hasAssessmentData: !!assessmentData,
    })

    // 验证必填字段
    if (!applicantEmail || !assessmentData) {
      console.error('❌ [API] 缺少必要字段:', { applicantEmail: !!applicantEmail, assessmentData: !!assessmentData })
      return NextResponse.json(
        { error: '缺少必要字段：applicantEmail, assessmentData' },
        { status: 400 }
      )
    }

    // 如果没有 userId，使用匿名用户（null）
    // 这样未登录用户也可以保存评估数据
    const finalUserId = userId || null

    // 准备要保存的数据
    const assessmentRecord: any = {
      assessment_type: 'gtv',
      applicant_name: applicantName || null,
      applicant_email: applicantEmail,
      applicant_phone: applicantPhone || null,
      field: field || null,
      resume_text: resumeText || null,
      resume_file_name: resumeFileName || null,
      resume_file_url: resumeFileUrl || null,
      additional_info: additionalInfo || null,
      overall_score: overallScore || null,
      eligibility_level: eligibilityLevel || null,
      gtv_pathway: gtvPathway || null,
      data: assessmentData, // 完整的评估结果数据（JSONB）
      status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // 如果有用户ID，添加 user_id 字段
    if (finalUserId) {
      assessmentRecord.user_id = finalUserId
    }

    console.log('💾 [API] 准备插入数据到 Supabase:', {
      hasUserId: !!assessmentRecord.user_id,
      userId: assessmentRecord.user_id || 'null (anonymous)',
      applicantEmail: assessmentRecord.applicant_email,
      assessmentType: assessmentRecord.assessment_type,
    })

    // 保存到 Supabase
    const { data, error } = await supabase
      .from('assessments')
      .insert(assessmentRecord)
      .select()
      .single()

    if (error) {
      console.error('❌ [API] 保存评估数据失败:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        fullError: error,
      })
      return NextResponse.json(
        { 
          error: '保存评估数据失败', 
          details: error.message,
          code: error.code,
          hint: error.hint,
        },
        { status: 500 }
      )
    }

    console.log('✅ [API] 评估数据保存成功:', {
      assessmentId: data.id,
      userId: data.user_id || 'anonymous',
      applicantEmail: data.applicant_email,
    })

    return NextResponse.json({
      success: true,
      message: '评估数据保存成功',
      assessmentId: data.id,
      data: data,
    })
  } catch (error) {
    console.error('❌ [API] 保存评估数据异常:', error)
    return NextResponse.json(
      {
        error: '服务器错误',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

