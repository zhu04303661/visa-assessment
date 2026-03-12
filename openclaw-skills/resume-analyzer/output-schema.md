# resume_analysis.json 标准 Schema

本文档定义 `resume_analysis.json` 的完整数据结构，供 `parse_resume.py` 输出及下游 skill 消费。

## 顶层结构

```json
{
  "applicant": { ... },
  "education": [ ... ],
  "experience": [ ... ],
  "skills": { ... },
  "achievements": [ ... ],
  "publications": [ ... ],
  "patents": [ ... ],
  "projects": [ ... ],
  "gtv_highlights": { ... },
  "gap_analysis": [ ... ],
  "metadata": { ... }
}
```

---

## 1. applicant（申请人信息）

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| name | string | 否 | 申请人中文姓名 | "张三" |
| name_en | string | 否 | 申请人英文姓名 | "San Zhang" |
| target_field | string | 否 | 目标申请领域 | "digital-technology" |
| target_path | string | 否 | 目标路径 | "exceptional_talent" |

**target_path 可选值**：`exceptional_talent` | `exceptional_promise` | `startup_visa`

**target_field 可选值**：`digital-technology` | `science` | `engineering` | `humanities` | `arts` | 其他

---

## 2. education（教育背景）

数组，每项为一条教育记录。

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| degree | string | 是 | 学历 | "硕士"、"Master" |
| institution | string | 是 | 院校名称 | "清华大学"、"UCL" |
| major | string | 否 | 专业 | "计算机科学"、"CS" |
| start_year | number | 否 | 入学年份 | 2015 |
| end_year | number | 否 | 毕业年份 | 2017 |
| gpa | string | 否 | GPA | "3.8/4.0" |
| rank | string | 否 | 排名 | "前5%"、"Top 10" |
| raw_text | string | 否 | 原始文本片段 | 用于追溯 |

**示例**：

```json
{
  "education": [
    {
      "degree": "硕士",
      "institution": "某大学",
      "major": "计算机科学",
      "start_year": 2015,
      "end_year": 2017,
      "gpa": "3.8/4.0"
    }
  ]
}
```

---

## 3. experience（工作经历）

数组，按时间倒序（最近的在先）。

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| company | string | 是 | 公司名称 | "某科技公司" |
| position | string | 是 | 职位 | "高级工程师" |
| level | string | 否 | 职位级别 | "senior"、"director"、"vp" |
| start_date | string | 否 | 开始日期 | "2019.03"、"2019-03" |
| end_date | string | 否 | 结束日期 | "2023.06"、"至今" |
| duration_months | number | 否 | 工作时长（月） | 48 |
| responsibilities | array[string] | 否 | 核心职责 | ["负责架构设计", "..."] |
| team_size | number | 否 | 管理团队规模 | 10 |
| raw_text | string | 否 | 原始文本片段 | 用于追溯 |

**level 可选值**：`c_level` | `vp` | `director` | `manager` | `senior` | `ic`

**示例**：

```json
{
  "experience": [
    {
      "company": "某科技公司",
      "position": "高级软件工程师",
      "level": "senior",
      "start_date": "2019.03",
      "end_date": "2023.06",
      "duration_months": 51,
      "responsibilities": ["负责核心系统架构", "带领5人技术小组"]
    }
  ]
}
```

---

## 4. skills（技能）

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| technical | array[string] | 否 | 技术/硬技能 | ["Python", "TensorFlow"] |
| soft | array[string] | 否 | 软技能 | ["团队协作", "沟通"] |
| certifications | array[string] | 否 | 专业认证 | ["AWS Certified"] |
| by_category | object | 否 | 按类别分组 | {"language": ["Python"], "framework": ["React"]} |

**示例**：

```json
{
  "skills": {
    "technical": ["Python", "Java", "TensorFlow", "AWS"],
    "soft": ["团队协作", "技术领导力"],
    "certifications": ["AWS Solutions Architect"]
  }
}
```

---

## 5. achievements（成就）

数组，每项为一条成就记录。

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| type | string | 是 | 类型 | "award"、"quantified"、"open_source" |
| description | string | 是 | 描述 | "获得XX奖项" |
| metrics | object | 否 | 量化指标 | {"value": 200, "unit": "%"} |
| raw_text | string | 否 | 原始文本 | 用于追溯 |

**type 可选值**：`award` | `quantified` | `open_source` | `leadership` | `other`

**示例**：

```json
{
  "achievements": [
    {
      "type": "quantified",
      "description": "主导系统优化，性能提升200%"
    },
    {
      "type": "award",
      "description": "获得公司年度技术之星"
    }
  ]
}
```

---

## 6. publications（论文发表）

数组。

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| title | string | 是 | 论文标题 | "..." |
| venue | string | 否 | 发表 venue | "NeurIPS"、"某期刊" |
| year | number | 否 | 年份 | 2022 |
| role | string | 否 | 作者角色 | "第一作者" |
| raw_text | string | 否 | 原始文本 | 用于追溯 |

---

## 7. patents（专利）

数组。

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| title | string | 是 | 专利名称 | "..." |
| number | string | 否 | 专利号 | "CN123456" |
| year | number | 否 | 年份 | 2021 |
| role | string | 否 | 发明人角色 | "第一发明人" |
| raw_text | string | 否 | 原始文本 | 用于追溯 |

---

## 8. projects（项目经历）

数组。

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| name | string | 是 | 项目名称 | "..." |
| role | string | 否 | 角色 | "技术负责人" |
| scale | string | 否 | 规模描述 | "百万级用户" |
| technologies | array[string] | 否 | 技术栈 | ["Python", "Kafka"] |
| impact | string | 否 | 业务影响 | "..." |
| raw_text | string | 否 | 原始文本 | 用于追溯 |

---

## 9. gtv_highlights（GTV 亮点）

由 `match_gtv.py` 填充或解析时推断。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| mc | array[object] | 否 | MC 维度匹配的亮点 |
| oc | array[object] | 否 | OC 维度匹配的亮点 |

每项亮点对象：

| 字段 | 类型 | 说明 |
|------|------|------|
| dimension | string | MC1/MC2/MC3/MC4 或 OC1/OC2/OC3/OC4 |
| evidence | string | 证据描述 |
| source | string | 来源（education/experience/achievement 等） |
| confidence | number | 置信度 0-1 |

---

## 10. gap_analysis（差距分析）

由 `match_gtv.py` 填充。

| 字段 | 类型 | 说明 |
|------|------|------|
| dimension | string | 缺失或薄弱的维度 |
| suggestion | string | 补强建议 |
| priority | string | 优先级 high/medium/low |

---

## 11. metadata（元数据）

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| source_type | string | 否 | 来源类型 | "paste"、"file"、"api" |
| analysis_date | string | 否 | 分析日期 | "2024-03-12" |
| confidence | number | 否 | 整体置信度 0-1 | 0.85 |

---

## 完整示例

```json
{
  "applicant": {
    "name": "示例申请人",
    "name_en": "Sample Applicant",
    "target_field": "digital-technology",
    "target_path": "exceptional_promise"
  },
  "education": [
    {
      "degree": "硕士",
      "institution": "某大学",
      "major": "计算机科学",
      "end_year": 2019
    }
  ],
  "experience": [
    {
      "company": "某科技公司",
      "position": "高级工程师",
      "level": "senior",
      "start_date": "2019.07",
      "end_date": "至今",
      "responsibilities": ["负责核心系统开发"]
    }
  ],
  "skills": {
    "technical": ["Python", "Java"],
    "soft": ["团队协作"]
  },
  "achievements": [
    {
      "type": "quantified",
      "description": "性能优化提升200%"
    }
  ],
  "publications": [],
  "patents": [],
  "projects": [],
  "gtv_highlights": {
    "mc": [
      {
        "dimension": "MC2",
        "evidence": "高级工程师职位，负责核心系统",
        "source": "experience",
        "confidence": 0.7
      }
    ],
    "oc": []
  },
  "gap_analysis": [
    {
      "dimension": "OC2",
      "suggestion": "可考虑发表论文或申请专利",
      "priority": "medium"
    }
  ],
  "metadata": {
    "source_type": "file",
    "analysis_date": "2024-03-12",
    "confidence": 0.8
  }
}
```
