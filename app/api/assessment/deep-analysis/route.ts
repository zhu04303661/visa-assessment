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

请以严格的 JSON 格式提供详细分析。注意以下几点非常重要:
1. JSON 必须是完全有效的格式，所有属性名和字符串值必须用双引号括起来
2. 布尔值必须是 true 或 false（小写，不用引号)
3. 数字不能加引号
4. status 必须是 "matched"、"partial" 或 "not-matched" 之一
5. 所有数组必须用 [] 包裹，对象必须用 {} 包裹
6. 不要在字符串中使用特殊字符而不转义

参考格式:
\`\`\`json
{
  "overallScore": 75,
  "completionPercentage": 60,
  "status": "partial",
  "groupAnalysis": "总体分析内容",
  "criteriResults": [
    {
      "criteriaId": "OC3-1",
      "matched": true,
      "score": 80,
      "analysis": "详细分析",
      "evidence": ["证据1", "证据2"],
      "recommendations": ["建议1", "建议2"]
    }
  ],
  "materialSuggestions": ["材料1", "材料2"]
}
\`\`\`

请确保:
1. 分析客观、专业、严谨
2. 得分基于简历中的实际证据
3. 如果缺少证据,在 recommendations 中提出具体建议
4. materialSuggestions 应该是用户需要补充或收集的具体文件/证明
5. 所有文本必须是中文，但不要使用中文标点符号引号
6. 严格按照上述 JSON 格式返回，确保 JSON 有效性

返回一个完全有效的 JSON 对象，不要有任何语法错误。`
}

function parseAnalysisResponse(text: string, criteriaGroup: any): CriteriaScoringResult {
  try {
    // 提取 JSON 内容
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/({[\s\S]*})/)
    if (!jsonMatch) {
      throw new Error('无法从 LLM 响应中提取 JSON')
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0]

    // 预处理 JSON 字符串，修复常见的格式错误
    const cleanedJsonStr = jsonStr
      // 修复未引用的布尔值和null
      .replace(/:\s*(true|false|null)\s*([,}\]])/g, ': "$1"$2')
      // 修复缺失引号的属性值（简单情况）
      .replace(/:\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*([,}\]])/g, ': "$1"$2')
      // 移除可能的尾随逗号
      .replace(/,(\s*[}\]])/g, '$1')
      // 修正转义字符
      .replace(/\\'/g, "'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')

    console.log('📝 清理后的 JSON 字符串:', cleanedJsonStr)

    let analysisData
    try {
      analysisData = JSON.parse(cleanedJsonStr)
    } catch (parseError) {
      // 如果清理后仍然无法解析，尝试更激进的修复
      console.warn('🔄 尝试更激进的 JSON 修复:', parseError)

      // 尝试手动修复一些常见的 JSON 问题
      const aggressivelyCleaned = cleanedJsonStr
        .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
        .replace(/:(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*([,}])/g, ': "$2"$3')

      analysisData = JSON.parse(aggressivelyCleaned)
    }

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
    console.error('📄 原始响应文本:', text)

    // 返回更详细的错误信息
    return {
      groupId: criteriaGroup.id,
      groupType: criteriaGroup.type,
      groupTitle: criteriaGroup.title,
      overallScore: 0,
      completionPercentage: 0,
      status: 'not-matched',
      groupAnalysis: '分析失败：AI 响应格式错误，请重试或检查提示词',
      materialSuggestions: ['请稍后重试', '如果问题持续，请联系技术支持'],
      criteriResults: criteriaGroup.criteriaList.map((c: any) => ({
        criteriaId: c.id,
        criteriaDescription: c.description,
        matched: false,
        score: 0,
        analysis: '分析失败',
        evidence: [],
        recommendations: ['请重新尝试分析'],
      })),
    }
  }
}

