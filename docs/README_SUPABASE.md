# Supabase 集成说明

本项目已集成 Supabase 作为后端数据库，提供用户管理、评估记录、聊天历史和文件上传等功能。

## 功能概述

### 1. 用户管理
- 用户注册（`POST /api/auth/register`）
- 用户登录（`POST /api/auth/login`）
- 获取用户信息（`GET /api/auth/user/<user_id>`）
- 用户登出（`POST /api/auth/logout`）

### 2. 评估记录管理
- 保存评估记录（`POST /api/assessments/`）
- 获取用户评估列表（`GET /api/assessments/user/<user_id>`）
- 获取单个评估记录（`GET /api/assessments/<assessment_id>`）

### 3. 聊天记录管理
- 保存聊天消息（`POST /api/chat/message`）
- 获取聊天历史（`GET /api/chat/history/<user_id>`）
- 获取用户会话列表（`GET /api/chat/sessions/<user_id>`）
- 创建新会话（`POST /api/chat/session/new`）

### 4. 文件上传管理
- 上传文件到 Supabase Storage（`POST /api/files/upload`）
- 获取用户文件列表（`GET /api/files/user/<user_id>`）

## 环境配置

确保 `.env.local` 文件中包含以下 Supabase 配置：

```bash
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 安装依赖

```bash
cd ace_gtv
pip install supabase>=2.0.0 postgrest-py>=0.13.0
```

或使用 requirements.txt：

```bash
pip install -r requirements.txt
```

## 数据库初始化

### 方法 1：使用脚本生成 SQL

```bash
cd ace_gtv
python init_supabase_db.py
```

脚本会生成 `supabase_init.sql` 文件，包含所有数据库表结构。

### 方法 2：手动在 Supabase Dashboard 执行

1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 选择您的项目
3. 进入 **SQL Editor**
4. 创建新查询
5. 复制粘贴 `supabase_init.sql` 中的内容
6. 点击 **Run** 执行

### 数据库表结构

- **user_profiles**: 用户配置表（扩展 auth.users）
- **assessments**: 评估记录表
- **chat_messages**: 聊天消息表
- **uploaded_files**: 上传文件表

所有表都启用了行级安全策略（RLS），确保用户只能访问自己的数据。

## API 使用示例

### 用户注册

```bash
curl -X POST http://localhost:5005/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "full_name": "用户名",
    "phone": "13800138000"
  }'
```

### 用户登录

```bash
curl -X POST http://localhost:5005/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### 保存评估记录

```bash
curl -X POST http://localhost:5005/api/assessments/ \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid",
    "assessment_data": {
      "name": "张三",
      "score": 85,
      "recommendations": ["建议1", "建议2"]
    }
  }'
```

### 保存聊天消息

```bash
curl -X POST http://localhost:5005/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid",
    "session_id": "session-uuid",
    "role": "user",
    "content": "请给我做一个GTV身份评估"
  }'
```

### 上传文件

```bash
curl -X POST http://localhost:5005/api/files/upload \
  -F "file=@/path/to/resume.pdf" \
  -F "user_id=user-uuid" \
  -F "file_type=resume"
```

### 获取聊天历史

```bash
curl http://localhost:5005/api/chat/history/user-uuid?session_id=session-uuid&limit=50
```

## 文件结构

```
ace_gtv/
├── supabase_client.py      # Supabase 客户端管理器
├── auth_routes.py          # 用户认证路由
├── assessment_routes.py    # 评估记录路由
├── chat_routes.py          # 聊天记录路由
├── file_routes.py          # 文件上传路由
├── init_supabase_db.py     # 数据库初始化脚本
├── api_server.py           # 主API服务器（已集成Supabase路由）
└── README_SUPABASE.md      # 本文档
```

## Supabase Storage 配置

### 创建存储桶

在 Supabase Dashboard 中：

1. 进入 **Storage**
2. 点击 **New bucket**
3. 创建以下存储桶：
   - `resumes`: 用于存储简历文件
   - `reports`: 用于存储生成的PDF报告
   - `documents`: 用于存储其他文档

### 设置存储桶策略

为每个存储桶设置策略，允许用户上传和访问自己的文件：

```sql
-- 允许用户上传文件到自己的目录
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 允许用户访问自己的文件
CREATE POLICY "Users can access own files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);
```

## 故障排查

### 1. Supabase 客户端初始化失败

**问题**: `Supabase 客户端初始化失败`

**解决方案**:
- 检查 `.env.local` 中的 Supabase 配置是否正确
- 确认 `supabase` Python 包已安装
- 检查网络连接

### 2. 数据库表不存在

**问题**: `relation "assessments" does not exist`

**解决方案**:
- 运行 `python init_supabase_db.py` 生成 SQL
- 在 Supabase Dashboard 的 SQL Editor 中执行生成的 SQL

### 3. 权限错误

**问题**: `new row violates row-level security policy`

**解决方案**:
- 确保用户已登录并且使用正确的 user_id
- 检查 RLS 策略是否正确设置

### 4. 文件上传失败

**问题**: `Storage bucket does not exist`

**解决方案**:
- 在 Supabase Dashboard 中创建对应的存储桶
- 设置正确的存储桶策略

## 降级模式

如果 Supabase 不可用，系统会自动切换到降级模式：
- Supabase 路由将不会注册
- 相关功能将被禁用
- 日志会显示警告信息

## 开发建议

1. **本地测试**: 使用 Supabase 提供的本地开发工具
2. **环境隔离**: 为开发、测试和生产环境使用不同的 Supabase 项目
3. **备份策略**: 定期备份数据库
4. **监控**: 使用 Supabase Dashboard 监控数据库性能
5. **安全**: 妥善保管 SERVICE_ROLE_KEY，不要提交到版本控制系统

## 参考资料

- [Supabase 官方文档](https://supabase.com/docs)
- [Supabase Python 客户端](https://github.com/supabase-community/supabase-py)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage](https://supabase.com/docs/guides/storage)

## 联系支持

如有问题，请联系开发团队或查阅项目文档。

