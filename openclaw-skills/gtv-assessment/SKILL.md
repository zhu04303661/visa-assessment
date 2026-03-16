---
name: gtv-assessment
description: 评估候选人是否符合英国GTV全球人才签证要求。用于：(1) 评估GTV资格和打分，(2) 分析Exceptional Talent/Promise/Startup Visa路径适用性，(3) 回答"我是否符合GTV"类问题。触发词：GTV评估、资格评估、打分、签证评分、人才签证评估、eligibility assessment。
---

# GTV 资格评估 Skill

评估候选人是否符合英国 Global Talent Visa 要求。采用与 **Tech Nation 官方评审标准对齐的 MC1-MC4 / OC1-OC4 八维指标体系**，结合全网信息验证和三路径差异化评审，输出可复现、稳定的量化评估报告。

## 核心原则

1. **指标对齐官方标准** — MC1-MC4 / OC1-OC4 编号与 Tech Nation 等背书机构的评审维度一一对应
2. **全网信息验证** — 主动搜索被评估者的公开信息（LinkedIn、GitHub、Google Scholar、媒体报道等）作为评估依据的补充和交叉验证
3. **评分稳定可复现** — 每个指标有明确的评分梯度和锚点，相同输入应产出一致的评分结果
4. **路径差异化评审** — Exceptional Talent / Promise / Startup Visa 三条路径采用不同的权重和侧重点

## ⚠️ 聊天输出格式规范（极其重要）

在聊天中与用户交互时，**严格遵守**以下输出规则：

### 禁止事项
- **禁止**在聊天中输出 Markdown 表格（`| 列1 | 列2 |` 格式）— 聊天界面无法良好渲染复杂表格
- **禁止**在聊天中展示 JSON 数据结构或代码块
- **禁止**在聊天中逐一列出每个子评分项的原始分数表
- **禁止**把内部评分过程的详细计算展示给用户

### 聊天中的展示方式
评分过程在内部完成，**聊天中只展示用户友好的摘要**：

**正确示范（聊天中展示）**：
```
### MC1：专业成就与认可（9.2/15 分）

**已确认的优势：**
- ✅ 获得区域技术最佳实践奖（2024）
- ✅ InfoQ 行业媒体报道 1 篇
- ✅ 2 位资深工程师推荐

**需要补充的信息：**
- ❓ 是否有 Forbes、BBC 等一线媒体独立报道？
- ❓ 是否入选过 Forbes 30 Under 30 等权威榜单？

**评分说明：** 您具备区域级行业认可，但缺乏国际级认可（顶级奖项/一线媒体），这是提升空间最大的方向。
```

**错误示范（禁止）**：
```
| 子项 | 权重 | 评估内容 | 评估内容 | 您的证据 | 得分 |
|------|------|----------|----------|----------|------|
| MC1.1 行业奖项 | 30% | ... | ... | 2.5/4.5 | confirmed |
```

### 评估结果的完整展示流程
1. 在聊天中按维度逐一展示评分摘要（使用上述「正确示范」格式）
2. 汇总展示总分和推荐路径
3. 列出所有待补充问题
4. **必须生成 PDF 报告** — 所有详细的子评分项、数据表格、官方标准引用等完整内容放在 PDF 报告中
5. 提供 PDF 下载链接

### 关键：必须完整执行到 PDF 生成
评估的**最终交付物是 PDF 报告**，不是聊天消息。聊天中的展示只是摘要预览。
**每次评估必须完整执行所有阶段（一 → 1.5 → 1.8 → 二 → 三 → 四 → 五），最终生成 PDF 报告并提供下载链接。**
如果因为信息不完整无法精确评分，使用区间评分并在 PDF 中标注，但仍然必须生成 PDF。

## 初始化：收集客户信息

### 必需信息

| 信息项 | 说明 | 来源 |
|--------|------|------|
| 姓名 | 用于全网搜索验证 | 用户提供 |
| 教育背景 | 学历层次、院校名称、专业、毕业年份 | 用户提供或从简历提取 |
| 工作经历 | 公司名称、职位、任职时长、主要职责 | 用户提供或从简历提取 |
| 申请领域 | digital-technology / science / engineering 等 | 用户确认 |
| 具体学科/子领域 | 如 "Artificial Intelligence"、"Software Engineering"、"Biomedical Engineering" 等，用于背书机构匹配 | 用户确认 |
| 技术技能 | 核心技术栈、专业认证 | 用户提供或从简历提取 |

### 可选信息

| 信息项 | 说明 |
|--------|------|
| LinkedIn 主页 | 用于验证工作经历和人脉网络 |
| GitHub 主页 | 用于验证开源贡献和技术实力 |
| Google Scholar / DBLP | 用于验证学术贡献和论文引用 |
| 主要成就 | 项目影响、奖项、专利、开源贡献、会议演讲 |
| 个人网站 / 技术博客 | 用于评估行业影响力 |

如用户未提供上述信息，**必须主动询问**获取。**缺少姓名、教育背景或工作经历时无法进行有效评估**。

## 输出目录结构

所有生成文件**必须保存到以下绝对路径**：

```
/home/xichi/workspace/visa-assessment/public/downloads/assessment/
├── assessment_report.json    # 结构化评估数据（供其他 skill 使用）
├── assessment_report.md      # 可读的评估报告
├── assessment_report.pdf     # 专业 PDF 报告（供客户下载）
└── path_comparison.md        # 路径对比分析（可选）
```

**初始化**：执行前先运行 `mkdir -p /home/xichi/workspace/visa-assessment/public/downloads/assessment/`。

## 工作流程

按以下六个阶段依次执行：

### 阶段一：信息收集与整理

**目标**：引导用户提供背景信息，或从简历文件中提取结构化数据。

**步骤**：

1. **检查必需信息**：确认姓名、教育背景、工作经历、申请领域、技术技能是否齐全
2. **缺失时主动询问**：按优先级逐项询问，优先获取姓名（用于全网搜索）和教育/工作经历
3. **从简历/文件提取**（如用户上传了 PDF/DOCX 文件）：
   - 使用文档解析工具提取文件内容：
   ```bash
   python3 scripts/parse_resume.py /path/to/uploaded/file.pdf
   ```
   - 支持格式：PDF（.pdf）、Word（.doc/.docx）
   - 提取后将文本内容结构化为统一格式
   - **重要**：提取结果需向用户确认，修正可能的 OCR 或排版识别错误
4. **整理为统一结构**：

```json
{
  "applicant": {
    "name": "张三",
    "name_en": "San Zhang",
    "linkedin": "https://linkedin.com/in/xxx",
    "github": "https://github.com/xxx"
  },
  "education": {"degree": "硕士", "university": "UCL", "major": "CS", "year": "2018"},
  "experience": [
    {"position": "Senior Engineer", "company": "Google", "duration": "5年", "responsibilities": ["..."]}
  ],
  "skills": ["Python", "ML", "System Design"],
  "achievements": ["开源项目1000+ stars", "国际会议演讲"],
  "field": "digital-technology",
  "discipline": "Artificial Intelligence"
}
```

### 阶段 1.5：背书机构匹配与官方标准确认

**目标**：根据申请人的领域和具体学科，匹配正确的背书机构，确定适用的官方评审标准。

**步骤**：

1. **背书机构匹配**：根据申请领域和具体学科/子领域，匹配至对应背书机构：
   - **Tech Nation** — digital-technology（含 AI、软件工程、网络安全、金融科技等）
   - **Royal Society** — 自然科学（物理、化学、生物、数学等）
   - **Royal Academy of Engineering** — 工程（机械、电子、土木、生物医学工程等）
   - **British Academy** — 人文社科
   - **Arts Council England (ACE)** — 艺术文化
   - **UK Research and Innovation (UKRI)** — 跨学科研究

2. **适用标准确认**：
   - **Tech Nation 申请人**：映射至 5 大 qualifying criteria 类别 — recognition（认可）、research（研究）、product-led contributions（产品主导贡献）、outside contributions（外部贡献）、innovation（创新）
   - **Science/Engineering 申请人**：映射至 peer review 相关要求
   - 输出适用的官方标准引用（见文末「官方标准引用库」）

3. **输出**：记录 `endorsing_body`、`applicable_criteria`、`official_standard_refs`，供后续评分和报告使用

### 阶段 1.8：申请者领域深度研究

**目标**：深入了解申请者所在行业领域的现状、发展方向和层级体系，用于准确定位申请者在其领域中的层次和影响力。

**为什么重要**：不同领域的"杰出"标准差异巨大——AI 领域的 Staff Engineer 与传统制造业的高级工程师所代表的行业层级完全不同。只有理解申请者所在领域的上下文，才能给出准确且有说服力的评估。

**步骤**：

1. **领域现状调研**：
   - 搜索申请者所在领域/细分赛道的市场规模、增长趋势
   - 了解该领域的头部公司、关键玩家
   - 识别领域内的权威奖项、顶级会议、行业标准

2. **层级体系对标**：
   - 了解该领域的职级体系（如 Tech 行业：IC→Senior→Staff→Principal→Fellow）
   - 将申请者的职位/角色对标到行业通用层级
   - 评估申请者在所在公司和行业内的相对位置（前 1%？前 5%？前 10%？）

3. **领域热点与方向**：
   - 识别申请者研究/工作方向在领域内的重要性
   - 评估其技术栈/专业方向的市场需求和前景
   - 判断申请者是否处于领域前沿（cutting-edge）还是传统方向

4. **竞争力基准**：
   - 参考已知的成功 GTV 申请案例（同领域）
   - 建立该领域的"杰出人才"基准画像
   - 识别申请者相对于基准的优势和差距

5. **输出领域分析**：记录到 `assessment_report.json` 的 `field_analysis` 字段：
```json
{
  "field_analysis": {
    "sector": "AI/ML",
    "sub_field": "Large Language Models",
    "market_status": "高速增长期，全球市场规模预计 2025 年达 $XXB",
    "key_players": ["OpenAI", "Google DeepMind", "Anthropic"],
    "industry_level": "Staff Engineer（行业前 5% 层级）",
    "field_relevance": "处于领域最前沿方向",
    "talent_benchmark": "同领域成功 GTV 申请者通常具备：5+ 年经验、顶会论文 3+ 篇、管理 10+ 人团队",
    "applicant_positioning": "高于行业中位数，接近但尚未达到 Exceptional Talent 基准"
  }
}
```

### 阶段二：全网信息搜索与验证

**目标**：通过公开信息源搜索被评估者的相关信息，补充用户未提及的成就，交叉验证用户自述内容。

**重要**：此阶段**必须执行**，是保障评估准确性和完整性的关键。

**步骤**：

1. **搜索策略**（按以下顺序执行搜索）：

| 搜索源 | 搜索方式 | 获取信息 |
|--------|----------|----------|
| Google / Bing | `"姓名" + 公司名 + 领域关键词` | 媒体报道、行业认可、公开演讲 |
| LinkedIn | `site:linkedin.com "姓名"` 或直接访问用户提供的链接 | 工作经历验证、推荐数、人脉 |
| GitHub | `site:github.com "用户名"` 或直接访问 | Stars、Forks、贡献者、项目活跃度 |
| Google Scholar / DBLP | `scholar.google.com "姓名"` | 论文数量、引用数、h-index |
| 专利数据库 | `patents.google.com "姓名"` | 专利数量、类型 |
| 技术社区 | `site:medium.com OR site:dev.to "姓名"` | 技术博客、粉丝量、影响力 |
| 新闻媒体 | `"姓名" + "公司名" + 新闻/报道/采访` | 媒体曝光度、行业影响力 |
| 行业会议 | `"姓名" + conference/summit/keynote` | 演讲记录、级别 |

2. **信息验证原则**：
   - 用户自述的公司、职位、年限必须与 LinkedIn 等公开信息一致
   - 用户声称的专利/论文必须在公开数据库可查
   - 用户声称的开源项目必须在 GitHub 可见
   - **发现不一致时**：在报告中标注，并降低相关维度的置信度

3. **信息补充**：
   - 搜索到但用户未提及的成就（如被媒体报道、GitHub 项目的社区影响力等），应**主动纳入评估**并告知用户
   - 搜索结果归类到对应的 MC/OC 维度

4. **输出验证摘要**：记录每项搜索的结果，作为 `assessment_report.json` 的 `web_verification` 字段

### 阶段三：八维指标评分

**目标**：按 MC1-MC4 / OC1-OC4 逐项打分。

**指标体系总览**：

#### Mandatory Criteria (MC) — 权重 60%

MC 评估申请人是否为领域内的"公认领导者"（Talent）或"新兴领导者"（Promise）。

| 编号 | 标准 | 满分 | 评估要素 |
|------|------|------|----------|
| MC1 | 专业成就与认可 | 15 | 行业奖项、媒体报道、同行评议、专业认可 |
| MC2 | 领导角色与产品贡献 | 18 | 职位级别、团队规模、产品/平台领导、组织影响力 |
| MC3 | 商业成功证据 | 15 | 营收增长、用户规模、市场份额、融资记录、商业数据 |
| MC4 | 行业影响力 | 12 | 行业标准参与、政府合作、大规模项目影响、市场地位 |

MC 总计：60 分

#### Optional Criteria (OC) — 权重 40%

OC 评估申请人在核心标准之外的卓越表现，**至少需满足 2 项**。

| 编号 | 标准 | 满分 | 评估要素 |
|------|------|------|----------|
| OC1 | 创新贡献 | 10 | 专利、技术突破、创新产品/方法、颠覆性成果 |
| OC2 | 学术与知识贡献 | 10 | 论文发表、引用数、顶会演讲、教材/教程 |
| OC3 | 技术领导力 | 10 | 技术架构决策、团队技术建设、Mentor、开源治理 |
| OC4 | 行业外贡献与社会影响 | 10 | 开源贡献、社区影响力、社会价值、跨界合作 |

OC 总计：40 分

**总分 = MC 得分 + OC 得分 = 100 分满分**

**评分规则**：
- 每个维度按 [assessment-dimensions.md](reference/assessment-dimensions.md) 中定义的**六级梯度**（0-5 级）评分
- 级别分数 × 维度满分 / 5 = 该维度得分
- **必须为每个维度标注具体评级理由和对应证据**
- **全网搜索结果必须纳入评分依据**

**子评分项展开（关键改进）**：

每个维度必须拆解为具体的子评分项进行独立评估，而非笼统打分。

**MC1 子评分项**（满分 15 = 各子项加权汇总）：
| 子项 | 权重 | 评估内容 | 依据要求 |
|------|------|----------|----------|
| MC1.1 行业奖项 | 30% | 奖项名称、颁发机构、级别、年份 | 需提供证书或公开可查的获奖记录 |
| MC1.2 媒体报道 | 25% | 报道媒体名称、类型（专访/提及）、发表日期 | 需提供链接或截图，区分独立报道vs付费推广 |
| MC1.3 同行认可 | 25% | 推荐人身份、与申请人关系、推荐内容具体程度 | 需注明推荐人在行业内的地位 |
| MC1.4 专业榜单/认证 | 20% | 榜单名称、入选年份、行业认证 | 需公开可查 |

**MC2 子评分项**（满分 18 = 各子项加权汇总）：
| 子项 | 权重 | 评估内容 | 依据要求 |
|------|------|----------|----------|
| MC2.1 职位级别 | 25% | 职位头衔、在公司层级中的位置 | LinkedIn 验证 |
| MC2.2 团队管理 | 25% | 直接下属人数、跨部门影响范围 | 具体数字 |
| MC2.3 产品影响 | 30% | 主导/核心贡献的产品、用户规模、商业指标 | 需量化数据 |
| MC2.4 决策权限 | 20% | 技术路线决策、预算管理、战略参与 | 具体案例 |

**MC3 子评分项**（满分 15 = 各子项加权汇总）：
| 子项 | 权重 | 评估内容 | 依据要求 |
|------|------|----------|----------|
| MC3.1 营收贡献 | 30% | 个人/团队带来的营收数据 | 需量化（金额或增长率） |
| MC3.2 用户增长 | 25% | DAU/MAU、注册用户增长 | 需具体数字和时间段 |
| MC3.3 融资记录 | 20% | 参与的融资轮次、金额、估值变化 | Crunchbase 等可查 |
| MC3.4 市场影响 | 25% | 市场份额、行业排名、竞品对比 | 行业报告或公开数据 |

**MC4 子评分项**（满分 12 = 各子项加权汇总）：
| 子项 | 权重 | 评估内容 | 依据要求 |
|------|------|----------|----------|
| MC4.1 标准/规范参与 | 30% | 参与的行业标准、技术规范 | 标准组织官网可查 |
| MC4.2 行业演讲 | 25% | 会议名称、级别、演讲类型（keynote/talk/poster） | 会议官网可查 |
| MC4.3 政府/公共合作 | 25% | 政府项目、公共部门技术顾问 | 公开可查 |
| MC4.4 大规模影响 | 20% | 影响的终端用户数、企业数 | 需量化 |

**OC1 子评分项**（满分 10）：
| 子项 | 权重 | 评估内容 | 依据要求 |
|------|------|----------|----------|
| OC1.1 专利 | 35% | 专利数量、类型（发明/实用新型）、授权状态 | 专利数据库可查 |
| OC1.2 技术突破 | 35% | 新算法、新架构、性能飞跃的描述 | 论文/产品可证明 |
| OC1.3 创新产品 | 30% | 首创性产品/功能、市场反响 | 用户数据或媒体报道 |

**OC2 子评分项**（满分 10）：
| 子项 | 权重 | 评估内容 | 依据要求 |
|------|------|----------|----------|
| OC2.1 论文发表 | 35% | 数量、会议/期刊级别（A/B/C） | Google Scholar/DBLP 可查 |
| OC2.2 引用影响 | 30% | 被引次数、h-index | Google Scholar 可查 |
| OC2.3 学术演讲 | 20% | keynote/tutorial/invited talk | 会议官网可查 |
| OC2.4 教育贡献 | 15% | 教材、课程、MOOCs | 公开可查 |

**OC3 子评分项**（满分 10）：
| 子项 | 权重 | 评估内容 | 依据要求 |
|------|------|----------|----------|
| OC3.1 技术架构决策 | 35% | 主导的技术选型和架构设计 | 具体案例 |
| OC3.2 团队建设 | 30% | 建立的技术标准、代码规范、培训体系 | 具体描述 |
| OC3.3 Mentor经历 | 20% | 指导的工程师人数和成长情况 | 具体案例 |
| OC3.4 开源治理 | 15% | Maintainer/PMC 角色 | GitHub 可查 |

**OC4 子评分项**（满分 10）：
| 子项 | 权重 | 评估内容 | 依据要求 |
|------|------|----------|----------|
| OC4.1 开源贡献 | 35% | 项目 stars、forks、影响力 | GitHub 可查 |
| OC4.2 社区影响 | 25% | 博客粉丝、演讲受众、社交影响力 | 公开可查 |
| OC4.3 社会价值 | 25% | 公益技术项目、教育项目 | 公开可查 |
| OC4.4 跨界合作 | 15% | 与非技术领域的合作 | 具体案例 |

**待补充标记与区间评分（关键改进）**：

当评分信息不完整时，不应随意猜测，而应明确标记并使用区间评分：

1. **信息充分** → 精确评分，如 `MC1.1 = 3.5/4.5`
2. **信息部分缺失** → 区间评分，如 `MC1.2 = [1.0-2.5]/3.75`，并标记 `"status": "pending_info"`，同时生成具体补充问题
3. **信息完全缺失** → 临时最低分 + 标记，如 `MC1.3 = 0/3.75`，`"status": "missing"`

**待补充问题生成规则**：对每个标记为 `pending_info` 或 `missing` 的子项，必须生成一个具体的补充问题：
- `MC1.1 pending_info` → "请问您是否获得过行业奖项？如有，请提供奖项名称、颁发机构和获奖年份。"
- `MC2.2 missing` → "请问您目前直接管理多少人的团队？是否有跨部门管理经验？"
- `MC3.1 pending_info` → "您负责的产品/项目为公司带来了多少营收？请提供具体金额或增长率数据。"

**区间评分汇总规则**：
- 维度总分 = Σ(子项确定分 + 子项区间中位数)
- 维度总分区间 = [Σ子项最低分, Σ子项最高分]
- 在报告中同时展示确定分和区间：如 "MC1 得分: 9.2 (区间: 7.5-11.0)"

**评分流程**：

1. 逐个维度评分，参考 [assessment-dimensions.md](reference/assessment-dimensions.md) 的详细指标
2. 对每个维度的每个子项：
   a. 列出用户提供的相关证据
   b. 列出全网搜索补充的证据
   c. 判断信息完整度（充分/部分缺失/完全缺失）
   d. 信息充分 → 精确评分；信息部分缺失 → 区间评分 + 补充问题；信息缺失 → 标记
   e. 记录评分理由（含官方标准引用）
3. 汇总各子项得分为维度得分（确定分 + 区间）
4. 汇总 MC/OC 得分和总分（同时输出确定总分和区间总分）
5. 生成待补充问题列表（`pending_questions`）

**⚠️ 聊天展示规则**：评分过程在内部完成，**不要**在聊天中输出子评分项表格。按维度输出简洁的评分摘要（参见「聊天输出格式规范」），详细数据全部写入 assessment_report.json 和 PDF 报告。

### 阶段四：路径推荐与差距分析

**目标**：根据评分推荐最优路径，分析薄弱环节。

**三条路径的评审差异**：

| 维度 | Exceptional Talent | Exceptional Promise | Startup Visa |
|------|-------------------|-------------------|--------------|
| 总分门槛 | 80+ | 65+ | 55+ |
| MC 侧重 | MC1-MC4 均需强证据 | MC2+MC3 为核心，MC1/MC4 可较弱 | MC3 为核心（商业成功），MC2 次之 |
| OC 要求 | 至少 2 项达良好 | 至少 2 项达中等 | OC1（创新）为核心，其余可弱 |
| 工作年限 | 通常 5+ 年 | 通常 3+ 年 | 无硬性要求 |
| 核心审视 | "已经做到什么" | "正在成为什么" | "商业计划能否落地" |

**步骤**：

1. **按路径评估达标情况**：逐项比对每条路径的要求
2. **确定推荐路径**：首选得分最高且达标的路径
3. **差距分析**：对未达标维度，给出具体的改进方向和预估提升空间
4. **生成路径对比**（可选）：运行 `scripts/compare_paths.py`

### 阶段五：报告生成与持久化（必须执行，不可跳过）

**目标**：生成评估报告并保存，提供下载链接。**本阶段是评估的核心交付环节，必须执行。**

**⏳ 等待提示（必须执行）**：在开始生成报告前，**必须先向用户发送等待提示**：

> ⏳ 正在为您生成专业评估报告，包含全网信息验证、八维指标评分、路径分析和PDF报告，预计需要 **3-10 分钟**，请耐心等待...

**重要**：无论评估信息是否完整，都**必须**生成 PDF 报告。信息不完整的维度使用区间评分，并在报告中标注为"待补充"。

**报告要求**：
- 每个评分必须包含官方标准引用和评分理由（scoring_justification）
- 报告必须包含背书机构推荐及推荐理由
- 必须突出显示常见非背书风险因素（如证据不足、领域不匹配、标准未达标等）

**步骤**：

1. **构建 assessment_report.json**，包含：

```json
{
  "assessment_version": "2.0",
  "assessment_date": "2025-03-12",
  "applicant_info": {
    "name": "...",
    "field": "digital-technology",
    "discipline": "Artificial Intelligence",
    "endorsing_body": "Tech Nation",
    "current_position": "...",
    "company": "...",
    "years_of_experience": 5
  },
  "field_analysis": {
    "sector": "AI/ML",
    "sub_field": "Large Language Models",
    "market_status": "...",
    "key_players": ["..."],
    "industry_level": "...",
    "field_relevance": "...",
    "talent_benchmark": "...",
    "applicant_positioning": "..."
  },
  "overall_score": 78,
  "recommended_pathway": "Exceptional Promise",
  "confidence": 0.85,
  "mc_scores": {
    "MC1": {
      "score": 10, "max": 15, "level": 3,
      "score_range": [7.5, 11.0],
      "evidence": "...",
      "scoring_justification": "...",
      "sub_scores": {
        "MC1.1_awards": {"score": 3.5, "max": 4.5, "status": "confirmed", "evidence": "ACM Best Paper 2023", "justification": "..."},
        "MC1.2_media": {"score": 2.0, "max": 3.75, "status": "pending_info", "score_range": [1.0, 2.5], "evidence": "TechCrunch 报道1篇", "justification": "...", "pending_question": "是否有其他主流媒体报道？"},
        "MC1.3_peer": {"score": 2.5, "max": 3.75, "status": "confirmed", "evidence": "2位行业专家推荐", "justification": "..."},
        "MC1.4_recognition": {"score": 2.0, "max": 3.0, "status": "confirmed", "evidence": "入选XX榜单", "justification": "..."}
      }
    },
    "MC2": {"score": 14, "max": 18, "level": 4, "evidence": "...", "web_verified": true, "scoring_justification": "...", "sub_scores": {...}},
    "MC3": {"score": 12, "max": 15, "level": 4, "evidence": "...", "web_verified": false, "scoring_justification": "...", "sub_scores": {...}},
    "MC4": {"score": 8, "max": 12, "level": 3, "evidence": "...", "web_verified": true, "scoring_justification": "...", "sub_scores": {...}}
  },
  "oc_scores": {
    "OC1": {"score": 8, "max": 10, "level": 4, "evidence": "...", "web_verified": true, "scoring_justification": "...", "sub_scores": {...}},
    "OC2": {"score": 6, "max": 10, "level": 3, "evidence": "...", "web_verified": true, "scoring_justification": "...", "sub_scores": {...}},
    "OC3": {"score": 7, "max": 10, "level": 3, "evidence": "...", "web_verified": false, "scoring_justification": "...", "sub_scores": {...}},
    "OC4": {"score": 5, "max": 10, "level": 2, "evidence": "...", "web_verified": false, "scoring_justification": "...", "sub_scores": {...}}
  },
  "pending_questions": [
    {"dimension": "MC1", "sub_item": "MC1.2", "question": "是否有其他主流媒体（如 Forbes、BBC、TechCrunch 等）对您或您的工作进行过独立报道？", "impact": "可能影响 MC1 得分 1.5-2.5 分"},
    {"dimension": "MC3", "sub_item": "MC3.1", "question": "请提供您负责的产品/项目的具体营收数据或增长率", "impact": "可能影响 MC3 得分 2-4 分"}
  ],
  "endorsing_body_recommendation": {
    "body": "Tech Nation",
    "reason": "申请人领域为 digital-technology，具体学科为 AI，符合 Tech Nation 管辖范围"
  },
  "non_endorsement_risk_factors": ["证据不足的维度", "需补充的官方标准覆盖"],
  "web_verification": {
    "linkedin_verified": true,
    "github_verified": true,
    "scholar_checked": true,
    "patent_checked": true,
    "media_found": ["..."],
    "discrepancies": []
  },
  "path_analysis": {
    "exceptional_talent": {"score": 78, "meets_threshold": false, "gaps": ["MC1 需更强的行业认可"]},
    "exceptional_promise": {"score": 78, "meets_threshold": true, "gaps": []},
    "startup_visa": {"score": 72, "meets_threshold": true, "gaps": ["OC4 社会影响较弱"]}
  },
  "strengths": ["..."],
  "weaknesses": ["..."],
  "recommendation": "...",
  "professional_advice": ["..."]
}
```

2. **保存 JSON 文件**：将 JSON 写入 `/home/xichi/workspace/visa-assessment/public/downloads/assessment/assessment_report.json`

3. **⚠️ 生成 PDF 报告（最重要的步骤，不可跳过）**：
```bash
cd /home/xichi/.openclaw/workspace/skills/gtv-assessment && python3 scripts/generate_pdf_report.py /home/xichi/workspace/visa-assessment/public/downloads/assessment/assessment_report.json -o /home/xichi/workspace/visa-assessment/public/downloads/assessment/assessment_report.pdf
```
**必须确认命令输出包含 "PDF 已生成" 字样，否则排查错误并重试。**

4. **生成 Markdown 报告**（可选，PDF 为主要交付物）：
```bash
cd /home/xichi/.openclaw/workspace/skills/gtv-assessment && python3 scripts/generate_report.py /home/xichi/workspace/visa-assessment/public/downloads/assessment/assessment_report.json -o /home/xichi/workspace/visa-assessment/public/downloads/assessment/assessment_report.md
```

5. **向用户提供下载链接（必须包含 PDF）**：
```
📄 您的 GTV 专业评估报告已生成完毕！

📎[GTV评估报告PDF](/home/xichi/workspace/visa-assessment/public/downloads/assessment/assessment_report.pdf)
📎[评估数据JSON](/home/xichi/workspace/visa-assessment/public/downloads/assessment/assessment_report.json)
```

**⚠️ 如果 PDF 生成失败，不要只提供 Markdown 和 JSON，必须重试 PDF 生成或向用户说明失败原因。**

6. **确认所有文件已保存**

## 评估指标体系（详细）

详细的每个维度的评分梯度和锚定标准，参见：
- [assessment-dimensions.md](reference/assessment-dimensions.md) — MC1-MC4 / OC1-OC4 各维度的详细评分要素和六级评分梯度
- [scoring-guide.md](reference/scoring-guide.md) — 六大背书机构的差异化评分侧重和路径评审差异
- [web-search-guide.md](reference/web-search-guide.md) — 全网信息搜索与验证的具体操作指南

## 评分稳定性规则

为确保评分可复现，必须遵循以下规则：

1. **锚定评分**：每个维度的评级必须对照 assessment-dimensions.md 中的六级梯度表，找到最匹配的级别
2. **证据驱动**：评级理由必须引用具体证据（用户提供 + 全网搜索），禁止仅凭印象打分
3. **边界裁定**：当证据跨越两个级别时，取较低级别 + 0.5 的折中分
4. **缺失降级**：无法验证的用户声称，该项证据的权重降低 50%
5. **最终校验**：MC 总分 + OC 总分 = 总分，确保计算无误

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
| gtv-copywriting | assessment_report.json | 文案撰写的优势论证、MC/OC 覆盖选择 |
| gtv-recommendation-letter | assessment_report.json | 推荐信的 MC/OC 证据选择和差异化 |

**数据传递**：`assessment_report.json` 中的 `mc_scores`、`oc_scores` 使用 MC1-MC4/OC1-OC4 编号，与推荐信 skill 的证据框架直接对应。

## 工具脚本

### 0. parse_resume.py — 简历文件解析

```bash
python3 scripts/parse_resume.py /path/to/resume.pdf
python3 scripts/parse_resume.py /path/to/resume.docx
```

从 PDF/DOCX 简历文件中提取纯文本内容，供 AI 进一步解析为结构化信息。
支持中英文混合文档。

**依赖**：`pdfminer.six`, `python-docx`

### 1. generate_report.py — 生成 Markdown 评估报告

```bash
python3 scripts/generate_report.py assessment_data.json -o assessment_report.md
```

从评估数据 JSON 生成格式化的 Markdown 报告，使用 MC1-MC4/OC1-OC4 编号展示评分明细。

### 2. generate_pdf_report.py — 生成 PDF 评估报告

```bash
python3 scripts/generate_pdf_report.py assessment_data.json -o assessment_report.pdf
```

**依赖**：`reportlab`（`pip install reportlab`）
**字体**：Noto Sans CJK SC（`sudo apt install fonts-noto-cjk`）

### 3. compare_paths.py — 路径对比分析

```bash
python3 scripts/compare_paths.py assessment_data.json -o path_comparison.md
```

## 执行检查清单

```
- [ ] 阶段一：已收集姓名、教育背景、工作经历、申请领域、具体学科/子领域、技术技能
- [ ] 阶段一：已使用 parse_resume.py 解析用户上传的文件（如有）
- [ ] 阶段一：已整理为统一的 extracted_info 结构
- [ ] 阶段 1.5：已匹配背书机构并确认适用官方标准
- [ ] 阶段 1.8：已完成申请者领域深度研究
- [ ] 阶段 1.8：已建立领域层级基准和人才画像对标
- [ ] 阶段二：已执行全网搜索（Google、LinkedIn、GitHub、Scholar）
- [ ] 阶段二：已交叉验证用户提供的关键信息
- [ ] 阶段二：搜索到的补充信息已纳入评估
- [ ] 阶段三：已按 MC1-MC4/OC1-OC4 逐项评分
- [ ] 阶段三：已对每个维度拆解子评分项逐项评估
- [ ] 阶段三：信息缺失的子项已标记为 pending_info 或 missing
- [ ] 阶段三：已为所有 pending 子项生成具体补充问题
- [ ] 阶段三：已使用区间评分处理信息不完整的维度
- [ ] 阶段三：每个维度有评级理由、对应证据及 scoring_justification（含官方标准引用）
- [ ] 阶段三：评分遵循六级梯度和稳定性规则
- [ ] 阶段四：已确定推荐路径并完成差距分析
- [ ] 阶段五：报告含官方标准引用、评分理由、背书机构推荐及非背书风险因素
- [ ] 阶段五：已生成 assessment_report.json
- [ ] 阶段五：已运行 generate_report.py 生成 assessment_report.md
- [ ] 阶段五：已运行 generate_pdf_report.py 生成 assessment_report.pdf
- [ ] 已向用户展示评估报告摘要
- [ ] 已向用户提供下载链接
```

## 官方标准引用库

GTV 官方标准参考编号及来源：

| 引用 ID | 适用范围 | 说明 |
|---------|----------|------|
| GTE 3.1-3.3 | Science bodies | 科学类背书机构标准（Royal Society 等） |
| GTE 4.1-4.3 | ACE | Arts Council England 艺术文化标准 |
| GTE 5.1-5.3 | PACT | 制作人联盟标准 |
| GTE 6.1-6.3 | BFC | 英国电影学会标准 |
| GTE 7.1-7.3 | RIBA | 英国皇家建筑师学会标准 |
| GTE 8.1-8.10 | Tech Nation | 数字技术领域标准（5 大 qualifying criteria） |

**官方来源**：
- https://www.gov.uk/global-talent-digital-technology
- https://www.gov.uk/government/publications/global-talent-endorsing-bodies/

## 注意事项

1. **评分仅供参考**：最终决定由 UKVI 做出，不同背书机构评审标准有差异
2. **全网搜索隐私**：仅搜索公开可访问的信息，不访问付费数据库或私人信息
3. **信息准确性**：发现用户自述与搜索结果不一致时，在报告中客观标注，不做主观判断
4. **不硬编码客户信息**：所有示例和模板中不使用真实客户姓名或敏感数据
