import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getBackendUrl } from '@/lib/auth/auth-utils'

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

    // 尝试从 cookie 获取用户 ID
    let finalUserId = userId || null
    const token = request.cookies.get('auth_token')?.value
    if (token && !finalUserId) {
      const payload = await verifyToken(token)
      if (payload) {
        finalUserId = payload.sub
      }
    }

    // 准备要保存的数据
    const assessmentRecord = {
      user_id: finalUserId,
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
      data: assessmentData,
      status: 'completed',
    }

    console.log('💾 [API] 准备保存数据:', {
      hasUserId: !!assessmentRecord.user_id,
      userId: assessmentRecord.user_id || 'null (anonymous)',
      applicantEmail: assessmentRecord.applicant_email,
      assessmentType: assessmentRecord.assessment_type,
    })

    // 调用后端 API 保存评估数据
    const backendUrl = getBackendUrl()
    const response = await fetch(`${backendUrl}/api/assessments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assessmentRecord),
    })

    const result = await response.json()

    if (!result.success) {
      console.error('❌ [API] 保存评估数据失败:', result.error)
      return NextResponse.json(
        {
          error: '保存评估数据失败',
          details: result.error,
        },
        { status: 500 }
      )
    }

    console.log('✅ [API] 评估数据保存成功:', {
      assessmentId: result.assessment_id,
      userId: finalUserId || 'anonymous',
      applicantEmail,
    })

    return NextResponse.json({
      success: true,
      message: '评估数据保存成功',
      assessmentId: result.assessment_id,
      data: {
        id: result.assessment_id,
        ...assessmentRecord,
      },
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
