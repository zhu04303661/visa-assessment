# Supabase配置说明

## 获取Supabase凭证

要使用文案管理系统，需要在 `.env.local` 文件中配置Supabase凭证。

### 步骤1: 登录Supabase Dashboard

访问 https://app.supabase.com 并登录你的账户。

### 步骤2: 选择或创建项目

- 如果已有项目，选择项目
- 如果没有项目，点击"New Project"创建新项目

### 步骤3: 获取API凭证

1. 在项目页面，点击左侧菜单的 **Settings** (设置)
2. 选择 **API**
3. 在 **Project API keys** 部分，找到以下信息：
   - **Project URL**: 例如 `https://xxxxx.supabase.co`
   - **anon public key**: 这是一个以 `eyJ...` 开头的长字符串

### 步骤4: 配置环境变量

在项目根目录的 `.env.local` 文件中添加：

```bash
# Supabase配置（必需）
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**注意**: 
- `SUPABASE_URL` 是 Project URL
- `SUPABASE_KEY` 是 `anon` `public` key（不是 `service_role` key）

### 步骤5: 创建数据库表

在Supabase Dashboard中：

1. 点击左侧菜单的 **SQL Editor**
2. 点击 **New query**
3. 复制 `ace_gtv/supabase_schema.sql` 文件的内容
4. 粘贴到SQL Editor中
5. 点击 **Run** 执行SQL脚本

这将创建以下表：
- `clients` - 客户表
- `cases` - 案件表
- `documents` - 文档表
- `progress` - 进度表
- `timeline` - 时间规划表

### 步骤6: 验证配置

运行测试脚本验证配置：

```bash
cd ace_gtv
python3 test_import_excel.py "../副本英国GTV文案进度表-李成(1).xlsx"
```

如果配置正确，应该能看到解析的Excel数据。

然后运行导入脚本：

```bash
python3 import_excel_data.py "../副本英国GTV文案进度表-李成(1).xlsx"
```

## 安全提示

⚠️ **重要**: 
- 不要将 `.env.local` 文件提交到Git仓库
- `SUPABASE_KEY` 应该使用 `anon` key，它有Row Level Security (RLS)保护
- 如果需要更严格的权限控制，可以在Supabase Dashboard中配置RLS策略

## 故障排除

### 错误：SUPABASE_URL 和 SUPABASE_KEY 必须在环境变量中配置

**原因**: `.env.local` 文件中缺少必要的配置

**解决方案**: 按照上述步骤添加配置

### 错误：relation "clients" does not exist

**原因**: 数据库表尚未创建

**解决方案**: 在Supabase SQL Editor中执行 `supabase_schema.sql` 脚本

### 错误：permission denied

**原因**: RLS策略限制了访问

**解决方案**: 
1. 在Supabase Dashboard中，进入 **Authentication** > **Policies**
2. 为相关表创建策略，允许匿名访问（仅用于开发环境）
3. 生产环境应配置更严格的策略

