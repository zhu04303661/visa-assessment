"""
统一文件存储抽象层

支持多种存储后端：
- local: 本地文件系统
- minio: MinIO 对象存储
- s3: AWS S3 / 阿里云 OSS / 腾讯云 COS（S3 兼容）

设计原则：
1. 数据库只存储：storage_type, bucket, object_name（相对路径）
2. URL 在运行时动态生成，基于 .env.local 中的端点配置
3. 切换存储只需修改环境变量，无需修改代码或数据库

环境变量配置：
    FILE_STORAGE_TYPE=minio|s3|local
    
    # MinIO / S3 兼容存储
    STORAGE_ENDPOINT=8.155.147.19:9000
    STORAGE_ACCESS_KEY=admin
    STORAGE_SECRET_KEY=admin123456
    STORAGE_SECURE=false
    STORAGE_DEFAULT_BUCKET=gtv-files
    STORAGE_PUBLIC_URL=http://8.155.147.19:9000  # 公网访问地址（可选）

使用方式：
    from database.file_storage import get_file_storage
    
    storage = get_file_storage()
    
    # 保存文件
    result = storage.save_file(
        project_id="E6CFB79B",
        category="raw_materials",
        filename="document.pdf",
        content=file_bytes
    )
    
    # 读取文件
    content = storage.get_file(result.bucket, result.object_name)
    
    # 获取预览 URL（动态生成，基于当前配置）
    url = storage.get_file_url(result.bucket, result.object_name)
    
    # 删除文件
    storage.delete_file(result.bucket, result.object_name)
"""

import os
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Union
from io import BytesIO

logger = logging.getLogger(__name__)


@dataclass
class FileInfo:
    """文件信息"""
    storage_type: str          # 存储类型：local 或 minio
    bucket: str                # 存储桶（本地为基础目录）
    object_name: str           # 对象名称（相对路径）
    file_path: str             # 完整路径（本地）或 MinIO 路径
    file_url: Optional[str]    # 预览 URL（MinIO 预签名 URL 或本地路径）
    file_size: int             # 文件大小
    content_type: str          # MIME 类型
    created_at: datetime       # 创建时间


class FileStorage(ABC):
    """文件存储抽象基类"""
    
    @property
    @abstractmethod
    def storage_type(self) -> str:
        """返回存储类型标识"""
        pass
    
    @abstractmethod
    def save_file(
        self,
        project_id: str,
        category: str,
        filename: str,
        content: Union[bytes, BytesIO],
        subfolder: Optional[str] = None,
        content_type: Optional[str] = None
    ) -> FileInfo:
        """
        保存文件
        
        Args:
            project_id: 项目ID
            category: 文件类别（如 raw_materials, exports）
            filename: 文件名
            content: 文件内容（bytes 或 BytesIO）
            subfolder: 可选的子文件夹
            content_type: MIME 类型
            
        Returns:
            FileInfo: 保存后的文件信息
        """
        pass
    
    @abstractmethod
    def get_file(self, bucket: str, object_name: str) -> Optional[bytes]:
        """
        读取文件内容
        
        Args:
            bucket: 存储桶
            object_name: 对象名称
            
        Returns:
            文件内容的 bytes，如果不存在返回 None
        """
        pass
    
    @abstractmethod
    def get_file_url(self, bucket: str, object_name: str, expires: int = 3600) -> Optional[str]:
        """
        获取文件预览/下载 URL
        
        Args:
            bucket: 存储桶
            object_name: 对象名称
            expires: URL 有效期（秒），仅对 MinIO 有效
            
        Returns:
            预览 URL，如果不存在返回 None
        """
        pass
    
    @abstractmethod
    def delete_file(self, bucket: str, object_name: str) -> bool:
        """
        删除文件
        
        Args:
            bucket: 存储桶
            object_name: 对象名称
            
        Returns:
            是否删除成功
        """
        pass
    
    @abstractmethod
    def file_exists(self, bucket: str, object_name: str) -> bool:
        """
        检查文件是否存在
        
        Args:
            bucket: 存储桶
            object_name: 对象名称
            
        Returns:
            文件是否存在
        """
        pass
    
    @abstractmethod
    def list_files(self, bucket: str, prefix: str = "") -> List[str]:
        """
        列出文件
        
        Args:
            bucket: 存储桶
            prefix: 前缀过滤
            
        Returns:
            文件对象名称列表
        """
        pass
    
    def get_content_type(self, filename: str) -> str:
        """根据文件名推断 MIME 类型"""
        ext = Path(filename).suffix.lower()
        mime_types = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.ppt': 'application/vnd.ms-powerpoint',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
            '.txt': 'text/plain',
            '.md': 'text/markdown',
            '.json': 'application/json',
            '.xml': 'application/xml',
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.zip': 'application/zip',
            '.rar': 'application/x-rar-compressed',
            '.7z': 'application/x-7z-compressed',
        }
        return mime_types.get(ext, 'application/octet-stream')


class LocalFileStorage(FileStorage):
    """本地文件系统存储"""
    
    def __init__(self, base_path: str = None):
        """
        初始化本地存储
        
        Args:
            base_path: 基础存储路径，默认为 uploads 目录
        """
        if base_path is None:
            base_path = os.getenv('UPLOAD_FOLDER', 'uploads')
        
        self.base_path = os.path.abspath(base_path)
        os.makedirs(self.base_path, exist_ok=True)
        logger.info(f"本地文件存储初始化完成，路径: {self.base_path}")
    
    @property
    def storage_type(self) -> str:
        return "local"
    
    def _get_full_path(self, bucket: str, object_name: str) -> str:
        """获取完整的文件路径"""
        return os.path.join(self.base_path, bucket, object_name)
    
    def save_file(
        self,
        project_id: str,
        category: str,
        filename: str,
        content: Union[bytes, BytesIO],
        subfolder: Optional[str] = None,
        content_type: Optional[str] = None
    ) -> FileInfo:
        # 构建路径
        bucket = project_id
        
        # 生成唯一文件名
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = filename.replace(' ', '_')
        
        if subfolder:
            object_name = f"{category}/{subfolder}/{timestamp}_{safe_filename}"
        else:
            object_name = f"{category}/{timestamp}_{safe_filename}"
        
        full_path = self._get_full_path(bucket, object_name)
        
        # 创建目录
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        
        # 写入文件
        if isinstance(content, BytesIO):
            content = content.read()
        
        with open(full_path, 'wb') as f:
            f.write(content)
        
        file_size = len(content)
        content_type = content_type or self.get_content_type(filename)
        
        logger.info(f"文件已保存到本地: {full_path} ({file_size} bytes)")
        
        return FileInfo(
            storage_type=self.storage_type,
            bucket=bucket,
            object_name=object_name,
            file_path=full_path,
            file_url=full_path,  # 本地路径
            file_size=file_size,
            content_type=content_type,
            created_at=datetime.now()
        )
    
    def get_file(self, bucket: str, object_name: str) -> Optional[bytes]:
        full_path = self._get_full_path(bucket, object_name)
        
        if not os.path.exists(full_path):
            logger.warning(f"文件不存在: {full_path}")
            return None
        
        with open(full_path, 'rb') as f:
            return f.read()
    
    def get_file_url(self, bucket: str, object_name: str, expires: int = 3600) -> Optional[str]:
        full_path = self._get_full_path(bucket, object_name)
        
        if not os.path.exists(full_path):
            return None
        
        # 本地存储返回文件路径
        return full_path
    
    def delete_file(self, bucket: str, object_name: str) -> bool:
        full_path = self._get_full_path(bucket, object_name)
        
        try:
            if os.path.exists(full_path):
                os.remove(full_path)
                logger.info(f"文件已删除: {full_path}")
                return True
            return False
        except Exception as e:
            logger.error(f"删除文件失败: {full_path}, 错误: {e}")
            return False
    
    def file_exists(self, bucket: str, object_name: str) -> bool:
        full_path = self._get_full_path(bucket, object_name)
        return os.path.exists(full_path)
    
    def list_files(self, bucket: str, prefix: str = "") -> List[str]:
        base_dir = os.path.join(self.base_path, bucket, prefix)
        
        if not os.path.exists(base_dir):
            return []
        
        files = []
        for root, _, filenames in os.walk(base_dir):
            for filename in filenames:
                full_path = os.path.join(root, filename)
                relative_path = os.path.relpath(full_path, os.path.join(self.base_path, bucket))
                files.append(relative_path)
        
        return files


class S3CompatibleStorage(FileStorage):
    """
    S3 兼容对象存储（支持 MinIO、AWS S3、阿里云 OSS、腾讯云 COS 等）
    
    所有 S3 兼容存储使用统一接口，通过环境变量配置具体使用哪个服务
    """
    
    def __init__(
        self,
        endpoint: str = None,
        access_key: str = None,
        secret_key: str = None,
        secure: bool = None,
        default_bucket: str = None,
        public_url: str = None,
        region: str = None
    ):
        """
        初始化 S3 兼容存储
        
        Args:
            endpoint: 服务端点（如 s3.amazonaws.com, oss-cn-hangzhou.aliyuncs.com）
            access_key: 访问密钥
            secret_key: 秘密密钥
            secure: 是否使用 HTTPS（默认 True）
            default_bucket: 默认存储桶
            public_url: 公网访问 URL（用于生成预览链接）
            region: 区域（某些云服务需要）
        """
        from minio import Minio
        
        # 优先使用通用配置，兼容旧的 MINIO_ 前缀
        self.endpoint = endpoint or os.getenv('STORAGE_ENDPOINT') or os.getenv('MINIO_ENDPOINT', 'localhost:9000')
        self.access_key = access_key or os.getenv('STORAGE_ACCESS_KEY') or os.getenv('MINIO_ACCESS_KEY', 'minioadmin')
        self.secret_key = secret_key or os.getenv('STORAGE_SECRET_KEY') or os.getenv('MINIO_SECRET_KEY', 'minioadmin')
        self.default_bucket = default_bucket or os.getenv('STORAGE_DEFAULT_BUCKET') or os.getenv('MINIO_DEFAULT_BUCKET', 'gtv-files')
        self.region = region or os.getenv('STORAGE_REGION', '')
        
        # 公网访问 URL（用于生成可访问的链接）
        # 如果未配置，则使用端点地址
        self.public_url = public_url or os.getenv('STORAGE_PUBLIC_URL') or os.getenv('MINIO_PUBLIC_URL')
        
        # HTTPS 配置
        if secure is not None:
            self.secure = secure
        else:
            secure_env = os.getenv('STORAGE_SECURE') or os.getenv('MINIO_SECURE', 'false')
            self.secure = secure_env.lower() in ('true', '1', 'yes')
        
        # 初始化 S3 客户端（MinIO 客户端兼容所有 S3 服务）
        self.client = Minio(
            self.endpoint,
            access_key=self.access_key,
            secret_key=self.secret_key,
            secure=self.secure,
            region=self.region if self.region else None
        )
        
        # 确保默认存储桶存在
        try:
            if not self.client.bucket_exists(self.default_bucket):
                self.client.make_bucket(self.default_bucket)
                logger.info(f"创建存储桶: {self.default_bucket}")
        except Exception as e:
            logger.error(f"存储桶初始化失败: {e}")
        
        logger.info(f"S3兼容存储初始化完成，端点: {self.endpoint}, 桶: {self.default_bucket}")
    
    @property
    def storage_type(self) -> str:
        # 返回通用的 s3 类型，便于识别是对象存储
        # 数据库中可以存储 "minio" 或 "s3"，都会被正确处理
        return "minio"  # 保持向后兼容
    
    def get_public_file_url(self, bucket: str, object_name: str) -> str:
        """
        生成公开访问的文件 URL（基于配置的公网地址）
        
        这个 URL 不包含签名，需要存储桶设置为公开访问
        主要用于需要长期有效链接的场景
        """
        if self.public_url:
            protocol = "https" if self.secure else "http"
            base_url = self.public_url.rstrip('/')
            return f"{base_url}/{bucket}/{object_name}"
        else:
            protocol = "https" if self.secure else "http"
            return f"{protocol}://{self.endpoint}/{bucket}/{object_name}"
    
    def save_file(
        self,
        project_id: str,
        category: str,
        filename: str,
        content: Union[bytes, BytesIO],
        subfolder: Optional[str] = None,
        content_type: Optional[str] = None
    ) -> FileInfo:
        from datetime import timedelta
        
        bucket = self.default_bucket
        
        # 生成唯一对象名
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = filename.replace(' ', '_')
        
        if subfolder:
            object_name = f"{project_id}/{category}/{subfolder}/{timestamp}_{safe_filename}"
        else:
            object_name = f"{project_id}/{category}/{timestamp}_{safe_filename}"
        
        # 准备内容
        if isinstance(content, bytes):
            content_stream = BytesIO(content)
            content_length = len(content)
        else:
            content.seek(0, 2)  # 移到末尾获取大小
            content_length = content.tell()
            content.seek(0)  # 回到开头
            content_stream = content
        
        content_type = content_type or self.get_content_type(filename)
        
        # 上传到 MinIO
        self.client.put_object(
            bucket,
            object_name,
            content_stream,
            content_length,
            content_type=content_type
        )
        
        # 生成预签名 URL
        url = self.client.presigned_get_object(
            bucket,
            object_name,
            expires=timedelta(days=7)
        )
        
        logger.info(f"文件已上传到 MinIO: {bucket}/{object_name} ({content_length} bytes)")
        
        return FileInfo(
            storage_type=self.storage_type,
            bucket=bucket,
            object_name=object_name,
            file_path=f"{bucket}/{object_name}",
            file_url=url,
            file_size=content_length,
            content_type=content_type,
            created_at=datetime.now()
        )
    
    def get_file(self, bucket: str, object_name: str) -> Optional[bytes]:
        try:
            response = self.client.get_object(bucket, object_name)
            content = response.read()
            response.close()
            response.release_conn()
            return content
        except Exception as e:
            logger.warning(f"获取 MinIO 文件失败: {bucket}/{object_name}, 错误: {e}")
            return None
    
    def get_file_url(self, bucket: str, object_name: str, expires: int = 3600) -> Optional[str]:
        from datetime import timedelta
        
        try:
            url = self.client.presigned_get_object(
                bucket,
                object_name,
                expires=timedelta(seconds=expires)
            )
            return url
        except Exception as e:
            logger.warning(f"生成 MinIO URL 失败: {bucket}/{object_name}, 错误: {e}")
            return None
    
    def delete_file(self, bucket: str, object_name: str) -> bool:
        try:
            self.client.remove_object(bucket, object_name)
            logger.info(f"MinIO 文件已删除: {bucket}/{object_name}")
            return True
        except Exception as e:
            logger.error(f"删除 MinIO 文件失败: {bucket}/{object_name}, 错误: {e}")
            return False
    
    def file_exists(self, bucket: str, object_name: str) -> bool:
        try:
            self.client.stat_object(bucket, object_name)
            return True
        except Exception:
            return False
    
    def list_files(self, bucket: str, prefix: str = "") -> List[str]:
        try:
            objects = self.client.list_objects(bucket, prefix=prefix, recursive=True)
            return [obj.object_name for obj in objects]
        except Exception as e:
            logger.error(f"列出 MinIO 文件失败: {bucket}/{prefix}, 错误: {e}")
            return []


# 单例实例
_file_storage_instance: Optional[FileStorage] = None


def get_file_storage(force_type: Optional[str] = None) -> FileStorage:
    """
    获取文件存储实例（单例模式）
    
    Args:
        force_type: 强制使用指定类型，默认从环境变量读取
            - "local": 本地文件系统
            - "minio": MinIO 对象存储
            - "s3": AWS S3
            - "oss": 阿里云 OSS
            - "cos": 腾讯云 COS
            （minio/s3/oss/cos 都使用 S3CompatibleStorage）
        
    Returns:
        FileStorage 实例
    """
    global _file_storage_instance
    
    if _file_storage_instance is not None and force_type is None:
        return _file_storage_instance
    
    # 确定存储类型
    storage_type = force_type or os.getenv('FILE_STORAGE_TYPE', 'minio')
    
    if storage_type == 'local':
        _file_storage_instance = LocalFileStorage()
    elif storage_type in ('minio', 's3', 'oss', 'cos'):
        # 所有 S3 兼容存储使用统一实现
        try:
            _file_storage_instance = S3CompatibleStorage()
        except Exception as e:
            logger.warning(f"对象存储初始化失败，回退到本地存储: {e}")
            _file_storage_instance = LocalFileStorage()
    else:
        logger.warning(f"未知的存储类型: {storage_type}，使用本地存储")
        _file_storage_instance = LocalFileStorage()
    
    return _file_storage_instance


# 别名，保持向后兼容
MinIOFileStorage = S3CompatibleStorage


def reset_file_storage():
    """重置文件存储实例（用于测试或切换存储类型）"""
    global _file_storage_instance
    _file_storage_instance = None


# 便捷方法
def save_project_file(
    project_id: str,
    category: str,
    filename: str,
    content: Union[bytes, BytesIO],
    subfolder: Optional[str] = None
) -> FileInfo:
    """保存项目文件的便捷方法"""
    storage = get_file_storage()
    return storage.save_file(project_id, category, filename, content, subfolder)


def get_project_file(bucket: str, object_name: str) -> Optional[bytes]:
    """获取项目文件的便捷方法"""
    storage = get_file_storage()
    return storage.get_file(bucket, object_name)


def get_project_file_url(bucket: str, object_name: str, expires: int = 3600) -> Optional[str]:
    """获取项目文件 URL 的便捷方法"""
    storage = get_file_storage()
    return storage.get_file_url(bucket, object_name, expires)


def get_file_from_db_record(record: dict) -> Optional[bytes]:
    """
    从数据库记录中获取文件内容
    
    自动处理 minio 和 local 存储类型，业务代码无需关心存储细节
    
    Args:
        record: 数据库记录，需包含以下字段之一：
            - minio: storage_type='minio', object_bucket, object_key
            - local: storage_type='local', file_path
    
    Returns:
        文件内容的 bytes，如果不存在返回 None
    """
    storage = get_file_storage()
    storage_type = record.get('storage_type', 'local')
    
    # 对于对象存储
    if storage_type in ('minio', 's3', 'oss', 'cos'):
        bucket = record.get('object_bucket')
        object_name = record.get('object_key')
        if bucket and object_name:
            return storage.get_file(bucket, object_name)
    
    # local 存储
    file_path = record.get('file_path')
    if file_path:
        # 尝试多种路径
        paths_to_try = [file_path]
        
        # 如果是相对路径，尝试不同的基础目录
        if not os.path.isabs(file_path):
            # 移除开头的 ./
            clean_path = file_path.lstrip('./')
            
            # 尝试 uploads 目录
            upload_folder = os.getenv('UPLOAD_FOLDER', 'uploads')
            paths_to_try.extend([
                clean_path,
                os.path.join(upload_folder, clean_path),
                os.path.join(os.getcwd(), clean_path),
                os.path.join(os.getcwd(), upload_folder, clean_path),
            ])
        
        for path in paths_to_try:
            if os.path.exists(path):
                with open(path, 'rb') as f:
                    return f.read()
        
        logger.warning(f"本地文件不存在，尝试过的路径: {paths_to_try[:3]}")
    
    return None


def get_file_url_from_db_record(record: dict, expires: int = 3600) -> Optional[str]:
    """
    从数据库记录中获取文件 URL
    
    重要：URL 总是基于当前配置动态生成，不使用数据库中存储的旧 URL
    这样当存储端点变化时，只需修改配置即可，无需更新数据库
    
    Args:
        record: 数据库记录
        expires: URL 有效期（秒）
    
    Returns:
        预览 URL
    """
    storage = get_file_storage()
    storage_type = record.get('storage_type', 'local')
    
    # 对于对象存储（minio/s3/oss/cos），基于当前配置动态生成 URL
    if storage_type in ('minio', 's3', 'oss', 'cos'):
        bucket = record.get('object_bucket')
        object_name = record.get('object_key')
        if bucket and object_name:
            # 使用存储接口动态生成预签名 URL
            return storage.get_file_url(bucket, object_name, expires)
    
    # local
    file_path = record.get('file_path')
    return file_path


def get_public_file_url_from_db_record(record: dict) -> Optional[str]:
    """
    从数据库记录中获取公开访问的文件 URL（无签名，永久有效）
    
    注意：需要存储桶设置为公开访问才能使用
    
    Args:
        record: 数据库记录
    
    Returns:
        公开访问 URL
    """
    storage = get_file_storage()
    storage_type = record.get('storage_type', 'local')
    
    if storage_type in ('minio', 's3', 'oss', 'cos'):
        bucket = record.get('object_bucket')
        object_name = record.get('object_key')
        if bucket and object_name and hasattr(storage, 'get_public_file_url'):
            return storage.get_public_file_url(bucket, object_name)
    
    # local
    file_path = record.get('file_path')
    return file_path


def delete_file_from_db_record(record: dict) -> bool:
    """
    根据数据库记录删除文件
    
    Args:
        record: 数据库记录
    
    Returns:
        是否删除成功
    """
    storage = get_file_storage()
    storage_type = record.get('storage_type', 'local')
    
    if storage_type == 'minio':
        bucket = record.get('object_bucket')
        object_name = record.get('object_key')
        if bucket and object_name:
            return storage.delete_file(bucket, object_name)
    
    # local
    file_path = record.get('file_path')
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
            return True
        except Exception:
            pass
    
    return False


# ============================================
# 数据库字段映射常量
# ============================================
# 数据库表使用 minio_* 前缀是历史原因，通过这些常量可以解耦
# 重要：minio_url 字段仅作为缓存使用，URL 应该动态生成
DB_FIELD_STORAGE_TYPE = 'storage_type'
DB_FIELD_BUCKET = 'object_bucket'
DB_FIELD_OBJECT_NAME = 'object_key'
DB_FIELD_URL = 'object_url'  # 仅缓存用，不应依赖此字段
DB_FIELD_FILE_PATH = 'file_path'


# ============================================
# 存储迁移指南
# ============================================
"""
当需要切换存储服务时（如从 MinIO 迁移到阿里云 OSS）：

1. 数据迁移：
   - 将现有文件从旧存储复制到新存储，保持相同的 bucket/object_name 结构
   - 可以使用 rclone 等工具进行批量迁移

2. 配置更新（.env.local）：
   # 从 MinIO
   STORAGE_ENDPOINT=8.155.147.19:9000
   STORAGE_ACCESS_KEY=admin
   STORAGE_SECRET_KEY=admin123456
   
   # 改为阿里云 OSS
   STORAGE_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
   STORAGE_ACCESS_KEY=your_oss_access_key
   STORAGE_SECRET_KEY=your_oss_secret_key
   STORAGE_REGION=cn-hangzhou
   STORAGE_SECURE=true
   STORAGE_PUBLIC_URL=https://your-bucket.oss-cn-hangzhou.aliyuncs.com

3. 无需修改数据库：
   - storage_type 字段保持 "minio"（或更新为 "oss"，代码会正确处理）
   - object_bucket、object_key 字段保持不变
   - minio_url 字段会被忽略，URL 基于新配置动态生成

4. 重启服务即可
"""


def migrate_storage_urls(db_path: str, new_public_url: str = None) -> dict:
    """
    迁移存储 URL（可选，用于更新数据库中的缓存 URL）
    
    通常不需要调用，因为 URL 是动态生成的
    但如果需要更新数据库中的缓存 URL，可以使用此方法
    
    Args:
        db_path: 数据库路径
        new_public_url: 新的公网 URL 基础地址
    
    Returns:
        迁移结果统计
    """
    import sqlite3
    
    storage = get_file_storage()
    
    if not new_public_url and hasattr(storage, 'public_url'):
        new_public_url = storage.public_url
    
    if not new_public_url:
        return {"success": False, "error": "未配置公网 URL"}
    
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 更新 material_files 表
        cursor.execute('''
            SELECT id, object_bucket, object_key 
            FROM material_files 
            WHERE storage_type IN ('minio', 's3', 'oss', 'cos')
        ''')
        
        updated = 0
        for row in cursor.fetchall():
            bucket = row['object_bucket']
            object_name = row['object_key']
            if bucket and object_name:
                new_url = f"{new_public_url.rstrip('/')}/{bucket}/{object_name}"
                cursor.execute('''
                    UPDATE material_files SET minio_url = ? WHERE id = ?
                ''', (new_url, row['id']))
                updated += 1
        
        conn.commit()
        conn.close()
        
        return {"success": True, "updated": updated}
        
    except Exception as e:
        return {"success": False, "error": str(e)}
