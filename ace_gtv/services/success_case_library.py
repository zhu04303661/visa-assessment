#!/usr/bin/env python3
"""
GTV签证成功案例库
存储、管理和匹配成功申请案例，为新申请提供参考
"""

import os
import json
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from pathlib import Path

from utils.logger_config import setup_module_logger

logger = setup_module_logger("success_case_library", os.getenv("LOG_LEVEL", "INFO"))


class SuccessCaseLibrary:
    """成功案例库 - 管理和匹配成功申请案例"""
    
    # 案例特征维度
    CASE_DIMENSIONS = {
        "industry": {
            "name": "行业领域",
            "options": [
                "人工智能/机器学习",
                "软件开发/工程",
                "数据科学/大数据",
                "网络安全",
                "金融科技",
                "电子商务",
                "游戏开发",
                "硬件/物联网",
                "生物技术",
                "清洁能源",
                "创业/投资",
                "学术研究",
                "其他"
            ]
        },
        "experience_level": {
            "name": "经验水平",
            "options": [
                "初级（1-3年）",
                "中级（3-5年）",
                "高级（5-10年）",
                "专家（10年以上）"
            ]
        },
        "pathway": {
            "name": "申请路径",
            "options": [
                "Exceptional Talent",
                "Exceptional Promise",
                "Startup Visa"
            ]
        },
        "education": {
            "name": "教育背景",
            "options": [
                "本科",
                "硕士",
                "博士",
                "MBA",
                "自学成才"
            ]
        },
        "achievements": {
            "name": "主要成就类型",
            "options": [
                "技术发明/专利",
                "开源项目贡献",
                "学术论文发表",
                "创业经历",
                "行业奖项",
                "领导力/管理",
                "产品影响力",
                "社区贡献"
            ]
        }
    }
    
    def __init__(self, library_path: str = None):
        """
        初始化成功案例库
        
        Args:
            library_path: 案例库存储路径
        """
        self.library_path = Path(library_path or os.getenv("CASE_LIBRARY_PATH", "./success_cases"))
        self.library_path.mkdir(parents=True, exist_ok=True)
        
        # 案例索引文件
        self.index_file = self.library_path / "case_index.json"
        self._load_index()
        
        logger.info(f"成功案例库初始化完成，路径: {self.library_path}")
    
    def _load_index(self):
        """加载案例索引"""
        if self.index_file.exists():
            with open(self.index_file, 'r', encoding='utf-8') as f:
                self.index = json.load(f)
        else:
            self.index = {
                "cases": [],
                "total_count": 0,
                "last_updated": datetime.now().isoformat(),
                "statistics": {}
            }
            self._save_index()
    
    def _save_index(self):
        """保存案例索引"""
        self.index['last_updated'] = datetime.now().isoformat()
        with open(self.index_file, 'w', encoding='utf-8') as f:
            json.dump(self.index, f, ensure_ascii=False, indent=2)
    
    def add_case(self, case_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        添加成功案例
        
        Args:
            case_data: 案例数据，包含：
                - applicant_profile: 申请人背景（匿名化）
                - industry: 行业领域
                - experience_level: 经验水平
                - pathway: 申请路径
                - education: 教育背景
                - achievements: 主要成就
                - key_documents: 关键文档样本
                - success_factors: 成功因素分析
                - timeline: 申请时间线
                - endorsement_body: 背书机构
                
        Returns:
            添加结果
        """
        try:
            case_id = str(uuid.uuid4())[:12].upper()
            timestamp = datetime.now().isoformat()
            
            # 创建案例文件夹
            case_folder = self.library_path / case_id
            case_folder.mkdir(exist_ok=True)
            
            # 完整案例数据
            full_case = {
                "id": case_id,
                "created_at": timestamp,
                "updated_at": timestamp,
                
                # 基本信息
                "applicant_profile": case_data.get("applicant_profile", {}),
                "industry": case_data.get("industry", "其他"),
                "experience_level": case_data.get("experience_level", "中级（3-5年）"),
                "pathway": case_data.get("pathway", "Exceptional Talent"),
                "education": case_data.get("education", "硕士"),
                "achievements": case_data.get("achievements", []),
                
                # 详细内容
                "background_summary": case_data.get("background_summary", ""),
                "success_factors": case_data.get("success_factors", ""),
                "key_takeaways": case_data.get("key_takeaways", ""),
                "timeline": case_data.get("timeline", {}),
                "endorsement_body": case_data.get("endorsement_body", "Tech Nation"),
                
                # 文档样本
                "document_samples": case_data.get("document_samples", {}),
                
                # 元数据
                "tags": case_data.get("tags", []),
                "match_keywords": case_data.get("match_keywords", []),
                "verified": case_data.get("verified", False)
            }
            
            # 保存完整案例
            case_file = case_folder / "case_data.json"
            with open(case_file, 'w', encoding='utf-8') as f:
                json.dump(full_case, f, ensure_ascii=False, indent=2)
            
            # 更新索引
            index_entry = {
                "id": case_id,
                "industry": full_case["industry"],
                "experience_level": full_case["experience_level"],
                "pathway": full_case["pathway"],
                "education": full_case["education"],
                "achievements": full_case["achievements"],
                "tags": full_case["tags"],
                "match_keywords": full_case["match_keywords"],
                "created_at": timestamp,
                "verified": full_case["verified"]
            }
            
            self.index["cases"].append(index_entry)
            self.index["total_count"] = len(self.index["cases"])
            self._update_statistics()
            self._save_index()
            
            logger.info(f"成功案例添加完成: {case_id}")
            return {"success": True, "case_id": case_id, "data": full_case}
            
        except Exception as e:
            logger.error(f"添加案例失败: {e}")
            return {"success": False, "error": str(e)}
    
    def _update_statistics(self):
        """更新案例统计信息"""
        stats = {
            "by_industry": {},
            "by_pathway": {},
            "by_experience": {},
            "by_education": {}
        }
        
        for case in self.index["cases"]:
            # 按行业统计
            industry = case.get("industry", "其他")
            stats["by_industry"][industry] = stats["by_industry"].get(industry, 0) + 1
            
            # 按路径统计
            pathway = case.get("pathway", "Unknown")
            stats["by_pathway"][pathway] = stats["by_pathway"].get(pathway, 0) + 1
            
            # 按经验统计
            exp = case.get("experience_level", "Unknown")
            stats["by_experience"][exp] = stats["by_experience"].get(exp, 0) + 1
            
            # 按教育统计
            edu = case.get("education", "Unknown")
            stats["by_education"][edu] = stats["by_education"].get(edu, 0) + 1
        
        self.index["statistics"] = stats
    
    def get_case(self, case_id: str) -> Dict[str, Any]:
        """
        获取案例详情
        
        Args:
            case_id: 案例ID
            
        Returns:
            案例详情
        """
        try:
            case_folder = self.library_path / case_id
            case_file = case_folder / "case_data.json"
            
            if not case_file.exists():
                return {"success": False, "error": "案例不存在"}
            
            with open(case_file, 'r', encoding='utf-8') as f:
                case_data = json.load(f)
            
            return {"success": True, "data": case_data}
            
        except Exception as e:
            logger.error(f"获取案例失败: {e}")
            return {"success": False, "error": str(e)}
    
    def search_cases(self, filters: Dict[str, Any] = None, 
                    keywords: List[str] = None,
                    limit: int = 10) -> Dict[str, Any]:
        """
        搜索案例
        
        Args:
            filters: 过滤条件
            keywords: 关键词
            limit: 限制数量
            
        Returns:
            匹配的案例列表
        """
        try:
            results = []
            
            for case_entry in self.index["cases"]:
                match = True
                
                # 应用过滤条件
                if filters:
                    for key, value in filters.items():
                        if key in case_entry:
                            if isinstance(case_entry[key], list):
                                if value not in case_entry[key]:
                                    match = False
                                    break
                            elif case_entry[key] != value:
                                match = False
                                break
                
                # 应用关键词匹配
                if match and keywords:
                    case_keywords = set(case_entry.get("match_keywords", []) + 
                                       case_entry.get("tags", []))
                    if not any(kw.lower() in str(case_keywords).lower() for kw in keywords):
                        match = False
                
                if match:
                    results.append(case_entry)
                    if len(results) >= limit:
                        break
            
            return {"success": True, "data": results, "total": len(results)}
            
        except Exception as e:
            logger.error(f"搜索案例失败: {e}")
            return {"success": False, "error": str(e), "data": []}
    
    def match_cases(self, applicant_profile: Dict[str, Any], 
                   top_k: int = 3) -> Dict[str, Any]:
        """
        为申请人匹配相似案例
        
        Args:
            applicant_profile: 申请人资料
            top_k: 返回前K个最匹配的案例
            
        Returns:
            匹配的案例列表（带匹配度分数）
        """
        try:
            scored_cases = []
            
            for case_entry in self.index["cases"]:
                score = self._calculate_match_score(applicant_profile, case_entry)
                if score > 0:
                    scored_cases.append({
                        **case_entry,
                        "match_score": score
                    })
            
            # 按匹配度排序
            scored_cases.sort(key=lambda x: x["match_score"], reverse=True)
            
            # 获取完整案例信息
            top_matches = []
            for entry in scored_cases[:top_k]:
                case_result = self.get_case(entry["id"])
                if case_result["success"]:
                    full_case = case_result["data"]
                    full_case["match_score"] = entry["match_score"]
                    top_matches.append(full_case)
            
            return {"success": True, "data": top_matches, "total": len(scored_cases)}
            
        except Exception as e:
            logger.error(f"匹配案例失败: {e}")
            return {"success": False, "error": str(e), "data": []}
    
    def _calculate_match_score(self, profile: Dict[str, Any], 
                               case_entry: Dict[str, Any]) -> float:
        """
        计算匹配度分数
        
        Args:
            profile: 申请人资料
            case_entry: 案例索引条目
            
        Returns:
            匹配度分数（0-100）
        """
        score = 0.0
        weights = {
            "industry": 25,
            "experience_level": 20,
            "pathway": 15,
            "education": 15,
            "achievements": 25
        }
        
        # 行业匹配
        if profile.get("industry") == case_entry.get("industry"):
            score += weights["industry"]
        elif profile.get("industry") in str(case_entry.get("tags", [])):
            score += weights["industry"] * 0.5
        
        # 经验水平匹配
        if profile.get("experience_level") == case_entry.get("experience_level"):
            score += weights["experience_level"]
        
        # 申请路径匹配
        if profile.get("pathway") == case_entry.get("pathway"):
            score += weights["pathway"]
        
        # 教育背景匹配
        if profile.get("education") == case_entry.get("education"):
            score += weights["education"]
        
        # 成就类型匹配
        profile_achievements = set(profile.get("achievements", []))
        case_achievements = set(case_entry.get("achievements", []))
        if profile_achievements and case_achievements:
            overlap = len(profile_achievements.intersection(case_achievements))
            score += weights["achievements"] * (overlap / max(len(profile_achievements), 1))
        
        return round(score, 1)
    
    def list_cases(self, page: int = 1, page_size: int = 20, 
                  sort_by: str = "created_at") -> Dict[str, Any]:
        """
        列出所有案例（分页）
        
        Args:
            page: 页码
            page_size: 每页数量
            sort_by: 排序字段
            
        Returns:
            案例列表
        """
        try:
            cases = self.index["cases"].copy()
            
            # 排序
            if sort_by in ["created_at", "id"]:
                cases.sort(key=lambda x: x.get(sort_by, ""), reverse=True)
            
            # 分页
            start = (page - 1) * page_size
            end = start + page_size
            page_cases = cases[start:end]
            
            return {
                "success": True,
                "data": page_cases,
                "page": page,
                "page_size": page_size,
                "total": len(cases),
                "total_pages": (len(cases) + page_size - 1) // page_size
            }
            
        except Exception as e:
            logger.error(f"列出案例失败: {e}")
            return {"success": False, "error": str(e), "data": []}
    
    def get_statistics(self) -> Dict[str, Any]:
        """获取案例库统计信息"""
        return {
            "success": True,
            "data": {
                "total_count": self.index["total_count"],
                "last_updated": self.index["last_updated"],
                "statistics": self.index.get("statistics", {})
            }
        }
    
    def get_sample_documents(self, case_id: str, 
                            document_type: str = None) -> Dict[str, Any]:
        """
        获取案例的样本文档
        
        Args:
            case_id: 案例ID
            document_type: 文档类型（可选）
            
        Returns:
            样本文档
        """
        try:
            case_result = self.get_case(case_id)
            if not case_result["success"]:
                return case_result
            
            case_data = case_result["data"]
            samples = case_data.get("document_samples", {})
            
            if document_type:
                if document_type in samples:
                    return {"success": True, "data": {document_type: samples[document_type]}}
                else:
                    return {"success": False, "error": f"文档类型 {document_type} 不存在"}
            
            return {"success": True, "data": samples}
            
        except Exception as e:
            logger.error(f"获取样本文档失败: {e}")
            return {"success": False, "error": str(e)}
    
    def import_case_from_file(self, file_path: str) -> Dict[str, Any]:
        """
        从文件导入案例
        
        Args:
            file_path: JSON文件路径
            
        Returns:
            导入结果
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                case_data = json.load(f)
            
            return self.add_case(case_data)
            
        except Exception as e:
            logger.error(f"导入案例失败: {e}")
            return {"success": False, "error": str(e)}
    
    def export_case(self, case_id: str, output_path: str = None) -> Dict[str, Any]:
        """
        导出案例
        
        Args:
            case_id: 案例ID
            output_path: 输出路径（可选）
            
        Returns:
            导出结果
        """
        try:
            case_result = self.get_case(case_id)
            if not case_result["success"]:
                return case_result
            
            if output_path:
                with open(output_path, 'w', encoding='utf-8') as f:
                    json.dump(case_result["data"], f, ensure_ascii=False, indent=2)
                return {"success": True, "file_path": output_path}
            
            return case_result
            
        except Exception as e:
            logger.error(f"导出案例失败: {e}")
            return {"success": False, "error": str(e)}
    
    def add_sample_cases(self) -> Dict[str, Any]:
        """添加示例案例（用于初始化）"""
        sample_cases = [
            {
                "applicant_profile": {
                    "nationality": "中国",
                    "age_range": "25-30",
                    "current_role": "高级软件工程师"
                },
                "industry": "人工智能/机器学习",
                "experience_level": "高级（5-10年）",
                "pathway": "Exceptional Talent",
                "education": "硕士",
                "achievements": ["开源项目贡献", "技术发明/专利", "学术论文发表"],
                "background_summary": """
申请人是一位在AI/ML领域有8年经验的资深工程师。
- 在知名科技公司担任技术负责人
- 参与多个开源AI项目，获得2000+ GitHub Stars
- 发表3篇机器学习相关论文
- 拥有2项AI相关专利
                """.strip(),
                "success_factors": """
1. 强大的技术影响力：开源项目被广泛使用
2. 学术和产业双重背景：论文发表+产品落地
3. 清晰的职业发展规划：展示了在英国的具体发展计划
4. 高质量推荐信：来自行业知名人士
                """.strip(),
                "key_takeaways": """
- 个人陈述重点突出技术创新和社区贡献
- 推荐信强调国际影响力和领导能力
- 证据材料包括代码贡献、论文引用、专利证书
- 展示了对英国AI生态的了解和贡献计划
                """.strip(),
                "tags": ["AI", "机器学习", "开源", "高级工程师"],
                "match_keywords": ["人工智能", "机器学习", "软件工程", "开源贡献", "论文发表"],
                "document_samples": {
                    "personal_statement_outline": """
# 个人陈述大纲

## 1. 开篇 - 个人定位
- 8年AI/ML领域经验
- 技术创新者和开源贡献者

## 2. 专业成就
- 开源项目影响力
- 学术论文和专利
- 产品落地经验

## 3. 为什么选择英国
- 英国AI生态的吸引力
- 具体的发展计划

## 4. 结语
- 能为英国科技行业带来的价值
                    """.strip(),
                    "cv_structure": """
# CV结构建议

## 个人信息
简洁明了，突出专业定位

## 专业摘要
2-3句话概括核心竞争力

## 工作经历
- 按时间倒序排列
- 每份工作列出3-5个关键成就
- 使用数据量化影响

## 技术技能
- 按熟练度分类
- 突出与AI/ML相关的技能

## 开源贡献
- 项目名称和链接
- 贡献描述和影响力指标

## 论文发表
- 标准学术引用格式
- 注明引用次数

## 专利
- 专利号和标题
- 简要说明创新点
                    """.strip()
                },
                "verified": True
            },
            {
                "applicant_profile": {
                    "nationality": "印度",
                    "age_range": "30-35",
                    "current_role": "创业者/CTO"
                },
                "industry": "金融科技",
                "experience_level": "高级（5-10年）",
                "pathway": "Exceptional Promise",
                "education": "MBA",
                "achievements": ["创业经历", "产品影响力", "领导力/管理"],
                "background_summary": """
申请人是一位金融科技创业者，联合创办了一家支付科技公司。
- 公司获得A轮融资500万美元
- 产品服务超过10万用户
- 团队规模从2人发展到30人
                """.strip(),
                "success_factors": """
1. 创业成功经历：融资和用户增长
2. 领导力证明：团队扩张和管理
3. 行业影响力：被行业媒体报道
4. 明确的英国发展计划
                """.strip(),
                "key_takeaways": """
- 强调创业成就和商业影响
- 推荐信来自投资人和行业顾问
- 展示产品数据和用户反馈
- 商业计划书清晰可行
                """.strip(),
                "tags": ["金融科技", "创业", "支付", "CTO"],
                "match_keywords": ["fintech", "创业者", "融资", "产品管理", "团队管理"],
                "document_samples": {},
                "verified": True
            },
            {
                "applicant_profile": {
                    "nationality": "中国",
                    "age_range": "25-30",
                    "current_role": "数据科学家"
                },
                "industry": "数据科学/大数据",
                "experience_level": "中级（3-5年）",
                "pathway": "Exceptional Promise",
                "education": "硕士",
                "achievements": ["学术论文发表", "开源项目贡献", "行业奖项"],
                "background_summary": """
申请人是数据科学领域的新锐人才。
- 发表2篇顶级会议论文（NeurIPS, ICML）
- Kaggle Master称号
- 参与多个开源数据科学项目
                """.strip(),
                "success_factors": """
1. 学术成就突出：顶会论文
2. 实践能力强：Kaggle比赛成绩
3. 社区活跃：开源贡献和技术分享
4. 发展潜力：年轻但成就显著
                """.strip(),
                "key_takeaways": """
- Promise路径适合早期职业阶段
- 重点展示潜力和发展轨迹
- 学术成就+实践能力结合
- 推荐信强调成长速度
                """.strip(),
                "tags": ["数据科学", "机器学习", "Kaggle", "学术"],
                "match_keywords": ["数据科学", "机器学习", "论文", "Kaggle", "研究"],
                "document_samples": {},
                "verified": True
            }
        ]
        
        results = []
        for case_data in sample_cases:
            result = self.add_case(case_data)
            results.append(result)
        
        return {
            "success": True,
            "added_count": len([r for r in results if r.get("success")]),
            "results": results
        }


# 测试代码
if __name__ == "__main__":
    library = SuccessCaseLibrary("./test_case_library")
    
    # 添加示例案例
    result = library.add_sample_cases()
    print(f"添加示例案例: {result['added_count']} 个")
    
    # 搜索案例
    search_result = library.search_cases(
        filters={"industry": "人工智能/机器学习"},
        limit=5
    )
    print(f"搜索结果: {len(search_result.get('data', []))} 个")
    
    # 匹配案例
    match_result = library.match_cases({
        "industry": "人工智能/机器学习",
        "experience_level": "高级（5-10年）",
        "pathway": "Exceptional Talent",
        "achievements": ["开源项目贡献", "学术论文发表"]
    })
    print(f"匹配结果: {len(match_result.get('data', []))} 个")
    for case in match_result.get('data', []):
        print(f"  - {case['id']}: 匹配度 {case['match_score']}%")
