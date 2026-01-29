"""
提取 DAO
处理 extraction_logs, extracted_contents 表相关操作
"""

import json
from typing import Dict, Any, List, Optional
from .base import BaseDAO, DatabaseConfig


class ExtractionDAO(BaseDAO):
    """提取数据访问对象"""
    
    def _init_tables(self):
        """初始化提取相关表"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # 提取日志表
            cursor.execute(self._adapt_sql('''
                CREATE TABLE IF NOT EXISTS extraction_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id TEXT NOT NULL,
                    file_id INTEGER,
                    file_name TEXT,
                    extraction_type TEXT,
                    status TEXT DEFAULT 'pending',
                    content TEXT,
                    error_message TEXT,
                    processing_time_ms INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            '''))
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_extraction_logs_project ON extraction_logs (project_id)')
            
            # 提取内容表
            cursor.execute(self._adapt_sql('''
                CREATE TABLE IF NOT EXISTS extracted_contents (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id TEXT NOT NULL,
                    file_id INTEGER,
                    file_name TEXT,
                    content_type TEXT,
                    content TEXT,
                    structured_data TEXT,
                    confidence REAL DEFAULT 0.0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            '''))
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_extracted_contents_project ON extracted_contents (project_id)')
    
    # ==================== extraction_logs 操作 ====================
    
    def get_logs(self, project_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """获取提取日志"""
        return self.execute(
            'SELECT * FROM extraction_logs WHERE project_id = ? ORDER BY created_at DESC LIMIT ?',
            (project_id, limit)
        )
    
    def get_logs_by_status(self, project_id: str, status: str) -> List[Dict[str, Any]]:
        """获取特定状态的日志"""
        return self.execute(
            'SELECT * FROM extraction_logs WHERE project_id = ? AND status = ? ORDER BY created_at DESC',
            (project_id, status)
        )
    
    def get_log_by_file(self, project_id: str, file_id: int) -> Optional[Dict[str, Any]]:
        """获取文件的提取日志"""
        return self.execute_one(
            'SELECT * FROM extraction_logs WHERE project_id = ? AND file_id = ? ORDER BY created_at DESC',
            (project_id, file_id)
        )
    
    def add_log(self, project_id: str, file_id: int = None, file_name: str = None,
               extraction_type: str = None, status: str = 'pending',
               content: str = None, error_message: str = None,
               processing_time_ms: int = None) -> int:
        """添加提取日志"""
        # 注意：extraction_logs 表使用 log_type 而不是 extraction_type，response 而不是 content
        return self.execute_insert(
            '''INSERT INTO extraction_logs 
               (project_id, log_type, file_name, status, response, error_message)
               VALUES (?, ?, ?, ?, ?, ?)''',
            (project_id, extraction_type, file_name, status, content, error_message)
        )
    
    def update_log_status(self, log_id: int, status: str, content: str = None,
                         error_message: str = None, processing_time_ms: int = None) -> bool:
        """更新日志状态"""
        rows = self.execute_write(
            '''UPDATE extraction_logs 
               SET status = ?, content = ?, error_message = ?, processing_time_ms = ?
               WHERE id = ?''',
            (status, content, error_message, processing_time_ms, log_id)
        )
        return rows > 0
    
    def delete_logs(self, project_id: str) -> int:
        """删除项目提取日志"""
        return self.execute_write(
            'DELETE FROM extraction_logs WHERE project_id = ?',
            (project_id,)
        )
    
    # ==================== extracted_contents 操作 ====================
    
    def get_contents(self, project_id: str) -> List[Dict[str, Any]]:
        """获取项目的所有提取内容"""
        return self.execute(
            'SELECT * FROM extracted_contents WHERE project_id = ? ORDER BY created_at',
            (project_id,)
        )
    
    def get_content_by_file(self, project_id: str, file_id: int) -> Optional[Dict[str, Any]]:
        """获取文件的提取内容"""
        return self.execute_one(
            'SELECT * FROM extracted_contents WHERE project_id = ? AND file_id = ?',
            (project_id, file_id)
        )
    
    def get_contents_by_type(self, project_id: str, content_type: str) -> List[Dict[str, Any]]:
        """获取特定类型的提取内容"""
        return self.execute(
            'SELECT * FROM extracted_contents WHERE project_id = ? AND content_type = ?',
            (project_id, content_type)
        )
    
    def save_content(self, project_id: str, file_id: int = None, file_name: str = None,
                    content_type: str = None, content: str = None,
                    structured_data: Dict[str, Any] = None, confidence: float = 0.0) -> int:
        """保存提取内容"""
        structured_json = json.dumps(structured_data, ensure_ascii=False) if structured_data else None
        
        return self.execute_insert(
            '''INSERT INTO extracted_contents 
               (project_id, file_id, file_name, content_type, content, structured_data, confidence)
               VALUES (?, ?, ?, ?, ?, ?, ?)''',
            (project_id, file_id, file_name, content_type, content, structured_json, confidence)
        )
    
    def update_content(self, content_id: int, content: str = None,
                      structured_data: Dict[str, Any] = None, confidence: float = None) -> bool:
        """更新提取内容"""
        structured_json = json.dumps(structured_data, ensure_ascii=False) if structured_data else None
        
        rows = self.execute_write(
            '''UPDATE extracted_contents 
               SET content = ?, structured_data = ?, confidence = ?
               WHERE id = ?''',
            (content, structured_json, confidence, content_id)
        )
        return rows > 0
    
    def delete_contents(self, project_id: str) -> int:
        """删除项目提取内容"""
        return self.execute_write(
            'DELETE FROM extracted_contents WHERE project_id = ?',
            (project_id,)
        )
    
    def delete_content_by_file(self, project_id: str, file_id: int) -> int:
        """删除文件的提取内容"""
        return self.execute_write(
            'DELETE FROM extracted_contents WHERE project_id = ? AND file_id = ?',
            (project_id, file_id)
        )
    
    def delete_content_by_id(self, content_id: int) -> bool:
        """根据 ID 删除提取内容"""
        rows = self.execute_write(
            'DELETE FROM extracted_contents WHERE id = ?',
            (content_id,)
        )
        return rows > 0
    
    def get_content_by_source_file(self, project_id: str, source_file: str) -> List[Dict[str, Any]]:
        """根据源文件名获取提取内容"""
        return self.execute(
            'SELECT * FROM extracted_contents WHERE project_id = ? AND file_name = ?',
            (project_id, source_file)
        )
    
    def get_contents_with_duplicates(self, project_id: str) -> List[Dict[str, Any]]:
        """获取可能重复的内容（用于去重）"""
        return self.execute(
            '''SELECT id, content, file_name as source_file FROM extracted_contents 
               WHERE project_id = ? ORDER BY id''',
            (project_id,)
        )
    
    def get_contents_summary(self, project_id: str) -> Dict[str, Any]:
        """获取提取内容统计"""
        result = self.execute_one(
            '''SELECT 
                COUNT(DISTINCT source_file) as file_count,
                COUNT(*) as content_count,
                SUM(LENGTH(content)) as total_chars
               FROM extracted_contents WHERE project_id = ?''',
            (project_id,)
        )
        return result or {'file_count': 0, 'content_count': 0, 'total_chars': 0}
    
    def update_content_metadata(self, content_id: int, metadata: str) -> bool:
        """更新内容元数据"""
        rows = self.execute_write(
            'UPDATE extracted_contents SET structured_data = ? WHERE id = ?',
            (metadata, content_id)
        )
        return rows > 0
    
    def upsert_content(self, project_id: str, file_id: int, file_name: str,
                      content_type: str, content: str, source_page: int = None,
                      word_count: int = None) -> int:
        """更新或插入提取内容"""
        # 先检查是否存在
        existing = self.execute_one(
            '''SELECT id FROM extracted_contents 
               WHERE project_id = ? AND file_id = ? AND content_type = ?''',
            (project_id, file_id, content_type)
        )
        
        if existing:
            self.execute_write(
                '''UPDATE extracted_contents 
                   SET content = ?, file_name = ?
                   WHERE id = ?''',
                (content, file_name, existing['id'])
            )
            return existing['id']
        else:
            return self.execute_insert(
                '''INSERT INTO extracted_contents 
                   (project_id, file_id, file_name, content_type, content)
                   VALUES (?, ?, ?, ?, ?)''',
                (project_id, file_id, file_name, content_type, content)
            )
    
    def get_all_content_texts(self, project_id: str) -> List[str]:
        """获取所有内容文本（用于去重检查）"""
        rows = self.execute(
            'SELECT content FROM extracted_contents WHERE project_id = ?',
            (project_id,)
        )
        return [row['content'] for row in rows if row.get('content')]
    
    def save_content_block(self, project_id: str, file_id: int = None,
                          source_file: str = None, source_page: int = None,
                          content_type: str = 'text', content: str = None,
                          word_count: int = 0) -> int:
        """保存单个内容块"""
        return self.execute_insert(
            '''INSERT INTO extracted_contents 
               (project_id, file_id, file_name, content_type, content)
               VALUES (?, ?, ?, ?, ?)''',
            (project_id, file_id, source_file, content_type, content)
        )
    
    def get_contents_for_dedup(self, project_id: str) -> List[Dict[str, Any]]:
        """获取用于去重的内容列表"""
        return self.execute(
            '''SELECT id, content, file_name as source_file 
               FROM extracted_contents 
               WHERE project_id = ? ORDER BY id''',
            (project_id,)
        )
    
    def get_contents_with_source(self, project_id: str, content_type: str = None,
                                 limit: int = None) -> List[Dict[str, Any]]:
        """获取带源信息的内容"""
        sql = '''SELECT id, file_id, source_file, content_type, content
                 FROM extracted_contents WHERE project_id = ?'''
        params = [project_id]
        
        if content_type:
            sql += ' AND content_type = ?'
            params.append(content_type)
        
        sql += ' ORDER BY id'
        
        if limit:
            sql += f' LIMIT {limit}'
        
        return self.execute(sql, tuple(params))
    
    def get_content_stats(self, project_id: str) -> Dict[str, Any]:
        """获取内容统计信息"""
        result = self.execute_one(
            '''SELECT 
                COUNT(DISTINCT source_file) as file_count,
                COUNT(*) as content_count,
                SUM(LENGTH(content)) as total_chars,
                COUNT(DISTINCT content_type) as type_count
               FROM extracted_contents WHERE project_id = ?''',
            (project_id,)
        )
        return result or {'file_count': 0, 'content_count': 0, 'total_chars': 0, 'type_count': 0}
    
    def get_available_files_count(self, project_id: str) -> int:
        """获取有可用内容的文件数"""
        result = self.execute_one(
            '''SELECT COUNT(*) as count FROM extracted_contents 
               WHERE project_id = ? AND content IS NOT NULL AND content != ""''',
            (project_id,)
        )
        return result['count'] if result else 0
    
    def update_content_text(self, content_id: int, content: str) -> bool:
        """更新内容文本"""
        rows = self.execute_write(
            'UPDATE extracted_contents SET content = ? WHERE id = ?',
            (content, content_id)
        )
        return rows > 0
    
    def search_content(self, project_id: str, keyword: str) -> List[Dict[str, Any]]:
        """搜索项目内容"""
        return self.execute(
            '''SELECT id, source_file, content_type, content
               FROM extracted_contents
               WHERE project_id = ? AND content LIKE ?
               ORDER BY id''',
            (project_id, f'%{keyword}%')
        )
    
    # ==================== content_outlines 操作 ====================
    
    def save_outline(self, project_id: str, outline_data: Dict[str, Any],
                    total_files: int = 0, total_keywords: int = 0) -> bool:
        """保存内容大纲"""
        outline_json = json.dumps(outline_data, ensure_ascii=False)
        sql = '''
            INSERT INTO content_outlines (project_id, outline_data, total_files, total_keywords, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(project_id) 
            DO UPDATE SET 
                outline_data = excluded.outline_data,
                total_files = excluded.total_files,
                total_keywords = excluded.total_keywords,
                updated_at = CURRENT_TIMESTAMP
        '''
        rows = self.execute_write(sql, (project_id, outline_json, total_files, total_keywords))
        return rows > 0
    
    def get_outline(self, project_id: str) -> Optional[Dict[str, Any]]:
        """获取内容大纲"""
        return self.execute_one(
            '''SELECT outline_data, total_files, total_keywords, updated_at
               FROM content_outlines WHERE project_id = ?''',
            (project_id,)
        )
    
    def delete_outline(self, project_id: str) -> int:
        """删除内容大纲"""
        return self.execute_write(
            'DELETE FROM content_outlines WHERE project_id = ?',
            (project_id,)
        )
