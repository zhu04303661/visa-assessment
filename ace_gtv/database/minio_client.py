#!/usr/bin/env python3
"""
MinIO 对象存储客户端模块
提供文件上传、下载、删除和 Bucket 管理功能
"""

import os
import io
import uuid
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, BinaryIO, Union
from pathlib import Path
from dotenv import load_dotenv

# 加载环境变量（使用绝对路径确保正确加载）
env_path = Path(__file__).parent.parent.parent / '.env.local'
if env_path.exists():
    load_dotenv(env_path, override=True)
else:
    load_dotenv()  # 尝试默认位置

# 导入 MinIO
try:
    from minio import Minio
    from minio.error import S3Error
    MINIO_AVAILABLE = True
except ImportError:
    MINIO_AVAILABLE = False
    logging.warning("MinIO 库未安装，请运行: pip install minio")

from utils.logger_config import setup_module_logger
logger = setup_module_logger("minio_client", os.getenv("LOG_LEVEL", "INFO"))


class MinIOManager:
    """MinIO 对象存储管理器"""
    
    def __init__(self):
        """初始化 MinIO 客户端"""
        if not MINIO_AVAILABLE:
            logger.warning("MinIO 不可用，将使用降级模式（本地存储）")
            self.client = None
            self.enabled = False
            return
        
        # 从环境变量获取配置
        self.endpoint = os.getenv("MINIO_ENDPOINT", "localhost:9000")
        self.access_key = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
        self.secret_key = os.getenv("MINIO_SECRET_KEY", "minioadmin")
        self.secure = os.getenv("MINIO_SECURE", "false").lower() == "true"
        self.bucket_prefix = os.getenv("MINIO_BUCKET_PREFIX", "gtv-project-")
        
        if not self.endpoint or not self.access_key or not self.secret_key:
            logger.warning("MinIO 配置未找到，将使用降级模式")
            self.client = None
            self.enabled = False
            return
        
        try:
            self.client = Minio(
                self.endpoint,
                access_key=self.access_key,
                secret_key=self.secret_key,
                secure=self.secure
            )
            # 测试连接
            self.client.list_buckets()
            self.enabled = True
            logger.info(f"✅ MinIO 客户端初始化成功: {self.endpoint}")
        except Exception as e:
            logger.error(f"❌ MinIO 客户端初始化失败: {e}")
            self.client = None
            self.enabled = False
    
    def is_enabled(self) -> bool:
        """检查 MinIO 是否可用"""
        return self.enabled and self.client is not None
    
    # ==================== Bucket 管理 ====================
    
    def get_bucket_name(self, project_id: str) -> str:
        """
        根据项目 ID 生成 bucket 名称
        
        Args:
            project_id: 项目 ID
        
        Returns:
            bucket 名称（小写，符合 S3 命名规范）
        """
        # S3 bucket 名称规范：小写字母、数字、连字符，3-63 字符
        safe_id = project_id.lower().replace('_', '-')
        bucket_name = f"{self.bucket_prefix}{safe_id}"
        # 确保长度不超过 63
        if len(bucket_name) > 63:
            bucket_name = bucket_name[:63]
        return bucket_name
    
    def create_bucket(self, project_id: str) -> Dict[str, Any]:
        """
        为项目创建 Bucket
        
        Args:
            project_id: 项目 ID
        
        Returns:
            创建结果
        """
        if not self.is_enabled():
            return {"success": False, "error": "MinIO 未启用"}
        
        bucket_name = self.get_bucket_name(project_id)
        
        try:
            # 检查 bucket 是否存在
            if self.client.bucket_exists(bucket_name):
                logger.info(f"Bucket 已存在: {bucket_name}")
                return {
                    "success": True,
                    "bucket_name": bucket_name,
                    "message": "Bucket 已存在"
                }
            
            # 创建 bucket
            self.client.make_bucket(bucket_name)
            logger.info(f"✅ Bucket 创建成功: {bucket_name}")
            
            return {
                "success": True,
                "bucket_name": bucket_name,
                "message": "Bucket 创建成功"
            }
        except S3Error as e:
            logger.error(f"❌ Bucket 创建失败: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"❌ Bucket 创建失败: {e}")
            return {"success": False, "error": str(e)}
    
    def delete_bucket(self, project_id: str, force: bool = False) -> Dict[str, Any]:
        """
        删除项目的 Bucket
        
        Args:
            project_id: 项目 ID
            force: 是否强制删除（包括所有文件）
        
        Returns:
            删除结果
        """
        if not self.is_enabled():
            return {"success": False, "error": "MinIO 未启用"}
        
        bucket_name = self.get_bucket_name(project_id)
        
        try:
            if not self.client.bucket_exists(bucket_name):
                return {
                    "success": True,
                    "message": "Bucket 不存在"
                }
            
            if force:
                # 删除所有对象
                objects = self.client.list_objects(bucket_name, recursive=True)
                for obj in objects:
                    self.client.remove_object(bucket_name, obj.object_name)
            
            self.client.remove_bucket(bucket_name)
            logger.info(f"✅ Bucket 删除成功: {bucket_name}")
            
            return {
                "success": True,
                "message": "Bucket 删除成功"
            }
        except S3Error as e:
            logger.error(f"❌ Bucket 删除失败: {e}")
            return {"success": False, "error": str(e)}
    
    def list_buckets(self) -> Dict[str, Any]:
        """
        列出所有 Bucket
        
        Returns:
            Bucket 列表
        """
        if not self.is_enabled():
            return {"success": False, "error": "MinIO 未启用"}
        
        try:
            buckets = self.client.list_buckets()
            return {
                "success": True,
                "buckets": [
                    {
                        "name": b.name,
                        "creation_date": b.creation_date.isoformat() if b.creation_date else None
                    }
                    for b in buckets
                ]
            }
        except Exception as e:
            logger.error(f"❌ 列出 Bucket 失败: {e}")
            return {"success": False, "error": str(e)}
    
    # ==================== 文件上传 ====================
    
    def upload_file(
        self,
        project_id: str,
        file_data: Union[bytes, BinaryIO, str],
        object_name: str,
        content_type: str = None,
        metadata: Dict[str, str] = None
    ) -> Dict[str, Any]:
        """
        上传文件到项目 Bucket
        
        Args:
            project_id: 项目 ID
            file_data: 文件数据（bytes、文件对象或本地文件路径）
            object_name: 对象名称（在 bucket 中的路径）
            content_type: 文件 MIME 类型
            metadata: 自定义元数据
        
        Returns:
            上传结果，包含文件 URL
        """
        if not self.is_enabled():
            return {"success": False, "error": "MinIO 未启用"}
        
        bucket_name = self.get_bucket_name(project_id)
        
        try:
            # 确保 bucket 存在
            if not self.client.bucket_exists(bucket_name):
                self.create_bucket(project_id)
            
            # 处理不同类型的文件数据
            if isinstance(file_data, str):
                # 本地文件路径
                if not os.path.exists(file_data):
                    return {"success": False, "error": f"文件不存在: {file_data}"}
                
                file_size = os.path.getsize(file_data)
                
                # 自动检测 content_type
                if not content_type:
                    content_type = self._get_content_type(file_data)
                
                self.client.fput_object(
                    bucket_name,
                    object_name,
                    file_data,
                    content_type=content_type,
                    metadata=metadata
                )
            elif isinstance(file_data, bytes):
                # bytes 数据
                data_stream = io.BytesIO(file_data)
                file_size = len(file_data)
                
                self.client.put_object(
                    bucket_name,
                    object_name,
                    data_stream,
                    length=file_size,
                    content_type=content_type or "application/octet-stream",
                    metadata=metadata
                )
            else:
                # 文件对象
                file_data.seek(0, 2)  # 移到末尾
                file_size = file_data.tell()
                file_data.seek(0)  # 移回开头
                
                self.client.put_object(
                    bucket_name,
                    object_name,
                    file_data,
                    length=file_size,
                    content_type=content_type or "application/octet-stream",
                    metadata=metadata
                )
            
            # 生成文件 URL
            file_url = self.get_file_url(project_id, object_name)
            
            logger.info(f"✅ 文件上传成功: {bucket_name}/{object_name}")
            
            return {
                "success": True,
                "bucket_name": bucket_name,
                "object_name": object_name,
                "file_url": file_url,
                "file_size": file_size
            }
        except S3Error as e:
            logger.error(f"❌ 文件上传失败: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"❌ 文件上传失败: {e}")
            return {"success": False, "error": str(e)}
    
    def upload_file_from_path(
        self,
        project_id: str,
        local_path: str,
        category_id: str = None,
        item_id: str = None,
        custom_name: str = None
    ) -> Dict[str, Any]:
        """
        从本地路径上传文件，自动生成对象名称
        
        Args:
            project_id: 项目 ID
            local_path: 本地文件路径
            category_id: 材料分类 ID
            item_id: 材料项 ID
            custom_name: 自定义文件名（可选）
        
        Returns:
            上传结果
        """
        if not os.path.exists(local_path):
            return {"success": False, "error": f"文件不存在: {local_path}"}
        
        # 生成对象名称
        filename = custom_name or os.path.basename(local_path)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        
        # 简化路径结构，分类信息由数据库管理
        # 格式: files/{timestamp}_{uuid}_{filename}
        object_name = f"files/{timestamp}_{unique_id}_{filename}"
        
        # 获取 content_type
        content_type = self._get_content_type(local_path)
        
        return self.upload_file(
            project_id=project_id,
            file_data=local_path,
            object_name=object_name,
            content_type=content_type
        )
    
    # ==================== 文件下载 ====================
    
    def download_file(
        self,
        project_id: str,
        object_name: str,
        local_path: str = None
    ) -> Dict[str, Any]:
        """
        下载文件到本地
        
        Args:
            project_id: 项目 ID
            object_name: 对象名称
            local_path: 本地保存路径（可选）
        
        Returns:
            下载结果
        """
        if not self.is_enabled():
            return {"success": False, "error": "MinIO 未启用"}
        
        bucket_name = self.get_bucket_name(project_id)
        
        try:
            if local_path:
                # 下载到文件
                Path(local_path).parent.mkdir(parents=True, exist_ok=True)
                self.client.fget_object(bucket_name, object_name, local_path)
                return {
                    "success": True,
                    "local_path": local_path
                }
            else:
                # 返回数据流
                response = self.client.get_object(bucket_name, object_name)
                data = response.read()
                response.close()
                response.release_conn()
                return {
                    "success": True,
                    "data": data
                }
        except S3Error as e:
            logger.error(f"❌ 文件下载失败: {e}")
            return {"success": False, "error": str(e)}
    
    def get_file_stream(
        self,
        project_id: str,
        object_name: str
    ) -> Optional[Any]:
        """
        获取文件流（用于直接响应）
        
        Args:
            project_id: 项目 ID
            object_name: 对象名称
        
        Returns:
            文件响应对象
        """
        if not self.is_enabled():
            return None
        
        bucket_name = self.get_bucket_name(project_id)
        
        try:
            return self.client.get_object(bucket_name, object_name)
        except Exception as e:
            logger.error(f"❌ 获取文件流失败: {e}")
            return None
    
    # ==================== 文件 URL ====================
    
    def get_file_url(
        self,
        project_id: str,
        object_name: str,
        expires: int = 7 * 24 * 3600  # 默认 7 天
    ) -> str:
        """
        获取文件的预签名 URL
        
        Args:
            project_id: 项目 ID
            object_name: 对象名称
            expires: URL 有效期（秒）
        
        Returns:
            预签名 URL
        """
        if not self.is_enabled():
            return ""
        
        bucket_name = self.get_bucket_name(project_id)
        
        try:
            url = self.client.presigned_get_object(
                bucket_name,
                object_name,
                expires=timedelta(seconds=expires)
            )
            return url
        except Exception as e:
            logger.error(f"❌ 获取文件 URL 失败: {e}")
            return ""
    
    def get_file_url_by_bucket(
        self,
        bucket_name: str,
        object_name: str,
        expires: int = 7 * 24 * 3600  # 默认 7 天
    ) -> str:
        """
        通过 bucket 名称直接获取文件的预签名 URL
        
        Args:
            bucket_name: Bucket 名称
            object_name: 对象名称
            expires: URL 有效期（秒）
        
        Returns:
            预签名 URL
        """
        if not self.is_enabled():
            return ""
        
        try:
            url = self.client.presigned_get_object(
                bucket_name,
                object_name,
                expires=timedelta(seconds=expires)
            )
            return url
        except Exception as e:
            logger.error(f"❌ 获取文件 URL 失败 (bucket={bucket_name}): {e}")
            return ""
    
    def get_public_url(self, project_id: str, object_name: str) -> str:
        """
        获取文件的公共 URL（需要 bucket 设置为公开）
        
        Args:
            project_id: 项目 ID
            object_name: 对象名称
        
        Returns:
            公共 URL
        """
        bucket_name = self.get_bucket_name(project_id)
        protocol = "https" if self.secure else "http"
        return f"{protocol}://{self.endpoint}/{bucket_name}/{object_name}"
    
    # ==================== 文件删除 ====================
    
    def delete_file(self, project_id: str, object_name: str) -> Dict[str, Any]:
        """
        删除文件
        
        Args:
            project_id: 项目 ID
            object_name: 对象名称
        
        Returns:
            删除结果
        """
        if not self.is_enabled():
            return {"success": False, "error": "MinIO 未启用"}
        
        bucket_name = self.get_bucket_name(project_id)
        
        try:
            self.client.remove_object(bucket_name, object_name)
            logger.info(f"✅ 文件删除成功: {bucket_name}/{object_name}")
            return {"success": True}
        except S3Error as e:
            logger.error(f"❌ 文件删除失败: {e}")
            return {"success": False, "error": str(e)}
    
    def delete_files(self, project_id: str, object_names: List[str]) -> Dict[str, Any]:
        """
        批量删除文件
        
        Args:
            project_id: 项目 ID
            object_names: 对象名称列表
        
        Returns:
            删除结果
        """
        if not self.is_enabled():
            return {"success": False, "error": "MinIO 未启用"}
        
        bucket_name = self.get_bucket_name(project_id)
        
        try:
            from minio.deleteobjects import DeleteObject
            
            delete_objects = [DeleteObject(name) for name in object_names]
            errors = list(self.client.remove_objects(bucket_name, delete_objects))
            
            if errors:
                return {
                    "success": False,
                    "errors": [str(e) for e in errors]
                }
            
            logger.info(f"✅ 批量删除成功: {len(object_names)} 个文件")
            return {"success": True, "deleted_count": len(object_names)}
        except Exception as e:
            logger.error(f"❌ 批量删除失败: {e}")
            return {"success": False, "error": str(e)}
    
    # ==================== 文件列表 ====================
    
    def list_files(
        self,
        project_id: str,
        prefix: str = None,
        recursive: bool = True
    ) -> Dict[str, Any]:
        """
        列出项目中的文件
        
        Args:
            project_id: 项目 ID
            prefix: 路径前缀
            recursive: 是否递归列出
        
        Returns:
            文件列表
        """
        if not self.is_enabled():
            return {"success": False, "error": "MinIO 未启用"}
        
        bucket_name = self.get_bucket_name(project_id)
        
        try:
            if not self.client.bucket_exists(bucket_name):
                return {
                    "success": True,
                    "files": [],
                    "message": "Bucket 不存在"
                }
            
            objects = self.client.list_objects(
                bucket_name,
                prefix=prefix,
                recursive=recursive
            )
            
            files = []
            for obj in objects:
                files.append({
                    "object_name": obj.object_name,
                    "size": obj.size,
                    "last_modified": obj.last_modified.isoformat() if obj.last_modified else None,
                    "etag": obj.etag,
                    "content_type": obj.content_type
                })
            
            return {
                "success": True,
                "files": files,
                "count": len(files)
            }
        except Exception as e:
            logger.error(f"❌ 列出文件失败: {e}")
            return {"success": False, "error": str(e)}
    
    # ==================== 工具方法 ====================
    
    def _get_content_type(self, file_path: str) -> str:
        """根据文件扩展名获取 MIME 类型"""
        import mimetypes
        content_type, _ = mimetypes.guess_type(file_path)
        return content_type or "application/octet-stream"
    
    def file_exists(self, project_id: str, object_name: str) -> bool:
        """
        检查文件是否存在
        
        Args:
            project_id: 项目 ID
            object_name: 对象名称
        
        Returns:
            是否存在
        """
        if not self.is_enabled():
            return False
        
        bucket_name = self.get_bucket_name(project_id)
        
        try:
            self.client.stat_object(bucket_name, object_name)
            return True
        except S3Error:
            return False
    
    def get_file_info(self, project_id: str, object_name: str) -> Optional[Dict[str, Any]]:
        """
        获取文件信息
        
        Args:
            project_id: 项目 ID
            object_name: 对象名称
        
        Returns:
            文件信息
        """
        if not self.is_enabled():
            return None
        
        bucket_name = self.get_bucket_name(project_id)
        
        try:
            stat = self.client.stat_object(bucket_name, object_name)
            return {
                "object_name": stat.object_name,
                "size": stat.size,
                "last_modified": stat.last_modified.isoformat() if stat.last_modified else None,
                "etag": stat.etag,
                "content_type": stat.content_type,
                "metadata": dict(stat.metadata) if stat.metadata else {}
            }
        except S3Error:
            return None
    
    def copy_file(
        self,
        source_project_id: str,
        source_object_name: str,
        dest_project_id: str,
        dest_object_name: str
    ) -> Dict[str, Any]:
        """
        复制文件
        
        Args:
            source_project_id: 源项目 ID
            source_object_name: 源对象名称
            dest_project_id: 目标项目 ID
            dest_object_name: 目标对象名称
        
        Returns:
            复制结果
        """
        if not self.is_enabled():
            return {"success": False, "error": "MinIO 未启用"}
        
        source_bucket = self.get_bucket_name(source_project_id)
        dest_bucket = self.get_bucket_name(dest_project_id)
        
        try:
            from minio.commonconfig import CopySource
            
            # 确保目标 bucket 存在
            if not self.client.bucket_exists(dest_bucket):
                self.create_bucket(dest_project_id)
            
            self.client.copy_object(
                dest_bucket,
                dest_object_name,
                CopySource(source_bucket, source_object_name)
            )
            
            logger.info(f"✅ 文件复制成功: {source_bucket}/{source_object_name} -> {dest_bucket}/{dest_object_name}")
            return {"success": True}
        except Exception as e:
            logger.error(f"❌ 文件复制失败: {e}")
            return {"success": False, "error": str(e)}


# 创建全局实例（延迟初始化）
_minio_manager = None


# 便捷函数
def get_minio_manager() -> MinIOManager:
    """获取 MinIO 管理器实例（延迟初始化，自动重试）"""
    global _minio_manager
    
    # 如果实例不存在，或者存在但未启用（可能是因为初始化时环境变量未加载），则重新创建
    if _minio_manager is None or not _minio_manager.is_enabled():
        # 确保环境变量已加载
        import os
        from pathlib import Path
        try:
            from dotenv import load_dotenv
            env_path = Path(__file__).parent.parent.parent / '.env.local'
            if env_path.exists():
                load_dotenv(env_path, override=True)
        except ImportError:
            pass
        
        # 只有当环境变量存在时才尝试创建新实例
        if os.getenv("MINIO_ENDPOINT") and os.getenv("MINIO_ACCESS_KEY"):
            logger.info(f"尝试初始化 MinIO 客户端 (endpoint={os.getenv('MINIO_ENDPOINT')})")
            _minio_manager = MinIOManager()
    
    return _minio_manager


# 为了向后兼容，提供一个属性访问
class _MinioManagerProxy:
    """MinIO 管理器代理，用于延迟初始化"""
    def __getattr__(self, name):
        return getattr(get_minio_manager(), name)

minio_manager = _MinioManagerProxy()


def upload_to_minio(
    project_id: str,
    file_data: Union[bytes, BinaryIO, str],
    object_name: str,
    content_type: str = None
) -> Dict[str, Any]:
    """
    便捷的文件上传函数
    
    Args:
        project_id: 项目 ID
        file_data: 文件数据
        object_name: 对象名称
        content_type: 内容类型
    
    Returns:
        上传结果
    """
    return get_minio_manager().upload_file(project_id, file_data, object_name, content_type)


def get_minio_url(project_id: str, object_name: str, expires: int = 3600) -> str:
    """
    便捷的获取文件 URL 函数
    
    Args:
        project_id: 项目 ID
        object_name: 对象名称
        expires: 有效期（秒）
    
    Returns:
        预签名 URL
    """
    return get_minio_manager().get_file_url(project_id, object_name, expires)
