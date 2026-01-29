"""
框架 DAO
处理 gtv_framework, framework_logs, client_profile_map 表相关操作
"""

import json
from typing import Dict, Any, List, Optional
from .base import BaseDAO, DatabaseConfig


class FrameworkDAO(BaseDAO):
    """框架数据访问对象"""
    
    def _init_tables(self):
        """初始化框架相关表"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # GTV 框架表
            cursor.execute(self._adapt_sql('''
                CREATE TABLE IF NOT EXISTS gtv_framework (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id TEXT UNIQUE NOT NULL,
                    domain_positioning TEXT,
                    mc_criteria TEXT,
                    oc_criteria TEXT,
                    recommenders TEXT,
                    personal_statement_points TEXT,
                    evidence_list TEXT,
                    framework_data TEXT,
                    version INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            '''))
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_gtv_framework ON gtv_framework (project_id)')
            
            # 框架构建日志表
            cursor.execute(self._adapt_sql('''
                CREATE TABLE IF NOT EXISTS framework_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id TEXT NOT NULL,
                    log_type TEXT,
                    action TEXT,
                    prompt TEXT,
                    response TEXT,
                    status TEXT DEFAULT 'success',
                    error_message TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            '''))
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_framework_logs_project ON framework_logs (project_id)')
            
            # 客户画像表
            cursor.execute(self._adapt_sql('''
                CREATE TABLE IF NOT EXISTS client_profile_map (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id TEXT UNIQUE NOT NULL,
                    personal_info TEXT,
                    education TEXT,
                    career_timeline TEXT,
                    technical_expertise TEXT,
                    achievements TEXT,
                    connections TEXT,
                    mindmap_data TEXT,
                    raw_analysis TEXT,
                    version INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            '''))
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_profile_map ON client_profile_map (project_id)')
    
    # ==================== gtv_framework 操作 ====================
    # 注意：同时支持旧表 gtv_frameworks 和新表 gtv_framework
    
    def get_framework(self, project_id: str) -> Optional[Dict[str, Any]]:
        """获取项目框架（优先从旧表读取）"""
        # 先尝试旧表
        try:
            result = self.execute_one(
                'SELECT * FROM gtv_frameworks WHERE project_id = ?',
                (project_id,)
            )
            if result:
                return result
        except:
            pass
        # 再尝试新表
        return self.execute_one(
            'SELECT * FROM gtv_framework WHERE project_id = ?',
            (project_id,)
        )
    
    def get_framework_data(self, project_id: str) -> Optional[Dict[str, Any]]:
        """获取项目框架数据（解析 JSON）"""
        result = self.get_framework(project_id)
        if result and result.get('framework_data'):
            try:
                return json.loads(result['framework_data'])
            except json.JSONDecodeError:
                pass
        return None
    
    def save_framework(self, project_id: str, framework_data: Dict[str, Any],
                      domain_positioning: str = None, mc_criteria: str = None,
                      oc_criteria: str = None, recommenders: str = None,
                      personal_statement_points: str = None, evidence_list: str = None) -> bool:
        """保存项目框架"""
        # 获取当前版本号
        current = self.get_framework(project_id)
        version = (current['version'] + 1) if current else 1
        
        framework_json = json.dumps(framework_data, ensure_ascii=False) if isinstance(framework_data, dict) else framework_data
        
        sql = '''
            INSERT INTO gtv_framework 
            (project_id, framework_data, domain_positioning, mc_criteria, oc_criteria,
             recommenders, personal_statement_points, evidence_list, version)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(project_id) 
            DO UPDATE SET 
                framework_data = ?,
                domain_positioning = ?,
                mc_criteria = ?,
                oc_criteria = ?,
                recommenders = ?,
                personal_statement_points = ?,
                evidence_list = ?,
                version = ?,
                updated_at = CURRENT_TIMESTAMP
        '''
        rows = self.execute_write(sql, (
            project_id, framework_json, domain_positioning, mc_criteria, oc_criteria,
            recommenders, personal_statement_points, evidence_list, version,
            framework_json, domain_positioning, mc_criteria, oc_criteria,
            recommenders, personal_statement_points, evidence_list, version
        ))
        return rows > 0
    
    def delete_framework(self, project_id: str) -> int:
        """删除项目框架（从两个表中删除）"""
        rows = 0
        try:
            rows += self.execute_write(
                'DELETE FROM gtv_frameworks WHERE project_id = ?',
                (project_id,)
            )
        except:
            pass
        try:
            rows += self.execute_write(
                'DELETE FROM gtv_framework WHERE project_id = ?',
                (project_id,)
            )
        except:
            pass
        return rows
    
    # ==================== framework_logs 操作 ====================
    
    def get_logs(self, project_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """获取框架构建日志"""
        return self.execute(
            'SELECT * FROM framework_logs WHERE project_id = ? ORDER BY created_at DESC LIMIT ?',
            (project_id, limit)
        )
    
    def get_logs_by_type(self, project_id: str, log_type: str) -> List[Dict[str, Any]]:
        """获取特定类型的日志"""
        return self.execute(
            'SELECT * FROM framework_logs WHERE project_id = ? AND log_type = ? ORDER BY created_at DESC',
            (project_id, log_type)
        )
    
    def add_log(self, project_id: str, log_type: str, action: str,
               prompt: str = None, response: str = None,
               status: str = 'success', error_message: str = None) -> int:
        """添加日志"""
        return self.execute_insert(
            '''INSERT INTO framework_logs 
               (project_id, log_type, action, prompt, response, status, error_message)
               VALUES (?, ?, ?, ?, ?, ?, ?)''',
            (project_id, log_type, action, prompt, response, status, error_message)
        )
    
    def delete_logs(self, project_id: str) -> int:
        """删除项目日志"""
        return self.execute_write(
            'DELETE FROM framework_logs WHERE project_id = ?',
            (project_id,)
        )
    
    # ==================== client_profile_map 操作 ====================
    
    def get_profile(self, project_id: str) -> Optional[Dict[str, Any]]:
        """获取客户画像"""
        return self.execute_one(
            'SELECT * FROM client_profile_map WHERE project_id = ?',
            (project_id,)
        )
    
    def save_profile(self, project_id: str, profile_data: Dict[str, Any] = None,
                    personal_info: str = None, education: str = None,
                    career_timeline: str = None, technical_expertise: str = None,
                    achievements: str = None, connections: str = None,
                    mindmap_data: str = None, raw_analysis: str = None) -> bool:
        """保存客户画像"""
        current = self.get_profile(project_id)
        version = (current['version'] + 1) if current else 1
        
        sql = '''
            INSERT INTO client_profile_map 
            (project_id, personal_info, education, career_timeline, technical_expertise,
             achievements, connections, mindmap_data, raw_analysis, version)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(project_id) 
            DO UPDATE SET 
                personal_info = ?,
                education = ?,
                career_timeline = ?,
                technical_expertise = ?,
                achievements = ?,
                connections = ?,
                mindmap_data = ?,
                raw_analysis = ?,
                version = ?,
                updated_at = CURRENT_TIMESTAMP
        '''
        rows = self.execute_write(sql, (
            project_id, personal_info, education, career_timeline, technical_expertise,
            achievements, connections, mindmap_data, raw_analysis, version,
            personal_info, education, career_timeline, technical_expertise,
            achievements, connections, mindmap_data, raw_analysis, version
        ))
        return rows > 0
    
    def delete_profile(self, project_id: str) -> int:
        """删除客户画像（从两个表中删除）"""
        rows = 0
        try:
            rows += self.execute_write(
                'DELETE FROM client_profile_maps WHERE project_id = ?',
                (project_id,)
            )
        except:
            pass
        try:
            rows += self.execute_write(
                'DELETE FROM client_profile_map WHERE project_id = ?',
                (project_id,)
            )
        except:
            pass
        return rows
    
    # ==================== 项目信息操作 ====================
    
    def get_project_info(self, project_id: str) -> Optional[Dict[str, Any]]:
        """获取项目信息（尝试多个表）"""
        for table in ["projects", "copywriting_projects"]:
            try:
                result = self.execute_one(
                    f"SELECT * FROM {table} WHERE project_id = ?",
                    (project_id,)
                )
                if result:
                    return result
            except:
                continue
        return None
    
    # ==================== 简化的框架保存/获取 ====================
    
    def save_framework_simple(self, project_id: str, framework_data: Dict[str, Any]) -> bool:
        """保存框架（简化版本，直接存储 JSON）"""
        current = self.get_framework(project_id)
        version = (current['version'] + 1) if current else 1
        
        framework_json = json.dumps(framework_data, ensure_ascii=False)
        
        # 尝试先写入旧表
        try:
            sql = '''
                INSERT INTO gtv_frameworks (project_id, framework_data, version, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(project_id) 
                DO UPDATE SET 
                    framework_data = excluded.framework_data,
                    version = excluded.version,
                    updated_at = CURRENT_TIMESTAMP
            '''
            rows = self.execute_write(sql, (project_id, framework_json, version))
            return rows > 0
        except:
            pass
        
        # 尝试新表
        sql = '''
            INSERT INTO gtv_framework (project_id, framework_data, version, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(project_id) 
            DO UPDATE SET 
                framework_data = excluded.framework_data,
                version = excluded.version,
                updated_at = CURRENT_TIMESTAMP
        '''
        rows = self.execute_write(sql, (project_id, framework_json, version))
        return rows > 0
    
    def get_framework_with_meta(self, project_id: str) -> Optional[Dict[str, Any]]:
        """获取框架数据和元信息"""
        # 先尝试旧表
        for table in ['gtv_frameworks', 'gtv_framework']:
            try:
                result = self.execute_one(
                    f'SELECT framework_data, version, updated_at FROM {table} WHERE project_id = ?',
                    (project_id,)
                )
                if result:
                    return result
            except:
                continue
        return None
    
    def save_profile_simple(self, project_id: str, profile_data: Dict[str, Any]) -> bool:
        """保存信息脉络图（简化版本）"""
        profile_json = json.dumps(profile_data, ensure_ascii=False)
        
        # 尝试先写入旧表
        try:
            sql = '''
                INSERT INTO client_profile_maps (project_id, profile_data, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(project_id) 
                DO UPDATE SET 
                    profile_data = excluded.profile_data,
                    updated_at = CURRENT_TIMESTAMP
            '''
            rows = self.execute_write(sql, (project_id, profile_json))
            return rows > 0
        except:
            pass
        
        # 尝试新表
        sql = '''
            INSERT INTO client_profile_map (project_id, mindmap_data, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(project_id) 
            DO UPDATE SET 
                mindmap_data = excluded.mindmap_data,
                updated_at = CURRENT_TIMESTAMP
        '''
        rows = self.execute_write(sql, (project_id, profile_json))
        return rows > 0
    
    def get_profile_simple(self, project_id: str) -> Optional[Dict[str, Any]]:
        """获取信息脉络图（简化版本）"""
        # 先尝试旧表
        try:
            result = self.execute_one(
                'SELECT profile_data, updated_at FROM client_profile_maps WHERE project_id = ?',
                (project_id,)
            )
            if result:
                return result
        except:
            pass
        
        # 尝试新表
        try:
            result = self.execute_one(
                'SELECT mindmap_data as profile_data, updated_at FROM client_profile_map WHERE project_id = ?',
                (project_id,)
            )
            if result:
                return result
        except:
            pass
        
        return None
