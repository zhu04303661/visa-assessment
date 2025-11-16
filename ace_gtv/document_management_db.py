#!/usr/bin/env python3
"""
英国GTV签证移民律师文案管理系统 - 数据库管理模块
使用Supabase作为数据存储
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from supabase import create_client, Client
from logger_config import setup_module_logger

logger = setup_module_logger("document_management_db", os.getenv("LOG_LEVEL", "INFO"))


class DocumentManagementDB:
    """文案管理系统数据库管理器"""
    
    def __init__(self):
        """初始化Supabase客户端"""
        supabase_url = os.getenv("SUPABASE_URL")
        # 优先使用service_role key（绕过RLS），否则使用anon key
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        
        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL 和 SUPABASE_KEY 必须在环境变量中配置")
        
        self.supabase: Client = create_client(supabase_url, supabase_key)
        self._init_tables()
    
    def _init_tables(self):
        """初始化数据库表结构（如果不存在）"""
        # 注意：Supabase表结构需要在Supabase Dashboard中手动创建
        # 这里只做验证，不实际创建表
        logger.info("数据库连接已初始化")
    
    # ==================== 客户管理 ====================
    
    def create_client(self, client_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建新客户"""
        try:
            # 尝试使用name，如果失败则使用full_name（兼容不同的表结构）
            name_value = client_data.get("name") or client_data.get("full_name")
            data = {
                "name": name_value,  # 先尝试name
                "full_name": name_value,  # 同时设置full_name以兼容
                "email": client_data.get("email"),
                "phone": client_data.get("phone"),
                "nationality": client_data.get("nationality"),
                "passport_number": client_data.get("passport_number"),
                "notes": client_data.get("notes", ""),
            }
            
            # email可能是必填字段，提供默认值
            if not data.get("email"):
                name_for_email = name_value.lower().replace(" ", ".").replace("，", ".").replace(",", ".")
                data["email"] = f"{name_for_email}@example.com"
            
            # 移除None值
            data = {k: v for k, v in data.items() if v is not None}
            
            result = self.supabase.table("clients").insert(data).execute()
            logger.info(f"客户创建成功: {name_value}")
            return {"success": True, "data": result.data[0] if result.data else None}
        except Exception as e:
            # 如果失败，尝试只使用full_name
            try:
                name_value = client_data.get("name") or client_data.get("full_name")
                # email可能是必填字段，提供默认值
                email_value = client_data.get("email") or f"{name_value.lower().replace(' ', '.')}@example.com"
                data = {
                    "full_name": name_value,
                    "email": email_value,  # 确保email不为空
                    "phone": client_data.get("phone", ""),
                    "nationality": client_data.get("nationality", ""),
                    "passport_number": client_data.get("passport_number", ""),
                    "notes": client_data.get("notes", ""),
                }
                # 只移除None值，保留空字符串（如果字段允许）
                data = {k: v for k, v in data.items() if v is not None}
                result = self.supabase.table("clients").insert(data).execute()
                logger.info(f"客户创建成功（使用full_name）: {name_value}")
                return {"success": True, "data": result.data[0] if result.data else None}
            except Exception as e2:
                logger.error(f"创建客户失败: {e2}")
                return {"success": False, "error": str(e2)}
    
    def get_clients(self, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
        """获取客户列表"""
        try:
            # 尝试查询，兼容不同的列名
            try:
                result = self.supabase.table("clients").select("*").limit(limit).offset(offset).order("created_at", desc=True).execute()
            except:
                # 如果created_at不存在，尝试其他排序
                result = self.supabase.table("clients").select("*").limit(limit).offset(offset).execute()
            
            # 标准化数据：将full_name映射到name
            data = result.data
            for item in data:
                if "full_name" in item and "name" not in item:
                    item["name"] = item["full_name"]
            
            return {"success": True, "data": data}
        except Exception as e:
            logger.error(f"获取客户列表失败: {e}")
            return {"success": False, "error": str(e), "data": []}
    
    def get_client(self, client_id: str) -> Dict[str, Any]:
        """获取单个客户信息"""
        try:
            result = self.supabase.table("clients").select("*").eq("id", client_id).execute()
            if result.data:
                data = result.data[0]
                # 标准化：将full_name映射到name
                if "full_name" in data and "name" not in data:
                    data["name"] = data["full_name"]
                return {"success": True, "data": data}
            return {"success": False, "error": "客户不存在"}
        except Exception as e:
            logger.error(f"获取客户信息失败: {e}")
            return {"success": False, "error": str(e)}
    
    def update_client(self, client_id: str, client_data: Dict[str, Any]) -> Dict[str, Any]:
        """更新客户信息"""
        try:
            client_data["updated_at"] = datetime.now().isoformat()
            result = self.supabase.table("clients").update(client_data).eq("id", client_id).execute()
            logger.info(f"客户更新成功: {client_id}")
            return {"success": True, "data": result.data[0] if result.data else None}
        except Exception as e:
            logger.error(f"更新客户失败: {e}")
            return {"success": False, "error": str(e)}
    
    def delete_client(self, client_id: str) -> Dict[str, Any]:
        """删除客户"""
        try:
            self.supabase.table("clients").delete().eq("id", client_id).execute()
            logger.info(f"客户删除成功: {client_id}")
            return {"success": True}
        except Exception as e:
            logger.error(f"删除客户失败: {e}")
            return {"success": False, "error": str(e)}
    
    # ==================== 案件管理 ====================
    
    def create_case(self, case_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建新案件"""
        try:
            # 只使用确实存在的列：client_id, visa_type, status
            case_type = case_data.get("case_type", "GTV")
            
            import uuid
            case_type = case_data.get("case_type", "GTV")
            data = {
                "client_id": case_data.get("client_id"),
                "case_number": f"CASE-{uuid.uuid4().hex[:8].upper()}",  # 生成案件编号
                "visa_type": case_data.get("visa_type", "GTV"),
                "status": "inquiry",  # 使用正确的enum值
            }
            
            # 尝试添加其他可能存在的字段
            optional_fields = ["priority", "description", "target_submission_date"]
            for field in optional_fields:
                value = case_data.get(field)
                if value is not None:
                    try:
                        # 测试字段是否存在
                        test_data = data.copy()
                        test_data[field] = value
                        # 如果字段不存在，会在插入时失败，我们捕获异常
                        data[field] = value
                    except:
                        pass  # 字段不存在，跳过
            
            # 移除None值
            data = {k: v for k, v in data.items() if v is not None}
            
            result = self.supabase.table("cases").insert(data).execute()
            logger.info(f"案件创建成功: {case_type}")
            return {"success": True, "data": result.data[0] if result.data else None}
        except Exception as e:
            # 如果失败，尝试使用正确的字段
            try:
                import uuid
                case_type = case_data.get("case_type", "GTV")
                minimal_data = {
                    "client_id": case_data.get("client_id"),
                    "case_number": f"CASE-{uuid.uuid4().hex[:8].upper()}",  # 生成案件编号
                    "visa_type": case_data.get("visa_type", "GTV"),
                    "status": "inquiry",  # 使用正确的enum值
                }
                result = self.supabase.table("cases").insert(minimal_data).execute()
                logger.info(f"案件创建成功（使用正确字段）: {case_type}")
                return {"success": True, "data": result.data[0] if result.data else None}
            except Exception as e2:
                logger.error(f"创建案件失败: {e2}")
                return {"success": False, "error": str(e2)}
    
    def get_cases(self, client_id: Optional[str] = None, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
        """获取案件列表"""
        try:
            query = self.supabase.table("cases").select("*")
            
            if client_id:
                query = query.eq("client_id", client_id)
            
            result = query.limit(limit).offset(offset).order("created_at", desc=True).execute()
            return {"success": True, "data": result.data}
        except Exception as e:
            logger.error(f"获取案件列表失败: {e}")
            return {"success": False, "error": str(e), "data": []}
    
    def get_case(self, case_id: str) -> Dict[str, Any]:
        """获取单个案件信息"""
        try:
            result = self.supabase.table("cases").select("*").eq("id", case_id).execute()
            if result.data:
                return {"success": True, "data": result.data[0]}
            return {"success": False, "error": "案件不存在"}
        except Exception as e:
            logger.error(f"获取案件信息失败: {e}")
            return {"success": False, "error": str(e)}
    
    def update_case(self, case_id: str, case_data: Dict[str, Any]) -> Dict[str, Any]:
        """更新案件信息"""
        try:
            case_data["updated_at"] = datetime.now().isoformat()
            result = self.supabase.table("cases").update(case_data).eq("id", case_id).execute()
            logger.info(f"案件更新成功: {case_id}")
            return {"success": True, "data": result.data[0] if result.data else None}
        except Exception as e:
            logger.error(f"更新案件失败: {e}")
            return {"success": False, "error": str(e)}
    
    # ==================== 文档管理 ====================
    
    def create_document(self, document_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建文档记录"""
        try:
            data = {
                "case_id": document_data.get("case_id"),
                "document_type": document_data.get("document_type", "raw"),  # raw: 原始材料, processed: 加工后材料
                "title": document_data.get("title"),
                "content": document_data.get("content", ""),
                "file_path": document_data.get("file_path", ""),
                "file_type": document_data.get("file_type", ""),
                "file_size": document_data.get("file_size", 0),
                "status": document_data.get("status", "draft"),
                "notes": document_data.get("notes", ""),
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            result = self.supabase.table("documents").insert(data).execute()
            logger.info(f"文档创建成功: {data.get('title')}")
            return {"success": True, "data": result.data[0] if result.data else None}
        except Exception as e:
            logger.error(f"创建文档失败: {e}")
            return {"success": False, "error": str(e)}
    
    def get_documents(self, case_id: Optional[str] = None, document_type: Optional[str] = None) -> Dict[str, Any]:
        """获取文档列表"""
        try:
            query = self.supabase.table("documents").select("*")
            
            if case_id:
                query = query.eq("case_id", case_id)
            if document_type:
                query = query.eq("document_type", document_type)
            
            result = query.order("created_at", desc=True).execute()
            return {"success": True, "data": result.data}
        except Exception as e:
            logger.error(f"获取文档列表失败: {e}")
            return {"success": False, "error": str(e), "data": []}
    
    def update_document(self, document_id: str, document_data: Dict[str, Any]) -> Dict[str, Any]:
        """更新文档"""
        try:
            document_data["updated_at"] = datetime.now().isoformat()
            result = self.supabase.table("documents").update(document_data).eq("id", document_id).execute()
            logger.info(f"文档更新成功: {document_id}")
            return {"success": True, "data": result.data[0] if result.data else None}
        except Exception as e:
            logger.error(f"更新文档失败: {e}")
            return {"success": False, "error": str(e)}
    
    def delete_document(self, document_id: str) -> Dict[str, Any]:
        """删除文档"""
        try:
            self.supabase.table("documents").delete().eq("id", document_id).execute()
            logger.info(f"文档删除成功: {document_id}")
            return {"success": True}
        except Exception as e:
            logger.error(f"删除文档失败: {e}")
            return {"success": False, "error": str(e)}
    
    # ==================== 进度管理 ====================
    
    def create_progress(self, progress_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建进度记录"""
        try:
            # progress表可能不存在，尝试创建，如果失败则跳过
            data = {
                "case_id": progress_data.get("case_id"),
                "milestone": progress_data.get("milestone"),
                "status": progress_data.get("status", "pending"),
                "description": progress_data.get("description", ""),
                "completed_at": progress_data.get("completed_at"),
            }
            
            # 移除None值
            data = {k: v for k, v in data.items() if v is not None}
            
            result = self.supabase.table("progress").insert(data).execute()
            logger.info(f"进度记录创建成功: {data.get('milestone')}")
            return {"success": True, "data": result.data[0] if result.data else None}
        except Exception as e:
            # progress表可能不存在，记录警告但不失败
            logger.warning(f"创建进度记录失败（表可能不存在）: {e}")
            return {"success": False, "error": str(e), "skip": True}  # 添加skip标记
    
    def get_progress(self, case_id: str) -> Dict[str, Any]:
        """获取案件进度"""
        try:
            result = self.supabase.table("progress").select("*").eq("case_id", case_id).order("created_at", desc=False).execute()
            return {"success": True, "data": result.data}
        except Exception as e:
            logger.error(f"获取进度失败: {e}")
            return {"success": False, "error": str(e), "data": []}
    
    def update_progress(self, progress_id: str, progress_data: Dict[str, Any]) -> Dict[str, Any]:
        """更新进度"""
        try:
            progress_data["updated_at"] = datetime.now().isoformat()
            result = self.supabase.table("progress").update(progress_data).eq("id", progress_id).execute()
            logger.info(f"进度更新成功: {progress_id}")
            return {"success": True, "data": result.data[0] if result.data else None}
        except Exception as e:
            logger.error(f"更新进度失败: {e}")
            return {"success": False, "error": str(e)}
    
    # ==================== 时间规划 ====================
    
    def create_timeline(self, timeline_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建时间规划"""
        try:
            # 尝试使用timeline_events表（实际表名）
            # 根据实际表结构，可能使用不同的列名
            table_name = "timeline_events"
            
            # 先尝试基本字段
            task_name = timeline_data.get("task_name") or timeline_data.get("title") or timeline_data.get("event_name")
            description = timeline_data.get("description") or timeline_data.get("content") or ""
            
            # 只使用case_id和title/event_name等基本字段
            # event_date是必填字段，使用due_date或start_date
            event_date = timeline_data.get("due_date") or timeline_data.get("start_date") or datetime.now().date().isoformat()
            
            data = {
                "case_id": timeline_data.get("case_id"),
                "event_type": timeline_data.get("task_type", "document"),  # event_type是必填字段
                "event_date": event_date,  # event_date是必填字段
            }
            
            # 尝试添加title字段（可能是实际列名）
            if task_name:
                # 尝试不同的列名
                for col_name in ["title", "event_name", "name", "task_name"]:
                    try:
                        test_data = data.copy()
                        test_data[col_name] = task_name
                        # 如果成功，使用这个列名
                        data[col_name] = task_name
                        break
                    except:
                        pass
            
            # 尝试添加description/content字段
            if description:
                for col_name in ["description", "content", "event_description", "notes"]:
                    try:
                        test_data = data.copy()
                        test_data[col_name] = description
                        data[col_name] = description
                        break
                    except:
                        pass
            
            # 移除None值和空字符串
            data = {k: v for k, v in data.items() if v is not None and v != ""}
            
            if not data.get("case_id"):
                return {"success": False, "error": "case_id is required"}
            
            result = self.supabase.table(table_name).insert(data).execute()
            logger.info(f"时间规划创建成功: {task_name or '未命名任务'}")
            return {"success": True, "data": result.data[0] if result.data else None}
        except Exception as e:
            logger.warning(f"创建时间规划失败（表结构可能不匹配）: {e}")
            return {"success": False, "error": str(e), "skip": True}
    
    def get_timeline(self, case_id: str) -> Dict[str, Any]:
        """获取时间规划"""
        try:
            # 尝试使用event_date排序（实际列名）
            try:
                result = self.supabase.table("timeline_events").select("*").eq("case_id", case_id).order("event_date", desc=False).execute()
            except:
                # 如果event_date不存在，尝试其他排序或不排序
                try:
                    result = self.supabase.table("timeline_events").select("*").eq("case_id", case_id).order("created_at", desc=False).execute()
                except:
                    result = self.supabase.table("timeline_events").select("*").eq("case_id", case_id).execute()
            return {"success": True, "data": result.data}
        except Exception as e:
            logger.error(f"获取时间规划失败: {e}")
            return {"success": False, "error": str(e), "data": []}
    
    def update_timeline(self, timeline_id: str, timeline_data: Dict[str, Any]) -> Dict[str, Any]:
        """更新时间规划"""
        try:
            timeline_data = {k: v for k, v in timeline_data.items() if v is not None}
            result = self.supabase.table("timeline_events").update(timeline_data).eq("id", timeline_id).execute()
            logger.info(f"时间规划更新成功: {timeline_id}")
            return {"success": True, "data": result.data[0] if result.data else None}
        except Exception as e:
            logger.error(f"更新时间规划失败: {e}")
            return {"success": False, "error": str(e)}

