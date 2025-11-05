import { NextRequest, NextResponse } from "next/server"

const PYTHON_API_BASE_URL =
  process.env.RESUME_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5005"

/**
 * OC评估API - 使用LangGraph和LLM进行真实OC评估
 * 调用后端Python API进行基于知识库规则的详细分析
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { applicantData, assessmentData } = body

    if (!applicantData) {
      return NextResponse.json(
        { error: "Missing applicantData" },
        { status: 400 }
      )
    }

    console.log("📊 开始OC评估（使用LangGraph和LLM）...")
    console.log("📋 申请人:", applicantData.name || "N/A")
    console.log("📄 评估数据字段:", Object.keys(assessmentData || {}))

    // 调用后端Python API进行OC评估
    const ocUrl = `${PYTHON_API_BASE_URL.replace(/\/$/, '')}/api/assessment/oc-evaluation`
    console.log("🔗 调用后端API:", ocUrl)

    try {
      const ocResponse = await fetch(ocUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicantData: applicantData,
          assessmentData: assessmentData,
        }),
      })

      if (!ocResponse.ok) {
        const errorText = await ocResponse.text()
        console.error("❌ 后端OC评估API调用失败:", ocResponse.status, errorText)
        throw new Error(`后端OC评估失败: ${ocResponse.status} - ${errorText}`)
      }

      const ocResults = await ocResponse.json()
      console.log("✅ OC评估完成:", {
        success: ocResults.success,
        oc_count: ocResults.oc_results?.length || 0,
        summary: ocResults.summary,
      })

      if (!ocResults.success) {
        console.error("❌ OC评估返回失败:", ocResults.error)
        throw new Error(ocResults.error || "OC评估失败")
      }

      return NextResponse.json(ocResults, { status: 200 })
    } catch (apiError) {
      console.error("❌ 调用后端OC评估API异常:", apiError)
      // Fallback: 返回错误信息，但不阻塞流程
      return NextResponse.json(
        {
          success: false,
          error: apiError instanceof Error ? apiError.message : "OC评估API调用失败",
          oc_results: [],
          summary: {
            total: 0,
            satisfied: 0,
            partially_satisfied: 0,
            unsatisfied: 0,
            average_score: 0,
            fulfillment_rate: "0%",
            recommendation: "OC评估服务暂时不可用，请稍后重试",
          },
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("❌ OC评估失败:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        oc_results: [],
        summary: {},
      },
      { status: 500 }
    )
  }
}
