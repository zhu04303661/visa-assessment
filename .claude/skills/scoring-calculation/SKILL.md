---
name: scoring-calculation
description: 基于三层评估框架计算GTV签证评分，包括规则基础评分、LLM分析和一致性验证
---

# 评分计算技能 (Scoring Calculation Skill)

## 功能描述

此技能实现了GTV签证评估的三层评分框架：

### Layer 1: 规则基础层
- 基于14条GTV评估规则
- 量化评分矩阵（0-100分）
- 维度权重配置（MC 60% + OC 40%）

### Layer 2: LLM分析层
- **Phase 1**: 理解官方标准（为什么要求这个？）
- **Phase 2**: 分析偏差（申请人vs标准的差距）
- **Phase 3**: 评估证据（证据完整性和可信度）

### Layer 3: 一致性验证层
- 计算评分方差
- 多维度交叉验证
- 识别需要人工审查的案例

## 使用方法

### 基本用法

```python
# 在Claude Agent中使用此技能
# 技能会自动识别需要计算评分的请求并调用相应的计算逻辑
```

### 输入参数

- `candidate_data`: 候选人数据（必需）
  - `education`: 教育背景
  - `experience`: 工作经验
  - `skills`: 技能列表
  - `achievements`: 成就列表
- `field`: 申请领域（必需）
- `evidence_documents`: 证据文档（可选）

### 输出格式

```json
{
  "layer1_rule_score": 75,
  "layer2_llm_analysis": {
    "official_requirement": {
      "level": "推荐标准",
      "description": "官方要求描述",
      "examples": ["示例1", "示例2"],
      "gtv_official_basis": "GTV官方依据",
      "reasoning": "推理过程"
    },
    "deviation_analysis": {
      "gap": 5,
      "type": "meet",
      "distance": "差距描述",
      "industry_context": "行业背景",
      "gtv_rules_alignment": "GTV规则对齐",
      "user_specific_analysis": "用户特定分析",
      "improvement_steps": ["改进步骤1", "改进步骤2"]
    },
    "evidence_assessment": {
      "completeness": 0.85,
      "credibility": 0.90,
      "relevance": 0.88
    }
  },
  "layer3_validation": {
    "score_variance": 2.5,
    "cross_validation_passed": true,
    "needs_manual_review": false
  },
  "final_score": 78,
  "confidence": 0.88,
  "breakdown": {
    "mc_score": 47,
    "oc_score": 31,
    "total": 78
  }
}
```

## 评分维度

### Mandatory Criteria (MC) - 60%权重

- **教育背景** (25%): 学历、学校排名、专业相关性
- **工作经验** (30%): 工作年限、职位级别、公司规模
- **技术专长** (20%): 技能深度、技术栈、专业认证
- **行业影响力** (25%): 项目影响、行业认可、技术贡献

### Optional Criteria (OC) - 40%权重

- **国际认可度** (30%): 国际奖项、国际会议、国际项目
- **创新贡献** (25%): 专利、创新项目、技术突破
- **领导力** (25%): 团队管理、技术领导、行业领导
- **社会影响** (20%): 开源贡献、社区影响、社会价值

## 集成说明

此技能与以下模块集成：

- `ace_gtv/scoring_agent_lite.py`: 评分Agent主模块
- `ace_gtv/scoring_agent_api.py`: 评分API服务
- `ace_gtv/assessment_database.py`: 评估数据库

## 相关文件

- `ace_gtv/scoring_agent_lite.py`: 评分计算实现
- `DETAILED_SCORING_GUIDE.md`: 详细评分指南
- `GTV_SCORING_OPTIMIZATION.md`: 评分优化文档

## 注意事项

- 评分基于Tech Nation官方标准，但最终决定权在UKVI
- 评分结果仅供参考，建议结合专业咨询
- 评分过程可追溯，支持审计和审查

