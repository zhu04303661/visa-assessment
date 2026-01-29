"""
项目 DAO
处理 projects 表相关操作
"""

from typing import Dict, Any, List, Optional
from .base import BaseDAO, DatabaseConfig


class ProjectDAO(BaseDAO):
    """项目数据访问对象"""
    
    def _init_tables(self):
        """初始化项目表"""
        sql = '''
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id TEXT UNIQUE NOT NULL,
                case_id TEXT,
                client_name TEXT NOT NULL,
                visa_type TEXT DEFAULT 'GTV',
                folder_name TEXT,
                folder_path TEXT,
                status TEXT DEFAULT 'created',
                overall_progress INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                metadata TEXT
            )
        '''
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(self._adapt_sql(sql))
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_projects_status ON projects (status)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_projects_client ON projects (client_name)')
    
    def get_by_id(self, project_id: str) -> Optional[Dict[str, Any]]:
        """根据 project_id 获取项目"""
        return self.execute_one(
            'SELECT * FROM projects WHERE project_id = ?',
            (project_id,)
        )
    
    def get_all(self, status: str = None, limit: int = 100) -> List[Dict[str, Any]]:
        """获取项目列表"""
        if status:
            return self.execute(
                'SELECT * FROM projects WHERE status = ? ORDER BY created_at DESC LIMIT ?',
                (status, limit)
            )
        return self.execute(
            'SELECT * FROM projects ORDER BY created_at DESC LIMIT ?',
            (limit,)
        )
    
    def create(self, project_id: str, client_name: str, visa_type: str = 'GTV',
               case_id: str = None, metadata: str = None) -> int:
        """创建项目"""
        return self.execute_insert(
            '''INSERT INTO projects (project_id, case_id, client_name, visa_type, metadata)
               VALUES (?, ?, ?, ?, ?)''',
            (project_id, case_id, client_name, visa_type, metadata)
        )
    
    def update_status(self, project_id: str, status: str, progress: int = None) -> bool:
        """更新项目状态"""
        if progress is not None:
            rows = self.execute_write(
                '''UPDATE projects SET status = ?, overall_progress = ?, 
                   updated_at = CURRENT_TIMESTAMP WHERE project_id = ?''',
                (status, progress, project_id)
            )
        else:
            rows = self.execute_write(
                '''UPDATE projects SET status = ?, updated_at = CURRENT_TIMESTAMP 
                   WHERE project_id = ?''',
                (status, project_id)
            )
        return rows > 0
    
    def delete(self, project_id: str) -> bool:
        """删除项目"""
        rows = self.execute_write(
            'DELETE FROM projects WHERE project_id = ?',
            (project_id,)
        )
        return rows > 0
    
    def exists(self, project_id: str) -> bool:
        """检查项目是否存在"""
        result = self.execute_one(
            'SELECT 1 FROM projects WHERE project_id = ?',
            (project_id,)
        )
        return result is not None
