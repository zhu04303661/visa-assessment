import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { getAIModel, getAIOptions } from '@/lib/ai-config'

interface CriteriaScoringRequest {
  resumeData: any
  criteriaGroup: {
    id: string
    type: 'MC' | 'OC1' | 'OC2' | 'OC3' | 'OC4'
    title: string
    description: string
    criteriaList: Array<{
      id: string
      description: string
      evidenceGuide: string[]
    }>
  }
}

interface CriteriaScoringResult {
  groupId: string
  groupType: string
  groupTitle: string
  overallScore: number // 0-100
  completionPercentage: number
  status: 'matched' | 'partial' | 'not-matched'
  criteriResults: Array<{
    criteriaId: string
    criteriaDescription: string
    matched: boolean
    score: number // 0-100
    analysis: string
    evidence: string[]
    recommendations: string[]
  }>
  groupAnalysis: string
  materialSuggestions: string[]
}

export async function POST(request: NextRequest) {
  try {
    const { resumeData, criteriaGroup } = (await request.json()) as CriteriaScoringRequest

    if (!resumeData || !criteriaGroup) {
      return NextResponse.json(
        { error: '缺少必要的请求参数' },
        { status: 400 }
      )
    }

    console.log(`🔍 开始分析标准组: ${criteriaGroup.type} - ${criteriaGroup.title}`)

    // 构建 LLM 分析提示
    const analysisPrompt = buildAnalysisPrompt(resumeData, criteriaGroup)

    // 调用 LLM 进行分析
    const model = getAIModel()
    const aiOptions = getAIOptions()

    const { text } = await generateText({
      model,
      ...aiOptions,
      prompt: analysisPrompt,
      temperature: 0.7,
      maxTokens: 4000,
    })

    // 解析 LLM 响应
    const result = parseAnalysisResponse(text, criteriaGroup)

    console.log(`✅ 分析完成: ${criteriaGroup.type} - 总分: ${result.overallScore}`)

    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ 深度分析失败:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '分析失败',
      },
      { status: 500 }
    )
  }
}

function buildAnalysisPrompt(resumeData: any, criteriaGroup: any): string {
  const resumeText = JSON.stringify(resumeData, null, 2)
  
  return `你是一位专业的英国 Global Talent Visa (GTV) 评估专家。

请分析以下简历内容是否符合 GTV ${criteriaGroup.type} (${criteriaGroup.title}) 标准。

【简历内容】
${resumeText}

【评估标准】
${criteriaGroup.description}

【具体评估项】
${criteriaGroup.criteriaList.map((c: any, i: number) => `
${i + 1}. ${c.description}
   证据要求: ${c.evidenceGuide.join('; ')}
`).join('')}

请以以下 JSON 格式提供详细分析:

\`\`\`json
{
  "overallScore": 0-100之间的数字,
  "completionPercentage": 0-100之间的数字表示完成度,
  "status": "matched|partial|not-matched",
  "groupAnalysis": "对整个标准组的总体分析(中文)",
  "criteriResults": [
    {
      "criteriaId": "评估项ID",
      "matched": true/false,
      "score": 0-100,
      "analysis": "对此项的分析(中文)",
      "evidence": ["在简历中找到的证据1", "证据2"],
      "recommendations": ["补充建议1", "补充建议2"]
    }
  ],
  "materialSuggestions": [
    "用户需要补充的材料1",
    "用户需要补充的材料2",
    "用户需要补充的材料3"
  ]
}
\`\`\`

请确保:
1. 分析客观、专业、严谨
2. 得分基于简历中的实际证据
3. 如果缺少证据,在 recommendations 中提出具体建议
4. materialSuggestions 应该是用户需要补充或收集的具体文件/证明
5. 所有文本必须是中文

返回格式必须是有效的 JSON。`
}

function parseAnalysisResponse(text: string, criteriaGroup: any): CriteriaScoringResult {
  try {
    // 提取 JSON 内容
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/({[\s\S]*})/)
    if (!jsonMatch) {
      throw new Error('无法从 LLM 响应中提取 JSON')
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0]
    const analysisData = JSON.parse(jsonStr)

    return {
      groupId: criteriaGroup.id,
      groupType: criteriaGroup.type,
      groupTitle: criteriaGroup.title,
      overallScore: Math.min(100, Math.max(0, analysisData.overallScore || 0)),
      completionPercentage: Math.min(100, Math.max(0, analysisData.completionPercentage || 0)),
      status: analysisData.status || 'not-matched',
      groupAnalysis: analysisData.groupAnalysis || '',
      materialSuggestions: analysisData.materialSuggestions || [],
      criteriResults: (analysisData.criteriResults || []).map((result: any) => ({
        criteriaId: result.criteriaId,
        criteriaDescription: criteriaGroup.criteriaList.find((c: any) => c.id === result.criteriaId)?.description || '',
        matched: result.matched || false,
        score: Math.min(100, Math.max(0, result.score || 0)),
        analysis: result.analysis || '',
        evidence: result.evidence || [],
        recommendations: result.recommendations || [],
      })),
    }
  } catch (error) {
    console.error('❌ 解析 LLM 响应失败:', error)
    // 返回默认结果
    return {
      groupId: criteriaGroup.id,
      groupType: criteriaGroup.type,
      groupTitle: criteriaGroup.title,
      overallScore: 0,
      completionPercentage: 0,
      status: 'not-matched',
      groupAnalysis: '分析失败，请稍后重试',
      materialSuggestions: [],
      criteriResults: [],
    }
  }
}

