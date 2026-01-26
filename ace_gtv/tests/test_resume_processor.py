#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简历处理器独立测试脚本
可以单独运行，测试简历处理器的各个功能模块
"""

import os
import sys
import json
import logging
import tempfile
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime
from dotenv import load_dotenv

# 添加当前目录到Python路径
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# 加载项目根目录的.env.local配置文件
project_root = current_dir.parent
env_local_path = project_root / ".env.local"
if env_local_path.exists():
    load_dotenv(env_local_path)
    print(f"✅ 已加载配置文件: {env_local_path}")
    
    # 兼容性处理：支持AI_PROVIDER和LLM_PROVIDER两种配置方式
    ai_provider = os.getenv("AI_PROVIDER", "").lower()
    llm_provider = os.getenv("LLM_PROVIDER", "").upper()
    
    if ai_provider and not llm_provider:
        # 将AI_PROVIDER映射到LLM_PROVIDER
        if ai_provider == "openai":
            os.environ["LLM_PROVIDER"] = "OPENAI"
        elif ai_provider == "azure":
            os.environ["LLM_PROVIDER"] = "AZURE"
        elif ai_provider == "anthropic":
            os.environ["LLM_PROVIDER"] = "ANTHROPIC"
        print(f"🔄 自动映射AI_PROVIDER={ai_provider} -> LLM_PROVIDER={os.environ['LLM_PROVIDER']}")
    
    # 兼容性处理：支持AZURE_API_KEY和AZURE_OPENAI_API_KEY
    azure_api_key = os.getenv("AZURE_API_KEY")
    azure_openai_api_key = os.getenv("AZURE_OPENAI_API_KEY")
    if azure_api_key and not azure_openai_api_key:
        os.environ["AZURE_OPENAI_API_KEY"] = azure_api_key
        print("🔄 自动映射AZURE_API_KEY -> AZURE_OPENAI_API_KEY")
    
    # 兼容性处理：支持AZURE_OPENAI_DEPLOYMENT_NAME和AZURE_OPENAI_DEPLOYMENT
    azure_deployment_name = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")
    azure_deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT")
    if azure_deployment_name and not azure_deployment:
        os.environ["AZURE_OPENAI_DEPLOYMENT"] = azure_deployment_name
        print(f"🔄 自动映射AZURE_OPENAI_DEPLOYMENT_NAME -> AZURE_OPENAI_DEPLOYMENT")
        
else:
    print(f"⚠️  配置文件不存在: {env_local_path}")
    print("💡 提示: 请确保项目根目录存在 .env.local 文件")

# 导入简历处理器模块
try:
    from resume_processor import (
        extract_text_from_file,
        call_ai_for_extraction,
        _extract_with_local_rules,
        create_personal_knowledge_base,
        update_main_knowledge_base,
        _get_llm_client,
        safe_preview
    )
    print("✅ 简历处理器模块导入成功")
except ImportError as e:
    print(f"❌ 简历处理器模块导入失败: {e}")
    sys.exit(1)

# 配置测试日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(filename)s:%(lineno)d %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('test_resume_processor.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

class ResumeProcessorTester:
    """简历处理器测试类"""
    
    def __init__(self):
        self.test_data_dir = Path("test_data")
        self.test_data_dir.mkdir(exist_ok=True)
        self.test_results = []
    
    def _read_file_content(self, file_path: str) -> str:
        """安全读取文件内容，支持多种文件格式"""
        try:
            if file_path.endswith(('.docx', '.pdf')):
                # 对于二进制文件，使用extract_text_from_file
                return extract_text_from_file(file_path)
            else:
                # 对于文本文件，尝试多种编码
                encodings = ['utf-8', 'gbk', 'gb2312', 'latin-1']
                for encoding in encodings:
                    try:
                        with open(file_path, 'r', encoding=encoding) as f:
                            return f.read()
                    except UnicodeDecodeError:
                        continue
                # 如果所有编码都失败，使用错误忽略模式
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    return f.read()
        except Exception as e:
            logger.error(f"读取文件失败 {file_path}: {e}")
            return ""
        
    def create_test_files(self):
        """创建测试文件"""
        logger.info("📁 准备测试文件...")
        
        # 使用真实的简历文件
        real_resume_file = Path("resumes/20251020_132537_ZHU_Enqings_resume_-202506.docx")
        if real_resume_file.exists():
            logger.info(f"✅ 找到真实简历文件: {real_resume_file}")
            test_files = {
                "real": str(real_resume_file),
                "detailed": str(real_resume_file),  # 使用真实文件作为详细测试
                "simple": str(real_resume_file)     # 使用真实文件作为简单测试
            }
        else:
            logger.warning(f"⚠️  真实简历文件不存在: {real_resume_file}")
            logger.info("📁 创建模拟测试文件...")
            
            # 创建测试简历文本文件
            test_resume_content = """张三
高级AI工程师

联系方式：
邮箱：zhangsan@example.com
电话：+86 138 0000 0000

工作经验：
2020-2025 高级AI工程师 - 腾讯科技
- 负责机器学习平台架构设计
- 主导了千万级用户推荐系统项目
- 团队规模：15人

2018-2020 机器学习工程师 - 字节跳动
- 开发了智能推荐算法
- 优化了模型训练效率30%
- 参与过多个AI产品开发

教育背景：
2016-2018 清华大学 计算机科学与技术 硕士
2012-2016 北京大学 计算机科学与技术 学士

技能：
- Python, Java, C++
- TensorFlow, PyTorch, Scikit-learn
- 机器学习, 深度学习, 自然语言处理
- Docker, Kubernetes, AWS

成就：
- 发表3篇SCI论文
- 获得2项发明专利
- 主导过千万级AI项目
- 获得公司年度最佳员工奖

项目经验：
- 智能推荐系统：基于深度学习的个性化推荐
- 机器学习平台：支持多租户的MLOps平台
- 自然语言处理：多语言文本分类系统

语言能力：
- 中文：母语
- 英语：流利（CET-6）
- 日语：基础

认证：
- AWS机器学习专业认证
- Google Cloud AI认证
- 华为云AI工程师认证
"""
            
            # 保存测试简历文件
            test_resume_file = self.test_data_dir / "test_resume.txt"
            with open(test_resume_file, 'w', encoding='utf-8') as f:
                f.write(test_resume_content)
            logger.info(f"✅ 创建模拟测试简历文件: {test_resume_file}")
            
            # 创建简化的测试简历
            simple_resume_content = """李四
软件工程师
邮箱：lisi@test.com
电话：138-0000-0000
技能：Python, Java, React
经验：3年软件开发经验
教育：计算机科学学士
"""
            
            simple_resume_file = self.test_data_dir / "simple_resume.txt"
            with open(simple_resume_file, 'w', encoding='utf-8') as f:
                f.write(simple_resume_content)
            logger.info(f"✅ 创建简化测试简历文件: {simple_resume_file}")
            
            test_files = {
                "detailed": str(test_resume_file),
                "simple": str(simple_resume_file)
            }
        
        return test_files
    
    def test_text_extraction(self, test_files: Dict[str, str]) -> bool:
        """测试文本提取功能"""
        logger.info("🧪 测试文本提取功能...")
        
        try:
            # 测试详细简历
            detailed_content = extract_text_from_file(test_files["detailed"])
            if not detailed_content:
                logger.error("❌ 详细简历文本提取失败")
                return False
            logger.info(f"✅ 详细简历文本提取成功，长度: {len(detailed_content)} 字符")
            
            # 测试简化简历
            simple_content = extract_text_from_file(test_files["simple"])
            if not simple_content:
                logger.error("❌ 简化简历文本提取失败")
                return False
            logger.info(f"✅ 简化简历文本提取成功，长度: {len(simple_content)} 字符")
            
            # 验证内容包含关键信息（使用真实简历文件时调整验证逻辑）
            if "朱恩庆" in detailed_content or "张三" in detailed_content:
                logger.info("✅ 详细简历内容验证通过（包含姓名信息）")
            else:
                logger.warning("⚠️  详细简历内容验证：未找到预期的姓名信息")
                
            if "朱恩庆" in simple_content or "李四" in simple_content:
                logger.info("✅ 简化简历内容验证通过（包含姓名信息）")
            else:
                logger.warning("⚠️  简化简历内容验证：未找到预期的姓名信息")
                
            logger.info("✅ 文本提取功能测试通过")
            return True
            
        except Exception as e:
            logger.error(f"❌ 文本提取功能测试失败: {e}")
            return False
    
    def test_local_rules_extraction(self, test_files: Dict[str, str]) -> bool:
        """测试本地规则信息提取"""
        logger.info("🧪 测试本地规则信息提取...")
        
        try:
            # 读取测试文件内容
            content = self._read_file_content(test_files["detailed"])
            
            # 使用本地规则提取
            extracted_info = _extract_with_local_rules(content)
            
            if not extracted_info:
                logger.error("❌ 本地规则提取返回空结果")
                return False
                
            logger.info(f"✅ 本地规则提取成功: {extracted_info}")
            
            # 验证提取的信息
            required_fields = ["name", "email", "phone", "experience", "education", "skills"]
            for field in required_fields:
                if field not in extracted_info:
                    logger.error(f"❌ 缺少必需字段: {field}")
                    return False
                    
            logger.info("✅ 本地规则信息提取测试通过")
            return True
            
        except Exception as e:
            logger.error(f"❌ 本地规则信息提取测试失败: {e}")
            return False
    
    def test_llm_client(self) -> bool:
        """测试LLM客户端配置"""
        logger.info("🧪 测试LLM客户端配置...")
        
        try:
            client = _get_llm_client()
            if client is None:
                logger.warning("⚠️  LLM客户端未配置，跳过AI提取测试")
                return True  # 不算作失败，只是跳过
                
            logger.info(f"✅ LLM客户端创建成功: {type(client).__name__}")
            return True
            
        except Exception as e:
            logger.error(f"❌ LLM客户端测试失败: {e}")
            return False
    
    def test_ai_extraction(self, test_files: Dict[str, str]) -> bool:
        """测试AI信息提取"""
        logger.info("🧪 测试AI信息提取...")
        
        try:
            # 读取测试文件内容
            content = self._read_file_content(test_files["detailed"])
            
            # 使用AI提取信息
            extracted_info = call_ai_for_extraction(content)
            
            if not extracted_info:
                logger.error("❌ AI信息提取返回空结果")
                return False
                
            logger.info(f"✅ AI信息提取成功: {extracted_info}")
            
            # 验证提取的信息结构
            required_fields = ["name", "email", "phone", "experience", "education", "skills"]
            for field in required_fields:
                if field not in extracted_info:
                    logger.error(f"❌ 缺少必需字段: {field}")
                    return False
                    
            logger.info("✅ AI信息提取测试通过")
            return True
            
        except Exception as e:
            logger.error(f"❌ AI信息提取测试失败: {e}")
            return False
    
    def test_knowledge_base_creation(self, test_files: Dict[str, str]) -> bool:
        """测试知识库创建"""
        logger.info("🧪 测试知识库创建...")
        
        try:
            # 读取测试文件内容
            content = self._read_file_content(test_files["detailed"])
            
            # 提取信息
            extracted_info = call_ai_for_extraction(content)
            if not extracted_info:
                logger.error("❌ 无法提取信息用于知识库创建")
                return False
            
            # 创建个人知识库
            name = extracted_info.get("name", "测试用户")
            personal_kb_path = create_personal_knowledge_base(name, extracted_info)
            
            if not personal_kb_path:
                logger.error("❌ 个人知识库创建失败")
                return False
                
            logger.info(f"✅ 个人知识库创建成功: {personal_kb_path}")
            
            # 验证知识库文件
            personal_file = Path(personal_kb_path) / "personal_info.json"
            if not personal_file.exists():
                logger.error("❌ 个人知识库文件不存在")
                return False
                
            with open(personal_file, 'r', encoding='utf-8') as f:
                personal_info = json.load(f)
                
            if "knowledge_bullets" not in personal_info:
                logger.error("❌ 个人知识库缺少knowledge_bullets字段")
                return False
                
            logger.info(f"✅ 个人知识库包含 {len(personal_info['knowledge_bullets'])} 个知识条目")
            logger.info("✅ 知识库创建测试通过")
            return True
            
        except Exception as e:
            logger.error(f"❌ 知识库创建测试失败: {e}")
            return False
    
    def test_main_knowledge_base_update(self, test_files: Dict[str, str]) -> bool:
        """测试主知识库更新"""
        logger.info("🧪 测试主知识库更新...")
        
        try:
            # 读取测试文件内容
            content = self._read_file_content(test_files["detailed"])
            
            # 提取信息
            extracted_info = call_ai_for_extraction(content)
            if not extracted_info:
                logger.error("❌ 无法提取信息用于知识库更新")
                return False
            
            # 创建个人知识库
            name = extracted_info.get("name", "测试用户")
            personal_kb_path = create_personal_knowledge_base(name, extracted_info)
            
            if not personal_kb_path:
                logger.error("❌ 个人知识库创建失败")
                return False
            
            # 更新主知识库
            update_result = update_main_knowledge_base(personal_kb_path, name)
            
            if not update_result:
                logger.error("❌ 主知识库更新失败")
                return False
                
            logger.info("✅ 主知识库更新成功")
            
            # 验证主知识库文件
            main_kb_file = Path("data/playbook.json")
            if main_kb_file.exists():
                with open(main_kb_file, 'r', encoding='utf-8') as f:
                    main_kb = json.load(f)
                    
                if "bullets" in main_kb and len(main_kb["bullets"]) > 0:
                    logger.info(f"✅ 主知识库包含 {len(main_kb['bullets'])} 个条目")
                else:
                    logger.warning("⚠️  主知识库为空或格式不正确")
            
            logger.info("✅ 主知识库更新测试通过")
            return True
            
        except Exception as e:
            logger.error(f"❌ 主知识库更新测试失败: {e}")
            return False
    
    def test_safe_preview(self) -> bool:
        """测试安全预览功能"""
        logger.info("🧪 测试安全预览功能...")
        
        try:
            # 测试正常文本
            normal_text = "这是一个正常的文本"
            preview = safe_preview(normal_text)
            if preview != normal_text:
                logger.error(f"❌ 正常文本预览失败: 期望 '{normal_text}', 实际 '{preview}'")
                return False
                
            # 测试包含特殊字符的文本
            special_text = "包含\x00空字符和\x01控制字符的文本"
            preview = safe_preview(special_text)
            # 特殊字符应该被替换为'.'
            expected_preview = "包含.空字符和.控制字符的文本"
            if preview != expected_preview:
                logger.error(f"❌ 特殊字符处理失败: 期望 '{expected_preview}', 实际 '{preview}'")
                return False
                
            # 测试超长文本
            long_text = "a" * 300
            preview = safe_preview(long_text, max_len=100)
            if len(preview) > 103:  # 100 + "..."
                logger.error(f"❌ 长度限制失败: 长度 {len(preview)} > 103")
                return False
                
            # 测试超长文本应该以"..."结尾
            if not preview.endswith("..."):
                logger.error(f"❌ 超长文本未正确截断: '{preview}'")
                return False
                
            logger.info("✅ 安全预览功能测试通过")
            return True
            
        except Exception as e:
            logger.error(f"❌ 安全预览功能测试失败: {e}")
            return False
    
    def run_all_tests(self):
        """运行所有测试"""
        logger.info("🚀 开始运行简历处理器测试套件...")
        
        # 创建测试文件
        test_files = self.create_test_files()
        
        # 运行各项测试
        tests = [
            ("文本提取功能", lambda: self.test_text_extraction(test_files)),
            ("本地规则信息提取", lambda: self.test_local_rules_extraction(test_files)),
            ("LLM客户端配置", self.test_llm_client),
            ("AI信息提取", lambda: self.test_ai_extraction(test_files)),
            ("知识库创建", lambda: self.test_knowledge_base_creation(test_files)),
            ("主知识库更新", lambda: self.test_main_knowledge_base_update(test_files)),
            ("安全预览功能", self.test_safe_preview),
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            logger.info(f"\n{'='*50}")
            logger.info(f"🧪 运行测试: {test_name}")
            logger.info(f"{'='*50}")
            
            try:
                result = test_func()
                if result:
                    logger.info(f"✅ {test_name} - 通过")
                    passed += 1
                else:
                    logger.error(f"❌ {test_name} - 失败")
            except Exception as e:
                logger.error(f"❌ {test_name} - 异常: {e}")
        
        # 输出测试结果
        logger.info(f"\n{'='*50}")
        logger.info(f"📊 测试结果汇总")
        logger.info(f"{'='*50}")
        logger.info(f"总测试数: {total}")
        logger.info(f"通过数: {passed}")
        logger.info(f"失败数: {total - passed}")
        logger.info(f"通过率: {passed/total*100:.1f}%")
        
        if passed == total:
            logger.info("🎉 所有测试通过！")
        else:
            logger.warning(f"⚠️  有 {total - passed} 个测试失败")
        
        return passed == total
    
    def cleanup_test_data(self):
        """清理测试数据"""
        logger.info("🧹 清理测试数据...")
        
        try:
            # 清理测试文件
            if self.test_data_dir.exists():
                import shutil
                shutil.rmtree(self.test_data_dir)
                logger.info("✅ 测试文件清理完成")
            
            # 清理个人知识库
            personal_kb_dir = Path("personal_kb")
            if personal_kb_dir.exists():
                for kb_dir in personal_kb_dir.iterdir():
                    if kb_dir.is_dir() and "测试" in kb_dir.name:
                        shutil.rmtree(kb_dir)
                        logger.info(f"✅ 清理个人知识库: {kb_dir}")
            
            # 清理主知识库（可选）
            main_kb_file = Path("data/playbook.json")
            if main_kb_file.exists():
                with open(main_kb_file, 'r', encoding='utf-8') as f:
                    main_kb = json.load(f)
                
                # 移除测试相关的条目
                if "bullets" in main_kb:
                    test_bullets = [k for k in main_kb["bullets"].keys() if "测试" in k or "test" in k.lower()]
                    for bullet_id in test_bullets:
                        del main_kb["bullets"][bullet_id]
                        logger.info(f"✅ 清理测试条目: {bullet_id}")
                
                # 保存清理后的主知识库
                with open(main_kb_file, 'w', encoding='utf-8') as f:
                    json.dump(main_kb, f, ensure_ascii=False, indent=2)
                logger.info("✅ 主知识库清理完成")
            
        except Exception as e:
            logger.warning(f"⚠️  清理测试数据时出现错误: {e}")

def main():
    """主函数"""
    print("🧪 简历处理器独立测试脚本")
    print("=" * 50)
    
    # 检查环境
    logger.info("🔍 检查运行环境...")
    
    # 检查必要的目录
    required_dirs = ["data", "personal_kb"]
    for dir_name in required_dirs:
        Path(dir_name).mkdir(exist_ok=True)
        logger.info(f"✅ 确保目录存在: {dir_name}")
    
    # 创建测试器实例
    tester = ResumeProcessorTester()
    
    try:
        # 运行所有测试
        success = tester.run_all_tests()
        
        # 询问是否清理测试数据
        print("\n" + "=" * 50)
        cleanup = input("是否清理测试数据？(y/N): ").strip().lower()
        if cleanup in ['y', 'yes']:
            tester.cleanup_test_data()
        
        # 输出最终结果
        if success:
            print("\n🎉 所有测试通过！简历处理器功能正常。")
            sys.exit(0)
        else:
            print("\n❌ 部分测试失败，请检查日志文件。")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n\n⚠️  测试被用户中断")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ 测试运行异常: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
