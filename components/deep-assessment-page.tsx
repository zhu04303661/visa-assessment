'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Award,
  Zap,
  Users,
  Code,
  Briefcase,
  Upload,
  Download,
  Save,
  FileText,
  TrendingUp,
  Star,
  Trash2,
  File,
  Plus,
  Loader2,
} from 'lucide-react'

interface EvidenceFile {
  id: string
  name: string
  size: number
  uploadedAt: string
}

interface CriteriaEvidence {
  id: string
  description: string
  evidenceGuide: string[] // 详细的证据指南
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

export function DeepAssessmentPage() {
  const [applicantInfo, setApplicantInfo] = useState({
    name: '',
    email: '',
    field: 'digital-technology',
    currentRole: '',
    yearsExperience: '',
  })

  const [criteriaGroups, setCriteriaGroups] = useState<CriteriaGroup[]>(initializeCriteriaGroups())
  const [activeTab, setActiveTab] = useState('mc')
  const [isAutoFilling, setIsAutoFilling] = useState(false)
  const [autoAnalysisResults, setAutoAnalysisResults] = useState<any>(null)
  const [isAutoAnalyzing, setIsAutoAnalyzing] = useState(false)
  const [hasResumeData, setHasResumeData] = useState(false)

  function initializeCriteriaGroups(): CriteriaGroup[] {
    return [
      {
        id: 'mc',
        type: 'MC',
        title: '强制要求 (Mandatory Criteria)',
        description: '展示过去5年内被认可为数字技术领域的领导型人才',
        requirementLevel: 'Mandatory',
        criteriaList: [
          {
            id: 'mc-1',
            description: '领导产品驱动型公司/产品/团队增长',
            evidenceGuide: [
              '来自行业领先专家的推荐信描述你的工作',
              '新闻剪报',
              '公共代码库中的代码行或类似证据',
            ],
            status: 'not-started',
            files: [],
            content: '',
            documentReference: '',
            comments: '',
          },
          {
            id: 'mc-2',
            description: '领导市场营销或业务发展，实现重大增长',
            evidenceGuide: [
              '行业领先专家的推荐信',
              '公司内部高级全球商业高管的推荐信',
              '公司合作伙伴/客户的推荐信',
              '收入/客户增长证明',
            ],
            status: 'not-started',
            files: [],
            content: '',
            documentReference: '',
            comments: '',
          },
          {
            id: 'mc-3',
            description: '领导非营利组织或社会企业',
            evidenceGuide: [
              '行业领先专家的推荐信',
              '新闻剪报或类似证据',
            ],
            status: 'not-started',
            files: [],
            content: '',
            documentReference: '',
            comments: '',
          },
          {
            id: 'mc-4',
            description: '领导或贡献于大型开源项目',
            evidenceGuide: [
              '代码提交摘要汇编',
              '仓库星标',
              '下载统计等类似指标',
            ],
            status: 'not-started',
            files: [],
            content: '',
            documentReference: '',
            comments: '',
          },
          {
            id: 'mc-5',
            description: '建立、领导或参与行业倡议',
            evidenceGuide: [
              '全球高级项目执行人员的推荐信',
            ],
            status: 'not-started',
            files: [],
            content: '',
            documentReference: '',
            comments: '',
          },
          {
            id: 'mc-6',
            description: '获得国家或国际奖项',
            evidenceGuide: [
              '奖项本身',
              '行业领先专家描述成就的推荐信',
              '新闻剪报或类似证据',
            ],
            status: 'not-started',
            files: [],
            content: '',
            documentReference: '',
            comments: '',
          },
          {
            id: 'mc-7',
            description: '在高端事件中发表演讲',
            evidenceGuide: [
              '行业领先专家描述工作的推荐信',
              '新闻剪报或类似证据',
              '活动规模/出席人数估计',
            ],
            status: 'not-started',
            files: [],
            content: '',
            documentReference: '',
            comments: '',
          },
          {
            id: 'mc-8',
            description: '在专业刊物中发表文章',
            evidenceGuide: [
              '文章标题和发布日期',
              '作者身份证明',
              '必要的翻译',
            ],
            status: 'not-started',
            files: [],
            content: '',
            documentReference: '',
            comments: '',
          },
          {
            id: 'mc-9',
            description: '获得高薪酬（包括奖金、股权）',
            evidenceGuide: [
              '商业或雇佣合同（含薪资信息）',
              '任何奖金和股权期权',
              '收入历史',
            ],
            status: 'not-started',
            files: [],
            content: '',
            documentReference: '',
            comments: '',
          },
          {
            id: 'mc-10',
            description: '担任重要专家评审角色',
            evidenceGuide: [
              '小组评审证书或推荐信',
              '独立评审任命证明',
            ],
            status: 'not-started',
            files: [],
            content: '',
            documentReference: '',
            comments: '',
          },
        ],
        overallStatus: 'not-started',
        completionPercentage: 0,
      },
      {
        id: 'oc1',
        type: 'OC1',
        title: '可选要求 1: 创新的可靠记录',
        description: '证明在数字技术领域有创新产品和市场成功的记录',
        requirementLevel: 'Optional',
        criteriaList: [
          {
            id: 'oc1-1',
            description: '创新/产品开发证据、市场产品证明及收入证明',
            evidenceGuide: [
              '产品的市场和相关吸引力证明',
              '通过收入反映的市场影响力证明',
            ],
            status: 'not-started',
            files: [],
            content: '',
            documentReference: '',
            comments: '',
          },
          {
            id: 'oc1-2',
            description: '经过审计的账目、财务预测和公司章程',
            evidenceGuide: [
              '最后一套经过审计的账目',
              '本财年的财务预测',
              '公司章程',
            ],
            status: 'not-started',
            files: [],
            content: '',
            documentReference: '',
            comments: '',
          },
          {
            id: 'oc1-3',
            description: '国内/国际销售证据和客户数据',
            evidenceGuide: [
              '公司运营国家的客户数量',
              '分销渠道排名',
              '销售实现时间（线上、实体零售、第三方分销商等）',
            ],
            status: 'not-started',
            files: [],
            content: '',
            documentReference: '',
            comments: '',
          },
          {
            id: 'oc1-4',
            description: '雇佣合同和薪资历史',
            evidenceGuide: [
              '包含薪资信息的雇佣合同',
              '任何奖金和股权期权',
              '收入历史',
            ],
            status: 'not-started',
            files: [],
            content: '',
            documentReference: '',
            comments: '',
          },
          {
            id: 'oc1-5',
            description: '展示技术贡献的专利',
            evidenceGuide: [
              '专利应包含 Google Patents 上可验证的 ID',
              '展示在新领域重大技术贡献的专利',
            ],
            status: 'not-started',
            files: [],
            content: '',
            documentReference: '',
            comments: '',
          },
        ],
        overallStatus: 'not-started',
        completionPercentage: 0,
      },
      {
        id: 'oc2',
        type: 'OC2',
        title: '可选要求 2: 工作外的认可',
        description: '展示超出日常工作范围对领域进步的贡献',
        requirementLevel: 'Optional',
        criteriaList: [
          {
            id: 'oc2-1',
            description: '开源项目贡献',
            evidenceGuide: [
              '对开源项目的贡献证据',
              '持续和进行中的贡献记录',
            ],
            status: 'not-started',
            files: [],
            content: '',
            documentReference: '',
            comments: '',
          },
          {
            id: 'oc2-2',
            description: 'GitHub 账户展示活跃参与',
            evidenceGuide: [
              'GitHub 个人资料链接',
              '协作项目中的活跃参与',
            ],
            status: 'not-started',
            files: [],
            content: '',
            documentReference: '',
            comments: '',
          },
          {
            id: 'oc2-3',
            description: 'Stack Overflow 贡献',
            evidenceGuide: [
              'Stack Overflow 个人资料链接',
              '代码讨论中的重要贡献',
            ],
            status: 'not-started',
            files: [],
            content: '',
            documentReference: '',
            comments: '',
          },
          {
            id: 'oc2-4',
            description: '在行业顶级会议上发表演讲',
            evidenceGuide: [
              '会议应广泛认为是行业领先活动',
              '至少 100 名参与者（非注册人数）',
              '在主舞台上发表演讲',
              '发言邀请不能由你的机构作为赞助的一部分支付',
              '演讲视频链接、活动日程或会议组织者推荐信',
            ],
            status: 'not-started',
            files: [],
            content: '',
            documentReference: '',
            comments: '',
          },
          {
            id: 'oc2-5',
            description: '思想领导力文章或新闻报道',
            evidenceGuide: [
              '专业或主要贸易刊物的文章',
              '主流媒体报道',
              '示范思想领导力的专栏文章',
            ],
            status: 'not-started',
            files: [],
            content: '',
            documentReference: '',
            comments: '',
          },
          {
            id: 'oc2-6',
            description: '结构化项目中的导师记录',
            evidenceGuide: [
              '组织外的导师活动',
              '结构化项目（有选择标准）',
              '包括非营利慈善机构和社会导师项目',
              '持续的导师记录和个人贡献的认可',
              '一级加速器中的高级导师',
              '项目的推荐信',
            ],
            status: 'not-started',
            files: [],
            content: '',
            documentReference: '',
            comments: '',
          },
        ],
        overallStatus: 'not-started',
        completionPercentage: 0,
      },
      {
        id: 'oc3',
        type: 'OC3',
        title: '可选要求 3: 重大技术贡献',
        description: '展示重大技术、商业或创业贡献',
        requirementLevel: 'Optional',
        criteriaList: [
          {
            id: 'oc3-1',
            description: '领导高影响力产品开发',
            evidenceGuide: [
              '高影响力数字产品或服务的开发',
            ],
            status: 'not-started',
            files: [],
            content: '',
            documentReference: '',
            comments: '',
          },
          {
            id: 'oc3-2',
            description: '启动/贡献开源项目',
            evidenceGuide: [
              '被同行认可为推动领域发展的方式',
            ],
            status: 'not-started',
            files: [],
            content: '',
            documentReference: '',
            comments: '',
          },
          {
            id: 'oc3-3',
            description: '初创公司核心工程师',
            evidenceGuide: [
              '作为初创公司核心产品的关键工程师',
              '对其成功的贡献证据',
            ],
            status: 'not-started',
            files: [],
            content: '',
            documentReference: '',
            comments: '',
          },
          {
            id: 'oc3-4',
            description: 'GitHub 代码贡献',
            evidenceGuide: [
              '包含代码行的 GitHub 账户',
              '清晰展示持续贡献',
            ],
            status: 'not-started',
            files: [],
            content: '',
            documentReference: '',
            comments: '',
          },
          {
            id: 'oc3-5',
            description: '产品设计/架构文档',
            evidenceGuide: [
              '清晰展示你的贡献',
              '不超过三页 A4',
              '展示个人工作，而非公司或团队工作',
            ],
            status: 'not-started',
            files: [],
            content: '',
            documentReference: '',
            comments: '',
          },
          {
            id: 'oc3-6',
            description: '雇主推荐信',
            evidenceGuide: [
              '说明商业贡献',
              '由另一位个人撰写',
              '销售渠道、增长生成、流程开发的证据',
            ],
            status: 'not-started',
            files: [],
            content: '',
            documentReference: '',
            comments: '',
          },
        ],
        overallStatus: 'not-started',
        completionPercentage: 0,
      },
      {
        id: 'oc4',
        type: 'OC4',
        title: '可选要求 4: 学术研究中的杰出能力',
        description: '通过学术研究贡献证明杰出的学术能力',
        requirementLevel: 'Optional',
        criteriaList: [
          {
            id: 'oc4-1',
            description: '在同行评审会议上发表演讲或获得竞争性同行评审研究经费',
            evidenceGuide: [
              '在同行评审会议上的演讲证明',
              '竞争性同行评审研究经费的证明',
            ],
            status: 'not-started',
            files: [],
            content: '',
            documentReference: '',
            comments: '',
          },
          {
            id: 'oc4-2',
            description: '因杰出应用工作获得奖项，并具有优异的学术成绩',
            evidenceGuide: [
              '杰出应用工作的奖项证明',
              '一级学位或荣誉学位',
              '出色的学术成就证明',
            ],
            status: 'not-started',
            files: [],
            content: '',
            documentReference: '',
            comments: '',
          },
          {
            id: 'oc4-3',
            description: '来自研究主管或学术专家的支持信',
            evidenceGuide: [
              '来自研究主管的推荐信',
              '来自学术领域专家的推荐信',
              '确认世界顶级水平潜力的信件',
              '必须由另一个个人撰写',
              '在所需推荐信之外的额外信件',
            ],
            status: 'not-started',
            files: [],
            content: '',
            documentReference: '',
            comments: '',
          },
          {
            id: 'oc4-4',
            description: '来自具有皇家学会地位的组织的基于功绩的奖项',
            evidenceGuide: [
              '来自知名学术组织的奖项',
              '与英国皇家学会相当的组织',
              '奖项的选择标准文件',
              '证明奖项的声望和认可',
            ],
            status: 'not-started',
            files: [],
            content: '',
            documentReference: '',
            comments: '',
          },
        ],
        overallStatus: 'not-started',
        completionPercentage: 0,
      },
    ]
  }

  const updateCriteria = (groupId: string, criteriaId: string, updates: Partial<CriteriaEvidence>) => {
    setCriteriaGroups(
      criteriaGroups.map((group) => {
        if (group.id === groupId) {
          return {
            ...group,
            criteriaList: group.criteriaList.map((criteria) =>
              criteria.id === criteriaId ? { ...criteria, ...updates } : criteria
            ),
          }
        }
        return group
      })
    )
  }

  const addFile = (groupId: string, criteriaId: string, fileName: string) => {
    const newFile: EvidenceFile = {
      id: `file-${Date.now()}`,
      name: fileName,
      size: Math.floor(Math.random() * 5000000),
      uploadedAt: new Date().toLocaleDateString('zh-CN'),
    }
    
    const criteria = criteriaGroups
      .find(g => g.id === groupId)
      ?.criteriaList.find(c => c.id === criteriaId)
    
    if (criteria) {
      updateCriteria(groupId, criteriaId, {
        files: [...criteria.files, newFile],
      })
    }
  }

  const removeFile = (groupId: string, criteriaId: string, fileId: string) => {
    const criteria = criteriaGroups
      .find(g => g.id === groupId)
      ?.criteriaList.find(c => c.id === criteriaId)
    
    if (criteria) {
      updateCriteria(groupId, criteriaId, {
        files: criteria.files.filter(f => f.id !== fileId),
      })
    }
  }

  // 从sessionStorage加载简历数据并自动填充（仅在组件挂载时执行一次）
  useEffect(() => {
    let isMounted = true
    let hasAnalyzed = false
    
    const autoFillFromResume = async () => {
      if (hasAnalyzed) return
      hasAnalyzed = true

      try {
        const fullStoredData = sessionStorage.getItem('fullAssessmentData')
        const storedData = sessionStorage.getItem('assessmentData')
        const dataToUse = fullStoredData || storedData
        
        if (!dataToUse || !isMounted) return

        const parsedData = JSON.parse(dataToUse)
        const gtvAnalysis = parsedData.gtvAnalysis || parsedData
        
        console.log('📥 开始从简历数据自动填充深度评估...')
        
        // 自动填充申请人信息
        if (isMounted) {
          setApplicantInfo({
            name: gtvAnalysis.applicantInfo?.name || '',
            email: gtvAnalysis.applicantInfo?.name ? `${gtvAnalysis.applicantInfo.name}@example.com` : '',
            field: 'digital-technology',
            currentRole: gtvAnalysis.applicantInfo?.currentPosition || '',
            yearsExperience: gtvAnalysis.applicantInfo?.yearsOfExperience || '',
          })
          
          setHasResumeData(true)
          setIsAutoFilling(true)
        }
        
        // 获取初始的criteriaGroups
        const initialGroups = initializeCriteriaGroups()
        
        // 使用初始的criteriaGroups填充
        const enrichedGroups = initialGroups.map(group => ({
          ...group,
          criteriaList: group.criteriaList.map(criteria => ({
            ...criteria,
            content: `基于简历分析:\n${gtvAnalysis.workExperience?.keyAchievements?.join(', ') || ''}`,
            status: 'in-progress' as const,
          })),
        }))
        
        if (isMounted) {
          setCriteriaGroups(enrichedGroups)
          console.log('✅ 已填充评估项，开始 LLM 分析...')
          
          // 运行自动分析
          await runAutoAnalysis(gtvAnalysis, enrichedGroups)
        }
      } catch (error) {
        console.error('❌ 自动填充失败:', error)
        if (isMounted) {
          setIsAutoFilling(false)
        }
      }
    }
    
    // 立即执行
    autoFillFromResume()

    return () => {
      isMounted = false
    }
  }, [])

  const runAutoAnalysis = async (resumeData: any, groups: CriteriaGroup[]) => {
    setIsAutoAnalyzing(true)
    try {
      const analysisResults: any = {
        overallScore: 0,
        groupAnalyses: {} as Record<string, any>,
        completionByGroup: {} as Record<string, number>,
      }

      let totalScore = 0
      let groupCount = 0

      // 为每个标准组调用详细分析API
      const updatedGroups = await Promise.all(
        groups.map(async (group) => {
          try {
            console.log(`🔍 分析标准组: ${group.type}`)
            const response = await fetch('/api/assessment/deep-analysis', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                resumeData,
                criteriaGroup: {
                  id: group.id,
                  type: group.type,
                  title: group.title,
                  description: group.description,
                  criteriaList: group.criteriaList,
                },
              }),
            })

            if (!response.ok) {
              throw new Error(`分析失败: ${response.status}`)
            }

            const result = await response.json()
            console.log(`✅ ${group.type} 分析完成, 得分: ${result.overallScore}`)

            // 保存分析结果
            analysisResults.groupAnalyses[group.id] = result
            analysisResults.completionByGroup[group.id] = result.completionPercentage
            totalScore += result.overallScore
            groupCount += 1

            // 更新评估组中的个别标准
            return {
              ...group,
              completionPercentage: result.completionPercentage,
              overallStatus: result.status === 'matched' ? 'completed' : 'in-progress',
              criteriaList: group.criteriaList.map((criteria) => {
                const criteriaResult = result.criteriResults.find(
                  (r: any) => r.criteriaId === criteria.id
                )
                return {
                  ...criteria,
                  content: criteriaResult?.analysis || `基于简历分析:\n${resumeData.workExperience?.keyAchievements?.join(', ') || ''}`,
                  status: criteriaResult?.matched ? 'completed' : 'in-progress',
                  comments: criteriaResult?.recommendations?.join('\n') || '',
                  documentReference: criteriaResult?.recommendations?.[0] || '',
                }
              }),
            }
          } catch (error) {
            console.error(`❌ ${group.type} 分析失败:`, error)
            return group
          }
        })
      )

      // 计算总体得分
      analysisResults.overallScore = groupCount > 0 ? Math.round(totalScore / groupCount) : 0

      setAutoAnalysisResults(analysisResults)
      setCriteriaGroups(updatedGroups)
    } catch (error) {
      console.error('❌ 自动分析失败:', error)
    } finally {
      setIsAutoAnalyzing(false)
    }
  }

  const getCriteriaGroup = (groupId: string) => criteriaGroups.find((g) => g.id === groupId)
  const calculateProgress = (groupId: string) => {
    const group = getCriteriaGroup(groupId)
    if (!group) return 0
    const completed = group.criteriaList.filter((c) => c.status === 'completed' || c.status === 'submitted').length
    return (completed / group.criteriaList.length) * 100
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900">🎯 GTV 深度资格评估</h1>
          <p className="mt-2 text-lg text-slate-600">基于 Excel 审核清单 - 包含完整证据指南和文档管理</p>
        </div>

        {/* 自动填充提示 */}
        {hasResumeData && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {isAutoAnalyzing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在基于您的简历数据进行自动分析...
                </span>
              ) : (
                '✅ 已自动加载您的简历数据并完成初步分析。所有评估项已使用简历内容预填充。'
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* 自动分析结果 */}
        {autoAnalysisResults && (
          <div className="mb-6 space-y-4">
            {/* 总体得分卡 */}
            <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <TrendingUp className="h-5 w-5" />
                  自动分析结果 - 综合评分
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-600">
                      {autoAnalysisResults.overallScore || 0}
                    </div>
                    <p className="text-sm text-blue-600">总体得分 / 100</p>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(autoAnalysisResults.completionByGroup || {}).map(([groupId, completion]: any) => {
                      const group = criteriaGroups.find((g) => g.id === groupId)
                      return (
                        <div key={groupId} className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700">
                            {group?.type || groupId}: 完成度
                          </span>
                          <div className="flex items-center gap-2">
                            <Progress value={completion} className="w-32" />
                            <span className="text-gray-600">{completion}%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 各标准组详细分析 */}
            {Object.entries(autoAnalysisResults.groupAnalyses || {}).map(([groupId, analysis]: any) => (
              <Card key={groupId} className="border-purple-200 bg-purple-50">
                <CardHeader>
                  <CardTitle className="text-purple-900">
                    {analysis.groupType} - {analysis.groupTitle}
                    <Badge className="ml-2" variant="outline">
                      得分: {analysis.overallScore}/100
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-purple-800">
                    {analysis.groupAnalysis}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 材料建议 */}
                  {analysis.materialSuggestions && analysis.materialSuggestions.length > 0 && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="font-semibold text-yellow-900 mb-2">📋 建议补充的材料:</p>
                      <ul className="space-y-1 text-sm text-yellow-800">
                        {analysis.materialSuggestions.map((suggestion: string, idx: number) => (
                          <li key={idx} className="flex gap-2">
                            <span className="text-yellow-600 font-bold">•</span>
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 各个评估项的结果 */}
                  <div className="space-y-3">
                    {analysis.criteriResults.map((result: any, idx: number) => (
                      <div
                        key={result.criteriaId}
                        className="p-3 bg-white border border-purple-200 rounded-lg"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {idx + 1}. {result.criteriaDescription}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {result.matched ? (
                              <Badge className="bg-green-100 text-green-800">✓ 符合</Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-800">✗ 不符合</Badge>
                            )}
                            <span className="font-bold text-purple-600">{result.score}分</span>
                          </div>
                        </div>
                        
                        {result.analysis && (
                          <p className="text-sm text-gray-700 mb-2">{result.analysis}</p>
                        )}

                        {result.evidence && result.evidence.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs font-semibold text-gray-600 mb-1">找到的证据:</p>
                            <ul className="text-xs text-gray-600 space-y-1">
                              {result.evidence.map((ev: string, i: number) => (
                                <li key={i} className="flex gap-2">
                                  <span className="text-green-600">✓</span>
                                  <span>{ev}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {result.recommendations && result.recommendations.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-600 mb-1">改进建议:</p>
                            <ul className="text-xs text-gray-600 space-y-1">
                              {result.recommendations.map((rec: string, i: number) => (
                                <li key={i} className="flex gap-2">
                                  <span className="text-orange-600">→</span>
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 申请人信息卡 */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              申请人基本信息
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">姓名 *</label>
                <Input
                  value={applicantInfo.name}
                  onChange={(e) => setApplicantInfo({ ...applicantInfo, name: e.target.value })}
                  placeholder="输入申请人姓名"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">邮箱 *</label>
                <Input
                  value={applicantInfo.email}
                  onChange={(e) => setApplicantInfo({ ...applicantInfo, email: e.target.value })}
                  placeholder="输入邮箱"
                  type="email"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">当前职位</label>
                <Input
                  value={applicantInfo.currentRole}
                  onChange={(e) => setApplicantInfo({ ...applicantInfo, currentRole: e.target.value })}
                  placeholder="输入职位"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">工作经验（年）</label>
                <Input
                  value={applicantInfo.yearsExperience}
                  onChange={(e) => setApplicantInfo({ ...applicantInfo, yearsExperience: e.target.value })}
                  placeholder="输入年数"
                  type="number"
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 评估进度总览 */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {criteriaGroups.map((group) => (
            <Card key={group.id} className="border-0 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{group.type}</h3>
                  <Badge className={group.requirementLevel === 'Mandatory' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}>
                    {group.requirementLevel === 'Mandatory' ? '必填' : '可选'}
                  </Badge>
                </div>
                <Progress value={calculateProgress(group.id)} className="mb-2" />
                <p className="text-sm text-gray-600">{calculateProgress(group.id).toFixed(0)}% 完成</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 详细评估 */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>详细评估与文档管理</CardTitle>
            <CardDescription>每个评估项目都支持文件上传和内容输入</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="mc">强制(MC)</TabsTrigger>
                <TabsTrigger value="oc1">创新(OC1)</TabsTrigger>
                <TabsTrigger value="oc2">认可(OC2)</TabsTrigger>
                <TabsTrigger value="oc3">技术(OC3)</TabsTrigger>
                <TabsTrigger value="oc4">学术(OC4)</TabsTrigger>
              </TabsList>

              {criteriaGroups.map((group) => (
                <TabsContent key={group.id} value={group.id} className="space-y-6 mt-6">
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-900 mb-2">{group.title}</h3>
                    <p className="text-sm text-blue-800">{group.description}</p>
                  </div>

                  <div className="space-y-6">
                    {group.criteriaList.map((criteria, index) => (
                      <div key={criteria.id} className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition">
                        {/* 标准标题 */}
                        <div className="mb-4">
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">
                            {index + 1}. {criteria.description}
                          </h4>
                          <Badge
                            variant="outline"
                            className={
                              criteria.status === 'completed' || criteria.status === 'submitted'
                                ? 'bg-green-50 text-green-800 border-green-200'
                                : 'bg-gray-50'
                            }
                          >
                            {criteria.status === 'not-started' && '未开始'}
                            {criteria.status === 'in-progress' && '进行中'}
                            {criteria.status === 'completed' && '已完成'}
                            {criteria.status === 'submitted' && '已提交'}
                          </Badge>
                        </div>

                        {/* 证据指南 */}
                        {criteria.evidenceGuide.length > 0 && (
                          <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                            <h5 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                              <Briefcase className="h-4 w-4" />
                              证据指南（需要提供的材料）
                            </h5>
                            <ul className="space-y-2">
                              {criteria.evidenceGuide.map((guide, i) => (
                                <li key={i} className="flex gap-3 text-sm text-amber-900">
                                  <span className="flex-shrink-0 text-amber-600 font-bold">•</span>
                                  <span>{guide}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* 状态选择 */}
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-gray-700 mb-2">评估状态</label>
                          <div className="flex flex-wrap gap-2">
                            {(['not-started', 'in-progress', 'completed', 'submitted'] as const).map((status) => (
                              <Button
                                key={status}
                                variant={criteria.status === status ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => updateCriteria(group.id, criteria.id, { status })}
                              >
                                {status === 'not-started' && '未开始'}
                                {status === 'in-progress' && '进行中'}
                                {status === 'completed' && '完成'}
                                {status === 'submitted' && '提交'}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* 文件上传 */}
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Upload className="h-4 w-4 inline mr-1" />
                            上传支持文档
                          </label>
                          <div className="mb-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => addFile(group.id, criteria.id, `document_${Date.now()}.pdf`)}
                            >
                              <Plus className="h-4 w-4" />
                              添加文件
                            </Button>
                          </div>

                          {criteria.files.length > 0 && (
                            <div className="space-y-2">
                              {criteria.files.map((file) => (
                                <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                  <div className="flex items-center gap-3">
                                    <File className="h-4 w-4 text-gray-500" />
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                      <p className="text-xs text-gray-500">上传于 {file.uploadedAt}</p>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFile(group.id, criteria.id, file.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* 内容输入 */}
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-gray-700 mb-2">相关内容/说明</label>
                          <Textarea
                            value={criteria.content}
                            onChange={(e) => updateCriteria(group.id, criteria.id, { content: e.target.value })}
                            placeholder="输入任何相关内容或详细说明..."
                            rows={3}
                          />
                        </div>

                        {/* 文档参考 */}
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-gray-700 mb-2">文档参考编号</label>
                          <Input
                            value={criteria.documentReference}
                            onChange={(e) => updateCriteria(group.id, criteria.id, { documentReference: e.target.value })}
                            placeholder="例如: DOC-001-CV, CERT-2025-01"
                          />
                        </div>

                        {/* 备注 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">额外备注</label>
                          <Textarea
                            value={criteria.comments}
                            onChange={(e) => updateCriteria(group.id, criteria.id, { comments: e.target.value })}
                            placeholder="输入任何补充说明或注意事项..."
                            rows={2}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* 底部操作按钮 */}
        <div className="mt-8 flex gap-3 justify-end">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            导出评估
          </Button>
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Save className="h-4 w-4" />
            保存草稿
          </Button>
          <Button className="gap-2 bg-green-600 hover:bg-green-700">
            <FileText className="h-4 w-4" />
            提交评估
          </Button>
        </div>
      </div>
    </div>
  )
}

export default DeepAssessmentPage
