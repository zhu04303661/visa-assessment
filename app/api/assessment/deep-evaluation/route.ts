import { NextRequest, NextResponse } from 'next/server'

interface EvidenceFile {
  id: string
  name: string
  size: number
  uploadedAt: string
}

interface CriteriaEvidence {
  id: string
  description: string
  evidenceGuide: string[]
  status: 'not-started' | 'in-progress' | 'completed' | 'submitted'
  files: EvidenceFile[]
  content: string
  documentReference: string
  comments: string
}

interface CriteriaGroup {
  id: string
  type: 'MC' | 'OC1' | 'OC2' | 'OC3' | 'OC4'
  title: string
  description: string
  requirementLevel: 'Mandatory' | 'Optional'
  criteriaList: CriteriaEvidence[]
  overallStatus: 'not-started' | 'in-progress' | 'completed'
  completionPercentage: number
}

interface AssessmentData {
  applicantInfo: {
    name: string
    email: string
    field: string
    currentRole: string
    yearsExperience: string
  }
  criteriaGroups: CriteriaGroup[]
  timestamp: string
  submissionId?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AssessmentData

    // 基础验证
    if (!body.applicantInfo?.name || !body.applicantInfo?.email) {
      return NextResponse.json(
        { success: false, error: '申请人姓名和邮箱不能为空' },
        { status: 400 }
      )
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.applicantInfo.email)) {
      return NextResponse.json(
        { success: false, error: '邮箱格式无效' },
        { status: 400 }
      )
    }

    // 计算完成度
    let mcCompletion = 0
    let ocCompletion = 0
    let totalFilesCount = 0
    let totalCompletedCriteria = 0

    body.criteriaGroups.forEach((group) => {
      const completedCount = group.criteriaList.filter(
        (c) => c.status === 'completed' || c.status === 'submitted'
      ).length
      const hasEvidence = group.criteriaList.filter(
        (c) => c.files.length > 0 || c.content.trim().length > 0
      ).length

      totalCompletedCriteria += completedCount
      totalFilesCount += group.criteriaList.reduce((sum, c) => sum + c.files.length, 0)

      const completion = (completedCount / group.criteriaList.length) * 100

      if (group.type === 'MC') {
        mcCompletion = completion
      } else {
        ocCompletion += completion
      }
    })

    // OC 平均值
    const ocGroupsCount = body.criteriaGroups.filter((g) => g.type.startsWith('OC')).length
    ocCompletion = ocGroupsCount > 0 ? ocCompletion / ocGroupsCount : 0

    // 总体完成度：MC 60% + OC 40%
    const overallCompletion = mcCompletion * 0.6 + ocCompletion * 0.4

    // 生成提交 ID
    const submissionId = `GTV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // 验证 MC 至少完成一项
    const mcGroup = body.criteriaGroups.find((g) => g.type === 'MC')
    const hasMCCompletion = mcGroup?.criteriaList.some(
      (c) => c.status === 'completed' || c.status === 'submitted'
    )

    if (!hasMCCompletion) {
      return NextResponse.json(
        {
          success: false,
          error: '至少需要完成一项强制要求 (MC)',
          progress: {
            mc: mcCompletion,
            oc: ocCompletion,
            overall: overallCompletion,
          },
        },
        { status: 400 }
      )
    }

    // 构建评估结果
    const assessmentResult = {
      success: true,
      submissionId,
      message: '深度评估已成功提交',
      completion: {
        mc: Math.round(mcCompletion * 100) / 100,
        oc: Math.round(ocCompletion * 100) / 100,
        overall: Math.round(overallCompletion * 100) / 100,
      },
      statistics: {
        totalCriteria: body.criteriaGroups.reduce((sum, g) => sum + g.criteriaList.length, 0),
        completedCriteria: totalCompletedCriteria,
        uploadedFiles: totalFilesCount,
        assessmentGroups: {
          mc: body.criteriaGroups.find((g) => g.type === 'MC')?.criteriaList.length || 0,
          oc1: body.criteriaGroups.find((g) => g.type === 'OC1')?.criteriaList.length || 0,
          oc2: body.criteriaGroups.find((g) => g.type === 'OC2')?.criteriaList.length || 0,
          oc3: body.criteriaGroups.find((g) => g.type === 'OC3')?.criteriaList.length || 0,
          oc4: body.criteriaGroups.find((g) => g.type === 'OC4')?.criteriaList.length || 0,
        },
      },
      applicant: {
        name: body.applicantInfo.name,
        email: body.applicantInfo.email,
        field: body.applicantInfo.field,
        currentRole: body.applicantInfo.currentRole,
        yearsExperience: body.applicantInfo.yearsExperience,
      },
      timestamp: new Date().toISOString(),
    }

    // 这里可以将数据保存到数据库
    // await saveAssessmentToDB(assessmentResult)

    return NextResponse.json(assessmentResult)
  } catch (error) {
    console.error('Assessment submission error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '评估提交失败',
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const submissionId = searchParams.get('id')

    if (!submissionId) {
      return NextResponse.json(
        { success: false, error: '评估 ID 不能为空' },
        { status: 400 }
      )
    }

    // 这里可以从数据库查询
    // const assessment = await getAssessmentFromDB(submissionId)

    return NextResponse.json({
      success: true,
      submissionId,
      message: '评估数据已检索',
      // assessment: assessment || null,
    })
  } catch (error) {
    console.error('Get assessment error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '获取评估失败',
      },
      { status: 500 }
    )
  }
}
