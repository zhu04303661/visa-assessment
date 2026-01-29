"""
DAO (Data Access Object) 层
提供数据库操作的抽象接口，支持切换不同数据库实现
"""

from .base import BaseDAO, DatabaseConfig
from .project_dao import ProjectDAO
from .material_dao import MaterialDAO
from .classification_dao import ClassificationDAO
from .framework_dao import FrameworkDAO
from .extraction_dao import ExtractionDAO
from .prompt_dao import PromptDAO

# 全局 DAO 实例管理
_dao_instances = {}

def get_dao(dao_class, db_type: str = None, db_path: str = None):
    """
    获取 DAO 实例（单例模式）
    
    Args:
        dao_class: DAO 类
        db_type: 数据库类型 ('sqlite', 'mysql')，默认从环境变量读取
        db_path: 数据库路径/连接字符串
    
    Returns:
        DAO 实例
    """
    import os
    
    if db_type is None:
        db_type = os.getenv('DB_TYPE', 'sqlite')
    if db_path is None:
        db_path = os.getenv('COPYWRITING_DB_PATH', './copywriting.db')
    
    key = f"{dao_class.__name__}_{db_type}_{db_path}"
    
    if key not in _dao_instances:
        config = DatabaseConfig(db_type=db_type, db_path=db_path)
        _dao_instances[key] = dao_class(config)
    
    return _dao_instances[key]


# 便捷访问函数
def get_project_dao() -> ProjectDAO:
    return get_dao(ProjectDAO)

def get_material_dao() -> MaterialDAO:
    return get_dao(MaterialDAO)

def get_classification_dao() -> ClassificationDAO:
    return get_dao(ClassificationDAO)

def get_framework_dao() -> FrameworkDAO:
    return get_dao(FrameworkDAO)

def get_extraction_dao() -> ExtractionDAO:
    return get_dao(ExtractionDAO)

def get_prompt_dao() -> PromptDAO:
    return get_dao(PromptDAO)


__all__ = [
    'BaseDAO',
    'DatabaseConfig',
    'ProjectDAO',
    'MaterialDAO', 
    'ClassificationDAO',
    'FrameworkDAO',
    'ExtractionDAO',
    'PromptDAO',
    'get_dao',
    'get_project_dao',
    'get_material_dao',
    'get_classification_dao',
    'get_framework_dao',
    'get_extraction_dao',
    'get_prompt_dao',
]
