# Azure OpenAI 配置指南

本应用现在支持两种AI提供商：
1. **OpenAI** - 直接使用OpenAI API
2. **Azure OpenAI** - 使用Azure的OpenAI服务

## 配置步骤

### 1. 环境变量配置

在 `.env.local` 文件中配置以下变量：

```env
# AI提供商选择 (openai 或 azure)
AI_PROVIDER=openai

# OpenAI 配置
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o

# Azure OpenAI 配置
AZURE_OPENAI_API_KEY=your_azure_openai_api_key_here
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=your-deployment-name
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_MODEL=gpt-4o

# 通用配置
MAX_TOKENS=4000
TEMPERATURE=0.7
```

### 2. Azure OpenAI 设置

#### 2.1 创建Azure OpenAI资源

1. 登录 [Azure Portal](https://portal.azure.com/)
2. 创建新资源，搜索 "Azure OpenAI"
3. 填写必要信息：
   - 订阅：选择您的订阅
   - 资源组：创建或选择现有资源组
   - 区域：选择离您最近的区域
   - 名称：为您的资源命名
   - 定价层：选择适合的定价层

#### 2.2 获取API密钥和终结点

1. 在Azure Portal中打开您的Azure OpenAI资源
2. 在左侧菜单中点击"密钥和终结点"
3. 复制以下信息：
   - **API密钥**：复制"密钥1"或"密钥2"
   - **终结点**：复制完整的URL（例如：`https://your-resource-name.openai.azure.com/`）

#### 2.3 部署模型

1. 在Azure Portal中，打开您的Azure OpenAI资源
2. 点击左侧菜单中的"模型部署"
3. 点击"创建"按钮
4. 选择模型（推荐：`gpt-4o` 或 `gpt-35-turbo`）
5. 输入部署名称（例如：`gpt-4o-deployment`）
6. 点击"保存"完成部署

#### 2.4 更新环境变量

将获取的信息更新到 `.env.local` 文件中：

```env
AI_PROVIDER=azure
AZURE_OPENAI_API_KEY=your_actual_api_key_here
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o-deployment
AZURE_MODEL=gpt-4o
```

### 3. 切换提供商

要切换AI提供商，只需修改 `.env.local` 中的 `AI_PROVIDER` 变量：

```env
# 使用OpenAI
AI_PROVIDER=openai

# 使用Azure OpenAI
AI_PROVIDER=azure
```

### 4. 验证配置

重启开发服务器后，应用会自动验证配置：

```bash
pnpm dev
```

如果配置有误，应用会显示详细的错误信息。

## 支持的模型

### OpenAI 模型
- `gpt-4o` (推荐)
- `gpt-4`
- `gpt-3.5-turbo`

### Azure OpenAI 模型
- `gpt-4o` (推荐)
- `gpt-4`
- `gpt-35-turbo`
- `gpt-35-turbo-16k`

## 配置验证

应用启动时会自动验证配置，如果发现问题会显示错误信息：

- ✅ 配置正确：应用正常启动
- ❌ 配置错误：显示具体的错误信息

## 故障排除

### 常见问题

1. **API密钥错误**
   - 确保API密钥正确且有效
   - 检查密钥是否已过期

2. **终结点错误**
   - 确保终结点URL格式正确
   - 检查是否包含协议（https://）

3. **部署名称错误**
   - 确保部署名称与Azure中创建的完全一致
   - 检查部署是否已完成

4. **权限问题**
   - 确保您的Azure账户有访问Azure OpenAI的权限
   - 检查订阅是否已启用Azure OpenAI服务

### 调试信息

如果遇到问题，可以查看控制台输出，应用会显示详细的配置验证信息。

## 成本优化

### OpenAI vs Azure OpenAI

- **OpenAI**：按使用量付费，适合小规模使用
- **Azure OpenAI**：企业级服务，有更好的安全性和合规性

### 模型选择建议

- **开发/测试**：使用 `gpt-3.5-turbo` 降低成本
- **生产环境**：使用 `gpt-4o` 获得最佳效果

## 安全注意事项

1. **API密钥安全**：
   - 永远不要将API密钥提交到版本控制系统
   - 使用环境变量存储敏感信息
   - 定期轮换API密钥

2. **网络安全**：
   - 在生产环境中使用HTTPS
   - 配置适当的网络访问控制

3. **数据隐私**：
   - 了解数据在Azure OpenAI中的处理方式
   - 确保符合相关的数据保护法规
