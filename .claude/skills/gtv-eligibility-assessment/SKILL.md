---
name: gtv-eligibility-assessment
description: 评估候选人是否符合GTV签证要求，包括Exceptional Talent、Exceptional Promise和Startup Visa路径的适用性分析
---

# GTV资格评估技能 (GTV Eligibility Assessment Skill)

## 功能描述

此技能用于评估候选人是否符合英国全球人才签证（GTV）的要求。它基于三层评估框架：

1. **规则基础层**: 基于14条GTV评估规则进行量化评分
2. **LLM分析层**: 分析官方要求、偏差和证据
3. **一致性验证层**: 多维度交叉验证

### 评估维度

- **Mandatory Criteria (MC)**: 强制性标准（权重60%）
  - 教育背景
  - 工作经验
  - 技术专长
  - 行业影响力

- **Optional Criteria (OC)**: 可选标准（权重40%）
  - 国际认可度
  - 创新贡献
  - 领导力
  - 社会影响

### 评估路径

- **Exceptional Talent**: 杰出人才路径（最低分数80分）
- **Exceptional Promise**: 杰出潜力路径（最低分数70分）
- **Startup Visa**: 创业签证路径（最低分数60分）

## 使用方法

### 基本用法

```python
# 在Claude Agent中使用此技能
# 技能会自动识别需要GTV评估的请求并调用相应的评估逻辑
```

### 输入参数

- `extracted_info`: 从简历中提取的信息（必需）
- `field`: 申请领域（必需，如：digital-technology）
- `evidence_documents`: 证据文档列表（可选）

### 输出格式

```json
{
  "field": "申请领域",
  "exceptional_talent_score": 85,
  "exceptional_promise_score": 78,
  "startup_visa_score": 65,
  "recommended_pathway": "exceptional_talent",
  "overall_score": 85,
  "mc_score": 52,
  "oc_score": 33,
  "detailed_analysis": {
    "education": {
      "score": 20,
      "analysis": "教育背景分析"
    },
    "experience": {
      "score": 25,
      "analysis": "工作经验分析"
    },
    "technical": {
      "score": 20,
      "analysis": "技术专长分析"
    },
    "leadership": {
      "score": 15,
      "analysis": "领导力分析"
    }
  },
  "feedback": "详细评估反馈",
  "confidence": 0.85
}
```

## 集成说明

此技能与以下模块集成：

- `ace_gtv/scoring_agent_lite.py`: 评分Agent主模块
- `ace_gtv/langgraph_scoring_agent.py`: LangGraph评分Agent
- `ace_gtv/assessment_database.py`: 评估数据库

## 相关文件

- `ace_gtv/scoring_agent_lite.py`: 评分计算实现
- `ace_gtv/langgraph_scoring_agent.py`: LangGraph评分实现
- `COMPREHENSIVE_ASSESSMENT_ARCHITECTURE.md`: 评估架构文档

## 注意事项

- 评估基于Tech Nation官方标准
- 评分结果仅供参考，最终决定由UKVI做出
- 建议结合证据文档进行综合评估

