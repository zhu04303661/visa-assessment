---
name: gtv-assessment
description: 评估候选人是否符合英国GTV全球人才签证要求。用于：(1) 评估GTV资格和打分，(2) 分析Exceptional Talent/Promise/Startup Visa路径适用性，(3) 回答"我是否符合GTV"类问题。触发词：GTV评估、资格评估、打分、签证评分、人才签证评估、eligibility assessment。
---

# GTV 资格评估 Skill

评估候选人是否符合英国 Global Talent Visa 要求，基于三层评估框架进行量化打分和路径推荐。按照结构化工作流程完成从信息收集到报告生成的全流程。

## 初始化：收集客户信息

在开始任何阶段前，必须先确认以下信息：

### 必需信息

| 信息项 | 说明 | 来源 |
|--------|------|------|
| 教育背景 | 学历层次、院校名称、专业、毕业年份 | 用户提供或从简历提取 |
| 工作经历 | 公司名称、职位、任职时长、主要职责 | 用户提供或从简历提取 |
| 申请领域 | digital-technology / science / engineering 等 | 用户确认 |
| 技术技能 | 核心技术栈、专业认证 | 用户提供或从简历提取 |

### 可选信息

| 信息项 | 说明 |
|--------|------|
| 主要成就 | 项目影响、奖项、专利、开源贡献、会议演讲 |
| 行业影响力 | 媒体报道、行业认可、技术贡献 |
| 国际认可 | 国际奖项、跨国项目、海外经历 |
| 领导力 | 团队规模、技术决策层级、mentor经历 |
| 申请人简历 | 用于批量提取上述信息 |

如用户未提供上述信息，**必须主动询问**获取。**缺少教育背景或工作经历时无法进行有效评估**，应引导用户提供或上传简历。

### 从已有材料提取信息

当用户提供简历或综合材料时：
- 使用项目内的简历解析能力提取结构化信息
- 或手动从材料中整理为 `extracted_info` 格式
- 提取后向用户确认关键信息（院校、公司、年限）的准确性

## 输出目录结构

所有生成文件**必须保存到以下绝对路径**：

```
/home/xichi/workspace/visa-assessment/public/downloads/assessment/
├── assessment_report.json    # 结构化评估数据（供其他 skill 使用）
├── assessment_report.md      # 可读的评估报告
└── path_comparison.md        # 路径对比分析（可选）
```

**初始化**：执行前先运行 `mkdir -p /home/xichi/workspace/visa-assessment/public/downloads/assessment/`。
**重要**：所有脚本的 `-o` 参数和文件保存操作都必须使用上述绝对路径。

## 工作流程

按以下四个阶段依次执行：

### 阶段一：信息收集与整理

**目标**：引导用户提供背景信息，或从简历文件中提取结构化数据。

**步骤**：

1. **检查必需信息**：确认教育背景、工作经历、申请领域、技术技能是否齐全
2. **缺失时主动询问**：按优先级逐项询问，优先获取教育和工作经历
3. **从简历提取**（如用户提供）：
   - 解析简历文件，提取学历、公司、职位、年限、技能、成就
   - 整理为后端 API 所需的 `extracted_info` 格式
4. **整理为统一结构**，示例：

```json
{
  "education": {"degree": "硕士", "university": "UCL", "major": "CS", "year": "2018"},
  "experience": [
    {"position": "Senior Engineer", "company": "Google", "duration": "5年", "responsibilities": ["..."]}
  ],
  "skills": ["Python", "ML", "System Design"],
  "achievements": ["开源项目1000+ stars", "国际会议演讲"],
  "field": "digital-technology"
}
```

### 阶段二：维度评分

**目标**：按 MC/OC 逐项打分，可调用后端 API 获取量化评分。

**步骤**：

1. **调用后端 API 获取综合评分**（如后端可用）：

```bash
curl -X POST http://127.0.0.1:5005/api/resume/gtv-assessment \
  -H "Content-Type: application/json" \
  -d '{
    "extracted_info": {
      "education": {"degree": "硕士", "university": "UCL", "major": "CS"},
      "experience": [{"position": "Senior Engineer", "company": "Google", "duration": "5年"}],
      "skills": ["Python", "ML", "System Design"],
      "achievements": ["开源项目1000+ stars", "国际会议演讲"]
    },
    "field": "digital-technology"
  }'
```

2. **对单项深入分析**（可选）：

```bash
curl -X POST http://127.0.0.1:5005/api/scoring/analyze-item \
  -H "Content-Type: application/json" \
  -d '{
    "item_name": "工作经验",
    "item_value": "Google高级工程师5年",
    "score": 25,
    "max_score": 30,
    "percentage": 83,
    "applicant_background": "CS硕士，专注ML方向"
  }'
```

3. **如 API 不可用**：参考 [scoring-guide.md](reference/scoring-guide.md) 和 [assessment-dimensions.md](reference/assessment-dimensions.md) 进行人工评分
4. **记录各维度得分**：MC 四维 + OC 四维，以及总分和路径得分

### 阶段三：路径推荐与差距分析

**目标**：综合评分推荐路径，分析薄弱环节。

**步骤**：

1. **计算三条路径得分**：Exceptional Talent (80+)、Exceptional Promise (70+)、Startup Visa (60+)
2. **确定推荐路径**：根据总分和维度均衡性选择最匹配路径
3. **差距分析**：识别得分较低的维度，列出具体改进方向
4. **生成路径对比**（可选）：运行 `scripts/compare_paths.py` 输出对比表

### 阶段四：报告生成与持久化

**目标**：生成评估报告并保存为 JSON 和 Markdown 文件。

**步骤**：

1. **构建 assessment_report.json**，包含：
   - 总体评分、推荐路径、信心指数
   - MC/OC 各维度得分明细
   - 优势亮点、需要加强、下一步建议
   - `chart_data` 字段（雷达图数据，供前端可视化）

2. **生成 Markdown 报告**：
   ```bash
   python3 scripts/generate_report.py assessment_data.json -o /home/xichi/workspace/visa-assessment/public/downloads/assessment/assessment_report.md
   ```

3. **生成路径对比**（可选）：
   ```bash
   python3 scripts/compare_paths.py assessment_data.json -o /home/xichi/workspace/visa-assessment/public/downloads/assessment/path_comparison.md
   ```

4. **确认输出**：`assessment_report.json` 和 `assessment_report.md` 已保存至 `/home/xichi/workspace/visa-assessment/public/downloads/assessment/` 目录

## 评估框架

### 三条申请路径

| 路径 | 最低参考分 | 适用人群 |
|------|-----------|---------|
| Exceptional Talent | 80+ | 已在行业取得杰出成就的领军人物 |
| Exceptional Promise | 70+ | 展现杰出潜力的早期职业人才 |
| Startup Visa | 60+ | 有创新商业计划的创业者 |

### Mandatory Criteria (MC) — 权重 60%

| 维度 | 权重 | 评估要点 |
|------|------|---------|
| 教育背景 | 25% | 学历层次、院校排名、专业相关性 |
| 工作经验 | 30% | 年限、职位级别、公司规模与声誉 |
| 技术专长 | 20% | 技能深度、技术栈广度、专业认证 |
| 行业影响力 | 25% | 项目影响、行业认可、技术贡献 |

### Optional Criteria (OC) — 权重 40%

| 维度 | 权重 | 评估要点 |
|------|------|---------|
| 国际认可度 | 30% | 国际奖项、会议演讲、跨国项目 |
| 创新贡献 | 25% | 专利、开源项目、技术突破 |
| 领导力 | 25% | 团队管理、技术领导、mentor经历 |
| 社会影响 | 20% | 开源贡献、社区影响、社会价值 |

## 输出格式

向用户展示时使用以下结构：

```
## GTV 资格评估报告

### 总体评分：XX/100
- 推荐路径：Exceptional Talent / Promise / Startup Visa
- 信心指数：XX%

### 评分明细
| 维度 | 得分 | 满分 | 评价 |
|------|------|------|------|
| 教育背景 | XX | 15 | ... |
| 工作经验 | XX | 18 | ... |
| ... | | | |

### 优势亮点
- ...

### 需要加强
- ...

### 下一步建议
1. ...
```

## 六大背书机构

GTV 申请需选择对应领域的背书机构：

- **Tech Nation** — 数字技术（最常用）
- **Royal Society** — 自然科学
- **Royal Academy of Engineering** — 工程
- **British Academy** — 人文社科
- **Arts Council England** — 艺术文化
- **UK Research and Innovation (UKRI)** — 跨学科研究

各机构详细评分标准参见 [scoring-guide.md](reference/scoring-guide.md)。

## 与其他 Skill 的数据联动

| 下游 Skill | 输入来源 | 用途 |
|------------|----------|------|
| immigration-strategy | assessment_report.json | 路径规划、时间线建议的输入依据 |
| gtv-copywriting | assessment_report.json | 文案撰写的优势论证、证据选择依据 |
| gtv-recommendation-letter | assessment_report.json | 推荐信证据选择的参考，强化薄弱维度 |

**数据传递**：将 `assessment_report.json` 作为上游输出，供上述 skill 读取 `overall_score`、`recommended_pathway`、`detailed_analysis`、`strengths`、`weaknesses` 等字段。

## 工具脚本

技能提供 2 个 Python 脚本（位于 `scripts/` 目录），仅依赖标准库。

### 1. generate_report.py — 生成评估报告

```bash
python3 scripts/generate_report.py assessment_data.json -o assessment_report.md
```

从评估数据 JSON 生成格式化的 Markdown 报告，并在 JSON 输出中包含 `chart_data`（雷达图数据）。

### 2. compare_paths.py — 路径对比分析

```bash
python3 scripts/compare_paths.py assessment_data.json -o path_comparison.md
```

对三条路径分别打分，输出路径对比表和推荐理由。

## 执行检查清单

确认以下事项完成：

```
- [ ] 阶段一：已收集教育背景、工作经历、申请领域、技术技能
- [ ] 阶段一：缺失信息已主动询问或从简历提取
- [ ] 阶段一：已整理为 extracted_info 统一格式
- [ ] 阶段二：已调用 API 或参考 scoring-guide 完成维度评分
- [ ] 阶段二：MC/OC 各维度得分已记录
- [ ] 阶段三：已确定推荐路径并完成差距分析
- [ ] 阶段四：已生成 assessment_report.json
- [ ] 阶段四：已运行 generate_report.py 生成 assessment_report.md
- [ ] 阶段四：所有文件已保存至 /home/xichi/workspace/visa-assessment/public/downloads/assessment/ 目录
- [ ] 已向用户展示评估报告摘要
```

## 注意事项

1. **评分仅供参考**：最终决定由 UKVI 做出，不同背书机构评审标准有差异
2. **信息准确性**：根据申请人领域选择对应背书机构，鼓励用户提供详细背景以提高评估准确度
3. **不硬编码客户信息**：所有示例和模板中不使用真实客户姓名或敏感数据
