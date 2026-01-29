"""
Prompt DAO
处理 system_prompts 表相关操作
支持版本历史管理
"""

import json
from typing import Dict, Any, List, Optional
from .base import BaseDAO, DatabaseConfig


class PromptDAO(BaseDAO):
    """系统提示词数据访问对象"""
    
    def _init_tables(self):
        """初始化提示词表和版本历史表"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # 主提示词表（存储当前生效版本）
            cursor.execute(self._adapt_sql('''
                CREATE TABLE IF NOT EXISTS system_prompts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    type TEXT,
                    description TEXT,
                    content TEXT NOT NULL,
                    category TEXT,
                    version INTEGER DEFAULT 1,
                    is_active INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            '''))
            
            # 版本历史表（存储所有历史版本）
            cursor.execute(self._adapt_sql('''
                CREATE TABLE IF NOT EXISTS system_prompts_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    prompt_name TEXT NOT NULL,
                    version INTEGER NOT NULL,
                    content TEXT NOT NULL,
                    description TEXT,
                    changed_by TEXT,
                    change_reason TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(prompt_name, version)
                )
            '''))
            
            # 添加可能缺失的列
            try:
                cursor.execute('ALTER TABLE system_prompts ADD COLUMN category TEXT')
            except:
                pass
            try:
                cursor.execute('ALTER TABLE system_prompts ADD COLUMN is_active INTEGER DEFAULT 1')
            except:
                pass
            try:
                cursor.execute('ALTER TABLE system_prompts ADD COLUMN type TEXT')
            except:
                pass
            
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_prompts_name ON system_prompts (name)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_prompts_history_name ON system_prompts_history (prompt_name)')
    
    def get_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """根据名称获取提示词"""
        return self.execute_one(
            'SELECT * FROM system_prompts WHERE name = ? AND is_active = 1',
            (name,)
        )
    
    def get_by_type(self, prompt_type: str) -> Optional[Dict[str, Any]]:
        """根据类型获取提示词（用于 v2 方法）"""
        return self.execute_one(
            'SELECT * FROM system_prompts WHERE type = ? AND is_active = 1',
            (prompt_type,)
        )
    
    def get_by_category(self, category: str) -> List[Dict[str, Any]]:
        """根据分类获取提示词"""
        return self.execute(
            'SELECT * FROM system_prompts WHERE category = ? AND is_active = 1 ORDER BY name',
            (category,)
        )
    
    def get_all(self, active_only: bool = True) -> List[Dict[str, Any]]:
        """获取所有提示词"""
        if active_only:
            return self.execute(
                'SELECT * FROM system_prompts WHERE is_active = 1 ORDER BY category, name'
            )
        return self.execute('SELECT * FROM system_prompts ORDER BY category, name')
    
    def get_latest_version(self, prompt_type: str) -> Optional[Dict[str, Any]]:
        """根据类型获取最新版本的提示词"""
        return self.execute_one(
            '''SELECT name, type, content, version, description FROM system_prompts 
               WHERE type = ? AND is_active = 1''',
            (prompt_type,)
        )
    
    def get_version_history(self, prompt_name: str) -> List[Dict[str, Any]]:
        """获取提示词的版本历史"""
        return self.execute(
            '''SELECT * FROM system_prompts_history 
               WHERE prompt_name = ? 
               ORDER BY version DESC''',
            (prompt_name,)
        )
    
    def get_specific_version(self, prompt_name: str, version: int) -> Optional[Dict[str, Any]]:
        """获取指定版本的提示词"""
        return self.execute_one(
            '''SELECT * FROM system_prompts_history 
               WHERE prompt_name = ? AND version = ?''',
            (prompt_name, version)
        )
    
    def create(self, name: str, content: str, description: str = None,
              category: str = None, prompt_type: str = None, version: int = 1) -> int:
        """创建提示词"""
        prompt_id = self.execute_insert(
            '''INSERT INTO system_prompts (name, type, content, description, category, version)
               VALUES (?, ?, ?, ?, ?, ?)''',
            (name, prompt_type, content, description, category, version)
        )
        
        # 同时保存到历史表
        self._save_to_history(name, version, content, description, "系统", "初始版本")
        
        return prompt_id
    
    def _save_to_history(self, prompt_name: str, version: int, content: str,
                        description: str = None, changed_by: str = None, 
                        change_reason: str = None):
        """保存版本到历史表"""
        try:
            self.execute_insert(
                '''INSERT OR REPLACE INTO system_prompts_history 
                   (prompt_name, version, content, description, changed_by, change_reason)
                   VALUES (?, ?, ?, ?, ?, ?)''',
                (prompt_name, version, content, description, changed_by, change_reason)
            )
        except Exception as e:
            # 忽略重复插入错误
            pass
    
    def update(self, name: str, content: str, description: str = None,
              changed_by: str = None, change_reason: str = None) -> int:
        """更新提示词内容（自动增加版本号并保存历史）"""
        current = self.get_by_name(name)
        if not current:
            return 0
        
        new_version = (current.get('version') or 0) + 1
        
        # 更新主表
        rows = self.execute_write(
            '''UPDATE system_prompts 
               SET content = ?, description = ?, version = ?, updated_at = CURRENT_TIMESTAMP
               WHERE name = ?''',
            (content, description or current.get('description'), new_version, name)
        )
        
        # 保存到历史表
        if rows > 0:
            self._save_to_history(
                name, new_version, content, description,
                changed_by or "用户", change_reason or "手动编辑"
            )
        
        return new_version if rows > 0 else 0
    
    def upsert(self, name: str, content: str, description: str = None,
              category: str = None, prompt_type: str = None) -> bool:
        """更新或插入提示词"""
        existing = self.get_by_name(name)
        
        if existing:
            return self.update(name, content, description) > 0
        else:
            self.create(name, content, description, category, prompt_type)
            return True
    
    def upsert_by_type(self, prompt_type: str, name: str, content: str, 
                      description: str = None, category: str = None) -> bool:
        """根据类型更新或插入提示词"""
        existing = self.get_by_type(prompt_type)
        
        if existing:
            return self.update(existing['name'], content, description) > 0
        else:
            self.create(name, content, description, category, prompt_type)
            return True
    
    def delete(self, name: str) -> bool:
        """删除提示词（软删除）"""
        rows = self.execute_write(
            'UPDATE system_prompts SET is_active = 0 WHERE name = ?',
            (name,)
        )
        return rows > 0
    
    def hard_delete(self, name: str) -> bool:
        """硬删除提示词"""
        rows = self.execute_write(
            'DELETE FROM system_prompts WHERE name = ?',
            (name,)
        )
        return rows > 0
