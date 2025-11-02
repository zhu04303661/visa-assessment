# UK GTV Visa Assessment Application
# 英国全球人才签证评估应用

[English](#english) | [中文](#chinese)

---

<a name="english"></a>
## English

### Overview

This is an AI-powered assessment application for the UK Global Talent Visa (GTV). It analyzes applicants' resumes and provides detailed evaluations based on official UK GTV criteria, including recommendations for Exceptional Talent or Exceptional Promise pathways.

### Features

- **Resume Analysis**: Upload resume files or paste text for AI-powered analysis
- **Comprehensive Evaluation**: Detailed assessment across multiple dimensions:
  - Education Background
  - Industry Background
  - Work Experience
  - Technical Expertise
- **Official Standards**: Evaluation based on Tech Nation and UK government criteria
- **Bilingual Support**: Full English and Chinese language support
- **Debug Interface**: Built-in debugging tools for administrators to optimize AI prompts
- **Detailed Reports**: 
  - Overall eligibility score
  - Strengths and weaknesses analysis
  - GTV pathway recommendations
  - Required documentation checklist
  - Professional advice and timeline

### Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **AI**: OpenAI GPT-4 via Vercel AI SDK
- **Deployment**: Vercel

### Prerequisites

- Node.js 18+ or Bun
- OpenAI API key (or Vercel AI Gateway access)

### Installation

1. **Clone the repository**
   \`\`\`bash
   git clone <repository-url>
   cd gtv-visa-assessment
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   # or
   bun install
   \`\`\`

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   \`\`\`env
   # Optional: If not using Vercel AI Gateway
   OPENAI_API_KEY=your_openai_api_key_here
   \`\`\`

4. **Run the development server**
   \`\`\`bash
   npm run dev
   # or
   bun dev
   \`\`\`

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

### Deployment

#### Deploy to Vercel (Recommended)

1. **Push to GitHub**
   \`\`\`bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   \`\`\`

2. **Deploy on Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Configure environment variables (if needed)
   - Click "Deploy"

3. **Environment Variables on Vercel**
   
   If not using Vercel AI Gateway, add in Vercel dashboard:
   - `OPENAI_API_KEY`: Your OpenAI API key

#### Manual Deployment

1. **Build the application**
   \`\`\`bash
   npm run build
   # or
   bun run build
   \`\`\`

2. **Start the production server**
   \`\`\`bash
   npm start
   # or
   bun start
   \`\`\`

### Project Structure

\`\`\`
gtv-visa-assessment/
├── app/
│   ├── api/
│   │   └── analyze-resume/
│   │       └── route.ts          # AI analysis API endpoint
│   ├── assessment/
│   │   └── page.tsx               # Assessment form page
│   ├── results/
│   │   └── page.tsx               # Results display page
│   ├── layout.tsx                 # Root layout with i18n
│   ├── page.tsx                   # Home page
│   └── globals.css                # Global styles
├── components/
│   ├── assessment-form.tsx        # Resume upload form
│   ├── assessment-results.tsx     # Results display component
│   ├── hero.tsx                   # Hero section
│   ├── features.tsx               # Features section
│   ├── language-switcher.tsx      # Language toggle
│   └── ...
├── lib/
│   └── i18n.tsx                   # Internationalization context
└── README.md
\`\`\`

### Usage

1. **Home Page**: Introduction to the GTV assessment service
2. **Start Assessment**: Click "Start Assessment" button
3. **Upload Resume**: 
   - Upload a file (TXT, PDF, DOC, DOCX) or
   - Paste resume text directly
4. **Fill Basic Info**: Provide name, email, phone, and field
5. **Submit**: Click "Analyze Resume" to start AI analysis
6. **View Results**: Detailed assessment report with:
   - Overall score and pathway recommendation
   - Education, industry, work, and technical analysis
   - Strengths and weaknesses
   - Professional advice
   - Required documents and timeline

### Debug Mode

For administrators to optimize AI prompts:

1. Navigate to the results page after an assessment
2. Scroll to the bottom to find the "Debug Information" section
3. View the exact prompt sent to GPT and the raw response
4. Copy prompts for testing and optimization

### Customization

#### Modify AI Analysis

Edit `app/api/analyze-resume/route.ts` to customize:
- Assessment criteria
- Scoring logic
- Output format
- AI model parameters

#### Update UI Text

Edit `lib/i18n.tsx` to modify:
- English translations
- Chinese translations
- Add new language support

#### Styling

Edit `app/globals.css` to customize:
- Color scheme (design tokens)
- Typography
- Component styles

### Troubleshooting

**Issue**: AI returns "I'm sorry, I can't assist with that"
- **Solution**: Check if resume content is appropriate and not too long (max 2500 chars)

**Issue**: "Missing required fields" error
- **Solution**: The API now auto-fills missing fields. Check debug logs for details.

**Issue**: Array type errors in results
- **Solution**: Fixed with comprehensive type validation. Update to latest code.

### License

MIT License

### Support

For issues or questions, please open an issue on GitHub.

---

<a name="chinese"></a>
## 中文

### 项目简介

这是一个基于 AI 的英国全球人才签证（GTV）评估应用。它能够分析申请人的简历，并根据英国 GTV 官方标准提供详细的评估报告，包括 Exceptional Talent 或 Exceptional Promise 路径的推荐。

### 功能特点

- **简历分析**：支持上传简历文件或粘贴文本进行 AI 分析
- **全面评估**：多维度详细评估：
  - 教育背景
  - 行业背景
  - 从业经历
  - 技术特长
- **官方标准**：基于 Tech Nation 和英国政府标准进行评估
- **双语支持**：完整的中英文双语界面
- **调试界面**：内置调试工具，方便管理员优化 AI 提示词
- **详细报告**：
  - 综合资格评分
  - 优劣势分析
  - GTV 路径推荐
  - 所需文档清单
  - 专业建议和时间表

### 技术栈

- **框架**：Next.js 15（App Router）
- **语言**：TypeScript
- **样式**：Tailwind CSS v4
- **UI 组件**：shadcn/ui
- **AI**：OpenAI GPT-4（通过 Vercel AI SDK）
- **部署**：Vercel

### 环境要求

- Node.js 18+ 或 Bun
- OpenAI API 密钥（或 Vercel AI Gateway 访问权限）

### 安装步骤

1. **克隆仓库**
   \`\`\`bash
   git clone <repository-url>
   cd gtv-visa-assessment
   \`\`\`

2. **安装依赖**
   \`\`\`bash
   npm install
   # 或
   bun install
   \`\`\`

3. **配置环境变量**
   
   在根目录创建 `.env.local` 文件：
   \`\`\`env
   # 可选：如果不使用 Vercel AI Gateway
   OPENAI_API_KEY=your_openai_api_key_here
   \`\`\`

4. **启动开发服务器**
   \`\`\`bash
   npm run dev
   # 或
   bun dev
   \`\`\`

5. **打开浏览器**
   
   访问 [http://localhost:3000](http://localhost:3000)

### 部署说明

#### 部署到 Vercel（推荐）

1. **推送到 GitHub**
   \`\`\`bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   \`\`\`

2. **在 Vercel 上部署**
   - 访问 [vercel.com](https://vercel.com)
   - 点击 "New Project"
   - 导入你的 GitHub 仓库
   - 配置环境变量（如需要）
   - 点击 "Deploy"

3. **在 Vercel 配置环境变量**
   
   如果不使用 Vercel AI Gateway，在 Vercel 控制台添加：
   - `OPENAI_API_KEY`：你的 OpenAI API 密钥

#### 手动部署

1. **构建应用**
   \`\`\`bash
   npm run build
   # 或
   bun run build
   \`\`\`

2. **启动生产服务器**
   \`\`\`bash
   npm start
   # 或
   bun start
   \`\`\`

### 项目结构

\`\`\`
gtv-visa-assessment/
├── app/
│   ├── api/
│   │   └── analyze-resume/
│   │       └── route.ts          # AI 分析 API 端点
│   ├── assessment/
│   │   └── page.tsx               # 评估表单页面
│   ├── results/
│   │   └── page.tsx               # 结果展示页面
│   ├── layout.tsx                 # 根布局（含国际化）
│   ├── page.tsx                   # 首页
│   └── globals.css                # 全局样式
├── components/
│   ├── assessment-form.tsx        # 简历上传表单
│   ├── assessment-results.tsx     # 结果展示组件
│   ├── hero.tsx                   # 英雄区块
│   ├── features.tsx               # 功能特点区块
│   ├── language-switcher.tsx      # 语言切换器
│   └── ...
├── lib/
│   └── i18n.tsx                   # 国际化上下文
└── README.md
\`\`\`

### 使用说明

1. **首页**：查看 GTV 评估服务介绍
2. **开始评估**：点击"开始评估"按钮
3. **上传简历**：
   - 上传文件（TXT、PDF、DOC、DOCX）或
   - 直接粘贴简历文本
4. **填写基本信息**：提供姓名、邮箱、电话和申请领域
5. **提交**：点击"分析简历"开始 AI 分析
6. **查看结果**：详细的评估报告包含：
   - 综合评分和路径推荐
   - 教育、行业、工作和技术分析
   - 优势和劣势
   - 专业建议
   - 所需文档和时间表

### 调试模式

供管理员优化 AI 提示词：

1. 完成评估后进入结果页面
2. 滚动到底部找到"调试信息"部分
3. 查看发送给 GPT 的确切提示词和原始响应
4. 复制提示词进行测试和优化

### 自定义配置

#### 修改 AI 分析

编辑 `app/api/analyze-resume/route.ts` 来自定义：
- 评估标准
- 评分逻辑
- 输出格式
- AI 模型参数

#### 更新界面文本

编辑 `lib/i18n.tsx` 来修改：
- 英文翻译
- 中文翻译
- 添加新语言支持

#### 样式定制

编辑 `app/globals.css` 来自定义：
- 配色方案（设计令牌）
- 字体排版
- 组件样式

### 常见问题

**问题**：AI 返回 "I'm sorry, I can't assist with that"
- **解决方案**：检查简历内容是否合适且不要太长（最多 2500 字符）

**问题**："Missing required fields" 错误
- **解决方案**：API 现在会自动填充缺失字段。查看调试日志了解详情。

**问题**：结果页面出现数组类型错误
- **解决方案**：已通过全面的类型验证修复。更新到最新代码。

### 许可证

MIT License

### 支持

如有问题或疑问，请在 GitHub 上提交 issue。
# visa-assessment



nohup ./start_frontend.sh > frontend.log 2>&1 &
nohup bash start_backend.sh &
