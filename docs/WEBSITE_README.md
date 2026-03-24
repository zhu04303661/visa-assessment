# 惜池移民官网 — 网站功能说明

## 项目概述

惜池移民（Xichi Immigration）官方网站，基于 Next.js 16 (App Router) 构建。提供英国全球人才签证（GTV）评估、AI 智能咨询、文书代写等全方位移民服务的线上入口。

## 技术特点

### 前端技术

- **Next.js 16**：App Router 架构
- **React 19**：最新 React 版本
- **TypeScript 5**：类型安全开发
- **Tailwind CSS v4**：原子化样式系统
- **shadcn/ui + Semi UI + Radix UI**：多组件库混合使用
- **Framer Motion + Remotion**：动画与视频合成
- **TipTap**：富文本编辑器
- **xterm.js**：嵌入式终端

### 设计特点

- **响应式设计**：适配桌面、平板和手机
- **现代化 UI**：渐变效果、动画和微交互
- **双语支持**：中文和英文切换
- **深色模式**：深色/浅色主题切换

## 页面结构（24 个页面）

```
/                                      # 首页（品牌展示、服务介绍、行动号召）
├── /about                             # 关于我们（公司介绍、价值观、联系方式）
├── /assessment                        # GTV 资格评估（简历上传、AI 分析）
├── /deep-assessment                   # 深度评估（LangGraph 评分代理）
├── /results                           # 评估结果展示（评分、路径推荐、PDF 导出）
├── /chat                              # AI 智能咨询（多模式对话）
│   └── /chat/share/[token]            # 分享的对话链接（只读）
├── /claude-chat                       # Claude Code Agent 对话
├── /copywriting                       # 文书项目管理中心
│   └── /copywriting/[projectId]/      # 项目工作流
│       ├── /assistant                 # AI 写作助手
│       ├── /extraction                # 内容提取
│       ├── /framework                 # 框架搭建
│       ├── /generation                # 文档生成
│       ├── /prompts                   # 提示词管理
│       ├── /recommendation_letters    # 推荐信
│       └── /[packageType]             # 材料包（个人陈述等）
├── /analysis                          # 分析中心
│   └── /analysis/agent                # Agent 分析模式
├── /knowledge-base                    # 知识库管理
├── /material-collection               # 材料收集与上传
├── /material-tags                     # 材料标签管理
├── /admin                             # 管理后台
├── /profile                           # 用户资料
└── /debug                             # 调试面板（管理员）
```

## API 路由（24 个端点）

### 认证

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/auth/login` | POST | 用户登录 |
| `/api/auth/register` | POST | 用户注册 |
| `/api/auth/logout` | POST | 用户登出 |
| `/api/auth/session` | GET | 会话状态查询 |
| `/api/auth/profile` | GET/PUT | 用户资料 |
| `/api/auth/nginx-verify` | GET | Nginx 认证验证 |

### 评估与评分

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/analyze-resume` | POST | 简历 AI 分析 |
| `/api/assessments/upload-resume` | POST | 上传简历文件 |
| `/api/assessments/save` | POST | 保存评估结果 |
| `/api/assessment/deep-analysis` | POST | 深度分析 |
| `/api/assessment/deep-evaluation` | POST | 深度评估 |
| `/api/assessment/oc-evaluation` | POST | Optional Criteria 评估 |
| `/api/scoring/analyze-all` | POST | 批量评分分析 |

### 对话

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/smart-chat` | POST | AI 智能对话 |
| `/api/ace-chat` | POST | ACE 代理对话 |
| `/api/chat-assessment` | POST | 对话式评估 |
| `/api/chat-share` | POST/GET | 对话分享 |
| `/api/chat-upload` | POST | 对话文件上传 |
| `/api/chat-download` | GET | 对话记录下载 |
| `/api/chat-title` | POST | 对话标题生成 |

### 文书与管理

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/copywriting/[...path]` | ALL | 代理到 Python 后端（文书全流程） |
| `/api/admin/users` | GET/POST | 用户管理 |

### 运维

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 前端健康检查 |
| `/api/backend-health` | GET | 后端健康检查 |

## 核心组件（141 个）

### 营销 / 首页

| 组件 | 文件 | 说明 |
|------|------|------|
| Navbar | `components/navbar.tsx` | 导航栏，移动端响应式菜单 |
| Hero | `components/hero.tsx` | 首页主横幅 |
| HeroAnimated | `components/hero-animated.tsx` | 动画版首页横幅（Remotion） |
| ServicesSection | `components/services-section.tsx` | 服务介绍区域 |
| AboutSection | `components/about-section.tsx` | 公司介绍区域 |
| CompanyValues | `components/company-values.tsx` | 公司价值观展示 |
| Features | `components/features.tsx` | 功能特点区块 |
| Footer | `components/footer.tsx` | 页脚（公司信息、服务链接） |
| StructuredData | `components/structured-data.tsx` | SEO JSON-LD 结构化数据 |
| LanguageSwitcher | `components/language-switcher.tsx` | 语言切换器 |

### 评估相关

| 组件 | 说明 |
|------|------|
| `assessment-form.tsx` | 简历上传与评估表单 |
| `assessment-results.tsx` | 评估结果展示 |
| `assessment-progress.tsx` | 评估进度条 |
| `assessment-loading.tsx` | 评估加载动画 |
| `assessment-skeleton.tsx` | 评估骨架屏 |
| `assessment-cta.tsx` | 评估行动号召 |
| `deep-assessment-page.tsx` | 深度评估页面 |
| `scoring-details-card.tsx` | 评分详情卡片 |
| `scoring-details-with-requirements.tsx` | 带要求的评分详情 |
| `scoring-analysis-button.tsx` | 评分分析按钮 |
| `oc-assessment-button.tsx` | OC 评估按钮 |
| `oc-assessment-display.tsx` | OC 评估结果展示 |

### PDF 导出（多种策略）

| 组件 | 说明 |
|------|------|
| `assessment-pdf-generator.tsx` | 评估 PDF 生成器 |
| `assessment-pdf-button.tsx` | 评估 PDF 导出按钮 |
| `pdf-download-button.tsx` | 通用 PDF 下载 |
| `professional-pdf-button.tsx` | 专业样式 PDF |
| `simple-pdf-button.tsx` | 简单样式 PDF |
| `pure-pdf-button.tsx` | 纯文本 PDF |
| `chinese-pdf-button.tsx` | 中文 PDF |
| `compatible-pdf-button.tsx` | 兼容性 PDF |
| `html2canvas-pdf-button.tsx` | 截图式 PDF |

### 对话相关

| 组件 | 说明 |
|------|------|
| `chat-ui.tsx` | 标准对话界面 |
| `ace-chat-ui.tsx` | ACE 代理对话界面 |
| `openclaw-chat-ui.tsx` | OpenClaw WebSocket 对话界面 |
| `chat-history-sidebar.tsx` | 对话历史侧边栏 |

### Claude Code 对话（`claude-chat/`）

| 组件 | 说明 |
|------|------|
| `ClaudeChat.tsx` | Claude 对话主组件 |
| `MessagesList.tsx` | 消息列表 |
| `ChatInput.tsx` | 对话输入框 |
| `ToolCallRenderer.tsx` | 工具调用渲染器 |
| `commands/SlashCommandDropdown.tsx` | 斜杠命令下拉 |
| `mentions/MentionDropdown.tsx` | @提及下拉 |
| `plan/PlanSidebar.tsx` | 计划模式侧边栏 |
| `plan/PlanSteps.tsx` | 计划步骤 |
| `plan/PlanFileTool.tsx` | 文件工具 |

### 文书工作区（`copywriting/`）

| 组件 | 说明 |
|------|------|
| `DocumentWorkspace.tsx` | 文档工作区主体 |
| `DocumentEditor.tsx` | 文档编辑器（TipTap） |
| `DocumentTree.tsx` | 文档树 |
| `DocumentTabs.tsx` | 文档标签页 |
| `DocumentUpload.tsx` | 文档上传 |
| `DiffViewer.tsx` | 差异对比 |
| `VersionManager.tsx` | 版本管理 |
| `AssistantChat.tsx` | AI 助手对话 |
| `AssistantContext.tsx` | 助手上下文 |
| `AssistantProgress.tsx` | 助手进度 |
| `PromptEditor.tsx` | 提示词编辑器 |
| `SemiModelSelector.tsx` | 模型选择器 |
| `SemiSkillSelector.tsx` | 技能选择器 |
| `SuggestionCard.tsx` | 建议卡片 |
| `CloudCLIEmbed.tsx` | Cloud CLI 嵌入 |

### 动画（`animations/`）

| 组件 | 说明 |
|------|------|
| `scroll-reveal.tsx` | 滚动显示动画 |
| `typewriter.tsx` | 打字机效果 |
| `counter-animation.tsx` | 数字计数动画 |
| `card-hover.tsx` | 卡片悬停效果 |

### 视频合成（`remotion/`）

| 组件 | 说明 |
|------|------|
| `Player.tsx` / `ResponsivePlayer.tsx` | 视频播放器 |
| `Root.tsx` | Remotion 根组件 |
| `compositions/HeroAnimation.tsx` | 首页动画合成 |
| `compositions/GTVProcessAnimation.tsx` | GTV 流程动画 |
| `components/ParticleField.tsx` | 粒子场 |
| `components/DataFlow.tsx` | 数据流动画 |
| `components/CenterPulse.tsx` | 中心脉冲 |

### 通用 / 其他

| 组件 | 说明 |
|------|------|
| `auth-guard.tsx` | 路由权限守卫 |
| `auth-dialog.tsx` | 登录/注册弹窗 |
| `consultation-booking.tsx` | 咨询预约 |
| `mindmap.tsx` / `mermaid-mindmap.tsx` | 思维导图 |
| `flow-canvas.tsx` | 流程画布（React Flow） |
| `unified-file-preview.tsx` | 统一文件预览 |
| `debug-panel.tsx` | 调试面板 |
| `error-dialog.tsx` | 错误弹窗 |
| `theme-provider.tsx` | 主题提供者 |
| `page-tracker.tsx` | 页面追踪 |
| `web-terminal/WebTerminal.tsx` | 嵌入式终端 |

### UI 基础组件（`ui/`，55 个）

基于 shadcn/ui (Radix) 的完整组件库：Accordion, Alert, AlertDialog, AspectRatio, Avatar, Badge, Breadcrumb, Button, ButtonGroup, Calendar, Card, Carousel, Chart, Checkbox, Collapsible, Command, ContextMenu, Dialog, Drawer, DropdownMenu, Empty, Field, Form, HoverCard, Input, InputGroup, InputOTP, Item, Kbd, Label, Menubar, NavigationMenu, Pagination, Popover, Progress, RadioGroup, Resizable, ScrollArea, Select, Separator, Sheet, Sidebar, Skeleton, Slider, Sonner, Spinner, Switch, Table, Tabs, TextShimmer, Textarea, Toast, Toaster, Toggle, ToggleGroup, Tooltip.

## 使用说明

### 开发环境

```bash
pnpm install
pnpm dev
```

### 生产环境

```bash
pnpm build
pm2 start ecosystem.config.js --only frontend-prod
```

## 自定义配置

### 更新公司信息

- `components/footer.tsx` — 联系信息
- `app/about/page.tsx` — 公司介绍
- `app/layout.tsx` — 网站元数据

### 添加新服务

1. 在 `components/services-section.tsx` 添加服务项
2. 创建对应的服务详情页面

### 修改样式

- `app/globals.css` — 全局样式和 CSS 变量
- Tailwind CSS 类名 — 组件级样式

---

*最后更新: 2026-03-24*
