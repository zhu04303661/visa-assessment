"""
材料 DAO
处理 material_files, material_collection 表相关操作
"""

import json
from typing import Dict, Any, List, Optional
from .base import BaseDAO, DatabaseConfig


class MaterialDAO(BaseDAO):
    """材料数据访问对象"""
    
    def _init_tables(self):
        """初始化材料相关表"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # 材料文件表
            cursor.execute(self._adapt_sql('''
                CREATE TABLE IF NOT EXISTS material_files (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id TEXT NOT NULL,
                    category_id TEXT NOT NULL,
                    item_id TEXT NOT NULL,
                    file_name TEXT NOT NULL,
                    file_path TEXT,
                    file_size INTEGER DEFAULT 0,
                    file_type TEXT,
                    description TEXT,
                    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    storage_type TEXT DEFAULT 'local',
                    object_bucket TEXT,
                    object_key TEXT
                )
            '''))
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_material_files_project ON material_files (project_id)')
            
            # 材料收集状态表
            cursor.execute(self._adapt_sql('''
                CREATE TABLE IF NOT EXISTS material_collection (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id TEXT NOT NULL,
                    category_id TEXT NOT NULL,
                    item_id TEXT NOT NULL,
                    status TEXT DEFAULT 'pending',
                    file_path TEXT,
                    file_name TEXT,
                    collected_at TIMESTAMP,
                    notes TEXT,
                    UNIQUE(project_id, category_id, item_id)
                )
            '''))
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_material_collection_project ON material_collection (project_id)')
    
    # ==================== material_files 操作 ====================
    
    def get_file_by_id(self, file_id: int) -> Optional[Dict[str, Any]]:
        """根据 ID 获取文件"""
        return self.execute_one(
            'SELECT * FROM material_files WHERE id = ?',
            (file_id,)
        )
    
    def get_files_by_project(self, project_id: str) -> List[Dict[str, Any]]:
        """获取项目的所有文件"""
        return self.execute(
            'SELECT * FROM material_files WHERE project_id = ? ORDER BY uploaded_at',
            (project_id,)
        )
    
    def get_files_by_category(self, project_id: str, category_id: str) -> List[Dict[str, Any]]:
        """获取项目某分类的文件"""
        return self.execute(
            'SELECT * FROM material_files WHERE project_id = ? AND category_id = ? ORDER BY uploaded_at',
            (project_id, category_id)
        )
    
    def get_files_by_item(self, project_id: str, category_id: str, item_id: str) -> List[Dict[str, Any]]:
        """获取项目某分类某项目的文件"""
        return self.execute(
            '''SELECT * FROM material_files 
               WHERE project_id = ? AND category_id = ? AND item_id = ? 
               ORDER BY uploaded_at''',
            (project_id, category_id, item_id)
        )
    
    def create_file(self, project_id: str, category_id: str, item_id: str,
                   file_name: str, file_path: str = None, file_size: int = 0,
                   file_type: str = None, description: str = None,
                   storage_type: str = 'local', object_bucket: str = None,
                   object_key: str = None) -> int:
        """创建文件记录"""
        return self.execute_insert(
            '''INSERT INTO material_files 
               (project_id, category_id, item_id, file_name, file_path, file_size, 
                file_type, description, storage_type, object_bucket, object_key)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (project_id, category_id, item_id, file_name, file_path, file_size,
             file_type, description, storage_type, object_bucket, object_key)
        )
    
    def update_file_category(self, file_id: int, category_id: str, item_id: str) -> bool:
        """更新文件分类"""
        rows = self.execute_write(
            'UPDATE material_files SET category_id = ?, item_id = ? WHERE id = ?',
            (category_id, item_id, file_id)
        )
        return rows > 0
    
    def delete_file(self, file_id: int) -> bool:
        """删除文件记录"""
        rows = self.execute_write(
            'DELETE FROM material_files WHERE id = ?',
            (file_id,)
        )
        return rows > 0
    
    def delete_files_by_project(self, project_id: str) -> int:
        """删除项目的所有文件"""
        return self.execute_write(
            'DELETE FROM material_files WHERE project_id = ?',
            (project_id,)
        )
    
    # ==================== material_collection 操作 ====================
    
    def get_collection_status(self, project_id: str) -> List[Dict[str, Any]]:
        """获取项目材料收集状态"""
        return self.execute(
            'SELECT * FROM material_collection WHERE project_id = ?',
            (project_id,)
        )
    
    def get_collection_item(self, project_id: str, category_id: str, item_id: str) -> Optional[Dict[str, Any]]:
        """获取单个收集项状态"""
        return self.execute_one(
            '''SELECT * FROM material_collection 
               WHERE project_id = ? AND category_id = ? AND item_id = ?''',
            (project_id, category_id, item_id)
        )
    
    def upsert_collection_status(self, project_id: str, category_id: str, item_id: str,
                                 status: str = 'pending', file_path: str = None,
                                 file_name: str = None, notes: str = None) -> bool:
        """更新或插入收集状态"""
        sql = '''
            INSERT INTO material_collection (project_id, category_id, item_id, status, file_path, file_name, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(project_id, category_id, item_id) 
            DO UPDATE SET status = ?, file_path = ?, file_name = ?, notes = ?, collected_at = CURRENT_TIMESTAMP
        '''
        rows = self.execute_write(sql, (
            project_id, category_id, item_id, status, file_path, file_name, notes,
            status, file_path, file_name, notes
        ))
        return rows > 0
    
    def delete_collection_by_project(self, project_id: str) -> int:
        """删除项目的收集状态"""
        return self.execute_write(
            'DELETE FROM material_collection WHERE project_id = ?',
            (project_id,)
        )
