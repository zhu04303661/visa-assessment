"""
DAO 基类和数据库配置
提供数据库连接管理和通用操作方法
"""

import os
import sqlite3
import logging
from abc import ABC, abstractmethod
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Dict, Any, List, Optional, Tuple, Union

try:
    from utils.logger_config import setup_module_logger
    logger = setup_module_logger("dao", os.getenv("LOG_LEVEL", "INFO"))
except ImportError:
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger("dao")


@dataclass
class DatabaseConfig:
    """数据库配置"""
    db_type: str = "sqlite"  # sqlite, mysql, postgresql
    db_path: str = "./copywriting.db"  # SQLite 路径或连接字符串
    
    # MySQL/PostgreSQL 配置
    host: str = "localhost"
    port: int = 3306
    user: str = ""
    password: str = ""
    database: str = ""
    
    # 连接池配置
    pool_size: int = 5
    max_overflow: int = 10
    
    @classmethod
    def from_env(cls) -> 'DatabaseConfig':
        """从环境变量创建配置"""
        return cls(
            db_type=os.getenv('DB_TYPE', 'sqlite'),
            db_path=os.getenv('COPYWRITING_DB_PATH', './copywriting.db'),
            host=os.getenv('DB_HOST', 'localhost'),
            port=int(os.getenv('DB_PORT', '3306')),
            user=os.getenv('DB_USER', ''),
            password=os.getenv('DB_PASSWORD', ''),
            database=os.getenv('DB_NAME', ''),
        )


class BaseDAO(ABC):
    """
    DAO 基类
    提供数据库连接管理和通用 CRUD 操作
    """
    
    def __init__(self, config: DatabaseConfig = None):
        self.config = config or DatabaseConfig.from_env()
        self._connection = None
        self._init_tables()
    
    @contextmanager
    def get_connection(self):
        """获取数据库连接（上下文管理器）"""
        if self.config.db_type == 'sqlite':
            conn = sqlite3.connect(self.config.db_path)
            conn.row_factory = sqlite3.Row
            try:
                yield conn
                conn.commit()
            except Exception as e:
                conn.rollback()
                raise
            finally:
                conn.close()
        elif self.config.db_type == 'mysql':
            # MySQL 连接（需要 mysql-connector-python）
            try:
                import mysql.connector
                conn = mysql.connector.connect(
                    host=self.config.host,
                    port=self.config.port,
                    user=self.config.user,
                    password=self.config.password,
                    database=self.config.database
                )
                try:
                    yield conn
                    conn.commit()
                except Exception as e:
                    conn.rollback()
                    raise
                finally:
                    conn.close()
            except ImportError:
                raise ImportError("请安装 mysql-connector-python: pip install mysql-connector-python")
        else:
            raise ValueError(f"不支持的数据库类型: {self.config.db_type}")
    
    def execute(self, sql: str, params: tuple = None) -> List[Dict[str, Any]]:
        """执行 SQL 查询并返回结果"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if params:
                cursor.execute(sql, params)
            else:
                cursor.execute(sql)
            
            if sql.strip().upper().startswith('SELECT'):
                if self.config.db_type == 'sqlite':
                    return [dict(row) for row in cursor.fetchall()]
                else:
                    columns = [desc[0] for desc in cursor.description]
                    return [dict(zip(columns, row)) for row in cursor.fetchall()]
            return []
    
    def execute_one(self, sql: str, params: tuple = None) -> Optional[Dict[str, Any]]:
        """执行 SQL 查询并返回单条结果"""
        results = self.execute(sql, params)
        return results[0] if results else None
    
    def execute_write(self, sql: str, params: tuple = None) -> int:
        """执行写操作（INSERT/UPDATE/DELETE）并返回影响行数"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if params:
                cursor.execute(sql, params)
            else:
                cursor.execute(sql)
            return cursor.rowcount
    
    def execute_insert(self, sql: str, params: tuple = None) -> int:
        """执行 INSERT 并返回 last_insert_id"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if params:
                cursor.execute(sql, params)
            else:
                cursor.execute(sql)
            return cursor.lastrowid
    
    def execute_many(self, sql: str, params_list: List[tuple]) -> int:
        """批量执行写操作"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.executemany(sql, params_list)
            return cursor.rowcount
    
    @abstractmethod
    def _init_tables(self):
        """初始化表结构（子类实现）"""
        pass
    
    def _adapt_sql(self, sql: str) -> str:
        """适配不同数据库的 SQL 语法"""
        if self.config.db_type == 'mysql':
            # SQLite 到 MySQL 的语法转换
            sql = sql.replace('AUTOINCREMENT', 'AUTO_INCREMENT')
            sql = sql.replace('INTEGER PRIMARY KEY', 'INT PRIMARY KEY')
            # MySQL 使用 %s 作为占位符
            sql = sql.replace('?', '%s')
        return sql
    
    def table_exists(self, table_name: str) -> bool:
        """检查表是否存在"""
        if self.config.db_type == 'sqlite':
            result = self.execute_one(
                "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                (table_name,)
            )
        elif self.config.db_type == 'mysql':
            result = self.execute_one(
                "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_NAME=%s",
                (table_name,)
            )
        else:
            return False
        return result is not None
