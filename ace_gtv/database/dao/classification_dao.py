"""
分类 DAO
处理 content_classifications, classification_progress 表相关操作
"""

import json
from typing import Dict, Any, List, Optional
from .base import BaseDAO, DatabaseConfig


class ClassificationDAO(BaseDAO):
    """分类数据访问对象"""
    
    def _init_tables(self):
        """初始化分类相关表"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # 内容分类表
            cursor.execute(self._adapt_sql('''
                CREATE TABLE IF NOT EXISTS content_classifications (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id TEXT NOT NULL,
                    category TEXT NOT NULL,
                    subcategory TEXT,
                    content TEXT,
                    source_file TEXT,
                    source_file_id INTEGER,
                    confidence REAL DEFAULT 0.0,
                    metadata TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            '''))
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_classifications_project ON content_classifications (project_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_classifications_category ON content_classifications (category)')
            
            # 分类进度表
            cursor.execute(self._adapt_sql('''
                CREATE TABLE IF NOT EXISTS classification_progress (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id TEXT UNIQUE NOT NULL,
                    status TEXT DEFAULT 'pending',
                    total_files INTEGER DEFAULT 0,
                    processed_files INTEGER DEFAULT 0,
                    current_step TEXT,
                    error_message TEXT,
                    started_at TIMESTAMP,
                    completed_at TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            '''))
    
    # ==================== content_classifications 操作 ====================
    
    def get_by_project(self, project_id: str) -> List[Dict[str, Any]]:
        """获取项目的所有分类"""
        return self.execute(
            'SELECT * FROM content_classifications WHERE project_id = ? ORDER BY category, id',
            (project_id,)
        )
    
    def get_by_category(self, project_id: str, category: str) -> List[Dict[str, Any]]:
        """获取项目某分类的内容"""
        return self.execute(
            'SELECT * FROM content_classifications WHERE project_id = ? AND category = ?',
            (project_id, category)
        )
    
    def get_categories_summary(self, project_id: str) -> List[Dict[str, Any]]:
        """获取项目分类摘要"""
        return self.execute(
            '''SELECT category, COUNT(*) as count 
               FROM content_classifications 
               WHERE project_id = ? 
               GROUP BY category''',
            (project_id,)
        )
    
    def create(self, project_id: str, category: str, content: str,
               subcategory: str = None, source_file: str = None,
               source_file_id: int = None, confidence: float = 0.0,
               metadata: str = None) -> int:
        """创建分类记录"""
        return self.execute_insert(
            '''INSERT INTO content_classifications 
               (project_id, category, subcategory, content, source_file, 
                source_file_id, confidence, metadata)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
            (project_id, category, subcategory, content, source_file,
             source_file_id, confidence, metadata)
        )
    
    def create_batch(self, classifications: List[Dict[str, Any]]) -> int:
        """批量创建分类记录"""
        if not classifications:
            return 0
        
        sql = '''INSERT INTO content_classifications 
                 (project_id, category, subcategory, content, source_file, 
                  source_file_id, confidence, metadata)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)'''
        
        params_list = [
            (c.get('project_id'), c.get('category'), c.get('subcategory'),
             c.get('content'), c.get('source_file'), c.get('source_file_id'),
             c.get('confidence', 0.0), c.get('metadata'))
            for c in classifications
        ]
        
        return self.execute_many(sql, params_list)
    
    def delete_by_project(self, project_id: str) -> int:
        """删除项目的所有分类"""
        return self.execute_write(
            'DELETE FROM content_classifications WHERE project_id = ?',
            (project_id,)
        )
    
    def delete_by_category(self, project_id: str, category: str) -> int:
        """删除项目某分类的内容"""
        return self.execute_write(
            'DELETE FROM content_classifications WHERE project_id = ? AND category = ?',
            (project_id, category)
        )
    
    # ==================== classification_progress 操作 ====================
    
    def get_progress(self, project_id: str) -> Optional[Dict[str, Any]]:
        """获取分类进度"""
        return self.execute_one(
            'SELECT * FROM classification_progress WHERE project_id = ?',
            (project_id,)
        )
    
    def upsert_progress(self, project_id: str, status: str = 'pending',
                       total_files: int = 0, processed_files: int = 0,
                       current_step: str = None, error_message: str = None) -> bool:
        """更新或插入分类进度"""
        sql = '''
            INSERT INTO classification_progress 
            (project_id, status, total_files, processed_files, current_step, error_message, started_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(project_id) 
            DO UPDATE SET 
                status = ?, 
                total_files = ?,
                processed_files = ?,
                current_step = ?,
                error_message = ?,
                updated_at = CURRENT_TIMESTAMP
        '''
        rows = self.execute_write(sql, (
            project_id, status, total_files, processed_files, current_step, error_message,
            status, total_files, processed_files, current_step, error_message
        ))
        return rows > 0
    
    def complete_progress(self, project_id: str, status: str = 'completed',
                         error_message: str = None) -> bool:
        """完成分类进度"""
        rows = self.execute_write(
            '''UPDATE classification_progress 
               SET status = ?, error_message = ?, completed_at = CURRENT_TIMESTAMP 
               WHERE project_id = ?''',
            (status, error_message, project_id)
        )
        return rows > 0
    
    # ==================== 扩展方法 ====================
    
    def get_by_source_file(self, project_id: str, source_file: str) -> List[Dict[str, Any]]:
        """根据源文件获取分类"""
        return self.execute(
            '''SELECT * FROM content_classifications 
               WHERE project_id = ? AND source_file = ?''',
            (project_id, source_file)
        )
    
    def get_with_details(self, project_id: str, category: str = None) -> List[Dict[str, Any]]:
        """获取详细分类信息"""
        if category:
            return self.execute(
                '''SELECT id, category, subcategory, content, source_file, 
                          source_file_id, confidence, metadata, created_at
                   FROM content_classifications 
                   WHERE project_id = ? AND category = ?
                   ORDER BY category, id''',
                (project_id, category)
            )
        return self.execute(
            '''SELECT id, category, subcategory, content, source_file, 
                      source_file_id, confidence, metadata, created_at
               FROM content_classifications 
               WHERE project_id = ?
               ORDER BY category, id''',
            (project_id,)
        )
    
    def update_classification(self, classification_id: int, category: str = None,
                             subcategory: str = None, content: str = None,
                             confidence: float = None) -> bool:
        """更新分类"""
        updates = []
        params = []
        if category is not None:
            updates.append('category = ?')
            params.append(category)
        if subcategory is not None:
            updates.append('subcategory = ?')
            params.append(subcategory)
        if content is not None:
            updates.append('content = ?')
            params.append(content)
        if confidence is not None:
            updates.append('confidence = ?')
            params.append(confidence)
        
        if not updates:
            return False
        
        params.append(classification_id)
        sql = f"UPDATE content_classifications SET {', '.join(updates)} WHERE id = ?"
        rows = self.execute_write(sql, tuple(params))
        return rows > 0
    
    def count_by_project(self, project_id: str) -> int:
        """统计项目分类数量"""
        result = self.execute_one(
            'SELECT COUNT(*) as count FROM content_classifications WHERE project_id = ?',
            (project_id,)
        )
        return result['count'] if result else 0
    
    def get_classification_summary(self, project_id: str) -> List[Dict[str, Any]]:
        """获取分类统计摘要"""
        return self.execute(
            '''SELECT category, subcategory, COUNT(*) as count, 
                      AVG(relevance_score) as avg_score,
                      MAX(recommender_name) as recommender_name, 
                      MAX(recommender_title) as recommender_title, 
                      MAX(recommender_org) as recommender_org
               FROM content_classifications 
               WHERE project_id = ?
               GROUP BY category, subcategory
               ORDER BY category, subcategory''',
            (project_id,)
        )
    
    def get_all_by_project(self, project_id: str) -> List[Dict[str, Any]]:
        """获取项目的所有分类记录"""
        return self.execute(
            '''SELECT id, category, subcategory, content, source_file, source_page,
                      relevance_score, evidence_type, key_points, subject_person,
                      recommender_name, recommender_title, recommender_org,
                      relationship, created_at
               FROM content_classifications 
               WHERE project_id = ?
               ORDER BY category, subcategory, id''',
            (project_id,)
        )
    
    def get_by_id(self, classification_id: int) -> Optional[Dict[str, Any]]:
        """根据 ID 获取分类记录"""
        return self.execute_one(
            'SELECT * FROM content_classifications WHERE id = ?',
            (classification_id,)
        )
    
    def delete_by_id(self, classification_id: int) -> bool:
        """根据 ID 删除分类记录"""
        rows = self.execute_write(
            'DELETE FROM content_classifications WHERE id = ?',
            (classification_id,)
        )
        return rows > 0
    
    def add_classification(self, project_id: str, category: str, subcategory: str,
                          content: str, source_file: str = None, source_page: int = None,
                          relevance_score: float = 0.0, evidence_type: str = None,
                          key_points: str = None, subject_person: str = 'applicant',
                          recommender_name: str = None, recommender_title: str = None,
                          recommender_org: str = None, relationship: str = None) -> int:
        """添加分类记录"""
        return self.execute_insert(
            '''INSERT INTO content_classifications 
               (project_id, category, subcategory, content, source_file, source_page,
                relevance_score, evidence_type, key_points, subject_person,
                recommender_name, recommender_title, recommender_org, relationship)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (project_id, category, subcategory, content, source_file, source_page,
             relevance_score, evidence_type, key_points, subject_person,
             recommender_name, recommender_title, recommender_org, relationship)
        )
    
    # ==================== 分类进度（灵活版本） ====================
    
    def update_progress_data(self, project_id: str, progress_data: Dict[str, Any]) -> bool:
        """更新分类进度（灵活字段）"""
        # 先检查是否存在
        existing = self.execute_one(
            'SELECT id FROM classification_progress WHERE project_id = ?',
            (project_id,)
        )
        
        progress_json = json.dumps(progress_data, ensure_ascii=False)
        
        if existing:
            sql = '''UPDATE classification_progress 
                     SET status = ?, total_contents = ?, processed_contents = ?,
                         current_batch = ?, total_batches = ?, total_classified = ?,
                         error = ?, updated_at = CURRENT_TIMESTAMP
                     WHERE project_id = ?'''
            rows = self.execute_write(sql, (
                progress_data.get('status', 'processing'),
                progress_data.get('total_contents', 0),
                progress_data.get('processed_contents', 0),
                progress_data.get('current_batch', 0),
                progress_data.get('total_batches', 0),
                progress_data.get('total_classified', 0),
                progress_data.get('error'),
                project_id
            ))
        else:
            sql = '''INSERT INTO classification_progress 
                     (project_id, status, total_contents, processed_contents,
                      current_batch, total_batches, total_classified, error, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'''
            rows = self.execute_write(sql, (
                project_id,
                progress_data.get('status', 'processing'),
                progress_data.get('total_contents', 0),
                progress_data.get('processed_contents', 0),
                progress_data.get('current_batch', 0),
                progress_data.get('total_batches', 0),
                progress_data.get('total_classified', 0),
                progress_data.get('error')
            ))
        return rows > 0
    
    def get_classified_evidence(self, project_id: str) -> List[Dict[str, Any]]:
        """获取分类证据（用于构建框架）"""
        return self.execute(
            '''SELECT id, category, subcategory, content, source_file, source_page, 
                      relevance_score, evidence_type, key_points, subject_person
               FROM content_classifications 
               WHERE project_id = ?
               ORDER BY category, subcategory, relevance_score DESC''',
            (project_id,)
        )
