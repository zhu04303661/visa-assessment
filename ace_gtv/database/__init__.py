#!/usr/bin/env python3
"""
数据库模块
包含 SQLite、MinIO 客户端和 DAO 层

注意：assessments.db 已合并到 copywriting.db
GTVAssessmentDatabase 和 assessment_db 已废弃，请使用 CopywritingDatabase
"""

from .copywriting_database import CopywritingDatabase

# 创建全局数据库实例
copywriting_db = CopywritingDatabase()

# 兼容性别名（已废弃，请使用 CopywritingDatabase）
# GTVAssessmentDatabase 功能已合并到 CopywritingDatabase
GTVAssessmentDatabase = CopywritingDatabase
assessment_db = copywriting_db

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

__all__ = [
    # 主数据库类
    'CopywritingDatabase',
    'copywriting_db',
    # 兼容性别名（已废弃）
    'GTVAssessmentDatabase',
    'assessment_db',
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
]
