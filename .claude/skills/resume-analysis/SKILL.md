---
name: resume-analysis
description: 分析简历内容，提取候选人的教育背景、工作经验、技能和成就等信息，用于GTV签证评估
---

# 简历分析技能 (Resume Analysis Skill)

## 功能描述

此技能用于分析候选人的简历，提取关键信息以支持GTV签证评估。它能够：

- 提取教育背景（学历、学校、专业）
- 提取工作经验（职位、公司、工作年限、职责）
- 提取技能和专长（技术栈、专业能力）
- 提取成就和荣誉（奖项、专利、论文、项目）
- 识别与GTV签证相关的关键信息

## 使用方法

### 基本用法

```python
# 在Claude Agent中使用此技能
# 技能会自动识别需要分析简历的请求并调用相应的处理逻辑
```

### 输入参数

- `resume_text`: 简历文本内容（必需）
- `candidate_info`: 候选人基本信息（可选）
  - `name`: 姓名
  - `email`: 邮箱
  - `field`: 申请领域（如：digital-technology）

### 输出格式

```json
{
  "name": "候选人姓名",
  "field": "申请领域",
  "education": {
    "degree": "学位",
    "university": "学校",
    "major": "专业",
    "graduation_year": "毕业年份"
  },
  "experience": [
    {
      "position": "职位",
      "company": "公司",
      "duration": "工作年限",
      "responsibilities": ["职责1", "职责2"]
    }
  ],
  "skills": ["技能1", "技能2"],
  "achievements": [
    {
      "type": "奖项/专利/论文",
      "description": "描述"
    }
  ]
}
```

## 集成说明

此技能与以下模块集成：

- `ace_gtv/resume_processor.py`: 简历处理主模块
- `ace_gtv/document_analyzer.py`: 文档分析模块
- `ace_gtv/assessment_database.py`: 评估数据库

## 相关文件

- `ace_gtv/resume_processor.py`: 简历处理实现
- `ace_gtv/document_analyzer.py`: 文档提取和分析

## 注意事项

- 支持多种简历格式：TXT、PDF、DOC、DOCX
- 使用LLM进行智能提取，确保信息准确性
- 提取的信息将用于后续的GTV资格评估

