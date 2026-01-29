# 统一文件存储配置指南

本项目支持多种对象存储后端，切换存储只需修改 `.env.local` 配置文件。

## 支持的存储类型

| 类型 | 说明 | 配置值 |
|------|------|--------|
| local | 本地文件系统 | `FILE_STORAGE_TYPE=local` |
| minio | MinIO 对象存储 | `FILE_STORAGE_TYPE=minio` |
| s3 | AWS S3 | `FILE_STORAGE_TYPE=s3` |
| oss | 阿里云 OSS | `FILE_STORAGE_TYPE=oss` |
| cos | 腾讯云 COS | `FILE_STORAGE_TYPE=cos` |

> 注：minio/s3/oss/cos 都使用 S3 兼容协议，配置方式相同

## 配置示例

### 本地存储

```bash
FILE_STORAGE_TYPE=local
UPLOAD_FOLDER=/path/to/uploads
```

### MinIO（自建对象存储）

```bash
FILE_STORAGE_TYPE=minio
STORAGE_ENDPOINT=8.155.147.19:9000
STORAGE_ACCESS_KEY=admin
STORAGE_SECRET_KEY=admin123456
STORAGE_SECURE=false
STORAGE_DEFAULT_BUCKET=gtv-files
STORAGE_PUBLIC_URL=http://8.155.147.19:9000
```

### AWS S3

```bash
FILE_STORAGE_TYPE=s3
STORAGE_ENDPOINT=s3.amazonaws.com
STORAGE_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE
STORAGE_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
STORAGE_REGION=us-east-1
STORAGE_SECURE=true
STORAGE_DEFAULT_BUCKET=my-gtv-files
STORAGE_PUBLIC_URL=https://my-gtv-files.s3.amazonaws.com
```

### 阿里云 OSS

```bash
FILE_STORAGE_TYPE=oss
STORAGE_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
STORAGE_ACCESS_KEY=your_access_key_id
STORAGE_SECRET_KEY=your_access_key_secret
STORAGE_REGION=cn-hangzhou
STORAGE_SECURE=true
STORAGE_DEFAULT_BUCKET=my-gtv-files
STORAGE_PUBLIC_URL=https://my-gtv-files.oss-cn-hangzhou.aliyuncs.com
```

### 腾讯云 COS

```bash
FILE_STORAGE_TYPE=cos
STORAGE_ENDPOINT=cos.ap-shanghai.myqcloud.com
STORAGE_ACCESS_KEY=your_secret_id
STORAGE_SECRET_KEY=your_secret_key
STORAGE_REGION=ap-shanghai
STORAGE_SECURE=true
STORAGE_DEFAULT_BUCKET=my-gtv-files
STORAGE_PUBLIC_URL=https://my-gtv-files.cos.ap-shanghai.myqcloud.com
```

## 存储迁移步骤

当需要从一个存储切换到另一个存储时：

### 1. 迁移文件数据

使用 rclone 或其他工具将文件从旧存储复制到新存储：

```bash
# 安装 rclone
brew install rclone  # macOS
apt install rclone   # Ubuntu

# 配置源和目标
rclone config

# 同步文件（保持相同的路径结构）
rclone sync old-storage:gtv-files new-storage:gtv-files
```

### 2. 更新配置

修改 `.env.local` 中的存储配置指向新的存储服务。

### 3. 重启服务

```bash
pm2 restart backend
```

### 4. 验证

访问应用，确认文件预览正常工作。

## 技术说明

### 为什么不需要更新数据库？

数据库中存储的是：
- `storage_type`: 存储类型标识
- `minio_bucket`: 存储桶名称
- `minio_object_name`: 对象路径（相对路径）

文件的访问 URL 是**运行时动态生成**的，基于当前的 `STORAGE_ENDPOINT` 和 `STORAGE_PUBLIC_URL` 配置。因此，只要保持相同的 bucket 和 object_name 结构，切换存储后无需修改数据库。

### 数据库字段说明

| 字段 | 说明 | 迁移时是否需要更新 |
|------|------|-------------------|
| `storage_type` | 存储类型 | 可选（代码会正确处理） |
| `minio_bucket` | 存储桶名称 | 否（保持不变） |
| `minio_object_name` | 对象路径 | 否（保持不变） |
| `minio_url` | URL 缓存 | 否（会被忽略，动态生成） |

### 向后兼容

旧的 `MINIO_*` 环境变量仍然有效，系统会自动识别并使用。建议新项目使用 `STORAGE_*` 前缀。
