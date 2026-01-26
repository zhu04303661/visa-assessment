#!/usr/bin/env python3
"""
Supabase 客户端集成模块
提供用户管理、评估记录、聊天历史、文件上传等功能
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

# 加载环境变量
load_dotenv('.env.local')

# 导入 Supabase
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    logging.warning("Supabase 库未安装，部分功能将不可用。请运行: pip install supabase")

from utils.logger_config import setup_module_logger
logger = setup_module_logger("supabase_client", os.getenv("LOG_LEVEL", "INFO"))


class SupabaseManager:
    """Supabase 数据库管理器"""
    
    def __init__(self):
        """初始化 Supabase 客户端"""
        if not SUPABASE_AVAILABLE:
            logger.warning("Supabase 不可用，将使用降级模式")
            self.client = None
            self.enabled = False
            return
        
        # 从环境变量获取配置
        self.supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        self.supabase_key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        
        if not self.supabase_url or not self.supabase_key:
            logger.warning("Supabase 配置未找到，将使用降级模式")
            self.client = None
            self.enabled = False
            return
        
        try:
            self.client: Client = create_client(self.supabase_url, self.supabase_key)
            self.enabled = True
            logger.info("✅ Supabase 客户端初始化成功")
        except Exception as e:
            logger.error(f"❌ Supabase 客户端初始化失败: {e}")
            self.client = None
            self.enabled = False
    
    def is_enabled(self) -> bool:
        """检查 Supabase 是否可用"""
        return self.enabled and self.client is not None
    
    # ==================== 用户管理 ====================
    
    async def create_user(self, email: str, password: str, user_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        创建新用户
        
        Args:
            email: 用户邮箱
            password: 用户密码
            user_data: 额外的用户数据
        
        Returns:
            用户信息字典
        """
        if not self.is_enabled():
            return {"error": "Supabase 未启用"}
        
        try:
            # 使用 Supabase Auth 创建用户
            response = self.client.auth.sign_up({
                "email": email,
                "password": password,
                "options": {
                    "data": user_data or {}
                }
            })
            
            logger.info(f"✅ 用户创建成功: {email}")
            return {
                "success": True,
                "user": response.user,
                "session": response.session
            }
        except Exception as e:
            logger.error(f"❌ 用户创建失败: {e}")
            return {"error": str(e)}
    
    async def login_user(self, email: str, password: str) -> Dict[str, Any]:
        """
        用户登录
        
        Args:
            email: 用户邮箱
            password: 用户密码
        
        Returns:
            登录会话信息
        """
        if not self.is_enabled():
            return {"error": "Supabase 未启用"}
        
        try:
            response = self.client.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            
            logger.info(f"✅ 用户登录成功: {email}")
            return {
                "success": True,
                "user": response.user,
                "session": response.session
            }
        except Exception as e:
            logger.error(f"❌ 用户登录失败: {e}")
            return {"error": str(e)}
    
    async def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """获取用户信息"""
        if not self.is_enabled():
            return None
        
        try:
            response = self.client.auth.get_user(user_id)
            return response.user
        except Exception as e:
            logger.error(f"❌ 获取用户信息失败: {e}")
            return None
    
    # ==================== 评估记录管理 ====================
    
    async def save_assessment(self, user_id: str, assessment_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        保存评估记录
        
        Args:
            user_id: 用户ID
            assessment_data: 评估数据
        
        Returns:
            保存结果
        """
        if not self.is_enabled():
            return {"error": "Supabase 未启用"}
        
        try:
            record = {
                "user_id": user_id,
                "assessment_type": "gtv",
                "data": json.dumps(assessment_data) if isinstance(assessment_data, dict) else assessment_data,
                "created_at": datetime.utcnow().isoformat(),
                "status": "completed"
            }
            
            response = self.client.table("assessments").insert(record).execute()
            
            logger.info(f"✅ 评估记录保存成功: {user_id}")
            return {
                "success": True,
                "data": response.data
            }
        except Exception as e:
            logger.error(f"❌ 评估记录保存失败: {e}")
            return {"error": str(e)}
    
    async def get_user_assessments(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        获取用户的评估记录
        
        Args:
            user_id: 用户ID
            limit: 返回记录数量
        
        Returns:
            评估记录列表
        """
        if not self.is_enabled():
            return []
        
        try:
            response = self.client.table("assessments") \
                .select("*") \
                .eq("user_id", user_id) \
                .order("created_at", desc=True) \
                .limit(limit) \
                .execute()
            
            return response.data
        except Exception as e:
            logger.error(f"❌ 获取评估记录失败: {e}")
            return []
    
    async def get_assessment_by_id(self, assessment_id: str) -> Optional[Dict[str, Any]]:
        """获取单个评估记录"""
        if not self.is_enabled():
            return None
        
        try:
            response = self.client.table("assessments") \
                .select("*") \
                .eq("id", assessment_id) \
                .single() \
                .execute()
            
            return response.data
        except Exception as e:
            logger.error(f"❌ 获取评估记录失败: {e}")
            return None
    
    # ==================== 聊天记录管理 ====================
    
    async def save_chat_message(
        self, 
        user_id: str, 
        session_id: str,
        role: str,
        content: str,
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        保存聊天消息
        
        Args:
            user_id: 用户ID
            session_id: 会话ID
            role: 消息角色 (user/assistant)
            content: 消息内容
            metadata: 额外元数据
        
        Returns:
            保存结果
        """
        if not self.is_enabled():
            return {"error": "Supabase 未启用"}
        
        try:
            record = {
                "user_id": user_id,
                "session_id": session_id,
                "role": role,
                "content": content,
                "metadata": json.dumps(metadata) if metadata else None,
                "created_at": datetime.utcnow().isoformat()
            }
            
            response = self.client.table("chat_messages").insert(record).execute()
            
            return {
                "success": True,
                "data": response.data
            }
        except Exception as e:
            logger.error(f"❌ 聊天消息保存失败: {e}")
            return {"error": str(e)}
    
    async def get_chat_history(
        self, 
        user_id: str, 
        session_id: str = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        获取聊天历史
        
        Args:
            user_id: 用户ID
            session_id: 会话ID（可选）
            limit: 返回消息数量
        
        Returns:
            聊天消息列表
        """
        if not self.is_enabled():
            return []
        
        try:
            query = self.client.table("chat_messages") \
                .select("*") \
                .eq("user_id", user_id)
            
            if session_id:
                query = query.eq("session_id", session_id)
            
            response = query.order("created_at", desc=False) \
                .limit(limit) \
                .execute()
            
            return response.data
        except Exception as e:
            logger.error(f"❌ 获取聊天历史失败: {e}")
            return []
    
    async def get_user_sessions(self, user_id: str) -> List[Dict[str, Any]]:
        """获取用户的所有会话"""
        if not self.is_enabled():
            return []
        
        try:
            response = self.client.table("chat_messages") \
                .select("session_id, created_at") \
                .eq("user_id", user_id) \
                .order("created_at", desc=True) \
                .execute()
            
            # 去重并按会话分组
            sessions = {}
            for msg in response.data:
                session_id = msg["session_id"]
                if session_id not in sessions:
                    sessions[session_id] = {
                        "session_id": session_id,
                        "last_message_at": msg["created_at"]
                    }
            
            return list(sessions.values())
        except Exception as e:
            logger.error(f"❌ 获取用户会话失败: {e}")
            return []
    
    # ==================== 文件上传管理 ====================
    
    async def upload_file(
        self, 
        user_id: str,
        file_path: str,
        bucket_name: str = "resumes",
        file_type: str = "resume"
    ) -> Dict[str, Any]:
        """
        上传文件到 Supabase Storage
        
        Args:
            user_id: 用户ID
            file_path: 本地文件路径
            bucket_name: 存储桶名称
            file_type: 文件类型
        
        Returns:
            上传结果
        """
        if not self.is_enabled():
            return {"error": "Supabase 未启用"}
        
        try:
            # 读取文件
            with open(file_path, 'rb') as f:
                file_content = f.read()
            
            # 生成文件名
            file_name = f"{user_id}/{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{os.path.basename(file_path)}"
            
            # 上传到 Supabase Storage
            response = self.client.storage.from_(bucket_name).upload(
                file_name,
                file_content
            )
            
            # 获取公共URL
            public_url = self.client.storage.from_(bucket_name).get_public_url(file_name)
            
            # 保存文件记录到数据库
            file_record = {
                "user_id": user_id,
                "file_name": os.path.basename(file_path),
                "file_path": file_name,
                "file_type": file_type,
                "file_url": public_url,
                "bucket_name": bucket_name,
                "uploaded_at": datetime.utcnow().isoformat()
            }
            
            self.client.table("uploaded_files").insert(file_record).execute()
            
            logger.info(f"✅ 文件上传成功: {file_name}")
            return {
                "success": True,
                "file_path": file_name,
                "file_url": public_url
            }
        except Exception as e:
            logger.error(f"❌ 文件上传失败: {e}")
            return {"error": str(e)}
    
    async def get_user_files(self, user_id: str, file_type: str = None) -> List[Dict[str, Any]]:
        """获取用户上传的文件列表"""
        if not self.is_enabled():
            return []
        
        try:
            query = self.client.table("uploaded_files") \
                .select("*") \
                .eq("user_id", user_id)
            
            if file_type:
                query = query.eq("file_type", file_type)
            
            response = query.order("uploaded_at", desc=True).execute()
            
            return response.data
        except Exception as e:
            logger.error(f"❌ 获取用户文件失败: {e}")
            return []
    
    # ==================== 数据库初始化 ====================
    
    def init_database_schema(self) -> Dict[str, Any]:
        """
        初始化数据库表结构（通过 SQL）
        注意：这需要在 Supabase Dashboard 的 SQL Editor 中执行
        
        返回创建表的 SQL 语句
        """
        sql_statements = """
-- 用户配置表（扩展 auth.users）
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    full_name TEXT,
    phone TEXT,
    company TEXT,
    position TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 评估记录表
CREATE TABLE IF NOT EXISTS assessments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    assessment_type TEXT NOT NULL,
    data JSONB NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 聊天消息表
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 上传文件表
CREATE TABLE IF NOT EXISTS uploaded_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_url TEXT NOT NULL,
    bucket_name TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_assessments_user_id ON assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_assessments_created_at ON assessments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_id ON uploaded_files(user_id);

-- 启用行级安全策略 (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

-- 用户只能访问自己的数据
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own assessments" ON assessments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assessments" ON assessments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own chat messages" ON chat_messages
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat messages" ON chat_messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own files" ON uploaded_files
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own files" ON uploaded_files
    FOR INSERT WITH CHECK (auth.uid() = user_id);
"""
        
        return {
            "sql": sql_statements,
            "note": "请在 Supabase Dashboard 的 SQL Editor 中执行这些语句"
        }


# 创建全局实例
supabase_manager = SupabaseManager()


# 便捷函数
def get_supabase_manager() -> SupabaseManager:
    """获取 Supabase 管理器实例"""
    return supabase_manager

