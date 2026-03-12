---
name: gtv-recommendation-letter
description: 为GTV（英国全球人才签证）申请人撰写推荐信。通用适配各种客户情况，按推荐人列表依次执行：全网检索推荐人信息并构建CV、深入研究申请人材料提取MC/OC证据框架、结合推荐人专长和律师建议撰写中文推荐信。当用户提到撰写GTV推荐信、推荐信写作、推荐人推荐信时触发。
---

# GTV推荐信撰写 Skill

## 概述

本技能为任意 GTV（英国全球人才签证）申请人撰写推荐信。按照推荐人信息列表依次处理每一位推荐人，完成从推荐人调研到推荐信产出的全流程。

## 初始化：收集客户信息

在开始任何阶段前，必须先确认以下信息：

### 必需信息

| 信息项 | 说明 | 来源 |
|--------|------|------|
| 申请人姓名（中英文） | 如：张三 / San Zhang | 用户提供或从简历提取 |
| 申请领域 | digital-technology / science / engineering 等 | 用户确认 |
| 推荐人信息列表 | 每位推荐人的姓名、已知职务、与申请人关系 | 用户提供文件或口述 |
| 申请人核心事实材料 | 包含成就、项目、数据等的材料文件 | 用户提供 |

### 可选信息

| 信息项 | 说明 |
|--------|------|
| 律师建议 | 律师对优势和劣势的分析文件 |
| MC/OC证据文件目录 | 已按MC/OC分类的证据材料（docx等格式） |
| 推荐信范本 | 格式参考用的已有推荐信（仅参考格式，不移用内容） |
| 申请人简历 | 用于提取背景信息 |

如用户未提供上述信息，主动询问获取。缺少推荐人列表或申请人材料时无法继续。

## 输出目录结构

所有生成文件**必须保存到以下绝对路径**，按推荐人分子目录：

```
/home/xichi/workspace/visa-assessment/public/downloads/recommendation/
├── [推荐人姓名]/
│   ├── 推荐人CV_[姓名].docx
│   ├── 推荐信_[姓名].docx
│   └── 推荐信构思思路_[姓名].md
├── [推荐人姓名2]/
│   └── ...
```

**初始化**：执行前先运行 `mkdir -p /home/xichi/workspace/visa-assessment/public/downloads/recommendation/[推荐人姓名]/`。
**重要**：所有脚本的 `-o` 参数和文件保存操作都必须使用上述绝对路径。

## 工作流程

对推荐人信息列表中的每一位推荐人，依次执行以下四个阶段：

### 阶段一：推荐人信息检索与CV构建

**目标**：通过全网搜索，准确获取推荐人的真实背景信息，构建可信的个人CV。

**步骤**：

1. 读取推荐人信息列表文件，获取当前推荐人的姓名和已知信息
2. **建立身份锚点**（Identity Anchor）：
   从推荐人信息中提取已知确定性信息作为身份锚点——后续搜索结果的校验基准。
   - 锚点要素：姓名、已知职务、已知单位、与申请人的认识时间/背景、参考链接
   - 整理为表备用

3. **全网检索该推荐人**：
   - 使用 WebSearch 搜索推荐人姓名 + 关键标识词
   - **防同名检索策略（必须执行）**：
     - 第一轮：`姓名 + 已知单位 + 职务`
     - 第二轮：`姓名 + 领域关键词 + 城市`
     - 第三轮：`姓名 + 与申请人关系锚点（合作项目/年份）`
     - 若搜索结果仅有"姓名"匹配、其余锚点均缺失，默认标记"待验证"
   - 搜索维度：当前职务与单位、历史履历、学历、行业地位、公开发表、参与项目

4. **身份验证流程**（每条搜索结果必须经过）：

   **第一步：同名排除检查** — 中文姓名同名率极高，检查城市/单位/职务/年龄段/领域是否与锚点一致

   **第二步：多维度交叉比对** — 至少3个维度匹配才可进入候选集

   **第三步：矛盾信息标记** — 优先采信官方来源（单位官网 > 百度百科 > 新闻报道 > 自媒体）

   **第四步：脚本化验证** — 整理锚点JSON和搜索来源JSON后运行：
   ```bash
   python3 scripts/verify_identity.py --anchor anchor.json --sources sources.json -o report.md
   ```

   **第五步：采信闸门** — 仅允许来源可信度不低于一般媒体、事实评级A/B的信息写入CV

5. **构建推荐人CV** 并生成 `.docx`：
   - 使用 `scripts/generate_cv.py` 生成格式化docx
   - 仅使用通过身份验证的信息
   - 输出至：`/home/xichi/workspace/visa-assessment/public/downloads/recommendation/[姓名]/推荐人CV_[姓名].docx`

**质量标准**：
- 关键事实须至少2个独立来源交叉验证
- 禁止将不同人物的信息混淆——**宁可少写，不可错写**
- 每条信息附带出处URL

### 阶段二：申请人证据框架构建

**目标**：深入研究申请人材料，提取并构建核心MC/OC证据框架。

**步骤**：

1. **读取申请人核心材料**：
   - 用户提供的事实依据文件
   - 律师建议（如有）

2. **读取证据文件**（如用户提供了按MC/OC分类的证据目录）：
   - 运行 `scripts/extract_evidence.py "[证据目录]/" --json -o evidence_framework.json` 自动提取
   - 或运行 `scripts/read_docx.py "[证据目录]/"` 批量读取后整理
   - 保留 `evidence_framework.json` 供后续阶段使用

3. **如用户未提供分类证据文件**，从申请人核心材料中手动整理：
   - 按 MC1-MC4 / OC1-OC4 分类
   - 提取每项的核心事实和数据

4. **构建证据框架**，输出：
   - MC证据列表（每项含：编号、标题、核心事实、支撑材料出处）
   - OC证据列表（同上格式）
   - 每项证据与推荐人专业领域的关联分析

**关键约束**：
- 所有证据项**严格遵守提供的材料事实**
- **禁止篡改或杜撰**任何信息
- 每条证据必须能追溯到原始材料

详细的证据框架提取指南参见 [evidence-framework.md](evidence-framework.md)

### 阶段三：撰写推荐信构思思路

**目标**：在正式撰写前，梳理核心构思逻辑，保存为思路文件。

**步骤**：

1. 综合阶段一（推荐人CV）和阶段二（证据框架）的成果
2. **运行证据-推荐人关联分析**：
   - 整理推荐人信息为 `recommender.json`
   - 运行 `scripts/map_evidence.py --recommender recommender.json --evidence evidence_framework.json -o mapping.md`
   - 确定核心论证证据和辅助论证证据
3. 结合律师建议中的优势和劣势分析（如有）
4. **撰写构思思路文件**，包含：
   - 身份验证报告
   - 证据-推荐人关联度分析
   - 推荐人核心定位与视角选择
   - 各章节核心论点和证据对应关系
   - 弱项弥补策略
   - **跨推荐人差异化方案**

5. **跨推荐人差异化控制**（必须执行）：

   多封推荐信最大的风险是**用不同的推荐人说同样的话**。评审委员会会同时阅读全部推荐信，高度重合会严重削弱可信度。

   **差异化三步法**：

   **第一步：确定推荐人视角类型**

   | 推荐人类型 | 论证视角 | 核心论证方式 |
   |-----------|---------|------------|
   | 高校/科研机构 | 学术技术专家 | 从科研方法论、技术范式、算法创新性评价 |
   | 上市公司/大型企业 | 产业合作伙伴 | 从商业规模、市场验证、运营能力评价 |
   | 政府/行业协会 | 政策与行业观察者 | 从政策影响力、行业标准、社会价值评价 |
   | 投资机构/孵化器 | 商业价值评估者 | 从投资价值、增长潜力、市场空间评价 |
   | 同行/合作伙伴 | 业内同行评价者 | 从专业能力、合作经历、行业贡献评价 |

   **第二步：分配证据所有权**
   - **独占证据**：每位推荐人分配2-4项与其视角最匹配的证据，重点展开（300-500字），其他推荐人**不得**同等篇幅展开
   - **共享证据**：核心证据可被多位推荐人引用，但**必须使用不同的论证角度**
   - **概括证据**：非本推荐人重点的证据，最多一句话概括

   在构思思路文件中必须记录证据分配表。

   **第三步：交叉检查（处理第二位及之后的推荐人时必须执行）**
   撰写第二封及后续推荐信前，**必须先读取所有已完成的推荐信**，检查重复。

6. **输出**：`/home/xichi/workspace/visa-assessment/public/downloads/recommendation/[姓名]/推荐信构思思路_[姓名].md`

### 阶段四：撰写GTV推荐信

**目标**：结合推荐人背景、证据框架和构思思路，撰写正式推荐信，输出 `.docx`。

**步骤**：

1. **读取推荐信范本**（如有）：
   - 使用 `scripts/read_docx.py` 提取范本内容
   - 分析结构、语气、论证逻辑
   - **注意**：仅参考格式和写法，**不要**将范本中的内容作为当前申请人的证据

2. **撰写推荐信**，严格遵循格式规范和篇幅限制：

   **篇幅硬性限制**：
   - **≤3页A4**（12pt仿宋，1.5倍行距）
   - **正文2400~3000中文字符**（不含标题和签名块）

   **各段字数预算**（总计2400~3000字）：

   | 段落 | 目标字数 | 精炼原则 |
   |------|----------|----------|
   | 推荐人自我介绍 | 250~350字 | 保留最能建立权威性的3-5项头衔/成就 |
   | 推荐意愿 | 50~80字 | 一句话过渡 |
   | 认识经过 | 250~350字 | 讲清时间、背景、合作性质 |
   | 核心能力与成就 | 1000~1400字 | 信的重心，2-3段，充分使用数据和事实论证 |
   | 行业认可 | 250~350字 | 合并为一段，最有分量的2-3项认可 |
   | 英国发展潜力 | 250~350字 | 市场需求+技术可迁移性+独特优势 |
   | 总结推荐 | 150~200字 | 重申核心判断，简洁有力 |

   **格式规范（必须严格遵守）**：
   - **标题**：仅一行"推荐信"，居中加粗
   - **无头部块**：不加独立的日期行、收件人行、主题行
   - **正文结构**：自然段落连续流动，**禁止使用编号章节**
   - **加粗文本**：使用Word原生加粗，不保留markdown标记
   - **签名落款**：信尾一个中文签名落款块
   - **无出处列表**：出处保留在构思思路文件中

   **语言**：全文使用中文，包括标题和结尾落款

   **推荐人视角**：以推荐人第一人称撰写

   **精炼写作原则**：
   - **数据优先于描述**：用具体数字说服，而非抽象形容
   - **一个论点一段话**：不拆为多段反复论证同一个点
   - **删除冗余修饰**：去掉空洞形容词
   - **合并同类信息**：同一逻辑的内容不拆段

   **跨推荐人差异化约束**：
   - 严格按照阶段三构思思路中的"证据分配表"使用证据
   - 同一证据被多位推荐人引用时，论证角度必须不同
   - **禁止两封信中出现超过2句话的高度相似表述**

3. **生成 `.docx` 格式推荐信**：
   ```bash
   python3 scripts/generate_letter.py letter_data.json -o "/home/xichi/workspace/visa-assessment/public/downloads/recommendation/[姓名]/推荐信_[姓名].docx"
   ```

4. **运行质量检查**：
   ```bash
   python3 scripts/check_letter.py "/home/xichi/workspace/visa-assessment/public/downloads/recommendation/[姓名]/推荐信_[姓名].docx" \
     --applicant "申请人姓名" \
     --evidence evidence_framework.json
   ```
   确认无错误；字数必须在2400~3000字之间。

详细的推荐信模板和写作指南参见 [letter-template.md](letter-template.md)

## 工具脚本

技能提供7个Python脚本（位于 `scripts/` 目录），依赖 `python-docx`。

### 1. read_docx.py — 读取docx文件

```bash
python3 scripts/read_docx.py "证据目录/"       # 读取整个目录
python3 scripts/read_docx.py --json "证据目录/" -o evidence_raw.json
```

### 2. extract_evidence.py — 提取MC/OC证据框架

```bash
python3 scripts/extract_evidence.py "证据目录/" --json -o evidence_framework.json
```

### 3. generate_cv.py — 生成推荐人CV的docx

```bash
python3 scripts/generate_cv.py cv_data.json -o "/home/xichi/workspace/visa-assessment/public/downloads/recommendation/[姓名]/推荐人CV_[姓名].docx"
```

### 4. generate_letter.py — 生成推荐信的docx

```bash
python3 scripts/generate_letter.py letter_data.json -o "/home/xichi/workspace/visa-assessment/public/downloads/recommendation/[姓名]/推荐信_[姓名].docx"
```

JSON 输入格式见脚本底部的 `EXAMPLE_INPUT`。

### 5. verify_identity.py — 推荐人身份验证

```bash
python3 scripts/verify_identity.py --anchor anchor.json --sources sources.json -o report.md
```

**anchor.json 格式**：
```json
{
  "name": "推荐人姓名",
  "known_titles": ["已知职务1", "已知职务2"],
  "known_orgs": ["已知单位"],
  "known_fields": ["专业领域1", "专业领域2"],
  "known_city": "所在城市",
  "relation_to_applicant": "与申请人关系描述",
  "reference_urls": ["参考链接"]
}
```

### 6. map_evidence.py — 证据-推荐人关联度分析

```bash
python3 scripts/map_evidence.py --recommender recommender.json --evidence evidence_framework.json -o mapping.md
```

**recommender.json 格式**：
```json
{
  "name": "推荐人姓名",
  "fields": ["专业领域1", "专业领域2"],
  "org_type": "高校|企业|政府|行业协会|投资机构",
  "expertise_keywords": ["关键词1", "关键词2"],
  "relation_context": "与申请人的合作背景"
}
```

### 7. check_letter.py — 推荐信质量检查

```bash
python3 scripts/check_letter.py "推荐信.docx" --applicant "申请人姓名"
python3 scripts/check_letter.py "推荐信.docx" --applicant "申请人姓名" --evidence evidence_framework.json
```

5维度质量检查：结构完整性、格式规范、证据覆盖度、禁忌项、一致性。

## 执行检查清单

对每位推荐人，确认以下事项完成：

```
推荐人：[姓名]
- [ ] 阶段一：已建立身份锚点
- [ ] 阶段一：每条搜索结果已经过同名排除检查
- [ ] 阶段一：每条采信的信息已通过至少3维度交叉比对
- [ ] 阶段一：已运行 verify_identity.py 生成身份验证报告
- [ ] 阶段一：推荐人CV已生成（docx格式）
- [ ] 阶段二：已构建MC/OC证据框架（evidence_framework.json）
- [ ] 阶段二：所有证据项严格来自原始材料
- [ ] 阶段三：已运行 map_evidence.py 分析证据-推荐人关联度
- [ ] 阶段三：已确定推荐人视角类型
- [ ] 阶段三：已完成证据分配表
- [ ] 阶段三：（非首位推荐人）已读取已完成推荐信确认差异化
- [ ] 阶段四：推荐信正文在2400~3000字之间
- [ ] 阶段四：已通过 generate_letter.py 生成docx
- [ ] 阶段四：已通过 check_letter.py 质量检查
- [ ] 所有文件位于 /home/xichi/workspace/visa-assessment/public/downloads/recommendation/[姓名]/ 目录下
```

## 注意事项

1. **事实准确性**：这是法律文件，任何虚假陈述可能导致签证被拒甚至法律后果
2. **推荐人身份验证**：中文同名现象极为普遍，必须严格执行身份验证流程
3. **证据真实性**：只使用材料中明确记载的事实，不得推测、夸大或编造
4. **范本边界**：任何范本仅作为格式参考，其中的人物信息不得移用
5. **语言要求**：最终推荐信使用中文
6. **跨推荐信差异化**：每位推荐人有唯一论证视角，证据做所有权分配，禁止高度相似表述
