---
name: recommendations-generation
description: 基于评估结果生成个性化的改进建议和申请策略，帮助申请人提升GTV签证申请成功率
---

# 建议生成技能 (Recommendations Generation Skill)

## 功能描述

此技能基于GTV签证评估结果，生成个性化的改进建议和申请策略。它能够：

- 分析当前评分和差距
- 识别需要改进的领域
- 提供具体的改进建议
- 制定申请策略和时间表
- 推荐合适的申请路径

## 使用方法

### 基本用法

```python
# 在Claude Agent中使用此技能
# 技能会自动识别需要生成建议的请求并调用相应的生成逻辑
```

### 输入参数

- `assessment_data`: 评估数据（必需）
  - `current_score`: 当前评分
  - `recommended_pathway`: 推荐路径
  - `detailed_analysis`: 详细分析
  - `weaknesses`: 劣势列表
  - `strengths`: 优势列表
- `candidate_info`: 候选人信息（可选）
- `target_pathway`: 目标申请路径（可选）

### 输出格式

```json
{
  "recommendations": [
    {
      "category": "教育背景",
      "priority": "high",
      "current_status": "本科学历，需要提升",
      "recommendation": "建议申请相关领域的硕士学位或专业认证",
      "specific_steps": [
        "研究相关领域的硕士项目",
        "准备申请材料",
        "申请专业认证（如AWS、Google Cloud等）"
      ],
      "expected_impact": "提升教育背景评分5-10分",
      "timeline": "6-12个月"
    },
    {
      "category": "国际认可度",
      "priority": "medium",
      "current_status": "缺乏国际认可",
      "recommendation": "参与国际项目或发表国际论文",
      "specific_steps": [
        "参与开源项目并做出贡献",
        "申请国际会议演讲",
        "发表技术博客或论文"
      ],
      "expected_impact": "提升OC评分8-12分",
      "timeline": "3-6个月"
    }
  ],
  "application_strategy": {
    "recommended_pathway": "exceptional_promise",
    "alternative_pathways": ["exceptional_talent"],
    "timeline": {
      "preparation": "3-6个月",
      "application": "1-2个月",
      "review": "3-6个月"
    },
    "key_focus_areas": [
      "提升教育背景",
      "增强国际认可度",
      "准备推荐信"
    ]
  },
  "improvement_roadmap": {
    "short_term": [
      "准备推荐信",
      "整理证据文档",
      "完善简历"
    ],
    "medium_term": [
      "参与国际项目",
      "获得专业认证",
      "发表技术内容"
    ],
    "long_term": [
      "申请高级学位",
      "建立行业影响力",
      "获得国际认可"
    ]
  },
  "success_probability": {
    "current": 0.65,
    "after_improvements": 0.85,
    "improvement_percentage": 30.8
  }
}
```

## 建议分类

### 高优先级建议
- 直接影响MC评分的改进
- 快速见效的改进措施
- 关键证据文档的准备

### 中优先级建议
- 影响OC评分的改进
- 需要一定时间的改进措施
- 增强申请竞争力的措施

### 低优先级建议
- 长期改进措施
- 锦上添花的改进
- 可选但有益的改进

## 集成说明

此技能与以下模块集成：

- `ace_gtv/scoring_agent_lite.py`: 评分Agent
- `ace_gtv/assessment_database.py`: 评估数据库
- `ace_gtv/pdf_report_generator.py`: PDF报告生成器

## 相关文件

- `ace_gtv/scoring_agent_lite.py`: 评分计算实现
- `DETAILED_SCORING_GUIDE.md`: 详细评分指南
- `GTV_ASSESSMENT_RULES_GUIDE.md`: GTV评估规则指南

## 注意事项

- 建议基于当前评估结果，实际情况可能有所不同
- 建议仅供参考，最终决定应由专业顾问做出
- 改进措施需要时间和努力，建议制定合理的时间表

