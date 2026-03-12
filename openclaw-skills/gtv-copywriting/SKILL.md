---
name: gtv-copywriting
description: 撰写GTV签证申请材料文案，聚焦个人陈述（Personal Statement）、证据描述（Evidence Description）和申请信（Cover Letter）。推荐信由 gtv-recommendation-letter skill 专门处理。用于：(1) 撰写或修改个人陈述，(2) 撰写证据描述和支撑材料说明，(3) 撰写申请信，(4) 优化申请文案措辞。触发词：个人陈述、personal statement、证据描述、evidence description、申请信、cover letter、文案撰写、申请材料、文案优化。
---

# GTV 申请文案写作

为 GTV 签证申请撰写专业的申请材料，**聚焦个人陈述、证据描述和申请信**。推荐信由 [gtv-recommendation-letter](gtv-recommendation-letter) skill 专门处理，本 skill 不涉及推荐信撰写。

## 职责边界

| 文案类型 | 负责 Skill | 说明 |
|----------|------------|------|
| 推荐信 (Recommendation Letter) | **gtv-recommendation-letter** | 由推荐人出具，需身份验证、证据映射、差异化控制 |
| 个人陈述 (Personal Statement) | **gtv-copywriting** | 申请人自述，Tech Nation 背书必需 |
| 证据描述 (Evidence Description) | **gtv-copywriting** | 对每份证据材料的说明，对应 MC/OC 标准 |
| 申请信 (Cover Letter) | **gtv-copywriting** | 正式签证申请信函 |

## 支持的文案类型

| 类型 | 说明 | 典型长度 |
|------|------|---------|
| 个人陈述 (Personal Statement) | 申请人自述背景、成就和来英计划 | 2000-3500字 |
| 证据描述 (Evidence Description) | 对每份证据材料的 What-Why-How 说明 | 200-500字/份 |
| 申请信 (Cover Letter) | 正式的签证申请信函 | 1-2页 |

## 初始化：收集信息

在开始任何阶段前，必须先确认以下信息：

### 必需信息

| 信息项 | 说明 | 来源 |
|--------|------|------|
| 申请人姓名（中英文） | 如：张三 / San Zhang | 用户提供或从简历提取 |
| 申请领域 | digital-technology / science / engineering 等 | 用户确认 |
| 目标路径 | Exceptional Talent / Exceptional Promise / Startup Visa | 用户确认 |
| 核心成就摘要 | 关键项目、数据、奖项、媒体报道等 | 用户提供或从材料提取 |

### 可选信息

| 信息项 | 说明 | 用途 |
|--------|------|------|
| assessment_report.json | gtv-assessment 的评估报告 | 优势论证、证据选择、弱项弥补策略 |
| resume_analysis.json | resume-analyzer 的简历分析 | 教育、经历、技能、成就的素材来源 |
| evidence_framework.json | MC/OC 证据框架 | 证据描述的对应关系、覆盖度校验 |
| 律师建议 | 律师对优势和劣势的分析 | 论证侧重、弱项弥补方向 |

如用户未提供上述信息，主动询问获取。缺少申请人姓名、申请领域或核心成就摘要时无法继续。

## 输出目录结构

所有生成文件**必须保存到以下绝对路径**：

```
/home/xichi/workspace/visa-assessment/public/downloads/copywriting/
├── personal_statement.txt      # 个人陈述
├── personal_statement_check.md # 个人陈述质量检查报告
├── evidence_descriptions.txt   # 证据描述（多份合并或分文件）
├── evidence_descriptions_check.md # 证据描述质量检查报告
├── cover_letter.txt            # 申请信（如有）
└── 构思思路.md                 # 框架与论证逻辑
```

**初始化**：执行前先运行 `mkdir -p /home/xichi/workspace/visa-assessment/public/downloads/copywriting/`。
**重要**：所有脚本的 `-o` 参数和文件保存操作都必须使用上述绝对路径。

## 工作流程

按以下四个阶段依次执行：

### 阶段一：需求确认与素材收集

**目标**：确认要撰写的文案类型，收集背景素材。

**步骤**：

1. **确认文案类型**：个人陈述 / 证据描述 / 申请信 / 组合
2. **读取可选输入**（如有）：
   - `assessment_report.json`：提取 `strengths`、`weaknesses`、`recommended_pathway`、`detailed_analysis`
   - `resume_analysis.json`：提取教育、经历、技能、成就、GTV 亮点
   - `evidence_framework.json`：提取 MC/OC 证据列表及核心事实
3. **整理素材清单**：按文案类型整理所需事实、数据、证据编号
4. **确认缺失项**：如有关键信息缺失，向用户询问

### 阶段二：框架构建

**目标**：根据 GTV 评审标准搭建文案结构。

**步骤**：

1. **个人陈述**：参考 [personal-statement-guide.md](reference/personal-statement-guide.md)
   - 按 Tech Nation 要求划分段落：引言、专业背景与核心成就、创新贡献与行业影响、来英计划、总结
   - 分配各段字数预算
   - 将 MC/OC 标准映射到各段落
   - 确定 Talent vs Promise 的侧重差异
2. **证据描述**：参考 [evidence-description-guide.md](reference/evidence-description-guide.md)
   - 按证据类型选择模板：项目/专利/论文/奖项/媒体报道/开源/演讲
   - 每份采用 What → Why → How 结构
   - 标注与 MC/OC 的对应关系
3. **申请信**：简要结构，突出申请意图和材料清单
4. **输出构思思路**：保存至 `/home/xichi/workspace/visa-assessment/public/downloads/copywriting/构思思路.md`

### 阶段三：初稿撰写

**目标**：按精炼写作原则撰写，严格控制篇幅。

**步骤**：

1. **个人陈述**：
   - 遵循各段字数预算（见 personal-statement-guide.md）
   - 数据优先于描述，避免空洞形容词
   - 每段一个核心论点，不重复论证
2. **证据描述**：
   - 每份 200-500 字
   - 包含量化数据（如适用）
   - 明确说明对应 MC/OC 标准
3. **申请信**：简洁正式，1-2 页
4. **保存初稿**：输出至 `/home/xichi/workspace/visa-assessment/public/downloads/copywriting/` 对应文件

### 阶段四：质量检查与润色

**目标**：运行质量检查脚本，根据反馈修改。

**步骤**：

1. **个人陈述质量检查**：
   ```bash
   python3 scripts/check_statement.py /home/xichi/workspace/visa-assessment/public/downloads/copywriting/personal_statement.txt --path talent
   ```
   根据报告修正：字数、段落结构、禁忌词、MC/OC 覆盖度

2. **证据描述质量检查**：
   ```bash
   python3 scripts/check_evidence_desc.py /home/xichi/workspace/visa-assessment/public/downloads/copywriting/evidence_descriptions.txt
   ```
   根据报告修正：每份字数、量化数据、MC/OC 对应

3. **字数统计**（可选）：
   ```bash
   python3 scripts/word_count.py /home/xichi/workspace/visa-assessment/public/downloads/copywriting/personal_statement.txt
   ```

4. **润色**：根据检查结果修改，直至通过

## 与其他 Skill 的数据联动

| 上游 Skill | 输出文件 | 本 Skill 用途 |
|------------|----------|---------------|
| gtv-assessment | assessment_report.json | 优势论证、证据选择、弱项弥补策略、路径侧重 |
| resume-analyzer | resume_analysis.json | 教育、经历、技能、成就的素材来源 |
| gtv-recommendation-letter | evidence_framework.json | 证据描述的 MC/OC 对应、覆盖度校验 |

**数据传递**：将上述 JSON 作为输入，本 skill 读取 `overall_score`、`recommended_pathway`、`strengths`、`weaknesses`、`detailed_analysis`、教育经历、成就列表等字段。

## 工具脚本

技能提供 4 个 Python 脚本（位于 `scripts/` 目录），**仅依赖 Python 标准库**。

### 1. check_statement.py — 个人陈述质量检查

```bash
python3 scripts/check_statement.py statement.txt --path talent
python3 scripts/check_statement.py statement.txt --path promise
```

检查项：字数统计、段落结构、禁忌词检测、MC/OC 覆盖度。输出：质量报告（通过/警告/失败）。

### 2. check_evidence_desc.py — 证据描述质量检查

```bash
python3 scripts/check_evidence_desc.py evidence_descriptions.txt
```

检查项：每份描述字数、是否包含量化数据、MC/OC 标准对应。输出：质量报告。

### 3. word_count.py — 中英文混合字数统计

```bash
python3 scripts/word_count.py document.txt
python3 scripts/word_count.py document.txt --by-paragraph
```

支持按段落统计、总计。

### 4. requirements.txt

本 skill 的脚本仅依赖 Python 标准库，无需额外安装。若需读取 docx 格式，可参考 gtv-recommendation-letter 的 `read_docx.py`（需 python-docx）。

## 执行检查清单

对每次文案撰写任务，确认以下事项完成：

```
文案类型：[个人陈述 / 证据描述 / 申请信]
- [ ] 阶段一：已确认文案类型
- [ ] 阶段一：已读取 assessment_report.json（如有）
- [ ] 阶段一：已读取 resume_analysis.json（如有）
- [ ] 阶段一：已整理素材清单
- [ ] 阶段二：已构建文案框架（构思思路.md）
- [ ] 阶段二：个人陈述已映射 MC/OC 到各段落
- [ ] 阶段二：证据描述已确定每份的 What-Why-How 结构
- [ ] 阶段三：初稿已撰写并保存
- [ ] 阶段三：个人陈述字数在 2000-3500 字范围内
- [ ] 阶段三：每份证据描述在 200-500 字范围内
- [ ] 阶段四：已运行 check_statement.py（个人陈述）
- [ ] 阶段四：已运行 check_evidence_desc.py（证据描述）
- [ ] 阶段四：质量检查通过，无错误项
- [ ] 所有文件位于 /home/xichi/workspace/visa-assessment/public/downloads/copywriting/ 目录下
```

## 注意事项

1. **事实准确性**：所有文案必须基于真实材料，不得编造经历或数据
2. **与推荐信边界**：推荐信由 gtv-recommendation-letter 处理，本 skill 不撰写推荐信
3. **语言要求**：个人陈述和证据描述通常使用英文提交，中文可作为底稿
4. **精炼原则**：数据优先于描述，删除空洞修饰，一个论点一段话
5. **MC/OC 覆盖**：确保内容与 GTV 评审标准明确对应
