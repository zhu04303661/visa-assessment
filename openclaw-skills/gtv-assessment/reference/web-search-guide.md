# 全网信息搜索与验证指南

本文档指导如何通过公开信息源搜索和验证被评估者的背景信息，是 GTV 评估准确性的关键保障。

---

## 一、搜索目标

全网搜索有三个目标：

1. **验证**：交叉验证用户自述信息（公司、职位、年限、成就等）的真实性
2. **补充**：发现用户未提及但对评分有帮助的公开成就（媒体报道、GitHub 数据等）
3. **定量**：获取量化数据（引用数、Stars 数、用户规模等）支撑客观评分

---

## 二、搜索策略与执行步骤

按以下顺序依次搜索，每个来源标注搜索结果状态。

### 步骤 1：Google / Bing 综合搜索

**搜索词组合**（按优先级）：

| 优先级 | 搜索词 | 目的 |
|--------|--------|------|
| P0 | `"姓名（英文）" + "公司名"` | 基础信息验证 |
| P0 | `"姓名" + 领域关键词（如 AI/fintech）` | 行业相关信息 |
| P1 | `"姓名" + award/recognition/获奖` | MC1 — 专业认可 |
| P1 | `"姓名" + interview/报道/采访` | MC1 — 媒体报道 |
| P2 | `"姓名" + patent/专利` | OC1 — 创新贡献 |
| P2 | `"姓名" + conference/summit/演讲` | MC4/OC2 — 行业影响/学术 |
| P3 | `"姓名" + open source/GitHub` | OC4 — 行业外贡献 |

**注意**：
- 中文名和英文名都要搜索
- 公司名使用当前公司和主要前公司
- 如结果过多，加入 `site:` 限定（如 `site:techcrunch.com`）

### 步骤 2：LinkedIn 验证

**搜索方式**：
- 用户提供了链接 → 直接访问
- 未提供 → `site:linkedin.com/in "姓名"`

**需验证的信息**：

| 验证项 | 与 MC/OC 的关系 |
|--------|-----------------|
| 当前职位与公司 | MC2 — 领导角色 |
| 工作年限（各段经历起止时间） | MC2 — 任职时长 |
| 团队规模（如可见） | MC2 — 团队管理 |
| 推荐人数量和内容 | MC1 — 同行认可 |
| 技能认可数 | MC2/OC3 — 技术专长 |
| 教育背景 | 教育信息验证 |

**差异处理**：
- 职位名称不一致 → 标注，取 LinkedIn 为准
- 公司名称不同但为同一公司（改名/并购） → 备注说明
- 任职时间差 > 6 个月 → 标注差异

### 步骤 3：GitHub 验证

**搜索方式**：
- 用户提供了用户名 → 直接访问 `github.com/用户名`
- 未提供 → `site:github.com "姓名"` 或搜索相关项目名

**需收集的数据**：

| 数据项 | 与 MC/OC 的关系 | 评估标准 |
|--------|-----------------|----------|
| 总 Stars（所有仓库） | OC4 — 开源影响力 | 100+ 有价值，1K+ 优秀，10K+ 卓越 |
| 最高 Star 项目 | OC1/OC4 — 创新/影响 | 项目质量和实用性 |
| 贡献者数量 | OC4 — 社区治理 | 多人参与说明项目有影响力 |
| 贡献日历（近一年） | 基础验证 | 持续活跃度 |
| Fork 数 | OC4 | 被其他人使用/改造 |
| 主导 vs 贡献 | OC3/OC4 | Maintainer vs Contributor |

### 步骤 4：Google Scholar / DBLP 学术搜索

**搜索方式**：
- `scholar.google.com` 搜索姓名
- `dblp.org` 搜索姓名

**需收集的数据**：

| 数据项 | 与 OC2 的关系 | 评估标准 |
|--------|---------------|----------|
| 论文总数 | 基础量 | 学术活跃度 |
| 总被引数 | 学术影响力 | 10+ 有价值，100+ 优秀，1000+ 卓越 |
| h-index | 综合学术指标 | 5+ 有价值，10+ 优秀，20+ 卓越 |
| 最高被引论文 | 核心贡献 | 标注标题和引用数 |
| 发表会议/期刊级别 | 论文质量 | A 类顶会 > B 类 > C 类 |
| 近 5 年发表趋势 | 持续性 | 持续活跃 vs 停滞 |

### 步骤 5：专利数据库搜索

**搜索方式**：
- `patents.google.com` 搜索发明人姓名
- 中国国家知识产权局 CNIPA 搜索

**需收集的数据**：

| 数据项 | 与 OC1 的关系 |
|--------|---------------|
| 专利总数 | 创新数量 |
| 发明专利 vs 实用新型 | 创新质量（发明 >> 实用新型） |
| 已授权 vs 申请中 | 成熟度 |
| 专利领域 | 与申请领域是否匹配 |

### 步骤 6：新闻/媒体搜索

**搜索方式**：
- `"姓名" + 新闻/报道/interview/featured`
- 限定权威来源：`site:bbc.com OR site:techcrunch.com OR site:forbes.com "姓名"`

**媒体分级**：

| 级别 | 代表媒体 | MC1 加分 |
|------|----------|----------|
| 国际一线 | BBC、CNN、NYT、WSJ、Forbes、TechCrunch、The Verge | 高 |
| 国际二线 | Wired、VentureBeat、The Next Web、Protocol | 中高 |
| 行业媒体 | InfoQ、TechTarget、36氪、虎嗅 | 中 |
| 区域/小众 | 地方媒体、个人博客转载 | 低 |
| 付费软文 | 明显的商业推广文章 | 不计 |

**辨别软文的信号**：
- 文章末尾标注"本文为商业推广"或"合作内容"
- 多个不同人物使用相同模板
- 仅在付费发布平台出现

---

## 三、搜索结果记录格式

每项搜索完成后，按以下格式记录，作为 `web_verification` 字段写入评估报告。

```json
{
  "web_verification": {
    "search_date": "2025-03-12",
    "linkedin": {
      "status": "verified",
      "url": "https://linkedin.com/in/xxx",
      "findings": "职位和年限与用户自述一致",
      "discrepancies": []
    },
    "github": {
      "status": "verified",
      "url": "https://github.com/xxx",
      "total_stars": 2500,
      "top_project": {"name": "xxx", "stars": 1800, "forks": 320},
      "active": true
    },
    "scholar": {
      "status": "checked",
      "total_papers": 8,
      "total_citations": 156,
      "h_index": 6,
      "top_paper": {"title": "xxx", "citations": 45, "venue": "AAAI 2023"}
    },
    "patents": {
      "status": "checked",
      "count": 2,
      "type": "invention",
      "granted": true
    },
    "media": {
      "status": "found",
      "articles": [
        {"source": "TechCrunch", "title": "xxx", "date": "2024-05", "type": "editorial"},
        {"source": "36氪", "title": "xxx", "date": "2024-03", "type": "editorial"}
      ]
    },
    "conferences": {
      "status": "checked",
      "talks": [
        {"event": "QCon", "year": 2024, "type": "speaker"},
        {"event": "GopherCon", "year": 2023, "type": "workshop"}
      ]
    },
    "discrepancies": [],
    "additional_findings": [
      "用户未提及但搜索发现：被评选为 2024 XX 行业 Top 50"
    ]
  }
}
```

---

## 四、搜索结果与评分的关联

搜索完成后，将发现的证据归类到对应的 MC/OC 维度：

| 搜索来源 | 可能关联的维度 |
|----------|---------------|
| LinkedIn 职位验证 | MC2 |
| LinkedIn 推荐 | MC1 |
| GitHub Stars/Forks | OC4 |
| GitHub 项目创新性 | OC1 |
| Google Scholar 引用 | OC2 |
| 专利数据 | OC1 |
| 媒体报道 | MC1 |
| 会议演讲 | MC4 / OC2 |
| 商业新闻（融资/上市） | MC3 |
| 政府合作报道 | MC4 |

---

## 五、搜索隐私与合规

1. **仅搜索公开信息**：不访问付费数据库、不尝试登录受限页面
2. **不记录无关个人信息**：仅收集与评估维度相关的专业信息
3. **尊重 robots.txt**：如网站限制爬取，遵守限制
4. **数据保留**：搜索结果仅保存在评估报告中，不另行存储
5. **告知义务**：在报告中标注"本评估参考了公开可用的网络信息"
