#!/usr/bin/env python3
"""
数据库模块
包含 SQLite、Supabase、MinIO 客户端和 DAO 层
"""

from .assessment_database import GTVAssessmentDatabase, assessment_db
from .copywriting_database import CopywritingDatabase

# DAO 层（支持切换数据库）
try:
    from .dao import (
        BaseDAO, DatabaseConfig,
        ProjectDAO, MaterialDAO, ClassificationDAO, FrameworkDAO, ExtractionDAO,
        get_dao, get_project_dao, get_material_dao, get_classification_dao,
        get_framework_dao, get_extraction_dao
    )
    DAO_AVAILABLE = True
except ImportError as e:
    DAO_AVAILABLE = False
    import logging
    logging.warning(f"DAO 模块导入失败: {e}")

# MinIO 客户端
try:
    from .minio_client import MinIOManager, get_minio_manager, upload_to_minio, get_minio_url
    MINIO_AVAILABLE = True
except ImportError:
    MINIO_AVAILABLE = False

# Supabase 客户端
try:
    from .supabase_client import SupabaseManager, get_supabase_manager
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False

__all__ = [
    # 原有数据库类
    'GTVAssessmentDatabase',
    'assessment_db',
    'CopywritingDatabase',
    # DAO 层
    'BaseDAO',
    'DatabaseConfig',
    'ProjectDAO',
    'MaterialDAO',
    'ClassificationDAO',
    'FrameworkDAO',
    'ExtractionDAO',
    'get_dao',
    'get_project_dao',
    'get_material_dao',
    'get_classification_dao',
    'get_framework_dao',
    'get_extraction_dao',
    'DAO_AVAILABLE',
    # MinIO
    'MinIOManager',
    'get_minio_manager',
    'upload_to_minio',
    'get_minio_url',
    'MINIO_AVAILABLE',
    # Supabase
    'SupabaseManager',
    'get_supabase_manager',
    'SUPABASE_AVAILABLE',
]
