import { NextRequest, NextResponse } from "next/server"

// Python backend service endpoint
const SCORING_AGENT_API = process.env.SCORING_AGENT_API || "http://localhost:5005"

interface ScoringItem {
  name: string
  value: any
  score: number
  maxScore: number
  percentage: number
  criteria: string
  reasoning: string
  improvement: string
}

interface Dimension {
  name: string
  totalScore: number
  maxScore: number
  percentage: number
  items: ScoringItem[]
}

async function callPythonAPI(
  endpoint: string,
  data: any
): Promise<any> {
  try {
    const response = await fetch(`${SCORING_AGENT_API}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Python API error (${response.status}):`, errorText)
      throw new Error(`Python API failed: ${response.status} ${errorText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Python API call failed:", error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { assessmentData, applicantBackground } = body

    if (!assessmentData) {
      return NextResponse.json(
        { error: "Missing assessmentData" },
        { status: 400 }
      )
    }

    console.log("📊 开始调用Python评分Agent...")
    console.log("📋 申请人背景:", applicantBackground)

    // Build dimensions data from assessmentData
    const dimensions: Record<string, any> = {}

    // 教育背景维度
    if (assessmentData.educationBackground) {
      dimensions.education = {
        name: "教育背景",
        items: [
          {
            name: "最高学历",
            value: assessmentData.educationBackground.degrees,
            score: 85,
            maxScore: 100,
            percentage: 85,
          },
        ],
      }
    }

    // 工作经验维度
    if (assessmentData.workExperience) {
      dimensions.experience = {
        name: "工作经验",
        items: [
          {
            name: "工作年限",
            value: assessmentData.applicantInfo?.yearsOfExperience,
            score: 80,
            maxScore: 100,
            percentage: 80,
          },
        ],
      }
    }

    // 技术专长维度
    if (assessmentData.technicalExpertise) {
      dimensions.technical = {
        name: "技术专长",
        items: [
          {
            name: "核心技能",
            value: assessmentData.technicalExpertise.coreSkills,
            score: 90,
            maxScore: 100,
            percentage: 90,
          },
        ],
      }
    }

    // 默认添加领导力和影响力维度
    dimensions.leadership = {
      name: "领导力",
      items: [
        {
          name: "团队管理",
          value: "领导能力",
          score: 75,
          maxScore: 100,
          percentage: 75,
        },
      ],
    }

    dimensions.impact = {
      name: "行业影响力",
      items: [
        {
          name: "行业认可",
          value: "行业认可度",
          score: 82,
          maxScore: 100,
          percentage: 82,
        },
      ],
    }

    // 调用Python API分析所有维度
    const analysisResults: Record<string, any> = {}

    for (const [dimKey, dimData] of Object.entries(dimensions)) {
      try {
        console.log(`🔄 分析维度: ${(dimData as any).name}...`)

        const result = await callPythonAPI("/api/scoring/analyze-dimension", {
          dimension_name: (dimData as any).name,
          items: (dimData as any).items,
          applicant_background: applicantBackground,
        })

        console.log(`✅ 维度分析完成: ${(dimData as any).name}`)

        // Transform the result to match expected format
        analysisResults[dimKey] = {
          name: (dimData as any).name,
          totalScore: (dimData as any).items[0]?.score || 0,
          maxScore: (dimData as any).items[0]?.maxScore || 100,
          percentage: (dimData as any).items[0]?.percentage || 0,
          items: (dimData as any).items.map((item: any, idx: number) => {
            // Get the LLM analysis from Python API result
            const itemAnalysis = result?.[idx]
            const officialReq = itemAnalysis?.official_requirement
            const deviationAnalysis = itemAnalysis?.deviation_analysis

            return {
              name: item.name,
              value: item.value,
              score: item.score,
              maxScore: item.maxScore,
              percentage: item.percentage,
              // Use LLM-generated content from Python API
              criteria:
                officialReq?.description ||
                officialReq?.level ||
                "GTV评估标准",
              reasoning:
                officialReq?.reasoning ||
                "基于申请人信息的评估",
              improvement:
                deviationAnalysis?.improvement_steps?.[0] ||
                deviationAnalysis?.gtv_rules_alignment ||
                "继续改进",
              // Additional LLM fields for detailed display
              officialRequirement: officialReq,
              deviationAnalysis: deviationAnalysis,
            }
          }),
        }
      } catch (error) {
        console.error(`❌ 分析维度失败: ${(dimData as any).name}`, error)

        // Fallback to basic structure if Python API fails
        analysisResults[dimKey] = {
          name: (dimData as any).name,
          totalScore: (dimData as any).items[0]?.score || 0,
          maxScore: (dimData as any).items[0]?.max_score || 100,
          percentage: (dimData as any).items[0]?.percentage || 0,
          items: (dimData as any).items.map((item: any) => ({
            name: item.name,
            value: item.value,
            score: item.score,
            maxScore: item.max_score,
            percentage: item.percentage,
            criteria: "GTV评估标准",
            reasoning: "基于申请人信息的评估",
            improvement: "持续改进建议",
          })),
        }
      }
    }

    console.log("✅ 所有维度分析完成")

    const response = {
      dimensions: analysisResults,
      summary: {
        overallScore: Math.round(
          Object.values(analysisResults).reduce(
            (sum: number, dim: any) => sum + (dim.totalScore || 0),
            0
          ) / Object.keys(analysisResults).length
        ),
        analysisDate: new Date().toISOString(),
        applicantName: applicantBackground?.name || "申请人",
      },
    }

    console.log("🎉 评分分析API返回成功")
    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error("❌ Scoring analysis error:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    )
  }
}
