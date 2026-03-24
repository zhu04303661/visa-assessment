# 惜池移民 — AI 驱动的英国全球人才签证评估与文书平台

# Xichi Immigration — AI-Powered UK GTV Assessment & Copywriting Platform

[English](#english) | [中文](#chinese)

---

<a name="english"></a>
## English

### Overview

A full-stack AI-powered platform for UK Global Talent Visa (GTV) applicants. The system provides end-to-end support — from initial eligibility assessment and scoring, through material collection and evidence validation, to AI-assisted copywriting of personal statements, recommendation letters, and application documents.

### Key Features

- **Resume Analysis & Scoring**: Upload resume files (PDF/DOC/DOCX/TXT) or paste text. Multi-dimensional AI analysis across education, industry, work experience, and technical expertise.
- **GTV Eligibility Assessment**: Automated evaluation against official Tech Nation / UK government criteria with Exceptional Talent, Exceptional Promise, and Startup Visa pathway recommendations.
- **Deep Assessment**: In-depth evaluation with LangGraph-based scoring agents, Optional Criteria (OC) analysis, and gap identification.
- **AI Smart Chat**: Multiple chat modes — OpenClaw WebSocket chat, Claude Code agent chat, and Vercel AI SDK chat — with persistent history and sharable links.
- **Copywriting Workflow**: Project-based multi-stage document pipeline:
  - Material collection & upload
  - Content extraction & analysis
  - Application framework building
  - Personal statement, cover letter & recommendation letter generation
  - AI assistant (Agent / Ask modes) with real-time streaming
- **Material Management**: Upload, tag, classify, and preview application materials with support for MinIO / S3 / OSS / COS object storage.
- **Knowledge Base**: Rule-based knowledge management for GTV assessment criteria.
- **PDF Report Generation**: Multiple export styles with CJK font support.
- **Bilingual Support**: Full English and Chinese interface.
- **Admin Dashboard**: User management and system administration.
- **SEO Optimized**: Full metadata, sitemap, robots.txt, JSON-LD structured data, and dynamic OG images.

### Tech Stack

#### Frontend

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| UI Runtime | React 19 |
| Styling | Tailwind CSS v4, tw-animate-css |
| Component Libraries | shadcn/ui, Semi UI (`@douyinfe/semi-ui`), Radix UI |
| Rich Text Editor | TipTap |
| Charts & Visualization | Recharts, Mermaid, React Flow (`@xyflow/react`) |
| Video / Animation | Remotion, Framer Motion |
| AI Integration | Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/azure`) |
| PDF | jsPDF, react-pdf, pdfjs-dist |
| Terminal | xterm.js |
| Analytics | Vercel Analytics |

#### Backend (Python)

| Category | Technology |
|----------|------------|
| Web Framework | Flask 3, Flask-CORS, Flask-SocketIO |
| LLM Orchestration | LangChain, LangGraph, OpenAI SDK |
| Data | pandas, numpy |
| Documents | pdfminer.six, python-docx, ReportLab, Pillow |
| Object Storage | MinIO (S3-compatible) |
| Database | SQLite (via DAO layer) |
| Testing | pytest, pytest-flask |

#### Infrastructure

| Category | Technology |
|----------|------------|
| Process Manager | PM2 (ecosystem.config.js) |
| Reverse Proxy | Nginx + Certbot (SSL) |
| AI Gateway | OpenClaw Gateway |
| Package Manager | pnpm |

### Prerequisites

- Node.js 20+ and pnpm
- Python 3.9+
- OpenAI API key (or Azure OpenAI / ENNCLOUD credentials)

### Quick Start

1. **Clone and install frontend dependencies**
   ```bash
   git clone <repository-url>
   cd visa-assessment
   pnpm install
   ```

2. **Install backend dependencies**
   ```bash
   cd ace_gtv
   pip install -r requirements.txt
   cd ..
   ```

3. **Configure environment**

   Create `.env.local` in the project root:
   ```env
   # AI Provider (openai / azure)
   AI_PROVIDER=openai
   OPENAI_API_KEY=your_key_here

   # Backend URL
   COPYWRITING_API_URL=http://localhost:5005

   # File Storage (local / minio / s3 / oss / cos)
   FILE_STORAGE_TYPE=local
   ```

4. **Start all services with PM2**
   ```bash
   pm2 start ecosystem.config.js
   ```

   Or start individually:
   ```bash
   # Frontend (dev)
   pnpm dev

   # Backend
   cd ace_gtv && python3 api_server.py
   ```

5. **Open** [http://localhost](http://localhost) (port 80) or [http://localhost:3000](http://localhost:3000)

### Production Deployment

See [`deploy/README.md`](deploy/README.md) for the full server deployment guide, including:
- Nginx reverse proxy configuration
- OpenClaw Gateway setup
- SSL certificate management
- PM2 process management

### Project Structure

```
visa-assessment/
├── app/                              # Next.js App Router
│   ├── api/                          # 24 API route handlers
│   │   ├── auth/                     # Login, register, session, logout, nginx-verify
│   │   ├── assessment/               # Deep analysis, deep evaluation, OC evaluation
│   │   ├── assessments/              # Save results, upload resume
│   │   ├── scoring/                  # Batch scoring analysis
│   │   ├── copywriting/[...path]/    # Proxy to Python backend
│   │   ├── smart-chat/               # AI chat endpoint
│   │   ├── ace-chat/                 # ACE agent chat
│   │   ├── chat-*/                   # Chat management (share, upload, download, title)
│   │   ├── admin/                    # User administration
│   │   └── health/                   # Health checks
│   ├── assessment/                   # GTV assessment page
│   ├── deep-assessment/              # Deep assessment page
│   ├── results/                      # Assessment results display
│   ├── chat/                         # AI chat (+ share/[token])
│   ├── claude-chat/                  # Claude Code agent chat
│   ├── copywriting/                  # Copywriting project hub
│   │   └── [projectId]/              # Per-project workflow
│   │       ├── assistant/            # AI writing assistant
│   │       ├── extraction/           # Content extraction
│   │       ├── framework/            # Framework building
│   │       ├── generation/           # Document generation
│   │       ├── prompts/              # Prompt management
│   │       ├── recommendation_letters/
│   │       └── [packageType]/        # Material packages
│   ├── analysis/                     # Analysis hub (+ agent/)
│   ├── knowledge-base/              # Knowledge base management
│   ├── material-collection/          # Material upload & management
│   ├── material-tags/                # Material tagging
│   ├── admin/                        # Admin dashboard
│   ├── profile/                      # User profile
│   ├── about/                        # About page
│   ├── debug/                        # Debug panel
│   ├── layout.tsx                    # Root layout (i18n, theme, analytics)
│   ├── page.tsx                      # Landing page
│   ├── globals.css                   # Global styles & design tokens
│   ├── sitemap.ts / robots.ts        # SEO
│   └── manifest.ts                   # PWA manifest
│
├── components/                       # 141 React components
│   ├── ui/                           # 55 shadcn/ui primitives
│   ├── claude-chat/                  # Claude chat (messages, input, tool calls, plan mode)
│   ├── copywriting/                  # Document workspace, editor, assistant, diff viewer
│   ├── remotion/                     # Video compositions & players
│   ├── animations/                   # Scroll reveal, typewriter, counter, card hover
│   ├── web-terminal/                 # Embedded terminal (xterm)
│   ├── assessment-*.tsx              # Assessment form, results, progress, PDF export
│   ├── chat-*.tsx                    # Chat UI variants (standard, ACE, OpenClaw)
│   ├── hero.tsx / hero-animated.tsx  # Landing page hero sections
│   ├── navbar.tsx / footer.tsx       # Site navigation
│   └── ...                           # Auth, mindmap, scoring, file preview, etc.
│
├── lib/                              # Shared utilities
│   ├── auth/                         # Authentication context & helpers
│   ├── ace/                          # ACE framework types & playbook
│   ├── i18n.tsx                      # Internationalization
│   ├── ai-config.ts                  # AI provider configuration
│   └── ...                           # PDF, OpenClaw client, chat sessions
│
├── hooks/                            # React hooks (toast, mobile, assessment loading)
│
├── ace_gtv/                          # Python backend
│   ├── api_server.py                 # Main Flask server (port 5005)
│   ├── api/                          # Route blueprints
│   │   ├── copywriting_routes.py     # Copywriting pipeline API
│   │   ├── scoring_agent_api.py      # Scoring agent API
│   │   ├── document_api.py           # Document processing API
│   │   └── terminal_routes.py        # Web terminal API
│   ├── agents/                       # AI agents
│   │   ├── langgraph_scoring_agent.py
│   │   ├── langgraph_oc_agent.py
│   │   ├── copywriting_agent.py
│   │   ├── content_extraction_agent.py
│   │   ├── framework_building_agent.py
│   │   ├── material_agent.py
│   │   ├── scoring_agent_lite.py
│   │   ├── document_llm_assistant.py
│   │   └── gtv_ace_agent.py          # ACE self-evolving agent
│   ├── services/                     # Business logic
│   │   ├── claude_code_service.py    # Claude Code CLI integration
│   │   ├── project_workspace_service.py
│   │   ├── copywriting_workflow.py
│   │   ├── copywriting_project_manager.py
│   │   ├── skill_router.py
│   │   ├── assessment_integration.py
│   │   ├── success_case_library.py
│   │   └── ...
│   ├── processors/                   # Document processors
│   │   ├── resume_processor.py
│   │   ├── material_processor.py
│   │   ├── material_analyzer.py
│   │   ├── document_analyzer.py
│   │   └── pdf_report_generator.py
│   ├── database/                     # Data access layer
│   │   ├── copywriting_database.py   # Core SQLite schema & CRUD
│   │   ├── file_storage.py           # Unified storage abstraction
│   │   ├── minio_client.py           # MinIO client
│   │   └── dao/                      # DAO pattern modules
│   ├── prompts/                      # LLM prompt templates
│   ├── data/                         # Static data & rules
│   └── migrations/                   # SQL migrations (Supabase)
│
├── .claude/skills/                   # Claude Code skill definitions
│   ├── resume-analysis/
│   ├── gtv-eligibility-assessment/
│   ├── scoring-calculation/
│   ├── evidence-validation/
│   ├── recommendations-generation/
│   └── document-processing/
│
├── openclaw-skills/                  # OpenClaw Gateway skills
│   ├── gtv-assessment/
│   ├── gtv-copywriting/
│   ├── gtv-recommendation-letter/
│   ├── resume-analyzer/
│   ├── immigration-strategy/
│   └── uk-immigration-policy/
│
├── deploy/                           # Deployment config
│   ├── nginx/                        # Nginx site config
│   ├── openclaw/                     # OpenClaw Gateway setup
│   └── setup.sh                      # One-click deploy script
│
├── docs/                             # Documentation
│   ├── CLAUDE_CODE_SERVICE_DESIGN.md
│   ├── CLAUDE_CODE_WORKSPACE_DESIGN.md
│   ├── STORAGE_CONFIG.md
│   ├── AZURE_SETUP.md
│   ├── PORT_CONFIG.md
│   ├── DEPLOY_502_LOGIN.md
│   └── ...
│
├── public/                           # Static assets & KB rules JSON
├── scripts/                          # Install & startup scripts
├── ecosystem.config.js               # PM2 process config
├── package.json                      # Frontend dependencies (pnpm)
├── next.config.mjs                   # Next.js configuration
├── tsconfig.json                     # TypeScript configuration
└── components.json                   # shadcn/ui config
```

### Architecture Overview

```
Browser → Nginx (443/HTTPS)
            ├── /              → Next.js (127.0.0.1:3000)    # Frontend
            ├── /api/copywriting/* → Next.js → Flask (5005)  # Backend proxy
            ├── /ws/openclaw   → OpenClaw (127.0.0.1:18789)  # Chat WebSocket
            └── /openclaw/     → OpenClaw (127.0.0.1:18789)  # Dashboard
```

### Configuration Reference

| Config Area | Documentation |
|-------------|---------------|
| AI Provider (OpenAI / Azure) | [`docs/AZURE_SETUP.md`](docs/AZURE_SETUP.md) |
| File Storage (MinIO / S3 / OSS / COS) | [`docs/STORAGE_CONFIG.md`](docs/STORAGE_CONFIG.md) |
| Port Configuration | [`docs/PORT_CONFIG.md`](docs/PORT_CONFIG.md) |
| Claude Code Service | [`docs/CLAUDE_CODE_SERVICE_DESIGN.md`](docs/CLAUDE_CODE_SERVICE_DESIGN.md) |
| Project Workspaces | [`docs/CLAUDE_CODE_WORKSPACE_DESIGN.md`](docs/CLAUDE_CODE_WORKSPACE_DESIGN.md) |
| Server Deployment | [`deploy/README.md`](deploy/README.md) |
| Backend (ACE / Agents) | [`ace_gtv/README.md`](ace_gtv/README.md) |

### SEO

Full SEO support including metadata, sitemap, robots.txt, JSON-LD structured data (`Organization`, `WebSite`, `ProfessionalService`), dynamic OG images, Web Manifest, and semantic HTML. See page-level `layout.tsx` files for per-route metadata.

### License

MIT License

---

<a name="chinese"></a>
## 中文

### 项目简介

惜池移民（Xichi Immigration）是一个 AI 驱动的英国全球人才签证（GTV）全流程服务平台。系统覆盖从初始资格评估、评分分析，到材料收集、证据验证，再到 AI 辅助撰写个人陈述、推荐信和申请文档的完整流程。

### 核心功能

- **简历分析与评分**：支持上传简历文件（PDF/DOC/DOCX/TXT）或粘贴文本，AI 进行教育、行业、工作经验和技术特长多维度分析。
- **GTV 资格评估**：基于 Tech Nation / 英国政府官方标准自动评估，推荐 Exceptional Talent、Exceptional Promise 或 Startup Visa 路径。
- **深度评估**：基于 LangGraph 的评分代理、Optional Criteria (OC) 分析和差距识别。
- **AI 智能对话**：多种对话模式 — OpenClaw WebSocket、Claude Code Agent、Vercel AI SDK — 支持持久化历史记录和分享链接。
- **文书工作流**：基于项目的多阶段文档流水线：
  - 材料收集与上传
  - 内容提取与分析
  - 申请框架搭建
  - 个人陈述、Cover Letter、推荐信生成
  - AI 助手（Agent / Ask 模式）实时流式输出
- **材料管理**：上传、标签、分类和预览申请材料，支持 MinIO / S3 / OSS / COS 对象存储。
- **知识库**：基于规则的 GTV 评估标准知识管理。
- **PDF 报告生成**：多种导出样式，支持中文字体。
- **双语支持**：完整的中英文界面。
- **管理后台**：用户管理和系统运维。
- **SEO 优化**：完整的元数据、Sitemap、robots.txt、JSON-LD 结构化数据和动态 OG 图片。

### 技术栈

#### 前端

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16（App Router） |
| 语言 | TypeScript 5 |
| UI 运行时 | React 19 |
| 样式 | Tailwind CSS v4, tw-animate-css |
| 组件库 | shadcn/ui, Semi UI, Radix UI |
| 富文本编辑器 | TipTap |
| 图表与可视化 | Recharts, Mermaid, React Flow |
| 视频 / 动画 | Remotion, Framer Motion |
| AI 集成 | Vercel AI SDK（`ai`, `@ai-sdk/openai`, `@ai-sdk/azure`） |
| PDF | jsPDF, react-pdf, pdfjs-dist |
| 终端 | xterm.js |
| 分析 | Vercel Analytics |

#### 后端（Python）

| 类别 | 技术 |
|------|------|
| Web 框架 | Flask 3, Flask-CORS, Flask-SocketIO |
| LLM 编排 | LangChain, LangGraph, OpenAI SDK |
| 数据处理 | pandas, numpy |
| 文档处理 | pdfminer.six, python-docx, ReportLab, Pillow |
| 对象存储 | MinIO（S3 兼容） |
| 数据库 | SQLite（DAO 层） |
| 测试 | pytest, pytest-flask |

#### 基础设施

| 类别 | 技术 |
|------|------|
| 进程管理 | PM2（ecosystem.config.js） |
| 反向代理 | Nginx + Certbot（SSL） |
| AI 网关 | OpenClaw Gateway |
| 包管理器 | pnpm |

### 环境要求

- Node.js 20+ 和 pnpm
- Python 3.9+
- OpenAI API 密钥（或 Azure OpenAI / ENNCLOUD 凭证）

### 快速开始

1. **克隆并安装前端依赖**
   ```bash
   git clone <repository-url>
   cd visa-assessment
   pnpm install
   ```

2. **安装后端依赖**
   ```bash
   cd ace_gtv
   pip install -r requirements.txt
   cd ..
   ```

3. **配置环境变量**

   在项目根目录创建 `.env.local`：
   ```env
   # AI 提供商 (openai / azure)
   AI_PROVIDER=openai
   OPENAI_API_KEY=your_key_here

   # 后端 URL
   COPYWRITING_API_URL=http://localhost:5005

   # 文件存储 (local / minio / s3 / oss / cos)
   FILE_STORAGE_TYPE=local
   ```

4. **使用 PM2 启动全部服务**
   ```bash
   pm2 start ecosystem.config.js
   ```

   或分别启动：
   ```bash
   # 前端（开发）
   pnpm dev

   # 后端
   cd ace_gtv && python3 api_server.py
   ```

5. **访问** [http://localhost](http://localhost)（80 端口）或 [http://localhost:3000](http://localhost:3000)

### 生产部署

参见 [`deploy/README.md`](deploy/README.md) 获取完整的服务器部署指南，包括：
- Nginx 反向代理配置
- OpenClaw Gateway 设置
- SSL 证书管理
- PM2 进程管理

### 项目结构

```
visa-assessment/
├── app/                              # Next.js App Router
│   ├── api/                          # 24 个 API 路由处理器
│   │   ├── auth/                     # 登录、注册、会话、登出
│   │   ├── assessment/               # 深度分析、OC 评估
│   │   ├── assessments/              # 保存结果、上传简历
│   │   ├── scoring/                  # 批量评分分析
│   │   ├── copywriting/[...path]/    # 代理到 Python 后端
│   │   ├── smart-chat/               # AI 对话端点
│   │   ├── ace-chat/                 # ACE 代理对话
│   │   ├── chat-*/                   # 对话管理（分享、上传、下载、标题）
│   │   ├── admin/                    # 用户管理
│   │   └── health/                   # 健康检查
│   ├── assessment/                   # GTV 评估页面
│   ├── deep-assessment/              # 深度评估页面
│   ├── results/                      # 评估结果展示
│   ├── chat/                         # AI 对话（含 share/[token]）
│   ├── claude-chat/                  # Claude Code Agent 对话
│   ├── copywriting/                  # 文书项目中心
│   │   └── [projectId]/              # 项目工作流
│   │       ├── assistant/            # AI 写作助手
│   │       ├── extraction/           # 内容提取
│   │       ├── framework/            # 框架搭建
│   │       ├── generation/           # 文档生成
│   │       ├── prompts/              # 提示词管理
│   │       ├── recommendation_letters/
│   │       └── [packageType]/        # 材料包
│   ├── analysis/                     # 分析中心（含 agent/）
│   ├── knowledge-base/              # 知识库管理
│   ├── material-collection/          # 材料上传与管理
│   ├── material-tags/                # 材料标签
│   ├── admin/                        # 管理后台
│   ├── profile/                      # 用户资料
│   ├── about/                        # 关于页面
│   └── debug/                        # 调试面板
│
├── components/                       # 141 个 React 组件
│   ├── ui/                           # 55 个 shadcn/ui 基础组件
│   ├── claude-chat/                  # Claude 对话（消息、输入、工具调用、计划模式）
│   ├── copywriting/                  # 文档工作区、编辑器、AI 助手、差异对比
│   ├── remotion/                     # 视频合成与播放器
│   ├── animations/                   # 滚动动画、打字机、计数器
│   ├── web-terminal/                 # 嵌入式终端
│   └── ...                           # 评估、对话、导航、PDF 导出等
│
├── ace_gtv/                          # Python 后端
│   ├── api_server.py                 # Flask 主服务器（端口 5005）
│   ├── api/                          # 路由蓝图
│   ├── agents/                       # AI 代理（评分、文书、OC、ACE 等）
│   ├── services/                     # 业务逻辑服务
│   ├── processors/                   # 文档处理器
│   ├── database/                     # 数据访问层（SQLite + DAO）
│   └── prompts/                      # LLM 提示词模板
│
├── .claude/skills/                   # Claude Code 技能定义（6 个）
├── openclaw-skills/                  # OpenClaw Gateway 技能（6 个）
├── deploy/                           # 部署配置（Nginx、OpenClaw、setup.sh）
├── docs/                             # 技术文档
├── ecosystem.config.js               # PM2 进程配置
└── package.json                      # 前端依赖（pnpm）
```

### 架构概览

```
浏览器 → Nginx (443/HTTPS)
            ├── /              → Next.js (127.0.0.1:3000)    # 前端应用
            ├── /api/copywriting/* → Next.js → Flask (5005)  # 后端代理
            ├── /ws/openclaw   → OpenClaw (127.0.0.1:18789)  # Chat WebSocket
            └── /openclaw/     → OpenClaw (127.0.0.1:18789)  # 控制台
```

### 配置参考

| 配置领域 | 文档 |
|----------|------|
| AI 提供商（OpenAI / Azure） | [`docs/AZURE_SETUP.md`](docs/AZURE_SETUP.md) |
| 文件存储（MinIO / S3 / OSS / COS） | [`docs/STORAGE_CONFIG.md`](docs/STORAGE_CONFIG.md) |
| 端口配置 | [`docs/PORT_CONFIG.md`](docs/PORT_CONFIG.md) |
| Claude Code 服务 | [`docs/CLAUDE_CODE_SERVICE_DESIGN.md`](docs/CLAUDE_CODE_SERVICE_DESIGN.md) |
| 项目工作空间 | [`docs/CLAUDE_CODE_WORKSPACE_DESIGN.md`](docs/CLAUDE_CODE_WORKSPACE_DESIGN.md) |
| 服务器部署 | [`deploy/README.md`](deploy/README.md) |
| 后端（ACE / 代理） | [`ace_gtv/README.md`](ace_gtv/README.md) |

### SEO 搜索引擎优化

全站 SEO 支持，包括元数据、Sitemap、robots.txt、JSON-LD 结构化数据（`Organization`、`WebSite`、`ProfessionalService`）、动态 OG 图片、Web Manifest 和语义化 HTML。各路由的页面级元数据参见对应的 `layout.tsx` 文件。

### 许可证

MIT License
