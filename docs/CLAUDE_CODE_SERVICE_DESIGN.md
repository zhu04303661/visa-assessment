# Claude Code Service 技术设计文档

## 1. 概述

`ClaudeCodeService` 是 GTV 签证评估系统的核心 AI 服务模块，提供了两种执行模式来处理用户的智能助手请求：

- **Agent 模式**：通过 Claude CLI 直接执行，具备文件操作和代码执行能力
- **Ask 模式**：通过 ENNCLOUD API 调用，提供纯对话式 AI 响应

## 2. 系统架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           前端 (Next.js)                                 │
│                    app/copywriting/[projectId]/assistant/                │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │ HTTP/SSE
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         API 路由层                                       │
│                  ace_gtv/api/copywriting_routes.py                       │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  /api/assistant/chat         - 全局助手对话                       │    │
│  │  /api/projects/<id>/assistant/chat - 项目级助手对话               │    │
│  │  /api/assistant/status       - 服务状态查询                       │    │
│  │  /api/assistant/skills       - 技能列表                          │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        服务层 (Services)                                 │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │              ClaudeCodeService                                  │     │
│  │         ace_gtv/services/claude_code_service.py                 │     │
│  │  ┌──────────────────────────────────────────────────────────┐   │     │
│  │  │  • _find_cli_path()     - 查找 Claude CLI 路径            │   │     │
│  │  │  • _load_skills()       - 加载可用技能                     │   │     │
│  │  │  • execute_with_skill() - 核心执行方法                     │   │     │
│  │  │  • _execute_with_cli()  - Agent 模式执行                   │   │     │
│  │  │  • _execute_with_api()  - Ask 模式执行                     │   │     │
│  │  │  • _build_prompt()      - 构建完整提示词                    │   │     │
│  │  └──────────────────────────────────────────────────────────┘   │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │              SkillRouter                                        │     │
│  │         ace_gtv/services/skill_router.py                        │     │
│  │  ┌──────────────────────────────────────────────────────────┐   │     │
│  │  │  • detect_skill()       - 自动检测技能                     │   │     │
│  │  │  • get_skill_suggestions() - 获取技能推荐                  │   │     │
│  │  │  • auto_detect_skill()  - 便捷检测函数                     │   │     │
│  │  └──────────────────────────────────────────────────────────┘   │     │
│  └────────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
          ┌───────────────────────┴───────────────────────┐
          ▼                                               ▼
┌──────────────────────────┐                ┌──────────────────────────┐
│     Agent 模式           │                │      Ask 模式            │
│   Claude CLI 执行        │                │   ENNCLOUD API 调用      │
│                          │                │                          │
│  • subprocess.Popen      │                │  • requests.post         │
│  • 流式输出 (stdout)     │                │  • 非流式响应             │
│  • 支持文件操作          │                │  • 纯对话模式             │
│  • 使用系统提示文件       │                │  • GLM-4.5-Air 模型      │
└──────────────────────────┘                └──────────────────────────┘
```

## 3. 核心组件详解

### 3.1 ClaudeCodeService 类

#### 3.1.1 初始化流程

```python
def __init__(self, cli_path: str = None, skills_dir: str = None):
    # 1. 查找 Claude CLI 路径
    self._cli_path = cli_path or self._find_cli_path()
    
    # 2. 设置技能目录
    self._skills_dir = project_root / ".claude" / "skills"
    
    # 3. 设置 Agent 系统提示文件
    self._agent_prompt_path = project_root / "ace_gtv/agents/gtv_copywriting_agent.md"
    
    # 4. 加载可用技能
    self._load_skills()
```

#### 3.1.2 CLI 路径查找策略

优先级顺序：
1. `/opt/homebrew/bin/claude` (macOS Homebrew)
2. `/usr/local/bin/claude` (Linux/macOS 传统路径)
3. `~/.local/bin/claude` (用户本地安装)
4. `which claude` 命令查找
5. 默认回退到 `/opt/homebrew/bin/claude`

#### 3.1.3 技能加载机制

```
.claude/skills/
├── document-processing/
│   └── SKILL.md
├── evidence-validation/
│   └── SKILL.md
├── gtv-eligibility-assessment/
│   └── SKILL.md
├── recommendations-generation/
│   └── SKILL.md
├── resume-analysis/
│   └── SKILL.md
└── scoring-calculation/
    └── SKILL.md
```

每个技能目录必须包含 `SKILL.md` 文件，服务会自动扫描并注册。

### 3.2 SkillRouter 类

#### 3.2.1 关键词匹配表

| 技能名称 | 关键词 |
|---------|--------|
| `resume-analysis` | 简历、cv、resume、履历、工作经历、教育背景 |
| `gtv-eligibility-assessment` | 评估、资格、eligibility、是否符合、适合 |
| `scoring-calculation` | 评分、分数、score、打分、得分 |
| `evidence-validation` | 证据、验证、evidence、证明、材料验证 |
| `recommendations-generation` | 建议、改进、recommend、提升、优化 |
| `document-processing` | 文档、处理、document、提取、分析文件 |

#### 3.2.2 技能优先级

```python
SKILL_PRIORITY = {
    "recommendations-generation": 1,  # 最高优先级
    "document-processing": 2,
    "resume-analysis": 3,
    "gtv-eligibility-assessment": 4,
    "scoring-calculation": 5,
    "evidence-validation": 6
}
```

## 4. 执行流程

### 4.1 完整请求处理流程

```
用户发送消息
      │
      ▼
┌─────────────────────────────────┐
│  1. API 路由接收请求             │
│     POST /api/projects/<id>/    │
│          assistant/chat         │
└─────────────────┬───────────────┘
                  │
                  ▼
┌─────────────────────────────────┐
│  2. 解析请求参数                 │
│     • message: 用户消息          │
│     • skill: 手动指定技能        │
│     • mode: ask/agent           │
│     • stream: 是否流式           │
└─────────────────┬───────────────┘
                  │
                  ▼
┌─────────────────────────────────┐
│  3. 自动检测技能（如未指定）      │
│     auto_detect_skill(message)  │
└─────────────────┬───────────────┘
                  │
                  ▼
┌─────────────────────────────────┐
│  4. 构建上下文                   │
│     • project_id                │
│     • client_name               │
│     • document_context          │
│     • conversation_history      │
└─────────────────┬───────────────┘
                  │
                  ▼
┌─────────────────────────────────┐
│  5. 调用 execute_with_skill()   │
└─────────────────┬───────────────┘
                  │
          ┌───────┴───────┐
          │               │
          ▼               ▼
   ┌─────────────┐ ┌─────────────┐
   │ Agent 模式  │ │  Ask 模式   │
   │  CLI 执行   │ │  API 调用   │
   └──────┬──────┘ └──────┬──────┘
          │               │
          └───────┬───────┘
                  │
                  ▼
┌─────────────────────────────────┐
│  6. 流式返回 SSE 响应            │
│     • type: start/log/content/  │
│            done                 │
└─────────────────────────────────┘
```

### 4.2 Agent 模式执行详情

```python
def _execute_with_cli(prompt, skill_name, context):
    # 1. 确定工作目录
    if project_id:
        cwd = workspace_service.get_workspace_path(project_id)
    else:
        cwd = os.getcwd()
    
    # 2. 构建 Claude CLI 命令
    cmd = [
        self._cli_path,
        "--print",                    # 非交互式输出
        "--dangerously-skip-permissions",  # 跳过权限确认
        "--system-prompt", agent_prompt_path,  # 系统提示
        full_prompt                   # 用户请求
    ]
    
    # 3. 设置环境变量
    env['LANG'] = 'zh_CN.UTF-8'
    env['LC_ALL'] = 'zh_CN.UTF-8'
    
    # 4. 启动进程
    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        cwd=cwd,
        env=env
    )
    
    # 5. 流式读取输出
    for line in iter(process.stdout.readline, b''):
        yield line.decode('utf-8')
```

### 4.3 Ask 模式执行详情

```python
def _execute_with_api(prompt, skill_name, context):
    # 1. 获取 API 配置
    api_key = os.getenv("ENNCLOUD_API_KEY")
    base_url = os.getenv("ENNCLOUD_BASE_URL", "https://ai.enncloud.cn/v1")
    model = os.getenv("ENNCLOUD_MODEL", "GLM-4.5-Air")
    
    # 2. 发送请求
    response = requests.post(
        f"{base_url}/chat/completions",
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "model": model,
            "messages": [{"role": "user", "content": full_prompt}],
            "temperature": 0.7,
            "max_tokens": 4000
        },
        timeout=120
    )
    
    # 3. 返回响应
    yield response.json()["choices"][0]["message"]["content"]
```

## 5. SSE 响应格式

### 5.1 事件类型

| 类型 | 说明 | 数据结构 |
|------|------|----------|
| `start` | 开始执行 | `{type: "start", mode: "agent", skill: "..."}` |
| `log` | 系统日志 | `{type: "log", content: "[系统] ..."}` |
| `content` | AI 输出内容 | `{type: "content", content: "..."}` |
| `done` | 执行完成 | `{type: "done", skill: "...", mode: "..."}` |

### 5.2 示例响应流

```
data: {"type": "start", "mode": "agent", "skill": "recommendations-generation"}

data: {"type": "log", "content": "[系统] 使用 Agent 模式执行，Claude CLI 路径: /opt/homebrew/bin/claude"}

data: {"type": "log", "content": "[系统] 技能: recommendations-generation"}

data: {"type": "log", "content": "[系统] 正在执行..."}

data: {"type": "content", "content": "根据您的材料分析..."}

data: {"type": "done", "skill": "recommendations-generation", "mode": "agent"}
```

## 6. 配置与环境变量

### 6.1 必需环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `ENNCLOUD_API_KEY` | ENNCLOUD API 密钥 | 无（Ask 模式必需） |
| `ENNCLOUD_BASE_URL` | ENNCLOUD API 地址 | `https://ai.enncloud.cn/v1` |
| `ENNCLOUD_MODEL` | 使用的模型 | `GLM-4.5-Air` |

### 6.2 可选环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `AI_EXECUTION_MODE` | 默认执行模式 | `ask` |
| `LLM_PROVIDER` | LLM 提供商 | `ENNCLOUD` |

## 7. 日志与调试

### 7.1 日志位置

| 日志类型 | 路径 |
|----------|------|
| 后端服务日志 | `~/.pm2/logs/backend-out.log` |
| 后端错误日志 | `~/.pm2/logs/backend-error.log` |
| Claude CLI 调试日志 | `~/.claude/debug/latest` |

### 7.2 查看日志命令

```bash
# 实时查看后端日志
pm2 logs backend

# 查看 Claude CLI 最新日志
cat ~/.claude/debug/latest

# 查看最近的调试日志
ls -lt ~/.claude/debug/ | head -5
```

## 8. 错误处理

### 8.1 常见错误场景

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| CLI 不可用 | Claude CLI 未安装或路径错误 | 检查 `which claude` 或手动指定路径 |
| API 调用超时 | 网络问题或 API 负载过高 | 增加 timeout 或稍后重试 |
| 403 错误 | API 认证失败或配额用尽 | 检查 API Key 和账户状态 |
| 进程挂起 | CLI 等待交互输入 | 使用 `--dangerously-skip-permissions` |

### 8.2 错误响应格式

```python
# CLI 执行错误
yield f"[错误] 进程退出码: {process.returncode}\n"

# API 调用错误
yield f"[错误] API 请求失败: {response.status_code}\n"

# 异常捕获
yield f"[错误] 执行失败: {str(e)}\n"
```

## 9. 性能考虑

### 9.1 单例模式

服务使用全局单例模式，避免重复初始化：

```python
_service: Optional[ClaudeCodeService] = None

def get_claude_code_service() -> ClaudeCodeService:
    global _service
    if _service is None:
        _service = ClaudeCodeService()
    return _service
```

### 9.2 流式输出

- Agent 模式：逐行读取 subprocess 输出，实时返回
- Ask 模式：当前为非流式（可优化为流式）

### 9.3 超时设置

| 操作 | 超时时间 |
|------|----------|
| CLI 版本检查 | 5 秒 |
| API 调用 | 120 秒 |
| CLI 执行 | 无超时（依赖进程自身） |

## 10. 扩展建议

### 10.1 近期优化

1. **Ask 模式流式化**：将 `stream: False` 改为 `stream: True`，支持 SSE
2. **超时处理**：为 CLI 执行添加超时机制
3. **重试机制**：API 调用失败时自动重试

### 10.2 长期演进

1. **多模型支持**：支持切换不同的 LLM 提供商
2. **缓存机制**：对相似请求进行结果缓存
3. **并发控制**：限制同时执行的 CLI 进程数量
4. **健康检查**：定期检测 CLI 和 API 可用性

---

*文档版本: 1.0*  
*最后更新: 2026-02-05*  
*作者: AI Assistant*
