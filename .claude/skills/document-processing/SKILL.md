---
name: document-processing
description: 处理和分析GTV签证申请相关的文档，包括简历、推荐信、证书等，提取关键信息用于评估
---

# 文档处理技能 (Document Processing Skill)

## 功能描述

此技能用于处理和分析GTV签证申请相关的各种文档格式，包括：

- **简历处理**: 提取教育、工作、技能等信息
- **推荐信处理**: 提取推荐者信息、推荐内容
- **证书处理**: 提取证书类型、颁发机构、时间
- **专利/论文处理**: 提取专利号、论文标题、发表信息
- **项目文档处理**: 提取项目描述、技术栈、成果

### 支持的文档格式

- **文本文件**: TXT, MD
- **PDF文件**: PDF（使用pdfminer提取）
- **Word文档**: DOC, DOCX（使用python-docx提取）
- **Excel文件**: XLSX（使用openpyxl提取）

## 使用方法

### 基本用法

```python
# 在Claude Agent中使用此技能
# 技能会自动识别需要处理文档的请求并调用相应的处理逻辑
```

### 输入参数

- `document_path`: 文档路径（必需）
- `document_type`: 文档类型（可选，自动识别）
  - `resume`: 简历
  - `recommendation_letter`: 推荐信
  - `certificate`: 证书
  - `patent`: 专利
  - `paper`: 论文
  - `project_document`: 项目文档
- `extraction_focus`: 提取重点（可选）
  - `education`: 教育背景
  - `experience`: 工作经验
  - `skills`: 技能
  - `achievements`: 成就

### 输出格式

```json
{
  "document_info": {
    "file_path": "文档路径",
    "file_type": "PDF",
    "file_size": 1024000,
    "page_count": 5,
    "extraction_method": "pdfminer"
  },
  "extracted_content": {
    "raw_text": "原始文本内容",
    "structured_data": {
      "education": [
        {
          "degree": "学士学位",
          "university": "大学名称",
          "major": "专业",
          "graduation_year": "2020"
        }
      ],
      "experience": [
        {
          "position": "职位",
          "company": "公司",
          "start_date": "2020-01",
          "end_date": "2023-12",
          "responsibilities": ["职责1", "职责2"]
        }
      ],
      "skills": ["技能1", "技能2"],
      "achievements": [
        {
          "type": "奖项",
          "title": "奖项名称",
          "date": "2022-01",
          "description": "描述"
        }
      ]
    }
  },
  "knowledge_extraction": {
    "rules_extracted": [
      {
        "title": "知识条目标题",
        "category": "评估标准",
        "dimension": "education",
        "content": "详细内容",
        "scoringRules": ["规则1", "规则2"]
      }
    ]
  },
  "processing_metadata": {
    "processing_time": 2.5,
    "confidence": 0.90,
    "warnings": [],
    "errors": []
  }
}
```

## 处理流程

### 1. 文档识别
- 识别文档类型和格式
- 选择合适提取方法
- 验证文档完整性

### 2. 内容提取
- 提取原始文本
- 识别文档结构
- 提取关键信息

### 3. 结构化处理
- 将文本转换为结构化数据
- 使用LLM进行智能提取
- 验证数据完整性

### 4. 知识提炼
- 从文档中提炼评估规则
- 提取评分相关信息
- 生成知识条目

## 集成说明

此技能与以下模块集成：

- `ace_gtv/document_analyzer.py`: 文档分析主模块
- `ace_gtv/resume_processor.py`: 简历处理模块
- `ace_gtv/assessment_database.py`: 评估数据库

## 相关文件

- `ace_gtv/document_analyzer.py`: 文档分析实现
- `ace_gtv/resume_processor.py`: 简历处理实现
- `DOCUMENT_ANALYSIS_README.md`: 文档分析说明文档

## 注意事项

- 支持多种文档格式，但PDF和Word文档需要相应库支持
- 提取准确性取决于文档质量和格式
- 敏感信息处理符合GDPR合规要求
- 建议对提取结果进行人工验证

