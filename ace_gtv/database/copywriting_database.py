#!/usr/bin/env python3
"""
GTV签证文案系统本地数据库
使用SQLite存储项目、文档、案例等数据
"""

import sqlite3
import json
import os
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from contextlib import contextmanager
from pathlib import Path

from utils.logger_config import setup_module_logger

logger = setup_module_logger("copywriting_database", os.getenv("LOG_LEVEL", "INFO"))


class CopywritingDatabase:
    """文案系统本地SQLite数据库"""
    
    def __init__(self, db_path: str = None):
        """
        初始化数据库
        
        Args:
            db_path: 数据库文件路径
        """
        self.db_path = db_path or os.getenv("COPYWRITING_DB_PATH", "copywriting.db")
        self._init_database()
        logger.info(f"文案数据库初始化完成: {self.db_path}")
    
    @contextmanager
    def _get_connection(self):
        """获取数据库连接的上下文管理器"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
    
    def _init_database(self):
        """初始化数据库表结构"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # ==================== 项目表 ====================
                cursor.execute('''
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
                ''')
                
                # ==================== 材料包表 ====================
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS material_packages (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        project_id TEXT NOT NULL,
                        package_type TEXT NOT NULL,
                        name TEXT NOT NULL,
                        name_en TEXT,
                        description TEXT,
                        required INTEGER DEFAULT 1,
                        status TEXT DEFAULT 'pending',
                        progress INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (project_id) REFERENCES projects (project_id),
                        UNIQUE(project_id, package_type)
                    )
                ''')
                
                # ==================== 生成文档表 ====================
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS generated_documents (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        project_id TEXT NOT NULL,
                        package_type TEXT NOT NULL,
                        stage TEXT NOT NULL,
                        filename TEXT NOT NULL,
                        file_path TEXT,
                        content TEXT,
                        version INTEGER DEFAULT 1,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (project_id) REFERENCES projects (project_id)
                    )
                ''')
                
                # ==================== 分析报告表 ====================
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS analysis_reports (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        project_id TEXT NOT NULL,
                        report_type TEXT NOT NULL,
                        filename TEXT NOT NULL,
                        file_path TEXT,
                        content TEXT,
                        analysis_data TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (project_id) REFERENCES projects (project_id)
                    )
                ''')
                
                # ==================== 工作流历史表 ====================
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS workflow_history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        project_id TEXT NOT NULL,
                        action TEXT NOT NULL,
                        status TEXT,
                        details TEXT,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (project_id) REFERENCES projects (project_id)
                    )
                ''')
                
                # ==================== 成功案例表 ====================
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS success_cases (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        case_id TEXT UNIQUE NOT NULL,
                        industry TEXT,
                        experience_level TEXT,
                        pathway TEXT,
                        education TEXT,
                        achievements TEXT,
                        applicant_profile TEXT,
                        background_summary TEXT,
                        success_factors TEXT,
                        key_takeaways TEXT,
                        document_samples TEXT,
                        tags TEXT,
                        match_keywords TEXT,
                        verified INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                
                # ==================== 案例匹配记录表 ====================
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS case_matches (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        project_id TEXT NOT NULL,
                        case_id TEXT NOT NULL,
                        match_score REAL,
                        match_number INTEGER,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (project_id) REFERENCES projects (project_id),
                        FOREIGN KEY (case_id) REFERENCES success_cases (case_id)
                    )
                ''')
                
                # ==================== 文档版本历史表 ====================
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS document_versions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        project_id TEXT NOT NULL,
                        package_type TEXT NOT NULL,
                        version INTEGER NOT NULL,
                        content TEXT,
                        edit_type TEXT DEFAULT 'manual',
                        edit_summary TEXT,
                        editor TEXT DEFAULT 'user',
                        word_count INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (project_id) REFERENCES projects (project_id),
                        UNIQUE(project_id, package_type, version)
                    )
                ''')
                
                # ==================== 材料包内容表 ====================
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS package_contents (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        project_id TEXT NOT NULL,
                        package_type TEXT NOT NULL,
                        current_version INTEGER DEFAULT 1,
                        content TEXT,
                        status TEXT DEFAULT 'draft',
                        last_edited_by TEXT DEFAULT 'user',
                        ai_generated INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (project_id) REFERENCES projects (project_id),
                        UNIQUE(project_id, package_type)
                    )
                ''')
                
                # ==================== Agent提示词配置表 ====================
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS agent_prompts (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        project_id TEXT NOT NULL,
                        package_type TEXT NOT NULL,
                        system_prompt TEXT,
                        user_prompt_template TEXT,
                        reference_doc_id INTEGER,
                        reference_structure TEXT,
                        custom_instructions TEXT,
                        created_by TEXT DEFAULT 'user',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (project_id) REFERENCES projects (project_id),
                        UNIQUE(project_id, package_type)
                    )
                ''')
                
                # ==================== 客户信息脉络图表 ====================
                cursor.execute('''
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
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (project_id) REFERENCES projects (project_id)
                    )
                ''')
                
                # ==================== GTV框架表 ====================
                cursor.execute('''
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
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (project_id) REFERENCES projects (project_id)
                    )
                ''')
                
                # ==================== 提示词模板表 ====================
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS prompt_templates (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        type TEXT NOT NULL,
                        package_type TEXT,
                        content TEXT NOT NULL,
                        description TEXT,
                        is_default INTEGER DEFAULT 0,
                        is_active INTEGER DEFAULT 1,
                        usage_count INTEGER DEFAULT 0,
                        created_by TEXT DEFAULT 'system',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(name, type)
                    )
                ''')
                
                # ==================== 指令历史表 ====================
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS instruction_history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        project_id TEXT,
                        package_type TEXT,
                        instruction TEXT NOT NULL,
                        used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        result_quality TEXT,
                        FOREIGN KEY (project_id) REFERENCES projects (project_id)
                    )
                ''')
                
                # ==================== Agent配置表 ====================
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS agent_configs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        project_id TEXT NOT NULL,
                        package_type TEXT NOT NULL,
                        system_prompt TEXT,
                        user_prompt_template TEXT,
                        custom_instructions TEXT,
                        reference_doc_id TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(project_id, package_type)
                    )
                ''')
                
                # ==================== 用户表（替代 Supabase auth.users）====================
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS users (
                        id TEXT PRIMARY KEY,
                        email TEXT UNIQUE NOT NULL,
                        password_hash TEXT NOT NULL,
                        full_name TEXT,
                        phone TEXT,
                        company TEXT,
                        position TEXT,
                        role TEXT DEFAULT 'guest',
                        email_verified INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        last_sign_in TIMESTAMP
                    )
                ''')
                
                # ==================== 用户会话表 ====================
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS user_sessions (
                        id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        token TEXT UNIQUE NOT NULL,
                        expires_at TIMESTAMP NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                    )
                ''')
                
                # ==================== 评估记录表（迁移自 Supabase）====================
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS assessments (
                        id TEXT PRIMARY KEY,
                        user_id TEXT,
                        assessment_type TEXT NOT NULL,
                        applicant_name TEXT,
                        applicant_email TEXT,
                        applicant_phone TEXT,
                        field TEXT,
                        current_position TEXT,
                        company TEXT,
                        years_of_experience INTEGER,
                        resume_text TEXT,
                        resume_file_name TEXT,
                        resume_file_url TEXT,
                        additional_info TEXT,
                        overall_score REAL,
                        eligibility_level TEXT,
                        gtv_pathway TEXT,
                        pathway_analysis TEXT,
                        final_recommendation TEXT,
                        timeline TEXT,
                        estimated_budget_min INTEGER,
                        estimated_budget_max INTEGER,
                        estimated_budget_currency TEXT DEFAULT 'GBP',
                        data TEXT,
                        status TEXT DEFAULT 'pending',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
                    )
                ''')
                
                # ==================== 上传文件记录表（合并自 assessments.db）====================
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS uploaded_files (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        assessment_id TEXT,
                        project_id TEXT,
                        user_id TEXT,
                        file_name TEXT NOT NULL,
                        file_type TEXT,
                        file_size INTEGER DEFAULT 0,
                        storage_type TEXT DEFAULT 'local',
                        local_path TEXT,
                        object_bucket TEXT,
                        object_key TEXT,
                        object_url TEXT,
                        category TEXT,
                        description TEXT,
                        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (assessment_id) REFERENCES assessments (id) ON DELETE SET NULL,
                        FOREIGN KEY (project_id) REFERENCES projects (project_id) ON DELETE SET NULL,
                        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
                    )
                ''')
                
                # 创建索引
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_projects_status ON projects (status)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_projects_client ON projects (client_name)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_documents_project ON generated_documents (project_id)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_cases_industry ON success_cases (industry)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_cases_pathway ON success_cases (pathway)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_versions_project ON document_versions (project_id, package_type)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_package_contents ON package_contents (project_id, package_type)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_agent_prompts ON agent_prompts (project_id, package_type)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_profile_map ON client_profile_map (project_id)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_gtv_framework ON gtv_framework (project_id)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_prompt_templates ON prompt_templates (type, package_type)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_instruction_history ON instruction_history (project_id, package_type)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_agent_configs ON agent_configs (project_id, package_type)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_role ON users (role)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions (user_id)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions (token)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions (expires_at)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_assessments_user ON assessments (user_id)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_assessments_email ON assessments (applicant_email)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_assessments_created ON assessments (created_at)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_uploaded_files_assessment ON uploaded_files (assessment_id)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_uploaded_files_project ON uploaded_files (project_id)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_uploaded_files_user ON uploaded_files (user_id)')
                
                # ==================== 数据库迁移 ====================
                # 为 document_versions 表添加新字段（如果不存在）
                try:
                    cursor.execute("PRAGMA table_info(document_versions)")
                    columns = [col[1] for col in cursor.fetchall()]
                    
                    if 'source_type' not in columns:
                        cursor.execute("ALTER TABLE document_versions ADD COLUMN source_type TEXT DEFAULT 'manual'")
                        logger.info("已添加 document_versions.source_type 字段")
                    
                    if 'source_file' not in columns:
                        cursor.execute("ALTER TABLE document_versions ADD COLUMN source_file TEXT")
                        logger.info("已添加 document_versions.source_file 字段")
                except Exception as e:
                    logger.warning(f"字段迁移检查时出错（可忽略）: {e}")
                
                conn.commit()
                logger.info("数据库表结构初始化完成")
                
        except Exception as e:
            logger.error(f"初始化数据库失败: {e}")
            raise
    
    # ==================== 项目管理 ====================
    
    def create_project(self, project_id: str, case_id: str, client_name: str,
                      visa_type: str, folder_name: str, folder_path: str,
                      metadata: Dict = None) -> Dict[str, Any]:
        """创建项目"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO projects (project_id, case_id, client_name, visa_type, 
                                         folder_name, folder_path, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (project_id, case_id, client_name, visa_type, 
                      folder_name, folder_path, json.dumps(metadata or {})))
                
                logger.info(f"项目创建成功: {project_id}")
                return {"success": True, "project_id": project_id}
                
        except sqlite3.IntegrityError:
            return {"success": False, "error": "项目ID已存在"}
        except Exception as e:
            logger.error(f"创建项目失败: {e}")
            return {"success": False, "error": str(e)}
    
    def get_project(self, project_id: str = None, case_id: str = None) -> Dict[str, Any]:
        """获取项目"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                if project_id:
                    cursor.execute('SELECT * FROM projects WHERE project_id = ?', (project_id,))
                elif case_id:
                    cursor.execute('SELECT * FROM projects WHERE case_id = ?', (case_id,))
                else:
                    return {"success": False, "error": "需要提供project_id或case_id"}
                
                row = cursor.fetchone()
                if row:
                    data = dict(row)
                    if data.get('metadata'):
                        data['metadata'] = json.loads(data['metadata'])
                    
                    # 获取材料包状态
                    cursor.execute('SELECT * FROM material_packages WHERE project_id = ?', (data['project_id'],))
                    packages = {}
                    for pkg_row in cursor.fetchall():
                        pkg = dict(pkg_row)
                        packages[pkg['package_type']] = {
                            "name": pkg['name'],
                            "name_en": pkg['name_en'],
                            "description": pkg['description'],
                            "required": bool(pkg['required']),
                            "status": pkg['status'],
                            "progress": pkg['progress']
                        }
                    data['material_packages'] = packages
                    
                    # 获取最近的工作流历史
                    cursor.execute('''
                        SELECT action, status, details, timestamp 
                        FROM workflow_history 
                        WHERE project_id = ? 
                        ORDER BY timestamp DESC LIMIT 20
                    ''', (data['project_id'],))
                    data['workflow_history'] = [dict(h) for h in cursor.fetchall()]
                    
                    return {"success": True, "data": data, "path": data.get('folder_path')}
                
                return {"success": False, "error": "项目不存在"}
                
        except Exception as e:
            logger.error(f"获取项目失败: {e}")
            return {"success": False, "error": str(e)}
    
    def list_projects(self, limit: int = 100, status: str = None) -> Dict[str, Any]:
        """列出项目"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                if status:
                    cursor.execute('''
                        SELECT * FROM projects WHERE status = ? 
                        ORDER BY created_at DESC LIMIT ?
                    ''', (status, limit))
                else:
                    cursor.execute('''
                        SELECT * FROM projects ORDER BY created_at DESC LIMIT ?
                    ''', (limit,))
                
                projects = []
                for row in cursor.fetchall():
                    data = dict(row)
                    if data.get('metadata'):
                        data['metadata'] = json.loads(data['metadata'])
                    projects.append(data)
                
                return {"success": True, "data": projects, "total": len(projects)}
                
        except Exception as e:
            logger.error(f"列出项目失败: {e}")
            return {"success": False, "error": str(e), "data": []}
    
    def update_project_status(self, project_id: str, status: str, 
                             progress: int = None) -> Dict[str, Any]:
        """更新项目状态"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                if progress is not None:
                    cursor.execute('''
                        UPDATE projects 
                        SET status = ?, overall_progress = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE project_id = ?
                    ''', (status, progress, project_id))
                else:
                    cursor.execute('''
                        UPDATE projects 
                        SET status = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE project_id = ?
                    ''', (status, project_id))
                
                return {"success": True}
                
        except Exception as e:
            logger.error(f"更新项目状态失败: {e}")
            return {"success": False, "error": str(e)}
    
    # ==================== 材料包管理 ====================
    
    def init_material_packages(self, project_id: str, packages: Dict[str, Dict]) -> Dict[str, Any]:
        """初始化项目的材料包"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                for pkg_type, pkg_info in packages.items():
                    cursor.execute('''
                        INSERT OR REPLACE INTO material_packages 
                        (project_id, package_type, name, name_en, description, required)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', (project_id, pkg_type, pkg_info.get('name'), 
                          pkg_info.get('name_en'), pkg_info.get('description'),
                          1 if pkg_info.get('required') else 0))
                
                return {"success": True}
                
        except Exception as e:
            logger.error(f"初始化材料包失败: {e}")
            return {"success": False, "error": str(e)}
    
    def update_package_status(self, project_id: str, package_type: str,
                             status: str, progress: int) -> Dict[str, Any]:
        """更新材料包状态"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    UPDATE material_packages 
                    SET status = ?, progress = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE project_id = ? AND package_type = ?
                ''', (status, progress, project_id, package_type))
                
                # 更新项目整体进度
                cursor.execute('''
                    SELECT AVG(progress) as avg_progress 
                    FROM material_packages 
                    WHERE project_id = ? AND required = 1
                ''', (project_id,))
                row = cursor.fetchone()
                if row and row['avg_progress']:
                    cursor.execute('''
                        UPDATE projects SET overall_progress = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE project_id = ?
                    ''', (int(row['avg_progress']), project_id))
                
                return {"success": True}
                
        except Exception as e:
            logger.error(f"更新材料包状态失败: {e}")
            return {"success": False, "error": str(e)}
    
    # ==================== 原始材料管理 ====================
    
    def add_raw_material(self, project_id: str, category: str, filename: str,
                        file_path: str = None, content: str = None,
                        file_size: int = 0, file_type: str = None) -> Dict[str, Any]:
        """添加原始材料（使用material_files表）"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # 映射旧的 category 到新的 category_id 和 item_id
                category_mapping = {
                    '简历': ('cv_docs', 'applicant_cv'),
                    '推荐信': ('ref_letter', 'ref1_letter'),
                    '证书': ('degree_cert', 'highest_degree'),
                    '证明': ('evidence', 'other_evidence'),
                }
                category_id, item_id = category_mapping.get(category, ('uncategorized', 'other'))
                
                cursor.execute('''
                    INSERT INTO material_files 
                    (project_id, category_id, item_id, file_name, file_path, file_size, file_type, description)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (project_id, category_id, item_id, filename, file_path or '', file_size, file_type, content))
                
                material_id = cursor.lastrowid
                logger.info(f"原始材料添加成功: {filename}")
                return {"success": True, "material_id": material_id}
                
        except Exception as e:
            logger.error(f"添加原始材料失败: {e}")
            return {"success": False, "error": str(e)}
    
    def get_raw_materials(self, project_id: str) -> Dict[str, Any]:
        """获取项目的原始材料（从material_files表读取）"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT * FROM material_files WHERE project_id = ? ORDER BY category_id, uploaded_at
                ''', (project_id,))
                
                materials = {}
                for row in cursor.fetchall():
                    data = dict(row)
                    category = data['category_id']
                    if category not in materials:
                        materials[category] = []
                    materials[category].append({
                        "id": data['id'],
                        "name": data['file_name'],
                        "path": data['file_path'],
                        "content": data.get('description', ''),
                        "size": data['file_size'],
                        "modified": data['uploaded_at']
                    })
                
                return {"success": True, "data": materials}
                
        except Exception as e:
            logger.error(f"获取原始材料失败: {e}")
            return {"success": False, "error": str(e)}
    
    # ==================== 生成文档管理 ====================
    
    def save_document(self, project_id: str, package_type: str, stage: str,
                     filename: str, file_path: str, content: str) -> Dict[str, Any]:
        """保存生成的文档"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # 检查是否存在，如果存在则更新版本
                cursor.execute('''
                    SELECT id, version FROM generated_documents 
                    WHERE project_id = ? AND package_type = ? AND stage = ? AND filename = ?
                ''', (project_id, package_type, stage, filename))
                
                existing = cursor.fetchone()
                if existing:
                    new_version = existing['version'] + 1
                    cursor.execute('''
                        UPDATE generated_documents 
                        SET content = ?, file_path = ?, version = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    ''', (content, file_path, new_version, existing['id']))
                    doc_id = existing['id']
                else:
                    cursor.execute('''
                        INSERT INTO generated_documents 
                        (project_id, package_type, stage, filename, file_path, content)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', (project_id, package_type, stage, filename, file_path, content))
                    doc_id = cursor.lastrowid
                
                # 更新材料包状态
                progress_map = {"draft": 33, "optimized": 66, "final": 100}
                status_map = {"draft": "draft", "optimized": "optimized", "final": "completed"}
                
                if stage in progress_map:
                    self.update_package_status(
                        project_id, package_type,
                        status_map[stage], progress_map[stage]
                    )
                
                logger.info(f"文档保存成功: {filename}")
                return {"success": True, "document_id": doc_id}
                
        except Exception as e:
            logger.error(f"保存文档失败: {e}")
            return {"success": False, "error": str(e)}
    
    def get_documents(self, project_id: str, stage: str = None) -> Dict[str, Any]:
        """获取项目的文档"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                if stage:
                    cursor.execute('''
                        SELECT * FROM generated_documents 
                        WHERE project_id = ? AND stage = ?
                        ORDER BY package_type, created_at
                    ''', (project_id, stage))
                else:
                    cursor.execute('''
                        SELECT * FROM generated_documents 
                        WHERE project_id = ?
                        ORDER BY stage, package_type, created_at
                    ''', (project_id,))
                
                documents = {}
                for row in cursor.fetchall():
                    data = dict(row)
                    stage_name = data['stage']
                    pkg_type = data['package_type']
                    
                    if stage_name not in documents:
                        documents[stage_name] = {}
                    if pkg_type not in documents[stage_name]:
                        documents[stage_name][pkg_type] = []
                    
                    documents[stage_name][pkg_type].append({
                        "id": data['id'],
                        "name": data['filename'],
                        "path": data['file_path'],
                        "content": data['content'],
                        "version": data['version'],
                        "modified": data['updated_at']
                    })
                
                return {"success": True, "data": documents}
                
        except Exception as e:
            logger.error(f"获取文档失败: {e}")
            return {"success": False, "error": str(e)}
    
    def get_document_content(self, project_id: str, doc_path: str) -> Dict[str, Any]:
        """获取文档内容"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # 解析路径
                parts = doc_path.split('/')
                if len(parts) >= 3:
                    stage = parts[0]
                    package_type = parts[1]
                    filename = parts[2]
                    
                    cursor.execute('''
                        SELECT * FROM generated_documents 
                        WHERE project_id = ? AND stage = ? AND package_type = ? AND filename = ?
                    ''', (project_id, stage, package_type, filename))
                else:
                    cursor.execute('''
                        SELECT * FROM generated_documents 
                        WHERE project_id = ? AND filename LIKE ?
                    ''', (project_id, f'%{doc_path}%'))
                
                row = cursor.fetchone()
                if row:
                    return {
                        "success": True,
                        "data": {
                            "path": doc_path,
                            "content": row['content'],
                            "version": row['version'],
                            "modified": row['updated_at']
                        }
                    }
                
                return {"success": False, "error": "文档不存在"}
                
        except Exception as e:
            logger.error(f"获取文档内容失败: {e}")
            return {"success": False, "error": str(e)}
    
    # ==================== 分析报告管理 ====================
    
    def save_analysis_report(self, project_id: str, report_type: str,
                            filename: str, file_path: str, content: str,
                            analysis_data: Dict = None) -> Dict[str, Any]:
        """保存分析报告"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO analysis_reports 
                    (project_id, report_type, filename, file_path, content, analysis_data)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (project_id, report_type, filename, file_path, content,
                      json.dumps(analysis_data or {})))
                
                report_id = cursor.lastrowid
                return {"success": True, "report_id": report_id}
                
        except Exception as e:
            logger.error(f"保存分析报告失败: {e}")
            return {"success": False, "error": str(e)}
    
    def get_analysis_reports(self, project_id: str, 
                            report_type: str = None) -> Dict[str, Any]:
        """获取分析报告"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                if report_type:
                    cursor.execute('''
                        SELECT * FROM analysis_reports 
                        WHERE project_id = ? AND report_type = ?
                        ORDER BY created_at DESC
                    ''', (project_id, report_type))
                else:
                    cursor.execute('''
                        SELECT * FROM analysis_reports 
                        WHERE project_id = ?
                        ORDER BY report_type, created_at DESC
                    ''', (project_id,))
                
                reports = []
                for row in cursor.fetchall():
                    data = dict(row)
                    if data.get('analysis_data'):
                        data['analysis_data'] = json.loads(data['analysis_data'])
                    reports.append(data)
                
                return {"success": True, "data": reports}
                
        except Exception as e:
            logger.error(f"获取分析报告失败: {e}")
            return {"success": False, "error": str(e)}
    
    # ==================== 工作流历史 ====================
    
    def log_workflow_action(self, project_id: str, action: str,
                           status: str = None, details: str = None) -> Dict[str, Any]:
        """记录工作流操作"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO workflow_history (project_id, action, status, details)
                    VALUES (?, ?, ?, ?)
                ''', (project_id, action, status, details))
                
                return {"success": True}
                
        except Exception as e:
            logger.error(f"记录工作流操作失败: {e}")
            return {"success": False, "error": str(e)}
    
    # ==================== 成功案例管理 ====================
    
    def add_success_case(self, case_data: Dict[str, Any]) -> Dict[str, Any]:
        """添加成功案例"""
        try:
            case_id = case_data.get('id') or str(uuid.uuid4())[:12].upper()
            
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO success_cases 
                    (case_id, industry, experience_level, pathway, education, 
                     achievements, applicant_profile, background_summary, 
                     success_factors, key_takeaways, document_samples, 
                     tags, match_keywords, verified)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    case_id,
                    case_data.get('industry'),
                    case_data.get('experience_level'),
                    case_data.get('pathway'),
                    case_data.get('education'),
                    json.dumps(case_data.get('achievements', [])),
                    json.dumps(case_data.get('applicant_profile', {})),
                    case_data.get('background_summary'),
                    case_data.get('success_factors'),
                    case_data.get('key_takeaways'),
                    json.dumps(case_data.get('document_samples', {})),
                    json.dumps(case_data.get('tags', [])),
                    json.dumps(case_data.get('match_keywords', [])),
                    1 if case_data.get('verified') else 0
                ))
                
                logger.info(f"成功案例添加: {case_id}")
                return {"success": True, "case_id": case_id}
                
        except sqlite3.IntegrityError:
            return {"success": False, "error": "案例ID已存在"}
        except Exception as e:
            logger.error(f"添加成功案例失败: {e}")
            return {"success": False, "error": str(e)}
    
    def get_success_case(self, case_id: str) -> Dict[str, Any]:
        """获取成功案例"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('SELECT * FROM success_cases WHERE case_id = ?', (case_id,))
                row = cursor.fetchone()
                
                if row:
                    data = self._parse_case_row(row)
                    return {"success": True, "data": data}
                
                return {"success": False, "error": "案例不存在"}
                
        except Exception as e:
            logger.error(f"获取成功案例失败: {e}")
            return {"success": False, "error": str(e)}
    
    def _parse_case_row(self, row) -> Dict[str, Any]:
        """解析案例行数据"""
        data = dict(row)
        data['id'] = data.pop('case_id')
        
        # 解析JSON字段
        for field in ['achievements', 'applicant_profile', 'document_samples', 'tags', 'match_keywords']:
            if data.get(field):
                try:
                    data[field] = json.loads(data[field])
                except:
                    pass
        
        data['verified'] = bool(data.get('verified'))
        return data
    
    def search_cases(self, filters: Dict = None, keywords: List[str] = None,
                    limit: int = 10) -> Dict[str, Any]:
        """搜索案例"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                query = 'SELECT * FROM success_cases WHERE 1=1'
                params = []
                
                if filters:
                    if filters.get('industry'):
                        query += ' AND industry = ?'
                        params.append(filters['industry'])
                    if filters.get('pathway'):
                        query += ' AND pathway = ?'
                        params.append(filters['pathway'])
                    if filters.get('experience_level'):
                        query += ' AND experience_level = ?'
                        params.append(filters['experience_level'])
                    if filters.get('education'):
                        query += ' AND education = ?'
                        params.append(filters['education'])
                
                if keywords:
                    keyword_conditions = []
                    for kw in keywords:
                        keyword_conditions.append('(match_keywords LIKE ? OR tags LIKE ?)')
                        params.extend([f'%{kw}%', f'%{kw}%'])
                    if keyword_conditions:
                        query += ' AND (' + ' OR '.join(keyword_conditions) + ')'
                
                query += ' LIMIT ?'
                params.append(limit)
                
                cursor.execute(query, params)
                
                cases = [self._parse_case_row(row) for row in cursor.fetchall()]
                return {"success": True, "data": cases, "total": len(cases)}
                
        except Exception as e:
            logger.error(f"搜索案例失败: {e}")
            return {"success": False, "error": str(e), "data": []}
    
    def list_cases(self, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
        """列出案例"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # 获取总数
                cursor.execute('SELECT COUNT(*) as count FROM success_cases')
                total = cursor.fetchone()['count']
                
                # 分页查询
                offset = (page - 1) * page_size
                cursor.execute('''
                    SELECT * FROM success_cases 
                    ORDER BY created_at DESC 
                    LIMIT ? OFFSET ?
                ''', (page_size, offset))
                
                cases = [self._parse_case_row(row) for row in cursor.fetchall()]
                
                return {
                    "success": True,
                    "data": cases,
                    "page": page,
                    "page_size": page_size,
                    "total": total,
                    "total_pages": (total + page_size - 1) // page_size
                }
                
        except Exception as e:
            logger.error(f"列出案例失败: {e}")
            return {"success": False, "error": str(e), "data": []}
    
    def get_case_statistics(self) -> Dict[str, Any]:
        """获取案例统计"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # 总数
                cursor.execute('SELECT COUNT(*) as count FROM success_cases')
                total = cursor.fetchone()['count']
                
                # 按行业统计
                cursor.execute('''
                    SELECT industry, COUNT(*) as count 
                    FROM success_cases 
                    GROUP BY industry
                ''')
                by_industry = {row['industry']: row['count'] for row in cursor.fetchall()}
                
                # 按路径统计
                cursor.execute('''
                    SELECT pathway, COUNT(*) as count 
                    FROM success_cases 
                    GROUP BY pathway
                ''')
                by_pathway = {row['pathway']: row['count'] for row in cursor.fetchall()}
                
                # 按经验统计
                cursor.execute('''
                    SELECT experience_level, COUNT(*) as count 
                    FROM success_cases 
                    GROUP BY experience_level
                ''')
                by_experience = {row['experience_level']: row['count'] for row in cursor.fetchall()}
                
                # 按教育统计
                cursor.execute('''
                    SELECT education, COUNT(*) as count 
                    FROM success_cases 
                    GROUP BY education
                ''')
                by_education = {row['education']: row['count'] for row in cursor.fetchall()}
                
                return {
                    "success": True,
                    "data": {
                        "total_count": total,
                        "statistics": {
                            "by_industry": by_industry,
                            "by_pathway": by_pathway,
                            "by_experience": by_experience,
                            "by_education": by_education
                        }
                    }
                }
                
        except Exception as e:
            logger.error(f"获取案例统计失败: {e}")
            return {"success": False, "error": str(e)}
    
    def save_case_match(self, project_id: str, case_id: str, 
                       match_score: float, match_number: int) -> Dict[str, Any]:
        """保存案例匹配记录"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO case_matches (project_id, case_id, match_score, match_number)
                    VALUES (?, ?, ?, ?)
                ''', (project_id, case_id, match_score, match_number))
                
                return {"success": True}
                
        except Exception as e:
            logger.error(f"保存案例匹配失败: {e}")
            return {"success": False, "error": str(e)}
    
    def get_matched_cases(self, project_id: str) -> Dict[str, Any]:
        """获取项目匹配的案例"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT cm.*, sc.*
                    FROM case_matches cm
                    JOIN success_cases sc ON cm.case_id = sc.case_id
                    WHERE cm.project_id = ?
                    ORDER BY cm.match_number
                ''', (project_id,))
                
                cases = []
                for row in cursor.fetchall():
                    case = self._parse_case_row(row)
                    case['match_score'] = row['match_score']
                    cases.append(case)
                
                return {"success": True, "data": cases}
                
        except Exception as e:
            logger.error(f"获取匹配案例失败: {e}")
            return {"success": False, "error": str(e), "data": []}
    
    # ==================== 材料包内容和版本管理 ====================
    
    def get_package_content(self, project_id: str, package_type: str) -> Dict[str, Any]:
        """获取材料包当前内容"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT * FROM package_contents 
                    WHERE project_id = ? AND package_type = ?
                ''', (project_id, package_type))
                
                row = cursor.fetchone()
                if row:
                    return {
                        "success": True,
                        "data": {
                            "id": row['id'],
                            "project_id": row['project_id'],
                            "package_type": row['package_type'],
                            "current_version": row['current_version'],
                            "content": row['content'],
                            "status": row['status'],
                            "last_edited_by": row['last_edited_by'],
                            "ai_generated": bool(row['ai_generated']),
                            "created_at": row['created_at'],
                            "updated_at": row['updated_at']
                        }
                    }
                
                return {"success": True, "data": None}
                
        except Exception as e:
            logger.error(f"获取材料包内容失败: {e}")
            return {"success": False, "error": str(e)}
    
    def save_package_content(self, project_id: str, package_type: str, content: str,
                            edit_type: str = "manual", edit_summary: str = None,
                            editor: str = "user") -> Dict[str, Any]:
        """保存材料包内容（自动创建新版本）"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # 获取当前版本
                cursor.execute('''
                    SELECT current_version, content FROM package_contents 
                    WHERE project_id = ? AND package_type = ?
                ''', (project_id, package_type))
                
                row = cursor.fetchone()
                
                if row:
                    # 如果内容相同，不创建新版本
                    if row['content'] == content:
                        return {"success": True, "message": "内容未变化", "version": row['current_version']}
                    
                    new_version = row['current_version'] + 1
                    
                    # 更新当前内容
                    cursor.execute('''
                        UPDATE package_contents 
                        SET content = ?, current_version = ?, last_edited_by = ?,
                            ai_generated = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE project_id = ? AND package_type = ?
                    ''', (content, new_version, editor, 1 if edit_type == "ai" else 0,
                          project_id, package_type))
                else:
                    new_version = 1
                    
                    # 创建新记录
                    cursor.execute('''
                        INSERT INTO package_contents 
                        (project_id, package_type, current_version, content, last_edited_by, ai_generated)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', (project_id, package_type, new_version, content, editor,
                          1 if edit_type == "ai" else 0))
                
                # 保存版本历史
                word_count = len(content.split()) if content else 0
                cursor.execute('''
                    INSERT INTO document_versions 
                    (project_id, package_type, version, content, edit_type, edit_summary, editor, word_count)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (project_id, package_type, new_version, content, edit_type, 
                      edit_summary or f"版本 {new_version}", editor, word_count))
                
                # 更新材料包状态
                self.update_package_status(project_id, package_type, "draft", 
                                          min(33 + new_version * 10, 100))
                
                logger.info(f"材料包内容保存成功: {project_id}/{package_type} v{new_version}")
                
                return {
                    "success": True,
                    "version": new_version,
                    "message": f"已保存为版本 {new_version}"
                }
                
        except Exception as e:
            logger.error(f"保存材料包内容失败: {e}")
            return {"success": False, "error": str(e)}
    
    def get_version_history(self, project_id: str, package_type: str) -> Dict[str, Any]:
        """获取版本历史"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT * FROM document_versions 
                    WHERE project_id = ? AND package_type = ?
                    ORDER BY version DESC
                ''', (project_id, package_type))
                
                versions = []
                for row in cursor.fetchall():
                    versions.append({
                        "id": row['id'],
                        "version": row['version'],
                        "edit_type": row['edit_type'],
                        "edit_summary": row['edit_summary'],
                        "editor": row['editor'],
                        "word_count": row['word_count'],
                        "created_at": row['created_at'],
                        "content_preview": row['content'][:200] + "..." if row['content'] and len(row['content']) > 200 else row['content']
                    })
                
                return {"success": True, "data": versions, "total": len(versions)}
                
        except Exception as e:
            logger.error(f"获取版本历史失败: {e}")
            return {"success": False, "error": str(e), "data": []}
    
    def get_version_content(self, project_id: str, package_type: str, 
                           version: int) -> Dict[str, Any]:
        """获取特定版本的内容"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT * FROM document_versions 
                    WHERE project_id = ? AND package_type = ? AND version = ?
                ''', (project_id, package_type, version))
                
                row = cursor.fetchone()
                if row:
                    return {
                        "success": True,
                        "data": {
                            "version": row['version'],
                            "content": row['content'],
                            "edit_type": row['edit_type'],
                            "edit_summary": row['edit_summary'],
                            "editor": row['editor'],
                            "word_count": row['word_count'],
                            "created_at": row['created_at']
                        }
                    }
                
                return {"success": False, "error": "版本不存在"}
                
        except Exception as e:
            logger.error(f"获取版本内容失败: {e}")
            return {"success": False, "error": str(e)}
    
    def rollback_to_version(self, project_id: str, package_type: str, 
                           version: int) -> Dict[str, Any]:
        """回滚到特定版本"""
        try:
            # 获取目标版本内容
            version_result = self.get_version_content(project_id, package_type, version)
            if not version_result.get("success"):
                return version_result
            
            content = version_result["data"]["content"]
            
            # 保存为新版本（回滚操作也创建新版本）
            return self.save_package_content(
                project_id, package_type, content,
                edit_type="rollback",
                edit_summary=f"回滚到版本 {version}",
                editor="user"
            )
            
        except Exception as e:
            logger.error(f"版本回滚失败: {e}")
            return {"success": False, "error": str(e)}
    
    def get_all_package_contents(self, project_id: str) -> Dict[str, Any]:
        """获取项目所有材料包的内容概览"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT pc.*, 
                           (SELECT COUNT(*) FROM document_versions dv 
                            WHERE dv.project_id = pc.project_id 
                            AND dv.package_type = pc.package_type) as version_count
                    FROM package_contents pc
                    WHERE pc.project_id = ?
                ''', (project_id,))
                
                packages = {}
                for row in cursor.fetchall():
                    packages[row['package_type']] = {
                        "current_version": row['current_version'],
                        "status": row['status'],
                        "last_edited_by": row['last_edited_by'],
                        "ai_generated": bool(row['ai_generated']),
                        "updated_at": row['updated_at'],
                        "version_count": row['version_count'],
                        "has_content": bool(row['content']),
                        "word_count": len(row['content'].split()) if row['content'] else 0
                    }
                
                return {"success": True, "data": packages}
                
        except Exception as e:
            logger.error(f"获取材料包概览失败: {e}")
            return {"success": False, "error": str(e), "data": {}}

    # ==================== Agent提示词管理 ====================
    
    def save_agent_prompt(self, project_id: str, package_type: str, 
                         system_prompt: str = None, user_prompt_template: str = None,
                         reference_doc_id: int = None, reference_structure: str = None,
                         custom_instructions: str = None) -> Dict[str, Any]:
        """保存或更新Agent提示词配置"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO agent_prompts 
                    (project_id, package_type, system_prompt, user_prompt_template, 
                     reference_doc_id, reference_structure, custom_instructions, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(project_id, package_type) 
                    DO UPDATE SET 
                        system_prompt = COALESCE(excluded.system_prompt, system_prompt),
                        user_prompt_template = COALESCE(excluded.user_prompt_template, user_prompt_template),
                        reference_doc_id = COALESCE(excluded.reference_doc_id, reference_doc_id),
                        reference_structure = COALESCE(excluded.reference_structure, reference_structure),
                        custom_instructions = COALESCE(excluded.custom_instructions, custom_instructions),
                        updated_at = CURRENT_TIMESTAMP
                ''', (project_id, package_type, system_prompt, user_prompt_template,
                     reference_doc_id, reference_structure, custom_instructions))
                
                return {"success": True}
                
        except Exception as e:
            logger.error(f"保存Agent配置失败: {e}")
            return {"success": False, "error": str(e)}
    
    def get_agent_prompt(self, project_id: str, package_type: str) -> Dict[str, Any]:
        """获取Agent提示词配置"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT * FROM agent_prompts 
                    WHERE project_id = ? AND package_type = ?
                ''', (project_id, package_type))
                
                row = cursor.fetchone()
                
                if row:
                    return {
                        "success": True,
                        "data": {
                            "id": row['id'],
                            "project_id": row['project_id'],
                            "package_type": row['package_type'],
                            "system_prompt": row['system_prompt'],
                            "user_prompt_template": row['user_prompt_template'],
                            "reference_doc_id": row['reference_doc_id'],
                            "reference_structure": row['reference_structure'],
                            "custom_instructions": row['custom_instructions'],
                            "updated_at": row['updated_at']
                        }
                    }
                
                return {"success": True, "data": None}
                
        except Exception as e:
            logger.error(f"获取Agent配置失败: {e}")
            return {"success": False, "error": str(e)}
    
    # ==================== 客户信息脉络图管理 ====================
    
    def save_profile_map(self, project_id: str, profile_data: Dict) -> Dict[str, Any]:
        """保存或更新客户信息脉络图"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # 获取当前版本号
                cursor.execute('''
                    SELECT version FROM client_profile_map WHERE project_id = ?
                ''', (project_id,))
                
                row = cursor.fetchone()
                new_version = (row['version'] + 1) if row else 1
                
                cursor.execute('''
                    INSERT INTO client_profile_map 
                    (project_id, personal_info, education, career_timeline, 
                     technical_expertise, achievements, connections, mindmap_data, 
                     raw_analysis, version, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(project_id) 
                    DO UPDATE SET 
                        personal_info = excluded.personal_info,
                        education = excluded.education,
                        career_timeline = excluded.career_timeline,
                        technical_expertise = excluded.technical_expertise,
                        achievements = excluded.achievements,
                        connections = excluded.connections,
                        mindmap_data = excluded.mindmap_data,
                        raw_analysis = excluded.raw_analysis,
                        version = excluded.version,
                        updated_at = CURRENT_TIMESTAMP
                ''', (
                    project_id,
                    json.dumps(profile_data.get("personal_info"), ensure_ascii=False),
                    json.dumps(profile_data.get("education"), ensure_ascii=False),
                    json.dumps(profile_data.get("career_timeline"), ensure_ascii=False),
                    json.dumps(profile_data.get("technical_expertise"), ensure_ascii=False),
                    json.dumps(profile_data.get("achievements"), ensure_ascii=False),
                    json.dumps(profile_data.get("connections"), ensure_ascii=False),
                    json.dumps(profile_data.get("mindmap_data"), ensure_ascii=False),
                    json.dumps(profile_data.get("raw_analysis"), ensure_ascii=False),
                    new_version
                ))
                
                return {"success": True, "version": new_version}
                
        except Exception as e:
            logger.error(f"保存信息脉络图失败: {e}")
            return {"success": False, "error": str(e)}
    
    def get_profile_map(self, project_id: str) -> Dict[str, Any]:
        """获取客户信息脉络图"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT * FROM client_profile_map WHERE project_id = ?
                ''', (project_id,))
                
                row = cursor.fetchone()
                
                if row:
                    return {
                        "success": True,
                        "data": {
                            "project_id": row['project_id'],
                            "personal_info": json.loads(row['personal_info']) if row['personal_info'] else None,
                            "education": json.loads(row['education']) if row['education'] else None,
                            "career_timeline": json.loads(row['career_timeline']) if row['career_timeline'] else None,
                            "technical_expertise": json.loads(row['technical_expertise']) if row['technical_expertise'] else None,
                            "achievements": json.loads(row['achievements']) if row['achievements'] else None,
                            "connections": json.loads(row['connections']) if row['connections'] else None,
                            "mindmap_data": json.loads(row['mindmap_data']) if row['mindmap_data'] else None,
                            "raw_analysis": json.loads(row['raw_analysis']) if row['raw_analysis'] else None,
                            "version": row['version'],
                            "updated_at": row['updated_at']
                        }
                    }
                
                return {"success": True, "data": None}
                
        except Exception as e:
            logger.error(f"获取信息脉络图失败: {e}")
            return {"success": False, "error": str(e)}
    
    # ==================== GTV框架管理 ====================
    
    def save_gtv_framework(self, project_id: str, framework_data: Dict) -> Dict[str, Any]:
        """保存或更新GTV框架"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # 获取当前版本号
                cursor.execute('''
                    SELECT version FROM gtv_framework WHERE project_id = ?
                ''', (project_id,))
                
                row = cursor.fetchone()
                new_version = (row['version'] + 1) if row else 1
                
                cursor.execute('''
                    INSERT INTO gtv_framework 
                    (project_id, domain_positioning, mc_criteria, oc_criteria, 
                     recommenders, personal_statement_points, evidence_list, 
                     framework_data, version, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(project_id) 
                    DO UPDATE SET 
                        domain_positioning = excluded.domain_positioning,
                        mc_criteria = excluded.mc_criteria,
                        oc_criteria = excluded.oc_criteria,
                        recommenders = excluded.recommenders,
                        personal_statement_points = excluded.personal_statement_points,
                        evidence_list = excluded.evidence_list,
                        framework_data = excluded.framework_data,
                        version = excluded.version,
                        updated_at = CURRENT_TIMESTAMP
                ''', (
                    project_id,
                    json.dumps(framework_data.get("domain_positioning"), ensure_ascii=False),
                    json.dumps(framework_data.get("mc_criteria"), ensure_ascii=False),
                    json.dumps(framework_data.get("oc_criteria"), ensure_ascii=False),
                    json.dumps(framework_data.get("recommenders"), ensure_ascii=False),
                    json.dumps(framework_data.get("personal_statement_points"), ensure_ascii=False),
                    json.dumps(framework_data.get("evidence_list"), ensure_ascii=False),
                    json.dumps(framework_data, ensure_ascii=False),
                    new_version
                ))
                
                return {"success": True, "version": new_version}
                
        except Exception as e:
            logger.error(f"保存GTV框架失败: {e}")
            return {"success": False, "error": str(e)}
    
    def get_gtv_framework(self, project_id: str) -> Dict[str, Any]:
        """获取GTV框架"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT * FROM gtv_framework WHERE project_id = ?
                ''', (project_id,))
                
                row = cursor.fetchone()
                
                if row:
                    return {
                        "success": True,
                        "data": {
                            "project_id": row['project_id'],
                            "domain_positioning": json.loads(row['domain_positioning']) if row['domain_positioning'] else None,
                            "mc_criteria": json.loads(row['mc_criteria']) if row['mc_criteria'] else None,
                            "oc_criteria": json.loads(row['oc_criteria']) if row['oc_criteria'] else None,
                            "recommenders": json.loads(row['recommenders']) if row['recommenders'] else None,
                            "personal_statement_points": json.loads(row['personal_statement_points']) if row['personal_statement_points'] else None,
                            "evidence_list": json.loads(row['evidence_list']) if row['evidence_list'] else None,
                            "framework_data": json.loads(row['framework_data']) if row['framework_data'] else None,
                            "version": row['version'],
                            "updated_at": row['updated_at']
                        }
                    }
                
                return {"success": True, "data": None}
                
        except Exception as e:
            logger.error(f"获取GTV框架失败: {e}")
            return {"success": False, "error": str(e)}

    # ==================== 用户管理 ====================
    
    def create_user(self, email: str, password_hash: str, full_name: str = None,
                   phone: str = None, company: str = None, position: str = None,
                   role: str = 'guest') -> Dict[str, Any]:
        """创建新用户"""
        try:
            user_id = str(uuid.uuid4())
            
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO users (id, email, password_hash, full_name, phone, company, position, role)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (user_id, email.lower(), password_hash, full_name, phone, company, position, role))
                
                logger.info(f"用户创建成功: {email}")
                return {
                    "success": True,
                    "user_id": user_id,
                    "user": {
                        "id": user_id,
                        "email": email.lower(),
                        "full_name": full_name,
                        "phone": phone,
                        "company": company,
                        "position": position,
                        "role": role,
                        "email_verified": False
                    }
                }
                
        except sqlite3.IntegrityError:
            return {"success": False, "error": "该邮箱已被注册"}
        except Exception as e:
            logger.error(f"创建用户失败: {e}")
            return {"success": False, "error": str(e)}
    
    def get_user_by_email(self, email: str) -> Dict[str, Any]:
        """根据邮箱获取用户"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('SELECT * FROM users WHERE email = ?', (email.lower(),))
                row = cursor.fetchone()
                
                if row:
                    return {
                        "success": True,
                        "user": {
                            "id": row['id'],
                            "email": row['email'],
                            "password_hash": row['password_hash'],
                            "full_name": row['full_name'],
                            "phone": row['phone'],
                            "company": row['company'],
                            "position": row['position'],
                            "role": row['role'],
                            "email_verified": bool(row['email_verified']),
                            "created_at": row['created_at'],
                            "updated_at": row['updated_at'],
                            "last_sign_in": row['last_sign_in']
                        }
                    }
                
                return {"success": False, "error": "用户不存在"}
                
        except Exception as e:
            logger.error(f"获取用户失败: {e}")
            return {"success": False, "error": str(e)}
    
    def get_user_by_id(self, user_id: str) -> Dict[str, Any]:
        """根据ID获取用户"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
                row = cursor.fetchone()
                
                if row:
                    return {
                        "success": True,
                        "user": {
                            "id": row['id'],
                            "email": row['email'],
                            "full_name": row['full_name'],
                            "phone": row['phone'],
                            "company": row['company'],
                            "position": row['position'],
                            "role": row['role'],
                            "email_verified": bool(row['email_verified']),
                            "created_at": row['created_at'],
                            "updated_at": row['updated_at'],
                            "last_sign_in": row['last_sign_in']
                        }
                    }
                
                return {"success": False, "error": "用户不存在"}
                
        except Exception as e:
            logger.error(f"获取用户失败: {e}")
            return {"success": False, "error": str(e)}
    
    def update_user(self, user_id: str, **kwargs) -> Dict[str, Any]:
        """更新用户信息"""
        try:
            allowed_fields = ['full_name', 'phone', 'company', 'position', 'role', 'email_verified']
            updates = {k: v for k, v in kwargs.items() if k in allowed_fields}
            
            if not updates:
                return {"success": False, "error": "没有可更新的字段"}
            
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                set_clause = ', '.join([f"{k} = ?" for k in updates.keys()])
                values = list(updates.values())
                values.append(user_id)
                
                cursor.execute(f'''
                    UPDATE users 
                    SET {set_clause}, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', values)
                
                if cursor.rowcount == 0:
                    return {"success": False, "error": "用户不存在"}
                
                return {"success": True, "message": "用户信息更新成功"}
                
        except Exception as e:
            logger.error(f"更新用户失败: {e}")
            return {"success": False, "error": str(e)}
    
    def update_last_sign_in(self, user_id: str) -> Dict[str, Any]:
        """更新用户最后登录时间"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    UPDATE users 
                    SET last_sign_in = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (user_id,))
                
                return {"success": True}
                
        except Exception as e:
            logger.error(f"更新登录时间失败: {e}")
            return {"success": False, "error": str(e)}
    
    def list_users(self, page: int = 1, page_size: int = 20, role: str = None) -> Dict[str, Any]:
        """列出所有用户"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # 获取总数
                if role:
                    cursor.execute('SELECT COUNT(*) as count FROM users WHERE role = ?', (role,))
                else:
                    cursor.execute('SELECT COUNT(*) as count FROM users')
                total = cursor.fetchone()['count']
                
                # 分页查询
                offset = (page - 1) * page_size
                if role:
                    cursor.execute('''
                        SELECT * FROM users WHERE role = ?
                        ORDER BY created_at DESC 
                        LIMIT ? OFFSET ?
                    ''', (role, page_size, offset))
                else:
                    cursor.execute('''
                        SELECT * FROM users 
                        ORDER BY created_at DESC 
                        LIMIT ? OFFSET ?
                    ''', (page_size, offset))
                
                users = []
                for row in cursor.fetchall():
                    users.append({
                        "id": row['id'],
                        "email": row['email'],
                        "full_name": row['full_name'],
                        "phone": row['phone'],
                        "company": row['company'],
                        "position": row['position'],
                        "role": row['role'],
                        "email_verified": bool(row['email_verified']),
                        "created_at": row['created_at'],
                        "updated_at": row['updated_at'],
                        "last_sign_in": row['last_sign_in']
                    })
                
                return {
                    "success": True,
                    "users": users,
                    "page": page,
                    "page_size": page_size,
                    "total": total,
                    "total_pages": (total + page_size - 1) // page_size
                }
                
        except Exception as e:
            logger.error(f"列出用户失败: {e}")
            return {"success": False, "error": str(e), "users": []}
    
    def delete_user(self, user_id: str) -> Dict[str, Any]:
        """删除用户"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # 删除用户会话
                cursor.execute('DELETE FROM user_sessions WHERE user_id = ?', (user_id,))
                
                # 删除用户
                cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))
                
                if cursor.rowcount == 0:
                    return {"success": False, "error": "用户不存在"}
                
                logger.info(f"用户删除成功: {user_id}")
                return {"success": True, "message": "用户删除成功"}
                
        except Exception as e:
            logger.error(f"删除用户失败: {e}")
            return {"success": False, "error": str(e)}
    
    # ==================== 会话管理 ====================
    
    def create_session(self, user_id: str, token: str, expires_at: datetime) -> Dict[str, Any]:
        """创建用户会话"""
        try:
            session_id = str(uuid.uuid4())
            
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # 清理该用户的过期会话
                cursor.execute('''
                    DELETE FROM user_sessions 
                    WHERE user_id = ? AND expires_at < CURRENT_TIMESTAMP
                ''', (user_id,))
                
                # 创建新会话
                cursor.execute('''
                    INSERT INTO user_sessions (id, user_id, token, expires_at)
                    VALUES (?, ?, ?, ?)
                ''', (session_id, user_id, token, expires_at.isoformat()))
                
                logger.info(f"会话创建成功: {session_id}")
                return {"success": True, "session_id": session_id}
                
        except Exception as e:
            logger.error(f"创建会话失败: {e}")
            return {"success": False, "error": str(e)}
    
    def validate_session(self, token: str) -> Dict[str, Any]:
        """验证会话有效性"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT s.*, u.email, u.full_name, u.role, u.phone, u.company, u.position, u.email_verified
                    FROM user_sessions s
                    JOIN users u ON s.user_id = u.id
                    WHERE s.token = ? AND s.expires_at > CURRENT_TIMESTAMP
                ''', (token,))
                
                row = cursor.fetchone()
                
                if row:
                    return {
                        "success": True,
                        "valid": True,
                        "session": {
                            "id": row['id'],
                            "user_id": row['user_id'],
                            "expires_at": row['expires_at']
                        },
                        "user": {
                            "id": row['user_id'],
                            "email": row['email'],
                            "full_name": row['full_name'],
                            "phone": row['phone'],
                            "company": row['company'],
                            "position": row['position'],
                            "role": row['role'],
                            "email_verified": bool(row['email_verified'])
                        }
                    }
                
                return {"success": True, "valid": False, "error": "会话无效或已过期"}
                
        except Exception as e:
            logger.error(f"验证会话失败: {e}")
            return {"success": False, "valid": False, "error": str(e)}
    
    def delete_session(self, token: str) -> Dict[str, Any]:
        """删除会话（登出）"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('DELETE FROM user_sessions WHERE token = ?', (token,))
                
                return {"success": True, "message": "会话已删除"}
                
        except Exception as e:
            logger.error(f"删除会话失败: {e}")
            return {"success": False, "error": str(e)}
    
    def delete_user_sessions(self, user_id: str) -> Dict[str, Any]:
        """删除用户的所有会话"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('DELETE FROM user_sessions WHERE user_id = ?', (user_id,))
                
                return {"success": True, "message": "所有会话已删除", "count": cursor.rowcount}
                
        except Exception as e:
            logger.error(f"删除用户会话失败: {e}")
            return {"success": False, "error": str(e)}
    
    def cleanup_expired_sessions(self) -> Dict[str, Any]:
        """清理过期会话"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP')
                
                count = cursor.rowcount
                if count > 0:
                    logger.info(f"清理了 {count} 个过期会话")
                
                return {"success": True, "cleaned_count": count}
                
        except Exception as e:
            logger.error(f"清理过期会话失败: {e}")
            return {"success": False, "error": str(e)}
    
    # ==================== 评估记录管理 ====================
    
    def save_assessment(self, assessment_data: Dict[str, Any]) -> Dict[str, Any]:
        """保存评估记录"""
        try:
            assessment_id = assessment_data.get('id') or str(uuid.uuid4())
            
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO assessments 
                    (id, user_id, assessment_type, applicant_name, applicant_email, 
                     applicant_phone, field, resume_text, resume_file_name, resume_file_url,
                     additional_info, overall_score, eligibility_level, gtv_pathway, data, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    assessment_id,
                    assessment_data.get('user_id'),
                    assessment_data.get('assessment_type', 'gtv'),
                    assessment_data.get('applicant_name'),
                    assessment_data.get('applicant_email'),
                    assessment_data.get('applicant_phone'),
                    assessment_data.get('field'),
                    assessment_data.get('resume_text'),
                    assessment_data.get('resume_file_name'),
                    assessment_data.get('resume_file_url'),
                    assessment_data.get('additional_info'),
                    assessment_data.get('overall_score'),
                    assessment_data.get('eligibility_level'),
                    assessment_data.get('gtv_pathway'),
                    json.dumps(assessment_data.get('data', {}), ensure_ascii=False),
                    assessment_data.get('status', 'completed')
                ))
                
                logger.info(f"评估记录保存成功: {assessment_id}")
                return {"success": True, "assessment_id": assessment_id}
                
        except Exception as e:
            logger.error(f"保存评估记录失败: {e}")
            return {"success": False, "error": str(e)}
    
    def get_assessment(self, assessment_id: str) -> Dict[str, Any]:
        """获取评估记录"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('SELECT * FROM assessments WHERE id = ?', (assessment_id,))
                row = cursor.fetchone()
                
                if row:
                    data = dict(row)
                    if data.get('data'):
                        data['data'] = json.loads(data['data'])
                    return {"success": True, "assessment": data}
                
                return {"success": False, "error": "评估记录不存在"}
                
        except Exception as e:
            logger.error(f"获取评估记录失败: {e}")
            return {"success": False, "error": str(e)}
    
    def delete_assessment(self, assessment_id: str) -> Dict[str, Any]:
        """删除评估记录"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # 先删除关联的上传文件记录
                cursor.execute('DELETE FROM uploaded_files WHERE assessment_id = ?', (assessment_id,))
                
                # 删除评估记录
                cursor.execute('DELETE FROM assessments WHERE id = ?', (assessment_id,))
                
                conn.commit()
                
                if cursor.rowcount > 0:
                    logger.info(f"评估记录已删除: {assessment_id}")
                    return {"success": True, "message": "评估记录删除成功"}
                else:
                    return {"success": False, "error": "评估记录不存在"}
                
        except Exception as e:
            logger.error(f"删除评估记录失败: {e}")
            return {"success": False, "error": str(e)}
    
    def list_assessments(self, user_id: str = None, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
        """列出评估记录"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # 获取总数
                if user_id:
                    cursor.execute('SELECT COUNT(*) as count FROM assessments WHERE user_id = ?', (user_id,))
                else:
                    cursor.execute('SELECT COUNT(*) as count FROM assessments')
                total = cursor.fetchone()['count']
                
                # 分页查询
                offset = (page - 1) * page_size
                if user_id:
                    cursor.execute('''
                        SELECT * FROM assessments WHERE user_id = ?
                        ORDER BY created_at DESC 
                        LIMIT ? OFFSET ?
                    ''', (user_id, page_size, offset))
                else:
                    cursor.execute('''
                        SELECT * FROM assessments 
                        ORDER BY created_at DESC 
                        LIMIT ? OFFSET ?
                    ''', (page_size, offset))
                
                assessments = []
                for row in cursor.fetchall():
                    data = dict(row)
                    if data.get('data'):
                        data['data'] = json.loads(data['data'])
                    assessments.append(data)
                
                return {
                    "success": True,
                    "assessments": assessments,
                    "page": page,
                    "page_size": page_size,
                    "total": total,
                    "total_pages": (total + page_size - 1) // page_size
                }
                
        except Exception as e:
            logger.error(f"列出评估记录失败: {e}")
            return {"success": False, "error": str(e), "assessments": []}
    
    def add_sample_cases(self) -> Dict[str, Any]:
        """添加示例案例"""
        sample_cases = [
            {
                "industry": "人工智能/机器学习",
                "experience_level": "高级（5-10年）",
                "pathway": "Exceptional Talent",
                "education": "硕士",
                "achievements": ["开源项目贡献", "技术发明/专利", "学术论文发表"],
                "applicant_profile": {"nationality": "中国", "age_range": "25-30", "current_role": "高级软件工程师"},
                "background_summary": "申请人是一位在AI/ML领域有8年经验的资深工程师。\n- 在知名科技公司担任技术负责人\n- 参与多个开源AI项目，获得2000+ GitHub Stars\n- 发表3篇机器学习相关论文\n- 拥有2项AI相关专利",
                "success_factors": "1. 强大的技术影响力：开源项目被广泛使用\n2. 学术和产业双重背景：论文发表+产品落地\n3. 清晰的职业发展规划：展示了在英国的具体发展计划\n4. 高质量推荐信：来自行业知名人士",
                "key_takeaways": "- 个人陈述重点突出技术创新和社区贡献\n- 推荐信强调国际影响力和领导能力\n- 证据材料包括代码贡献、论文引用、专利证书\n- 展示了对英国AI生态的了解和贡献计划",
                "tags": ["AI", "机器学习", "开源", "高级工程师"],
                "match_keywords": ["人工智能", "机器学习", "软件工程", "开源贡献", "论文发表"],
                "verified": True
            },
            {
                "industry": "金融科技",
                "experience_level": "高级（5-10年）",
                "pathway": "Exceptional Promise",
                "education": "MBA",
                "achievements": ["创业经历", "产品影响力", "领导力/管理"],
                "applicant_profile": {"nationality": "印度", "age_range": "30-35", "current_role": "创业者/CTO"},
                "background_summary": "申请人是一位金融科技创业者，联合创办了一家支付科技公司。\n- 公司获得A轮融资500万美元\n- 产品服务超过10万用户\n- 团队规模从2人发展到30人",
                "success_factors": "1. 创业成功经历：融资和用户增长\n2. 领导力证明：团队扩张和管理\n3. 行业影响力：被行业媒体报道\n4. 明确的英国发展计划",
                "key_takeaways": "- 强调创业成就和商业影响\n- 推荐信来自投资人和行业顾问\n- 展示产品数据和用户反馈\n- 商业计划书清晰可行",
                "tags": ["金融科技", "创业", "支付", "CTO"],
                "match_keywords": ["fintech", "创业者", "融资", "产品管理", "团队管理"],
                "verified": True
            },
            {
                "industry": "数据科学/大数据",
                "experience_level": "中级（3-5年）",
                "pathway": "Exceptional Promise",
                "education": "硕士",
                "achievements": ["学术论文发表", "开源项目贡献", "行业奖项"],
                "applicant_profile": {"nationality": "中国", "age_range": "25-30", "current_role": "数据科学家"},
                "background_summary": "申请人是数据科学领域的新锐人才。\n- 发表2篇顶级会议论文（NeurIPS, ICML）\n- Kaggle Master称号\n- 参与多个开源数据科学项目",
                "success_factors": "1. 学术成就突出：顶会论文\n2. 实践能力强：Kaggle比赛成绩\n3. 社区活跃：开源贡献和技术分享\n4. 发展潜力：年轻但成就显著",
                "key_takeaways": "- Promise路径适合早期职业阶段\n- 重点展示潜力和发展轨迹\n- 学术成就+实践能力结合\n- 推荐信强调成长速度",
                "tags": ["数据科学", "机器学习", "Kaggle", "学术"],
                "match_keywords": ["数据科学", "机器学习", "论文", "Kaggle", "研究"],
                "verified": True
            }
        ]
        
        results = []
        for case_data in sample_cases:
            result = self.add_success_case(case_data)
            results.append(result)
        
        added_count = sum(1 for r in results if r.get("success"))
        return {
            "success": True,
            "added_count": added_count,
            "results": results
        }
    
    # ==================== 文件上传记录管理（合并自 assessment_database.py）====================
    
    def save_uploaded_file(
        self,
        file_name: str,
        file_type: str = None,
        file_size: int = 0,
        storage_type: str = "local",
        local_path: str = None,
        object_bucket: str = None,
        object_key: str = None,
        object_url: str = None,
        category: str = None,
        description: str = None,
        assessment_id: str = None,
        project_id: str = None,
        user_id: str = None
    ) -> Dict[str, Any]:
        """
        保存上传文件记录
        
        Args:
            file_name: 文件名
            file_type: 文件类型
            file_size: 文件大小
            storage_type: 存储类型 (local/minio/s3)
            local_path: 本地路径
            object_bucket: 对象存储 bucket 名称
            object_key: 对象存储 key
            object_url: 对象存储访问 URL
            category: 文件分类
            description: 描述
            assessment_id: 关联的评估 ID
            project_id: 关联的项目 ID
            user_id: 关联的用户 ID
        
        Returns:
            保存结果
        """
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO uploaded_files (
                        assessment_id, project_id, user_id, file_name, file_type, file_size,
                        storage_type, local_path, object_bucket, object_key, object_url,
                        category, description
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    assessment_id, project_id, user_id, file_name, file_type, file_size,
                    storage_type, local_path, object_bucket, object_key, object_url,
                    category, description
                ))
                
                file_id = cursor.lastrowid
                conn.commit()
                
                logger.info(f"文件记录保存成功: {file_name} (id={file_id})")
                return {
                    "success": True,
                    "file_id": file_id,
                    "message": "文件记录保存成功"
                }
                
        except Exception as e:
            logger.error(f"保存文件记录失败: {e}")
            return {"success": False, "error": str(e)}
    
    def get_uploaded_files(
        self,
        assessment_id: str = None,
        project_id: str = None,
        user_id: str = None,
        category: str = None
    ) -> List[Dict[str, Any]]:
        """
        获取上传的文件列表
        
        Args:
            assessment_id: 评估 ID（可选）
            project_id: 项目 ID（可选）
            user_id: 用户 ID（可选）
            category: 文件分类（可选）
        
        Returns:
            文件列表
        """
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                query = 'SELECT * FROM uploaded_files WHERE 1=1'
                params = []
                
                if assessment_id:
                    query += ' AND assessment_id = ?'
                    params.append(assessment_id)
                
                if project_id:
                    query += ' AND project_id = ?'
                    params.append(project_id)
                
                if user_id:
                    query += ' AND user_id = ?'
                    params.append(user_id)
                
                if category:
                    query += ' AND category = ?'
                    params.append(category)
                
                query += ' ORDER BY uploaded_at DESC'
                
                cursor.execute(query, params)
                rows = cursor.fetchall()
                
                return [dict(row) for row in rows]
                
        except Exception as e:
            logger.error(f"获取文件列表失败: {e}")
            return []
    
    def get_uploaded_file(self, file_id: int) -> Optional[Dict[str, Any]]:
        """获取单个文件记录"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute('SELECT * FROM uploaded_files WHERE id = ?', (file_id,))
                row = cursor.fetchone()
                return dict(row) if row else None
                
        except Exception as e:
            logger.error(f"获取文件记录失败: {e}")
            return None
    
    def delete_uploaded_file(self, file_id: int) -> Dict[str, Any]:
        """删除文件记录"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute('DELETE FROM uploaded_files WHERE id = ?', (file_id,))
                conn.commit()
                
                if cursor.rowcount > 0:
                    logger.info(f"文件记录删除成功: id={file_id}")
                    return {"success": True, "message": "文件记录删除成功"}
                else:
                    return {"success": False, "error": "文件记录不存在"}
                
        except Exception as e:
            logger.error(f"删除文件记录失败: {e}")
            return {"success": False, "error": str(e)}
    
    # ==================== 兼容 assessment_database.py 的评估保存方法 ====================
    
    def save_assessment_legacy(self, assessment_data: Dict[str, Any], assessment_id: str = None) -> str:
        """
        保存评估结果（兼容旧版 assessment_database.py 的接口）
        
        Args:
            assessment_data: 评估数据（旧格式）
            assessment_id: 评估 ID（可选，自动生成）
        
        Returns:
            评估 ID
        """
        try:
            if not assessment_id:
                assessment_id = f"GTV_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            # 转换旧格式到新格式
            applicant_info = assessment_data.get('applicantInfo', {})
            gtv_pathway = assessment_data.get('gtvPathway', {})
            estimated_budget = assessment_data.get('estimatedBudget', {})
            
            new_data = {
                'id': assessment_id,
                'assessment_type': 'gtv',
                'applicant_name': applicant_info.get('name', ''),
                'applicant_email': applicant_info.get('email', ''),
                'field': applicant_info.get('field', ''),
                'current_position': applicant_info.get('currentPosition', ''),
                'company': applicant_info.get('company', ''),
                'years_of_experience': applicant_info.get('yearsOfExperience', 0),
                'overall_score': assessment_data.get('overallScore', 0),
                'eligibility_level': gtv_pathway.get('eligibilityLevel', ''),
                'gtv_pathway': gtv_pathway.get('recommendedRoute', ''),
                'pathway_analysis': gtv_pathway.get('analysis', ''),
                'final_recommendation': assessment_data.get('recommendation', ''),
                'timeline': assessment_data.get('timeline', ''),
                'estimated_budget_min': estimated_budget.get('min', 0),
                'estimated_budget_max': estimated_budget.get('max', 0),
                'estimated_budget_currency': estimated_budget.get('currency', 'GBP'),
                'data': assessment_data,
                'status': 'completed'
            }
            
            result = self.save_assessment(new_data)
            if result.get('success'):
                return assessment_id
            else:
                raise Exception(result.get('error', '保存失败'))
                
        except Exception as e:
            logger.error(f"保存评估结果到数据库失败: {e}")
            raise
    
    def get_assessment_legacy(self, assessment_id: str) -> Optional[Dict[str, Any]]:
        """
        获取评估结果（兼容旧版 assessment_database.py 的接口）
        
        Args:
            assessment_id: 评估 ID
        
        Returns:
            评估数据（旧格式）
        """
        try:
            result = self.get_assessment(assessment_id)
            if not result.get('success') or not result.get('assessment'):
                return None
            
            assessment = result['assessment']
            data = assessment.get('data')
            
            # 如果有原始数据，直接返回
            if data:
                if isinstance(data, str):
                    try:
                        data = json.loads(data)
                    except:
                        data = {}
                data['assessment_id'] = assessment_id
                data['created_at'] = assessment.get('created_at')
                data['updated_at'] = assessment.get('updated_at')
                return data
            
            # 否则从字段构建
            return {
                'assessment_id': assessment_id,
                'applicantInfo': {
                    'name': assessment.get('applicant_name', ''),
                    'email': assessment.get('applicant_email', ''),
                    'field': assessment.get('field', ''),
                    'currentPosition': assessment.get('current_position', ''),
                    'company': assessment.get('company', ''),
                    'yearsOfExperience': assessment.get('years_of_experience', 0)
                },
                'overallScore': assessment.get('overall_score', 0),
                'gtvPathway': {
                    'recommendedRoute': assessment.get('gtv_pathway', ''),
                    'eligibilityLevel': assessment.get('eligibility_level', ''),
                    'analysis': assessment.get('pathway_analysis', '')
                },
                'recommendation': assessment.get('final_recommendation', ''),
                'timeline': assessment.get('timeline', ''),
                'estimatedBudget': {
                    'min': assessment.get('estimated_budget_min', 0),
                    'max': assessment.get('estimated_budget_max', 0),
                    'currency': assessment.get('estimated_budget_currency', 'GBP')
                },
                'created_at': assessment.get('created_at'),
                'updated_at': assessment.get('updated_at')
            }
                
        except Exception as e:
            logger.error(f"从数据库获取评估结果失败: {e}")
            return None
    
    def list_assessments_legacy(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        列出评估结果（兼容旧版接口）
        """
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT id, applicant_name, field, overall_score, 
                           gtv_pathway, created_at, updated_at
                    FROM assessments 
                    ORDER BY created_at DESC 
                    LIMIT ?
                ''', (limit,))
                
                rows = cursor.fetchall()
                return [
                    {
                        'assessment_id': row['id'],
                        'applicant_name': row['applicant_name'],
                        'field': row['field'],
                        'overall_score': row['overall_score'],
                        'gtv_pathway': row['gtv_pathway'],
                        'created_at': row['created_at'],
                        'updated_at': row['updated_at']
                    }
                    for row in rows
                ]
                
        except Exception as e:
            logger.error(f"列出评估结果失败: {e}")
            return []


# 测试代码
if __name__ == "__main__":
    db = CopywritingDatabase("test_copywriting.db")
    
    # 测试添加示例案例
    result = db.add_sample_cases()
    print(f"添加示例案例: {result['added_count']} 个")
    
    # 测试创建项目
    project_result = db.create_project(
        project_id="TEST001",
        case_id="case-001",
        client_name="测试用户",
        visa_type="GTV",
        folder_name="test_folder",
        folder_path="/tmp/test"
    )
    print(f"创建项目: {project_result}")
    
    # 测试获取统计
    stats = db.get_case_statistics()
    print(f"案例统计: {stats}")
