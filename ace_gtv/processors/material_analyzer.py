#!/usr/bin/env python3
"""
GTV材料智能分析器
分析客户提交的所有材料，生成GTV递交框架脑图
"""

import os
import json
import sqlite3
from datetime import datetime
from typing import Dict, Any, List, Optional
from pathlib import Path

from utils.logger_config import setup_module_logger

logger = setup_module_logger("material_analyzer", os.getenv("LOG_LEVEL", "INFO"))

# GTV递交框架模板
GTV_FRAMEWORK = {
    "领域定位": {
        "id": "domain",
        "description": "确定申请人的专业领域和申请类别",
        "children": {
            "评估机构": "Tech Nation",
            "细分领域": "",
            "岗位定位": "",
            "核心论点": ""
        }
    },
    "MC_必选标准": {
        "id": "mc",
        "description": "Mandatory Criteria - 必须满足的标准",
        "children": {
            "MC1_产品/团队领导力": {
                "description": "领导产品、团队或公司增长的证据",
                "evidence_types": ["推荐信", "产品描述", "新闻报道", "代码贡献"],
                "collected": []
            },
            "MC2_商业发展": {
                "description": "商业发展、营销、收入增长的证据",
                "evidence_types": ["销售合同", "客户协议", "收入证明"],
                "collected": []
            },
            "MC3_非营利/社会企业": {
                "description": "领导数字科技领域非营利组织的证据",
                "evidence_types": ["聘书", "活动证明", "媒体报道"],
                "collected": []
            },
            "MC4_专家评审角色": {
                "description": "评审同行工作的专家角色证据",
                "evidence_types": ["评审邀请", "评委证书", "专家聘书"],
                "collected": []
            }
        }
    },
    "OC_可选标准": {
        "id": "oc",
        "description": "Optional Criteria - 至少满足2项",
        "children": {
            "OC1_创新": {
                "description": "创新/产品开发及市场验证证据",
                "evidence_types": ["专利证书", "产品截图", "财务报表", "采购合同"],
                "collected": []
            },
            "OC2_行业认可": {
                "description": "作为领域专家的认可证据",
                "evidence_types": ["演讲邀请", "媒体采访", "行业奖项", "论文发表"],
                "collected": []
            },
            "OC3_重大贡献": {
                "description": "对数字技术产品的重大技术贡献",
                "evidence_types": ["代码贡献", "技术文档", "系统架构", "专利"],
                "collected": []
            },
            "OC4_学术贡献": {
                "description": "在数字技术领域的学术贡献",
                "evidence_types": ["论文", "引用数据", "学术会议", "研究项目"],
                "collected": []
            }
        }
    },
    "推荐信": {
        "id": "reference",
        "description": "3封推荐信",
        "children": {
            "推荐人1": {"name": "", "title": "", "relationship": "", "status": ""},
            "推荐人2": {"name": "", "title": "", "relationship": "", "status": ""},
            "推荐人3": {"name": "", "title": "", "relationship": "", "status": ""}
        }
    },
    "个人陈述": {
        "id": "statement",
        "description": "Personal Statement",
        "content": ""
    }
}


class MaterialAnalyzer:
    """材料分析器"""
    
    def __init__(self, db_path: str = "copywriting.db"):
        self.db_path = db_path
        self.llm_client = None
        self._init_llm()
        logger.info("材料分析器初始化完成")
    
    def _init_llm(self):
        """初始化LLM客户端"""
        try:
            from openai import OpenAI
            
            api_key = os.getenv("ENNCLOUD_API_KEY") or os.getenv("OPENAI_API_KEY")
            base_url = os.getenv("ENNCLOUD_BASE_URL") or os.getenv("OPENAI_BASE_URL")
            
            if api_key and base_url:
                self.llm_client = OpenAI(api_key=api_key, base_url=base_url)
                self.model = os.getenv("ENNCLOUD_MODEL", "glm-4.6-no-think")
                logger.info(f"LLM客户端初始化成功: {base_url}")
            else:
                logger.warning("未配置LLM，将使用规则分析")
        except Exception as e:
            logger.error(f"初始化LLM失败: {e}")
    
    def analyze_project_materials(self, project_id: str) -> Dict[str, Any]:
        """
        分析项目的所有材料，生成GTV框架
        """
        try:
            # 1. 获取项目信息
            project_info = self._get_project_info(project_id)
            if not project_info:
                return {"success": False, "error": "项目不存在"}
            
            # 2. 获取所有已收集的材料
            materials = self._get_collected_materials(project_id)
            
            # 3. 获取所有表单数据
            forms = self._get_form_data(project_id)
            
            # 4. 提取材料内容
            material_contents = self._extract_material_contents(materials)
            
            # 5. 使用AI分析材料并匹配到GTV框架
            framework = self._analyze_and_map_to_framework(
                project_info, materials, forms, material_contents
            )
            
            # 6. 生成分析报告
            report = self._generate_analysis_report(framework)
            
            # 7. 保存分析结果
            self._save_analysis_result(project_id, framework, report)
            
            return {
                "success": True,
                "data": {
                    "project_id": project_id,
                    "project_name": project_info.get("client_name", ""),
                    "framework": framework,
                    "report": report,
                    "statistics": self._calculate_statistics(framework),
                    "analyzed_at": datetime.now().isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"分析项目材料失败: {e}")
            return {"success": False, "error": str(e)}
    
    def _get_project_info(self, project_id: str) -> Optional[Dict]:
        """获取项目信息"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # 尝试不同的表名
            for table in ["copywriting_projects", "projects"]:
                try:
                    cursor.execute(
                        f"SELECT * FROM {table} WHERE project_id = ?",
                        (project_id,)
                    )
                    row = cursor.fetchone()
                    if row:
                        conn.close()
                        return dict(row)
                except:
                    continue
            
            conn.close()
            return None
        except Exception as e:
            logger.error(f"获取项目信息失败: {e}")
            return None
    
    def _get_collected_materials(self, project_id: str) -> List[Dict]:
        """获取所有已收集的材料"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT mf.*, mc.category_id, mc.item_id, mc.status
                FROM material_files mf
                LEFT JOIN material_collection mc ON mf.project_id = mc.project_id 
                    AND mf.category_id = mc.category_id AND mf.item_id = mc.item_id
                WHERE mf.project_id = ?
                ORDER BY mf.uploaded_at DESC
            """, (project_id,))
            
            rows = cursor.fetchall()
            conn.close()
            
            return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"获取材料文件失败: {e}")
            return []
    
    def _get_form_data(self, project_id: str) -> List[Dict]:
        """获取所有表单数据"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT * FROM collection_forms
                WHERE project_id = ?
            """, (project_id,))
            
            rows = cursor.fetchall()
            conn.close()
            
            result = []
            for row in rows:
                data = dict(row)
                if data.get("form_data"):
                    data["form_data"] = json.loads(data["form_data"])
                result.append(data)
            
            return result
        except Exception as e:
            logger.error(f"获取表单数据失败: {e}")
            return []
    
    def _extract_material_contents(self, materials: List[Dict]) -> Dict[str, str]:
        """提取材料文件的文本内容"""
        contents = {}
        
        for material in materials:
            file_path = material.get("file_path")
            file_type = material.get("file_type", "").lower()
            file_id = material.get("id")
            
            if not file_path or not os.path.exists(file_path):
                continue
            
            try:
                content = None
                
                if file_type == "txt":
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                
                elif file_type == "docx":
                    try:
                        from docx import Document
                        doc = Document(file_path)
                        content = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
                    except:
                        pass
                
                elif file_type == "pdf":
                    try:
                        from pdfminer.high_level import extract_text
                        content = extract_text(file_path)
                    except:
                        pass
                
                if content and len(content) > 50:
                    # 限制内容长度
                    contents[str(file_id)] = content[:5000]
                    
            except Exception as e:
                logger.warning(f"提取文件内容失败 {file_path}: {e}")
        
        return contents
    
    def _analyze_and_map_to_framework(
        self, 
        project_info: Dict, 
        materials: List[Dict], 
        forms: List[Dict],
        contents: Dict[str, str]
    ) -> Dict:
        """分析材料并映射到GTV框架"""
        
        import copy
        framework = copy.deepcopy(GTV_FRAMEWORK)
        
        # 按分类统计材料
        category_materials = {}
        for m in materials:
            cat_id = m.get("category_id", "unknown")
            if cat_id not in category_materials:
                category_materials[cat_id] = []
            category_materials[cat_id].append(m)
        
        # 映射到框架
        # folder_1: 个人资料 -> 基本信息
        # folder_2: 现雇主 -> MC1/MC2
        # folder_3: 过往雇主 -> MC1/MC2/MC3
        # folder_4: 重大业绩 -> OC1/OC2/OC3/OC4
        # folder_5: 项目证据 -> MC1/OC1/OC3
        # folder_6: 推荐人 -> 推荐信
        
        # 提取推荐人信息
        if "folder_6" in category_materials:
            for m in category_materials["folder_6"]:
                item_id = m.get("item_id", "")
                if "recommender_1" in item_id:
                    framework["推荐信"]["children"]["推荐人1"]["status"] = "已收集"
                    framework["推荐信"]["children"]["推荐人1"]["files"] = [m.get("file_name")]
                elif "recommender_2" in item_id:
                    framework["推荐信"]["children"]["推荐人2"]["status"] = "已收集"
                    framework["推荐信"]["children"]["推荐人2"]["files"] = [m.get("file_name")]
                elif "recommender_3" in item_id:
                    framework["推荐信"]["children"]["推荐人3"]["status"] = "已收集"
                    framework["推荐信"]["children"]["推荐人3"]["files"] = [m.get("file_name")]
        
        # 处理业绩证据
        if "folder_4" in category_materials:
            for m in category_materials["folder_4"]:
                item_id = m.get("item_id", "")
                file_name = m.get("file_name", "")
                
                evidence = {
                    "file_name": file_name,
                    "file_id": m.get("id"),
                    "category": item_id
                }
                
                # 专利 -> OC1/OC3
                if "patent" in item_id or "专利" in file_name:
                    framework["OC_可选标准"]["children"]["OC1_创新"]["collected"].append(evidence)
                    framework["OC_可选标准"]["children"]["OC3_重大贡献"]["collected"].append(evidence)
                
                # 论文 -> OC2/OC4
                elif "publication" in item_id or "论文" in file_name:
                    framework["OC_可选标准"]["children"]["OC2_行业认可"]["collected"].append(evidence)
                    framework["OC_可选标准"]["children"]["OC4_学术贡献"]["collected"].append(evidence)
                
                # 奖项 -> OC2
                elif "award" in item_id or "奖" in file_name:
                    framework["OC_可选标准"]["children"]["OC2_行业认可"]["collected"].append(evidence)
                
                # 贡献表 -> MC1
                elif "contribution" in item_id:
                    framework["MC_必选标准"]["children"]["MC1_产品/团队领导力"]["collected"].append(evidence)
        
        # 处理项目证据
        if "folder_5" in category_materials:
            for m in category_materials["folder_5"]:
                evidence = {
                    "file_name": m.get("file_name", ""),
                    "file_id": m.get("id"),
                    "category": m.get("item_id", "")
                }
                framework["MC_必选标准"]["children"]["MC1_产品/团队领导力"]["collected"].append(evidence)
                framework["OC_可选标准"]["children"]["OC1_创新"]["collected"].append(evidence)
        
        # 处理雇主材料
        for folder in ["folder_2", "folder_3"]:
            if folder in category_materials:
                for m in category_materials[folder]:
                    evidence = {
                        "file_name": m.get("file_name", ""),
                        "file_id": m.get("id"),
                        "category": m.get("item_id", "")
                    }
                    item_id = m.get("item_id", "")
                    
                    if "employment" in item_id or "就职" in m.get("file_name", ""):
                        framework["MC_必选标准"]["children"]["MC1_产品/团队领导力"]["collected"].append(evidence)
                    elif "award" in item_id:
                        framework["OC_可选标准"]["children"]["OC2_行业认可"]["collected"].append(evidence)
        
        # 使用AI进行更深入的分析（如果可用）
        if self.llm_client and contents:
            framework = self._ai_enhanced_analysis(framework, contents, project_info)
        
        return framework
    
    def _ai_enhanced_analysis(self, framework: Dict, contents: Dict, project_info: Dict) -> Dict:
        """使用AI增强分析"""
        try:
            # 构建提示
            content_summary = "\n\n".join([
                f"文件{fid}内容摘要:\n{content[:1000]}..."
                for fid, content in list(contents.items())[:5]
            ])
            
            prompt = f"""
分析以下GTV签证申请材料，提取关键信息：

申请人：{project_info.get('client_name', '未知')}

材料内容摘要：
{content_summary}

请提取以下信息（JSON格式）：
1. 申请人的专业领域（domain）
2. 主要工作成就（achievements）- 列表
3. 技术贡献（technical_contributions）- 列表
4. 领导力证据（leadership）- 列表
5. 创新成果（innovations）- 列表
6. 建议的申请策略（strategy）

返回JSON格式。
"""
            
            response = self.llm_client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=2000
            )
            
            ai_result = response.choices[0].message.content
            
            # 尝试解析JSON
            try:
                import re
                json_match = re.search(r'\{[\s\S]*\}', ai_result)
                if json_match:
                    ai_data = json.loads(json_match.group())
                    
                    # 更新框架
                    if ai_data.get("domain"):
                        framework["领域定位"]["children"]["细分领域"] = ai_data["domain"]
                    
                    if ai_data.get("strategy"):
                        framework["分析建议"] = {
                            "id": "suggestion",
                            "content": ai_data["strategy"]
                        }
            except:
                pass
                
        except Exception as e:
            logger.warning(f"AI增强分析失败: {e}")
        
        return framework
    
    def _generate_analysis_report(self, framework: Dict) -> Dict:
        """生成分析报告"""
        report = {
            "summary": "",
            "mc_status": {},
            "oc_status": {},
            "recommendations": [],
            "missing_items": [],
            "strength_points": []
        }
        
        # 分析MC状态
        mc = framework.get("MC_必选标准", {}).get("children", {})
        for mc_key, mc_data in mc.items():
            collected = mc_data.get("collected", [])
            report["mc_status"][mc_key] = {
                "count": len(collected),
                "status": "充足" if len(collected) >= 2 else ("不足" if len(collected) == 0 else "基本"),
                "files": [c.get("file_name") for c in collected[:5]]
            }
        
        # 分析OC状态
        oc = framework.get("OC_可选标准", {}).get("children", {})
        oc_satisfied = 0
        for oc_key, oc_data in oc.items():
            collected = oc_data.get("collected", [])
            status = "充足" if len(collected) >= 2 else ("不足" if len(collected) == 0 else "基本")
            if len(collected) >= 2:
                oc_satisfied += 1
            report["oc_status"][oc_key] = {
                "count": len(collected),
                "status": status,
                "files": [c.get("file_name") for c in collected[:5]]
            }
        
        # 分析推荐信
        refs = framework.get("推荐信", {}).get("children", {})
        ref_count = sum(1 for r in refs.values() if r.get("status") == "已收集")
        
        # 生成建议
        if ref_count < 3:
            report["missing_items"].append(f"推荐信还需要{3-ref_count}封")
        
        if oc_satisfied < 2:
            report["missing_items"].append(f"可选标准(OC)需要至少满足2项，当前仅满足{oc_satisfied}项")
        
        # 总结
        mc_ok = any(s["count"] >= 2 for s in report["mc_status"].values())
        report["summary"] = f"""
材料分析完成。
- 必选标准(MC)：{"基本满足" if mc_ok else "需要补充材料"}
- 可选标准(OC)：满足{oc_satisfied}/4项（需至少2项）
- 推荐信：已收集{ref_count}/3封
        """.strip()
        
        return report
    
    def _calculate_statistics(self, framework: Dict) -> Dict:
        """计算统计数据"""
        stats = {
            "total_files": 0,
            "mc_coverage": 0,
            "oc_coverage": 0,
            "reference_count": 0
        }
        
        # MC统计
        mc = framework.get("MC_必选标准", {}).get("children", {})
        mc_with_evidence = sum(1 for v in mc.values() if len(v.get("collected", [])) > 0)
        stats["mc_coverage"] = round(mc_with_evidence / len(mc) * 100) if mc else 0
        
        for v in mc.values():
            stats["total_files"] += len(v.get("collected", []))
        
        # OC统计
        oc = framework.get("OC_可选标准", {}).get("children", {})
        oc_with_evidence = sum(1 for v in oc.values() if len(v.get("collected", [])) >= 2)
        stats["oc_coverage"] = round(oc_with_evidence / 2 * 100)  # 需要满足2项
        stats["oc_coverage"] = min(stats["oc_coverage"], 100)
        
        for v in oc.values():
            stats["total_files"] += len(v.get("collected", []))
        
        # 推荐信
        refs = framework.get("推荐信", {}).get("children", {})
        stats["reference_count"] = sum(1 for r in refs.values() if r.get("status") == "已收集")
        
        return stats
    
    def _save_analysis_result(self, project_id: str, framework: Dict, report: Dict):
        """保存分析结果"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 创建分析结果表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS material_analysis (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id TEXT NOT NULL,
                    framework TEXT,
                    report TEXT,
                    analyzed_at TEXT,
                    UNIQUE(project_id)
                )
            """)
            
            cursor.execute("""
                INSERT OR REPLACE INTO material_analysis (project_id, framework, report, analyzed_at)
                VALUES (?, ?, ?, ?)
            """, (
                project_id,
                json.dumps(framework, ensure_ascii=False),
                json.dumps(report, ensure_ascii=False),
                datetime.now().isoformat()
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"保存分析结果失败: {e}")
    
    def get_analysis_result(self, project_id: str) -> Optional[Dict]:
        """获取已保存的分析结果"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute(
                "SELECT * FROM material_analysis WHERE project_id = ?",
                (project_id,)
            )
            row = cursor.fetchone()
            conn.close()
            
            if row:
                return {
                    "framework": json.loads(row["framework"]),
                    "report": json.loads(row["report"]),
                    "analyzed_at": row["analyzed_at"]
                }
            return None
        except Exception as e:
            logger.error(f"获取分析结果失败: {e}")
            return None
    
    def generate_mindmap_data(self, framework: Dict, project_name: str = "", materials: List[Dict] = None) -> Dict:
        """生成完整的思维导图数据结构"""
        
        def get_status(collected_count: int) -> str:
            if collected_count >= 2:
                return "success"
            elif collected_count > 0:
                return "warning"
            return "error"
        
        mindmap = {
            "id": "root",
            "label": project_name or "GTV申请框架",
            "type": "root",
            "children": []
        }
        
        # 1. 领域定位
        domain_node = {
            "id": "domain",
            "label": "🎯 领域定位",
            "type": "category",
            "status": "info",
            "children": []
        }
        domain_data = framework.get("领域定位", {}).get("children", {})
        domain_items = [
            ("评估机构", "Tech Nation"),
            ("细分领域", domain_data.get("细分领域", "待确定")),
            ("岗位定位", domain_data.get("岗位定位", "待确定")),
            ("核心论点", domain_data.get("核心论点", "待确定"))
        ]
        for key, value in domain_items:
            domain_node["children"].append({
                "id": f"domain_{key}",
                "label": key,
                "type": "criteria",
                "details": value if value else "待填写"
            })
        mindmap["children"].append(domain_node)
        
        # 2. MC必选标准（递交材料框架）
        mc_node = {
            "id": "mc",
            "label": "📋 MC必选标准 (Mandatory Criteria)",
            "type": "category",
            "children": []
        }
        
        mc_definitions = {
            "MC1_产品/团队领导力": {
                "full_name": "MC1: 产品/团队领导力",
                "description": "领导产品导向的数字科技公司/产品/团队增长的证据",
                "evidence_hints": ["推荐信", "产品描述", "新闻报道", "代码贡献"]
            },
            "MC2_商业发展": {
                "full_name": "MC2: 商业/营销发展",
                "description": "领导营销或业务开发，实现收入/客户增长的证据",
                "evidence_hints": ["销售合同", "客户协议", "收入增长数据"]
            },
            "MC3_非营利/社会企业": {
                "full_name": "MC3: 非营利组织领导",
                "description": "领导数字科技领域非营利组织或社会企业的证据",
                "evidence_hints": ["聘书", "活动证明", "媒体报道"]
            },
            "MC4_专家评审角色": {
                "full_name": "MC4: 专家评审角色",
                "description": "担任评审同行工作的重要专家角色的证据",
                "evidence_hints": ["评审邀请", "评委证书", "专家聘书"]
            }
        }
        
        mc_data = framework.get("MC_必选标准", {}).get("children", {})
        for key, definition in mc_definitions.items():
            data = mc_data.get(key, {})
            collected = data.get("collected", [])
            status = get_status(len(collected))
            
            child = {
                "id": f"mc_{key}",
                "label": definition["full_name"],
                "type": "criteria",
                "status": status,
                "details": definition["description"],
                "fileCount": len(collected),
                "children": []
            }
            
            # 添加证据文件
            for ev in collected[:8]:
                child["children"].append({
                    "id": f"mc_{key}_{ev.get('file_id', '')}",
                    "label": ev.get("file_name", "未知文件")[:50],
                    "type": "file",
                    "details": f"分类: {ev.get('category', '')}"
                })
            
            if len(collected) > 8:
                child["children"].append({
                    "id": f"mc_{key}_more",
                    "label": f"+{len(collected) - 8} 更多文件",
                    "type": "file"
                })
            
            mc_node["children"].append(child)
        
        mindmap["children"].append(mc_node)
        
        # 3. OC可选标准
        oc_node = {
            "id": "oc",
            "label": "📊 OC可选标准 (Optional Criteria)",
            "type": "category",
            "children": []
        }
        
        oc_definitions = {
            "OC1_创新": {
                "full_name": "OC1: 创新/产品开发",
                "description": "创新/产品开发证据，市场验证及收入证明",
                "evidence_hints": ["专利证书", "产品截图", "财务报表", "采购合同"]
            },
            "OC2_行业认可": {
                "full_name": "OC2: 行业专家认可",
                "description": "作为领域专家获得的认可证据",
                "evidence_hints": ["演讲邀请", "媒体采访", "行业奖项", "论文发表"]
            },
            "OC3_重大贡献": {
                "full_name": "OC3: 重大技术/商业贡献",
                "description": "对数字技术产品的重大技术、商业或创业贡献",
                "evidence_hints": ["代码贡献", "技术文档", "投资决策", "商业成果"]
            },
            "OC4_学术贡献": {
                "full_name": "OC4: 学术贡献",
                "description": "在数字技术领域的学术贡献",
                "evidence_hints": ["论文", "引用数据", "学术会议", "研究项目"]
            }
        }
        
        oc_data = framework.get("OC_可选标准", {}).get("children", {})
        for key, definition in oc_definitions.items():
            data = oc_data.get(key, {})
            collected = data.get("collected", [])
            status = get_status(len(collected))
            
            child = {
                "id": f"oc_{key}",
                "label": definition["full_name"],
                "type": "criteria",
                "status": status,
                "details": definition["description"],
                "fileCount": len(collected),
                "children": []
            }
            
            for ev in collected[:8]:
                child["children"].append({
                    "id": f"oc_{key}_{ev.get('file_id', '')}",
                    "label": ev.get("file_name", "未知文件")[:50],
                    "type": "file",
                    "details": f"分类: {ev.get('category', '')}"
                })
            
            if len(collected) > 8:
                child["children"].append({
                    "id": f"oc_{key}_more",
                    "label": f"+{len(collected) - 8} 更多文件",
                    "type": "file"
                })
            
            oc_node["children"].append(child)
        
        mindmap["children"].append(oc_node)
        
        # 4. 推荐信
        ref_node = {
            "id": "reference",
            "label": "✉️ 三封推荐信",
            "type": "category",
            "children": []
        }
        ref_data = framework.get("推荐信", {}).get("children", {})
        
        recommenders = [
            ("推荐人1", "行业专家推荐"),
            ("推荐人2", "学术/技术推荐"),
            ("推荐人3", "商业/合作推荐")
        ]
        
        for key, hint in recommenders:
            data = ref_data.get(key, {})
            status = "success" if data.get("status") == "已收集" else "error"
            files = data.get("files", [])
            
            ref_child = {
                "id": f"ref_{key}",
                "label": key,
                "type": "criteria",
                "status": status,
                "details": f"{hint} - {data.get('name', '待确定')}",
                "children": []
            }
            
            if files:
                for f in files[:3]:
                    ref_child["children"].append({
                        "id": f"ref_{key}_{f}",
                        "label": f,
                        "type": "file"
                    })
            
            ref_node["children"].append(ref_child)
        
        mindmap["children"].append(ref_node)
        
        return mindmap


# 测试
if __name__ == "__main__":
    analyzer = MaterialAnalyzer()
    result = analyzer.analyze_project_materials("TEST001")
    print(json.dumps(result, ensure_ascii=False, indent=2))
