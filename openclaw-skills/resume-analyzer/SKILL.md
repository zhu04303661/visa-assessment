---
name: resume-analyzer
description: 分析简历内容，提取候选人的教育背景、工作经验、技能和成就信息，识别GTV签证申请相关亮点。用于：(1) 解析简历并提取结构化信息，(2) 识别GTV相关证据和亮点，(3) 评估简历强项和弱项。触发词：简历分析、resume analysis、解析简历、背景分析、简历提取、CV分析。
---

# 简历分析与 GTV 亮点提取

解析候选人简历，提取结构化信息，并从 GTV 签证申请角度识别关键亮点和证据。输出 `resume_analysis.json` 供下游 skill 使用。

## 初始化：收集信息

在开始任何阶段前，必须先确认以下信息：

### 支持的简历格式

| 格式 | 说明 | 获取方式 |
|------|------|----------|
| PDF | 常见简历格式 | 通过 API 上传后由后端解析，或用户提供已提取的纯文本 |
| DOCX | Word 格式 | 使用 `gtv-recommendation-letter` 的 `read_docx.py` 提取文本 |
| 纯文本 | 直接粘贴 | 用户直接粘贴简历内容 |

### 必需信息

| 信息项 | 说明 | 来源 |
|--------|------|------|
| 申请人姓名 | 中英文均可 | 用户提供或从简历提取 |
| 目标申请领域 | digital-technology / science / engineering 等 | 用户确认 |
| 目标路径 | Exceptional Talent / Exceptional Promise / Startup Visa | 用户确认 |

### 可选信息

| 信息项 | 说明 |
|--------|------|
| 简历文件 | PDF、DOCX 或纯文本 |
| 律师建议 | 律师对优势和劣势的分析文件 |

如用户未提供上述信息，主动询问获取。缺少简历内容时无法继续。

## 输出目录与持久化

所有分析结果**必须保存到以下绝对路径**：

```
/home/xichi/workspace/visa-assessment/public/downloads/resume/
├── resume_analysis.json    # 主输出，结构化格式
├── gtv_highlights.md      # GTV 亮点匹配报告（match_gtv.py 输出）
└── resume_report.md       # 人类可读分析报告（generate_summary.py 输出）
```

**初始化**：执行前先运行 `mkdir -p /home/xichi/workspace/visa-assessment/public/downloads/resume/`。
**重要**：所有脚本的 `-o` 参数和文件保存操作都必须使用上述绝对路径。

## 工作流程

对每份简历依次执行以下四个阶段：

### 阶段一：简历获取与解析

**目标**：通过 API 上传文件或接收用户粘贴的文本，提取原始信息。

**步骤**：

1. **获取简历内容**：
   - 用户粘贴：直接使用粘贴的纯文本
   - 文件上传：通过 API 上传 PDF/DOCX 后获取解析文本
   - DOCX 文件：使用 `gtv-recommendation-letter` 的 `read_docx.py` 提取：
     ```bash
     python3 scripts/read_docx.py path/to/resume.docx -o resume_raw.txt
     ```

2. **解析为结构化信息**：
   ```bash
   python3 scripts/parse_resume.py resume_text.txt -o /home/xichi/workspace/visa-assessment/public/downloads/resume/resume_analysis.json
   # 或从 stdin 输入
   cat resume.txt | python3 scripts/parse_resume.py - -o /home/xichi/workspace/visa-assessment/public/downloads/resume/resume_analysis.json
   ```

3. **输入申请人信息**（可选）：若解析时已知姓名、目标领域、目标路径，可通过 `--name`、`--field`、`--path` 参数传入，或后续在 JSON 中手动补充。

### 阶段二：结构化信息提取

**目标**：从原始文本中提取教育、经历、技能、成就等分维度整理。

**步骤**：

1. 读取 `parse_resume.py` 的输出，或手动按 [extraction-rules.md](extraction-rules.md) 规则整理
2. 确保提取维度完整：
   - 教育背景：学历、院校、专业、毕业时间、GPA/排名
   - 工作经历：公司、职位、时长、核心职责、管理范围
   - 技能：硬技能vs软技能、技术栈分类、熟练度推断
   - 成就：量化成就、奖项、专利、论文发表、开源贡献
   - 项目经历：项目名称、规模、角色、技术方案、业务影响

3. 输出格式符合 [output-schema.md](output-schema.md) 定义

### 阶段三：GTV 亮点识别与差距分析

**目标**：按 MC/OC 标准标注证据亮点，识别薄弱环节。

**步骤**：

1. **运行 GTV 亮点匹配**：
   ```bash
   python3 scripts/match_gtv.py /home/xichi/workspace/visa-assessment/public/downloads/resume/resume_analysis.json -o /home/xichi/workspace/visa-assessment/public/downloads/resume/gtv_highlights.md --update-input
   ```
   `--update-input` 会将匹配结果合并回 `resume_analysis.json`，供下游使用。

2. **匹配结果**：
   - MC 相关亮点：高级别职位、知名企业、技术领导力、大规模项目
   - OC 相关亮点：国际会议演讲、开源贡献、专利、论文、行业标准、创业经历

3. **差距分析**：脚本输出中识别缺失的 GTV 证据类型，供补强建议使用

### 阶段四：报告生成与持久化

**目标**：生成分析报告，保存为 `resume_analysis.json` 供下游 skill 使用。

**步骤**：

1. **生成人类可读报告**：
   ```bash
   python3 scripts/generate_summary.py /home/xichi/workspace/visa-assessment/public/downloads/resume/resume_analysis.json -o /home/xichi/workspace/visa-assessment/public/downloads/resume/resume_report.md
   ```

2. **确认最终 JSON 持久化**：
   - `resume_analysis.json` 必须包含所有阶段一至三的完整数据
   - 格式严格符合 [output-schema.md](output-schema.md)

3. **数据联动**：下游 skill 可读取：

   | 下游 Skill | 用途 |
   |------------|------|
   | gtv-assessment | 评估的输入数据（education、experience、skills、achievements） |
   | gtv-copywriting | 文案素材来源（成就、经历、技能描述） |
   | gtv-recommendation-letter | 证据提取的基础（gtv_highlights、achievements） |

## 提取维度（知识库）

### 基础信息提取

| 维度 | 提取项 |
|------|--------|
| 教育背景 | 学历、院校、专业、毕业时间、GPA/排名 |
| 工作经历 | 公司、职位、时长、核心职责、管理范围 |
| 技术技能 | 编程语言、框架、工具、专业认证 |
| 成就荣誉 | 奖项、专利、论文发表、开源贡献 |
| 项目经历 | 项目名称、规模、角色、技术方案、业务影响 |

### GTV 亮点识别

**Mandatory Criteria 相关**：
- 高级别职位（VP、Director、Principal Engineer 等）
- 知名企业（FAANG、独角兽、行业龙头）经历
- 技术领导力证据（架构决策、技术方向制定）
- 大规模项目负责人经历

**Optional Criteria 相关**：
- 国际会议演讲/受邀报告
- 高影响力开源项目（stars、contributors、adoption）
- 专利发明
- 学术论文（顶会/顶刊）
- 行业标准制定参与
- 技术社区贡献（知名博客、教程、mentor）
- 创业经历和融资记录

## 工具脚本

技能提供 3 个 Python 脚本（位于 `scripts/` 目录），**仅依赖标准库**。

### 1. parse_resume.py — 解析简历文本

```bash
python3 scripts/parse_resume.py resume_text.txt -o /home/xichi/workspace/visa-assessment/public/downloads/resume/resume_analysis.json
cat resume.txt | python3 scripts/parse_resume.py - -o /home/xichi/workspace/visa-assessment/public/downloads/resume/resume_analysis.json
python3 scripts/parse_resume.py resume.txt --name "申请人" --field digital-technology --path exceptional_talent -o /home/xichi/workspace/visa-assessment/public/downloads/resume/resume_analysis.json
```

### 2. match_gtv.py — GTV 亮点匹配与差距分析

```bash
python3 scripts/match_gtv.py /home/xichi/workspace/visa-assessment/public/downloads/resume/resume_analysis.json -o /home/xichi/workspace/visa-assessment/public/downloads/resume/gtv_highlights.md --update-input
```

### 3. generate_summary.py — 生成人类可读报告

```bash
python3 scripts/generate_summary.py /home/xichi/workspace/visa-assessment/public/downloads/resume/resume_analysis.json -o /home/xichi/workspace/visa-assessment/public/downloads/resume/resume_report.md
```

## 后端 API 集成（可选）

如后端服务可用，可通过 API 上传并解析简历：

```bash
curl -X POST http://127.0.0.1:5005/api/resume/upload \
  -F "resume=@/path/to/resume.pdf" \
  -F "name=申请人" \
  -F "field=digital-technology"
```

## 执行检查清单

对每份简历，确认以下事项完成：

```
申请人：[姓名]
- [ ] 初始化：已确认申请人姓名、目标领域、目标路径
- [ ] 初始化：已获取简历内容（粘贴/文件/API）
- [ ] 阶段一：已运行 parse_resume.py 生成 resume_analysis.json
- [ ] 阶段二：已按 extraction-rules.md 完成结构化提取
- [ ] 阶段二：已按 output-schema.md 校验 JSON 格式
- [ ] 阶段三：已运行 match_gtv.py 生成 gtv_highlights.md
- [ ] 阶段三：已识别差距分析中的薄弱环节
- [ ] 阶段四：已运行 generate_summary.py 生成 resume_report.md
- [ ] 阶段四：resume_analysis.json 已持久化供下游使用
- [ ] 所有输出文件位于 /home/xichi/workspace/visa-assessment/public/downloads/resume/ 目录
```

## 注意事项

- 对用户提供的信息保密
- 如信息不足，主动询问缺失的关键维度
- 分析应客观，既要突出优势也要坦诚指出不足
- 不要硬编码任何客户具体信息
- 所有证据项**严格遵守提供的材料事实**，禁止篡改或杜撰
