# GTV 后端服务 — AI 代理与文书工作流

基于 Flask + LangChain/LangGraph 的 GTV 签证评估后端，提供评分代理、文书工作流、材料处理和 Claude Code 集成等服务。

## 系统架构

```
Next.js 前端 ←→ Next.js API 路由 (/api/copywriting/[...path]) ←→ Flask API (端口 5005) ←→ AI 代理 / 数据库 / 文件存储
```

### 模块关系

```
ace_gtv/
├── api_server.py              # 主入口，聚合所有蓝图
├── api/                       # Flask 路由蓝图
│   ├── copywriting_routes.py  # 文书全流程 API（上传、项目、材料、提取、框架）
│   ├── scoring_agent_api.py   # 评分代理 REST API
│   ├── document_api.py        # 文档上传/解析/知识提取
│   └── terminal_routes.py     # Web 终端 SocketIO
│
├── agents/                    # AI 代理
│   ├── langgraph_scoring_agent.py    # LangGraph 评分代理（知识库 + 多步 LLM）
│   ├── langgraph_oc_agent.py         # LangGraph OC 评估代理
│   ├── scoring_agent_lite.py         # 轻量评分代理（无需 LangGraph）
│   ├── copywriting_agent.py          # 文书撰写代理（PS、推荐信等）
│   ├── content_extraction_agent.py   # 内容提取代理
│   ├── framework_building_agent.py   # 申请框架搭建代理
│   ├── material_agent.py             # 材料处理代理
│   ├── document_llm_assistant.py     # 文档 LLM 辅助
│   └── gtv_ace_agent.py              # ACE 自我进化代理
│
├── services/                  # 业务逻辑层
│   ├── claude_code_service.py         # Claude Code CLI 封装（Agent/Ask 双模式）
│   ├── project_workspace_service.py   # 项目工作空间管理
│   ├── copywriting_workflow.py        # 文书工作流编排
│   ├── copywriting_project_manager.py # 文书项目管理
│   ├── skill_router.py                # 技能关键词路由
│   ├── assessment_integration.py      # 评估集成桥接
│   ├── gtv_scoring_detailed.py        # 评分详解与改进建议
│   ├── raw_material_manager.py        # 原始材料管理（MinIO）
│   ├── memory_loader.py               # CLAUDE.md / AGENTS.md 加载
│   └── success_case_library.py        # 成功案例库
│
├── processors/                # 文档处理器
│   ├── resume_processor.py           # 简历处理（上传、解析、评估）
│   ├── material_processor.py         # 材料处理（PDF/DOCX/图片/URL）
│   ├── material_analyzer.py          # 材料分析（框架思维导图）
│   ├── document_analyzer.py          # 文档分析与知识提取
│   └── pdf_report_generator.py       # PDF 评估报告（ReportLab，CJK 支持）
│
├── database/                  # 数据访问层
│   ├── copywriting_database.py       # SQLite 核心 Schema 与 CRUD
│   ├── file_storage.py               # 统一存储抽象（local/MinIO/S3/OSS/COS）
│   ├── minio_client.py               # MinIO 客户端
│   └── dao/                          # DAO 模式
│       ├── base.py                   # 基础 DAO 与连接管理
│       ├── project_dao.py            # 项目表
│       ├── material_dao.py           # 材料表
│       ├── classification_dao.py     # 分类表
│       ├── framework_dao.py          # 框架表
│       ├── extraction_dao.py         # 提取表
│       └── prompt_dao.py             # 提示词表
│
├── prompts/                   # LLM 提示词模板
├── data/                      # 静态数据与规则
├── migrations/                # SQL 迁移脚本（Supabase）
├── tests/                     # 测试
├── utils/                     # 工具函数
└── requirements.txt           # Python 依赖
```

## 安装和运行

### 1. 安装依赖

```bash
cd ace_gtv
pip install -r requirements.txt
```

### 2. 配置环境变量

在项目根目录的 `.env.local` 中添加：

```env
# AI 提供商
OPENAI_API_KEY=your_key_here

# Claude Code（可选，Agent 模式需要）
ANTHROPIC_BASE_URL=https://api.moonshot.cn/anthropic
ANTHROPIC_AUTH_TOKEN=sk-xxx
ANTHROPIC_MODEL=kimi-k2-thinking-turbo

# ENNCLOUD（可选，Ask 模式）
ENNCLOUD_API_KEY=your_key_here
ENNCLOUD_BASE_URL=https://ai.enncloud.cn/v1
ENNCLOUD_MODEL=GLM-4.5-Air

# 文件存储
FILE_STORAGE_TYPE=local
# 或 MinIO:
# FILE_STORAGE_TYPE=minio
# STORAGE_ENDPOINT=localhost:9000
# STORAGE_ACCESS_KEY=admin
# STORAGE_SECRET_KEY=admin123456
```

### 3. 启动服务

```bash
# 使用 PM2（推荐）
pm2 start ecosystem.config.js --only backend-api

# 或直接运行
python3 api_server.py
```

服务默认在 `http://localhost:5005` 启动。

## 核心 API 接口

### 健康检查

```
GET /health
```

### 文书工作流

```
POST /api/copywriting/projects              # 创建项目
GET  /api/copywriting/projects              # 项目列表
GET  /api/copywriting/projects/<id>         # 项目详情
POST /api/copywriting/upload                # 上传材料
POST /api/copywriting/projects/<id>/extract # 内容提取
POST /api/copywriting/projects/<id>/framework # 框架搭建
```

### AI 助手

```
POST /api/assistant/chat                    # 全局助手对话
POST /api/projects/<id>/assistant/chat      # 项目级助手对话
GET  /api/assistant/status                  # 服务状态
GET  /api/assistant/skills                  # 可用技能列表
```

### 评分代理

```
POST /api/scoring/analyze                   # 评分分析
```

### 文档处理

```
POST /api/documents/upload                  # 文档上传与解析
POST /api/documents/extract                 # 知识提取
```

### 项目工作空间

```
GET  /api/copywriting/projects/<id>/workspace     # 工作空间状态
POST /api/copywriting/projects/<id>/workspace     # 初始化工作空间
DELETE /api/copywriting/projects/<id>/workspace   # 清理工作空间
POST /api/copywriting/projects/<id>/workspace/materials  # 复制材料
```

## AI 代理详解

### 评分代理

- **LangGraph 评分代理** (`langgraph_scoring_agent.py`)：基于知识库和多步 LLM 推理的完整评分流程，支持 Mandatory Criteria 和 Optional Criteria 分析。
- **轻量评分代理** (`scoring_agent_lite.py`)：分阶段 LLM 调用（需求分析 → 差距分析 → 综合评估），无需 LangGraph 依赖。
- **OC 评估代理** (`langgraph_oc_agent.py`)：专门针对 Optional Criteria 的 LangGraph 评估代理。

### 文书代理

- **文书撰写代理** (`copywriting_agent.py`)：多阶段模板化文书生成（个人陈述、推荐信等）。
- **内容提取代理** (`content_extraction_agent.py`)：从项目材料中提取和结构化内容。
- **框架搭建代理** (`framework_building_agent.py`)：构建 GTV 申请框架（MC/OC 文本、证据映射）。

### Claude Code 集成

- **ClaudeCodeService** (`claude_code_service.py`)：封装 Claude CLI，支持 Agent 模式（文件操作）和 Ask 模式（纯对话）。
- **SkillRouter** (`skill_router.py`)：根据用户消息自动匹配技能（简历分析、资格评估、评分计算等）。

### ACE 自我进化代理

- **GTVACEAgent** (`gtv_ace_agent.py`)：基于 ACE (Agentic Context Engineering) 框架，通过生成器 → 反思器 → 策展人循环持续优化知识库。

## 数据库

使用 SQLite，通过 DAO 模式管理：

- **projects** — 文书项目
- **material_files** — 材料文件元数据
- **material_collection** — 材料收集记录
- **content_classification** — 内容分类
- **framework** — 申请框架
- **extraction_logs** — 提取日志
- **system_prompts** — 系统提示词版本

## 文件存储

通过 `file_storage.py` 统一抽象，支持：

| 类型 | 配置值 | 说明 |
|------|--------|------|
| local | `FILE_STORAGE_TYPE=local` | 本地文件系统 |
| minio | `FILE_STORAGE_TYPE=minio` | MinIO 自建对象存储 |
| s3 | `FILE_STORAGE_TYPE=s3` | AWS S3 |
| oss | `FILE_STORAGE_TYPE=oss` | 阿里云 OSS |
| cos | `FILE_STORAGE_TYPE=cos` | 腾讯云 COS |

详见 [`docs/STORAGE_CONFIG.md`](../docs/STORAGE_CONFIG.md)。

## 依赖

核心依赖：

- **Web**: Flask 3, Flask-CORS, Flask-SocketIO, eventlet
- **LLM**: openai, langchain, langchain-core, langchain-openai, pydantic
- **文档**: pdfminer.six, python-docx, reportlab, Pillow
- **数据**: pandas, numpy
- **存储**: minio
- **配置**: python-dotenv
- **HTTP**: requests, httpx
- **测试**: pytest, pytest-flask

## 故障排除

### 服务无法启动

1. 检查 Python 版本（需要 3.9+）
2. 确保依赖已安装：`pip install -r requirements.txt`
3. 检查端口 5005 是否被占用：`lsof -i :5005`

### API 连接失败

1. 确认服务运行中：`pm2 status` 或 `curl http://localhost:5005/health`
2. 检查 `COPYWRITING_API_URL` 环境变量
3. 确认前端代理配置（`app/api/copywriting/[...path]/route.ts`）

### LLM 调用失败

1. 检查 API 密钥配置
2. 确认网络连接
3. 查看日志：`pm2 logs backend-api`

## 日志

| 日志类型 | 位置 |
|----------|------|
| 后端服务日志 | `~/.pm2/logs/backend-api-out.log` |
| 后端错误日志 | `~/.pm2/logs/backend-api-error.log` |
| 实时查看 | `pm2 logs backend-api` |

---

*最后更新: 2026-03-24*
