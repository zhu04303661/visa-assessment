# Supabase 集成快速开始指南

本指南将帮助您快速配置和使用 Supabase 集成功能。

## 📋 前置条件

- Python 3.8+
- 已有 Supabase 账号和项目
- `.env.local` 文件中已配置 Supabase 凭证

## 🚀 快速开始

### 步骤 1: 安装依赖

```bash
cd ace_gtv
pip install -r requirements.txt
```

新增的依赖包括：
- `supabase>=2.0.0`
- `postgrest-py>=0.13.0`

### 步骤 2: 初始化数据库

运行初始化脚本生成 SQL：

```bash
python init_supabase_db.py
```

这将生成 `supabase_init.sql` 文件并显示在终端。

### 步骤 3: 在 Supabase Dashboard 执行 SQL

1. 访问 [Supabase Dashboard](https://app.supabase.com)
2. 选择您的项目（URL: `https://jauyustbxrltqlkaffog.supabase.co`）
3. 导航到 **SQL Editor**
4. 创建新查询
5. 复制粘贴 `supabase_init.sql` 的内容
6. 点击 **Run** 执行

### 步骤 4: 创建 Storage 存储桶

在 Supabase Dashboard 中：

1. 导航到 **Storage**
2. 点击 **New bucket**
3. 创建以下存储桶：
   - 名称: `resumes`，公开: ❌（私有）
   - 名称: `reports`，公开: ❌（私有）
   - 名称: `documents`，公开: ❌（私有）

### 步骤 5: 设置 Storage 策略

为每个存储桶设置访问策略：

```sql
-- 对 resumes 存储桶
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resumes' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can access own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'resumes' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 对 reports 和 documents 重复相同的策略，只需修改 bucket_id
```

### 步骤 6: 启动后端服务

```bash
cd /home/xichi/workspace/visa-assessment
bash start_backend.sh
```

查看日志确认 Supabase 路由已注册：

```bash
tail -f ace_gtv/logs/api_server_unified.log
```

应该看到：
```
✅ Supabase 客户端初始化成功
✅ Supabase 路由注册成功
```

## 📝 API 端点

### 用户认证

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| GET | `/api/auth/user/<user_id>` | 获取用户信息 |
| POST | `/api/auth/logout` | 用户登出 |

### 评估记录

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/api/assessments/` | 保存评估记录 |
| GET | `/api/assessments/user/<user_id>` | 获取用户评估列表 |
| GET | `/api/assessments/<assessment_id>` | 获取单个评估记录 |

### 聊天记录

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/api/chat/message` | 保存聊天消息 |
| GET | `/api/chat/history/<user_id>` | 获取聊天历史 |
| GET | `/api/chat/sessions/<user_id>` | 获取用户会话列表 |
| POST | `/api/chat/session/new` | 创建新会话 |

### 文件上传

| 方法 | 端点 | 描述 |
|------|------|------|
| POST | `/api/files/upload` | 上传文件 |
| GET | `/api/files/user/<user_id>` | 获取用户文件列表 |

## 🧪 测试 API

### 1. 测试用户注册

```bash
curl -X POST http://localhost:5005/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456",
    "full_name": "测试用户",
    "phone": "13800138000"
  }'
```

### 2. 测试用户登录

```bash
curl -X POST http://localhost:5005/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456"
  }'
```

保存返回的 `user.id` 用于后续测试。

### 3. 测试创建会话

```bash
curl -X POST http://localhost:5005/api/chat/session/new \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "your-user-id",
    "title": "GTV评估咨询"
  }'
```

### 4. 测试保存聊天消息

```bash
curl -X POST http://localhost:5005/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "your-user-id",
    "session_id": "your-session-id",
    "role": "user",
    "content": "我想做一个GTV签证评估"
  }'
```

### 5. 测试获取聊天历史

```bash
curl "http://localhost:5005/api/chat/history/your-user-id?session_id=your-session-id&limit=50"
```

## 🗂️ 数据库表结构

### user_profiles
扩展 Supabase Auth 用户表

| 字段 | 类型 | 描述 |
|------|------|------|
| id | UUID | 用户ID（外键 auth.users.id） |
| full_name | TEXT | 用户全名 |
| phone | TEXT | 电话号码 |
| company | TEXT | 公司名称 |
| position | TEXT | 职位 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### assessments
评估记录表

| 字段 | 类型 | 描述 |
|------|------|------|
| id | UUID | 评估ID |
| user_id | UUID | 用户ID（外键 auth.users.id） |
| assessment_type | TEXT | 评估类型 |
| data | JSONB | 评估数据（JSON格式） |
| status | TEXT | 状态（pending/completed） |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### chat_messages
聊天消息表

| 字段 | 类型 | 描述 |
|------|------|------|
| id | UUID | 消息ID |
| user_id | UUID | 用户ID（外键 auth.users.id） |
| session_id | TEXT | 会话ID |
| role | TEXT | 角色（user/assistant/system） |
| content | TEXT | 消息内容 |
| metadata | JSONB | 元数据（JSON格式） |
| created_at | TIMESTAMP | 创建时间 |

### uploaded_files
上传文件记录表

| 字段 | 类型 | 描述 |
|------|------|------|
| id | UUID | 文件ID |
| user_id | UUID | 用户ID（外键 auth.users.id） |
| file_name | TEXT | 文件名 |
| file_path | TEXT | 文件路径 |
| file_type | TEXT | 文件类型（resume/document/report） |
| file_url | TEXT | 文件URL |
| bucket_name | TEXT | 存储桶名称 |
| uploaded_at | TIMESTAMP | 上传时间 |

## 🔒 安全特性

### Row Level Security (RLS)

所有表都启用了行级安全策略：
- 用户只能查看和修改自己的数据
- 基于 `auth.uid()` 自动过滤
- 防止数据泄露和未授权访问

### 数据加密

- 密码使用 bcrypt 加密
- 传输使用 HTTPS/TLS
- 数据库连接使用 SSL

## ⚠️ 故障排查

### Supabase 客户端初始化失败

**症状**: 日志显示 `❌ Supabase 客户端初始化失败`

**解决方案**:
1. 检查 `.env.local` 中的配置：
   ```bash
   grep SUPABASE .env.local
   ```
2. 确认网络可以访问 Supabase API
3. 验证 API 密钥是否正确

### 数据库表不存在

**症状**: 错误 `relation "assessments" does not exist`

**解决方案**:
1. 运行 `python init_supabase_db.py`
2. 在 Supabase Dashboard 执行生成的 SQL
3. 检查表是否创建成功

### 权限错误

**症状**: `new row violates row-level security policy`

**解决方案**:
1. 确保用户已登录
2. 使用正确的 user_id
3. 检查 RLS 策略是否正确设置

### 文件上传失败

**症状**: `Storage bucket does not exist`

**解决方案**:
1. 在 Supabase Dashboard 创建存储桶
2. 设置存储桶策略
3. 验证存储桶名称拼写正确

## 📊 监控和维护

### 查看日志

```bash
# 查看 API 服务器日志
tail -f ace_gtv/logs/api_server_unified.log

# 查看 Supabase 客户端日志
tail -f ace_gtv/logs/api_server_unified.log | grep -i supabase
```

### 数据库查询

在 Supabase Dashboard 的 SQL Editor 中：

```sql
-- 查看用户数量
SELECT COUNT(*) FROM auth.users;

-- 查看评估记录数量
SELECT COUNT(*) FROM assessments;

-- 查看聊天消息数量
SELECT COUNT(*) FROM chat_messages;

-- 查看最近的评估记录
SELECT * FROM assessments 
ORDER BY created_at DESC 
LIMIT 10;
```

### 数据备份

Supabase 提供自动备份功能，也可以手动备份：

1. 在 Supabase Dashboard 导航到 **Database** > **Backups**
2. 点击 **Create backup**
3. 选择备份选项

## 📚 相关文档

- [Supabase 集成详细说明](./ace_gtv/README_SUPABASE.md)
- [API 服务器文档](./ace_gtv/README.md)
- [Supabase 官方文档](https://supabase.com/docs)

## 🆘 获取帮助

如遇问题：
1. 查看日志文件
2. 检查 Supabase Dashboard 中的错误
3. 参考本文档的故障排查部分
4. 联系开发团队

## ✅ 验证清单

安装完成后，请验证：

- [ ] Python 依赖已安装（`pip list | grep supabase`）
- [ ] 数据库表已创建（在 Supabase Dashboard 检查）
- [ ] Storage 存储桶已创建
- [ ] Storage 策略已设置
- [ ] 后端服务启动成功
- [ ] Supabase 路由已注册
- [ ] 用户注册 API 可用
- [ ] 用户登录 API 可用
- [ ] 聊天消息保存 API 可用
- [ ] 文件上传 API 可用

恭喜！Supabase 集成已完成！🎉

