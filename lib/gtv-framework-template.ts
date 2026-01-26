/**
 * GTV 递交框架模板
 * 基于 Tech Nation 的 Global Talent Visa 评估标准
 */

export interface GTVFrameworkNode {
  id: string
  label: string
  type: 'root' | 'category' | 'criteria' | 'evidence' | 'file' | 'info'
  status?: 'success' | 'warning' | 'error' | 'pending'
  details?: string
  children?: GTVFrameworkNode[]
  evidenceFiles?: string[]
  requirements?: string
  tips?: string
}

// GTV 递交框架标准模板
export const GTV_FRAMEWORK_TEMPLATE: GTVFrameworkNode = {
  id: 'root',
  label: 'GTV申请框架',
  type: 'root',
  children: [
    {
      id: 'domain-positioning',
      label: '领域定位',
      type: 'category',
      children: [
        {
          id: 'assessment-body',
          label: '评估机构',
          type: 'criteria',
          details: 'Tech Nation',
          tips: '数字科技领域由 Tech Nation 评估'
        },
        {
          id: 'sub-field',
          label: '细分领域',
          type: 'criteria',
          details: '待填写',
          tips: '如：AI/ML, Fintech, Cybersecurity, Hardware & Devices, Gaming, E-commerce 等'
        },
        {
          id: 'position-type',
          label: '岗位定位',
          type: 'criteria',
          details: '待填写',
          tips: '如：Business Development, Technical Leadership, Product Management 等'
        },
        {
          id: 'core-thesis',
          label: '核心论点',
          type: 'criteria',
          details: '待填写',
          tips: '向背书机构论证的核心要点'
        }
      ]
    },
    {
      id: 'mc-criteria',
      label: 'MC必选标准 (Mandatory Criteria)',
      type: 'category',
      requirements: '需要满足至少2项MC标准',
      children: [
        {
          id: 'mc1',
          label: 'MC1: 产品/团队领导力',
          type: 'criteria',
          details: 'You led the growth of a product-led digital technology company, product or team',
          requirements: '需要领先行业专家的推荐信或新闻报道、代码仓库等证据',
          children: [
            {
              id: 'mc1-evidence-1',
              label: '产品描述文档',
              type: 'evidence',
              details: '介绍产品在数字科技方面的技术革新'
            },
            {
              id: 'mc1-evidence-2', 
              label: '行业专家推荐信',
              type: 'evidence',
              details: '证明申请人的行业专业性和产品先进性'
            }
          ]
        },
        {
          id: 'mc2',
          label: 'MC2: 营销/业务开发领导力',
          type: 'criteria',
          details: 'You led the marketing or business development at a product-led digital technology company',
          requirements: '需要证明实现了可观的收入/客户增长或重大商业成功',
          children: [
            {
              id: 'mc2-evidence-1',
              label: '销售合同/授权委托书',
              type: 'evidence',
              details: '证明商业成功的销售文件'
            },
            {
              id: 'mc2-evidence-2',
              label: '投资协议',
              type: 'evidence',
              details: '体现投资数字科技企业的经历'
            }
          ]
        },
        {
          id: 'mc3',
          label: 'MC3: 非营利组织/社会企业',
          type: 'criteria',
          details: 'You led the growth of a non-profit organisation or social enterprise with digital technology focus',
          requirements: '需要推荐信或新闻报道证明',
          children: [
            {
              id: 'mc3-evidence-1',
              label: '创业导师聘书',
              type: 'evidence',
              details: '证明在科技创业领域的贡献'
            }
          ]
        },
        {
          id: 'mc4',
          label: 'MC4: 专家评审角色',
          type: 'criteria',
          details: 'You have held a significant expert role assessing the work of others in digital technology',
          requirements: '需要证明参与过重要的行业评审工作'
        }
      ]
    },
    {
      id: 'oc-criteria',
      label: 'OC可选标准 (Optional Criteria)',
      type: 'category',
      requirements: '需要满足至少2项OC标准',
      children: [
        {
          id: 'oc1',
          label: 'OC1: 创新 (Innovation)',
          type: 'criteria',
          details: 'Evidence of innovation/product development, proof of product in market and traction through revenue',
          children: [
            {
              id: 'oc1-evidence-1',
              label: '供应商资质/采购合同',
              type: 'evidence',
              details: '成为知名企业供应商的证明'
            },
            {
              id: 'oc1-evidence-2',
              label: '专利报告',
              type: 'evidence',
              details: '产品相关的专利和技术描述'
            },
            {
              id: 'oc1-evidence-3',
              label: '财务报表',
              type: 'evidence',
              details: '审计账目，包含利润亏损表和资产负债表'
            }
          ]
        },
        {
          id: 'oc2',
          label: 'OC2: 学术贡献 (Academic Contributions)',
          type: 'criteria',
          details: 'Proof of recognition for work outside of your immediate occupation that contributed to the digital technology sector',
          children: [
            {
              id: 'oc2-evidence-1',
              label: '学术论文/专利',
              type: 'evidence'
            },
            {
              id: 'oc2-evidence-2',
              label: '行业演讲/培训',
              type: 'evidence'
            }
          ]
        },
        {
          id: 'oc3',
          label: 'OC3: 重大贡献 (Significant Impact)',
          type: 'criteria',
          details: 'Having led or played a key role in the growth of a product-led digital technology company',
          children: [
            {
              id: 'oc3-evidence-1',
              label: '投资决策文件',
              type: 'evidence',
              details: '投委会议事规则、成员名单、投资决策表'
            },
            {
              id: 'oc3-evidence-2',
              label: '商业成功证明',
              type: 'evidence',
              details: '销售渠道、增长数据、投资协议'
            }
          ]
        },
        {
          id: 'oc4',
          label: 'OC4: 行业领袖 (Thought Leader)',
          type: 'criteria',
          details: 'Proof that you are a thought leader or figurehead in the digital technology sector',
          children: [
            {
              id: 'oc4-evidence-1',
              label: '行业奖项/荣誉',
              type: 'evidence'
            },
            {
              id: 'oc4-evidence-2',
              label: '媒体报道',
              type: 'evidence'
            }
          ]
        }
      ]
    },
    {
      id: 'reference-letters',
      label: '推荐信 (3封)',
      type: 'category',
      requirements: '需要3封来自不同推荐人的推荐信',
      children: [
        {
          id: 'reference-1',
          label: '推荐人1',
          type: 'criteria',
          children: [
            {
              id: 'ref1-letter',
              label: '推荐信文件',
              type: 'evidence'
            }
          ]
        },
        {
          id: 'reference-2',
          label: '推荐人2',
          type: 'criteria',
          children: [
            {
              id: 'ref2-letter',
              label: '推荐信文件',
              type: 'evidence'
            }
          ]
        },
        {
          id: 'reference-3',
          label: '推荐人3',
          type: 'criteria',
          children: [
            {
              id: 'ref3-letter',
              label: '推荐信文件',
              type: 'evidence'
            }
          ]
        }
      ]
    },
    {
      id: 'personal-statement',
      label: '个人陈述',
      type: 'category',
      children: [
        {
          id: 'ps-doc',
          label: '个人陈述文档',
          type: 'evidence',
          details: '阐述专业背景、成就和未来计划'
        }
      ]
    },
    {
      id: 'cv',
      label: '简历/CV',
      type: 'category',
      children: [
        {
          id: 'cv-doc',
          label: 'CV文档',
          type: 'evidence'
        }
      ]
    }
  ]
}

// 生成带有客户数据的框架
export function generateClientFramework(
  clientName: string,
  analysisData?: any
): GTVFrameworkNode {
  const framework = JSON.parse(JSON.stringify(GTV_FRAMEWORK_TEMPLATE))
  framework.label = `${clientName} - GTV申请框架`
  
  // 如果有分析数据，更新框架状态
  if (analysisData) {
    updateFrameworkWithAnalysis(framework, analysisData)
  }
  
  return framework
}

// 根据分析数据更新框架状态
function updateFrameworkWithAnalysis(node: GTVFrameworkNode, analysisData: any) {
  // 根据分析结果更新每个节点的状态
  if (analysisData.evidenceMapping) {
    updateNodeStatus(node, analysisData.evidenceMapping)
  }
}

function updateNodeStatus(node: GTVFrameworkNode, evidenceMapping: Record<string, string[]>) {
  if (evidenceMapping[node.id]) {
    node.status = 'success'
    node.evidenceFiles = evidenceMapping[node.id]
  }
  
  if (node.children) {
    for (const child of node.children) {
      updateNodeStatus(child, evidenceMapping)
    }
    
    // 根据子节点状态更新父节点状态
    const childStatuses = node.children.map(c => c.status)
    if (childStatuses.every(s => s === 'success')) {
      node.status = 'success'
    } else if (childStatuses.some(s => s === 'success')) {
      node.status = 'warning'
    } else if (node.children.length > 0 && !node.status) {
      node.status = 'pending'
    }
  }
}

// 计算框架完成度
export function calculateFrameworkCompletion(framework: GTVFrameworkNode): {
  total: number
  completed: number
  percentage: number
  mcCompleted: number
  ocCompleted: number
  refCompleted: number
} {
  let total = 0
  let completed = 0
  let mcCompleted = 0
  let ocCompleted = 0
  let refCompleted = 0
  
  function countNodes(node: GTVFrameworkNode, parentId?: string) {
    if (node.type === 'evidence') {
      total++
      if (node.status === 'success') {
        completed++
        if (parentId?.startsWith('mc')) mcCompleted++
        if (parentId?.startsWith('oc')) ocCompleted++
        if (parentId?.startsWith('ref')) refCompleted++
      }
    }
    
    if (node.children) {
      for (const child of node.children) {
        countNodes(child, node.id)
      }
    }
  }
  
  countNodes(framework)
  
  return {
    total,
    completed,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    mcCompleted,
    ocCompleted,
    refCompleted
  }
}
