# 简历信息提取规则

本文档定义从简历文本中提取结构化信息的详细规则，供 `parse_resume.py` 及人工整理时参考。

## 1. 教育背景提取规则

### 1.1 学历关键词

| 中文 | 英文 | 层级 |
|------|------|------|
| 博士、PhD、Ph.D. | Doctorate | 最高 |
| 硕士、研究生、MS、MSc、MA、MBA | Master | 高 |
| 学士、本科、BS、BA、BSc | Bachelor | 中 |
| 专科、大专 | Associate | 基础 |
| 在读、在读研究生 | In Progress | 进行中 |

### 1.2 院校名称识别

- **模式**：通常出现在学历关键词之后、专业之前
- **常见格式**：
  - `[学历] [院校名称] [专业] [年份]`
  - `[院校名称] - [专业] - [学历] [年份]`
- **识别要点**：
  - 院校名通常为 2-10 个字符（中英文）
  - 常见后缀：大学、学院、University、College、Institute
  - 国际院校：可含国家名（如 UCL、MIT、Stanford）

### 1.3 专业分类映射

| 原始表述 | 标准分类 |
|----------|----------|
| 计算机、CS、计算机科学、软件工程 | digital-technology |
| 人工智能、AI、机器学习、ML、数据科学 | digital-technology |
| 电子、通信、自动化 | engineering |
| 数学、物理、化学、生物 | science |
| 金融、经济、管理、MBA | business |
| 其他 | 保留原文 |

### 1.4 毕业时间提取

- **年份模式**：`20XX`、`XXXX年`、`XXXX.XX`
- **区间模式**：`20XX-20XX`、`20XX.09-20XX.06`
- **推断**：若仅有入学年份，毕业年份可推断为入学+学制（硕士+2、博士+4-5）

### 1.5 GPA/排名

- **GPA**：`GPA: X.XX`、`GPA X.X/4.0`、`3.8/4.0`
- **排名**：`前X%`、`Top X%`、`排名第X`、`X/XXX`

---

## 2. 工作经历提取规则

### 2.1 职位级别识别（由高到低）

| 级别 | 关键词 | 示例 |
|------|--------|------|
| C-level | CEO、CTO、CFO、COO、Chief、创始人 | CEO、CTO |
| VP | VP、Vice President、副总裁 | VP of Engineering |
| Director | Director、总监、主任 | Director of Product |
| Manager | Manager、主管、经理 | Engineering Manager |
| Senior IC | Senior、Principal、Staff、Lead | Senior Engineer、Principal |
| IC | Engineer、Developer、Analyst、专员 | Software Engineer |

**优先级**：C-level > VP > Director > Manager > Senior IC > IC

### 2.2 公司分类

| 类型 | 识别特征 |
|------|----------|
| FAANG/大厂 | 知名科技公司名（Google、Meta、Apple、Amazon、Microsoft、字节、腾讯、阿里） |
| 独角兽 | 估值>10亿美元、融资轮次、行业龙头 |
| 创业公司 | 初创、Startup、种子轮、A轮 |
| 传统企业 | 非科技行业、传统制造业、金融 |
| 政府/学术 | 政府、高校、研究所、实验室 |

### 2.3 时长提取

- **模式**：`20XX.XX - 至今`、`20XX - 20XX`、`X年X月`、`X years`
- **时长计算**：结束日期 - 开始日期，不足整年按比例

### 2.4 管理范围

- **团队规模**：`带领X人团队`、`管理X人`、`team of X`
- **预算/项目**：`负责X万预算`、`X个项目`

---

## 3. 技能提取规则

### 3.1 硬技能 vs 软技能

| 类型 | 特征 | 示例 |
|------|------|------|
| 硬技能 | 可量化、可验证、技术栈 | Python、Java、TensorFlow、AWS |
| 软技能 | 抽象能力、人际 | 沟通、领导力、团队协作 |

### 3.2 技术栈分类

| 类别 | 关键词 |
|------|--------|
| 编程语言 | Python、Java、C++、Go、Rust、JavaScript、TypeScript |
| 框架/库 | React、Vue、Spring、Django、TensorFlow、PyTorch |
| 云/基础设施 | AWS、GCP、Azure、Kubernetes、Docker |
| 数据库 | MySQL、PostgreSQL、MongoDB、Redis |
| 工具 | Git、CI/CD、Jira、Agile |

### 3.3 熟练度推断

- **精通/熟练**：`精通`、`熟练`、`深入`、`Proficient`、`Expert`
- **熟悉**：`熟悉`、`了解`、`Familiar`、`Working knowledge`
- **基础**：`了解`、`Basic`、`入门`

---

## 4. 成就提取规则

### 4.1 量化成就识别模式

**模式**：`[数字] + [动词] + [结果]`

| 动词 | 示例 |
|------|------|
| 提升、提升、优化 | 性能提升200%、效率提升50% |
| 带领、管理 | 带领10人团队完成X项目 |
| 实现、达成 | 实现营收增长300%、用户增长至100万 |
| 获得、获得 | 获得X轮融资、获得X奖项 |
| 发表、申请 | 发表X篇论文、申请X项专利 |

### 4.2 奖项识别

- **模式**：`获得`、`荣获`、`Award`、`Prize`、`Recognition`
- **级别**：国际/国家级 > 省部级 > 行业/公司级

### 4.3 专利/论文识别

| 类型 | 关键词 |
|------|--------|
| 专利 | 专利、Patent、发明、实用新型 |
| 论文 | 论文、Paper、发表、Publication、顶会、顶刊 |
| 开源 | GitHub、stars、contributors、开源项目 |

---

## 5. GTV 亮点匹配规则

### 5.1 MC（Mandatory Criteria）维度

| MC 维度 | 关键词 | 匹配模式 |
|---------|--------|----------|
| MC1 专业成就 | 奖项、认可、媒体报道、行业认可 | 奖项名、媒体名、认可机构 |
| MC2 领导角色 | VP、Director、CTO、创始人、负责、领导 | 职位级别 + 职责描述 |
| MC3 商业成功 | 营收、增长、用户、市场份额、融资 | 数字 + 商业指标 |
| MC4 行业影响力 | 政府项目、数据统计、市场份额、行业标准 | 政府、行业、规模 |

### 5.2 OC（Optional Criteria）维度

| OC 维度 | 关键词 | 匹配模式 |
|---------|--------|----------|
| OC1 创新贡献 | 创新、专利、技术突破、收入增长 | 专利号、创新描述 |
| OC2 学术贡献 | 论文、专利、学术、顶会、顶刊 | 论文标题、会议名 |
| OC3 技术领导力 | 架构、技术决策、团队、技术方向 | 技术 + 领导力 |
| OC4 行业外贡献 | 开源、社区、社会影响、跨界 | 开源项目、社区贡献 |

### 5.3 高价值关键词（加分项）

- **国际**：国际会议、International、全球、Global
- **规模**：百万、千万、亿、million、billion
- **权威**：国家级、政府、行业标准、Top
- **领导力**：架构师、Principal、Staff、Lead、Mentor
