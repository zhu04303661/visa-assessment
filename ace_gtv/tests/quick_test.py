#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简历处理器快速测试脚本
只测试基本功能，不涉及AI调用
"""

import os
import sys
from pathlib import Path
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
    
    # 兼容性处理
    ai_provider = os.getenv("AI_PROVIDER", "").lower()
    llm_provider = os.getenv("LLM_PROVIDER", "").upper()
    
    if ai_provider and not llm_provider:
        if ai_provider == "openai":
            os.environ["LLM_PROVIDER"] = "OPENAI"
        elif ai_provider == "azure":
            os.environ["LLM_PROVIDER"] = "AZURE"
        elif ai_provider == "anthropic":
            os.environ["LLM_PROVIDER"] = "ANTHROPIC"
        print(f"🔄 自动映射AI_PROVIDER={ai_provider} -> LLM_PROVIDER={os.environ['LLM_PROVIDER']}")
else:
    print(f"⚠️  配置文件不存在: {env_local_path}")

# 导入简历处理器模块
try:
    from resume_processor import (
        extract_text_from_file,
        _extract_with_local_rules,
        safe_preview
    )
    print("✅ 简历处理器模块导入成功")
except ImportError as e:
    print(f"❌ 简历处理器模块导入失败: {e}")
    sys.exit(1)

def quick_test():
    """快速测试基本功能"""
    print("\n🚀 简历处理器快速测试")
    print("=" * 50)
    
    # 优先使用真实简历文件
    real_resume_file = Path("resumes/20251020_132537_ZHU_Enqings_resume_-202506.docx")
    
    if real_resume_file.exists():
        test_file = real_resume_file
        print(f"📁 使用真实简历文件: {test_file}")
    else:
        print(f"⚠️  真实简历文件不存在: {real_resume_file}")
        print("📁 创建模拟测试文件...")
        
        # 创建测试数据
        test_data_dir = Path("test_data")
        test_data_dir.mkdir(exist_ok=True)
        
        # 创建简单测试简历
        test_resume_content = """张三
软件工程师
邮箱：zhangsan@example.com
电话：138-0000-0000
技能：Python, Java, React
经验：3年软件开发经验
教育：计算机科学学士
"""
        
        test_file = test_data_dir / "quick_test_resume.txt"
        with open(test_file, 'w', encoding='utf-8') as f:
            f.write(test_resume_content)
        
        print(f"📁 创建模拟测试文件: {test_file}")
    
    # 测试1: 文本提取
    print("\n🧪 测试1: 文本提取功能")
    try:
        content = extract_text_from_file(str(test_file))
        if content:
            print(f"✅ 文本提取成功，长度: {len(content)} 字符")
            print(f"📄 内容预览: {content[:100]}...")
        else:
            print("❌ 文本提取失败")
            return False
    except Exception as e:
        print(f"❌ 文本提取异常: {e}")
        return False
    
    # 测试2: 本地规则信息提取
    print("\n🧪 测试2: 本地规则信息提取")
    try:
        extracted_info = _extract_with_local_rules(content)
        if extracted_info:
            print("✅ 本地规则提取成功")
            print(f"📋 提取信息: {extracted_info}")
        else:
            print("❌ 本地规则提取失败")
            return False
    except Exception as e:
        print(f"❌ 本地规则提取异常: {e}")
        return False
    
    # 测试3: 安全预览功能
    print("\n🧪 测试3: 安全预览功能")
    try:
        # 测试正常文本
        normal_text = "正常文本"
        preview = safe_preview(normal_text)
        if preview == normal_text:
            print("✅ 正常文本预览测试通过")
        else:
            print(f"❌ 正常文本预览失败: {preview}")
            return False
        
        # 测试特殊字符
        special_text = "包含\x00特殊字符"
        preview = safe_preview(special_text)
        if "." in preview and "\x00" not in preview:
            print("✅ 特殊字符处理测试通过")
        else:
            print(f"❌ 特殊字符处理失败: {preview}")
            return False
        
        # 测试长度限制
        long_text = "a" * 300
        preview = safe_preview(long_text, max_len=50)
        if len(preview) <= 53 and preview.endswith("..."):
            print("✅ 长度限制测试通过")
        else:
            print(f"❌ 长度限制失败: {len(preview)}")
            return False
            
    except Exception as e:
        print(f"❌ 安全预览测试异常: {e}")
        return False
    
    # 清理测试文件（只清理临时创建的文件）
    if test_file.name.startswith("quick_test_resume"):
        try:
            test_file.unlink()
            print(f"\n🧹 清理临时测试文件: {test_file}")
        except Exception as e:
            print(f"⚠️  清理文件失败: {e}")
    else:
        print(f"\n📄 保留真实简历文件: {test_file}")
    
    print("\n🎉 所有快速测试通过！")
    return True

def main():
    """主函数"""
    try:
        success = quick_test()
        if success:
            print("\n✅ 快速测试完成，简历处理器基本功能正常")
            print("💡 提示: 运行 'python test_resume_processor.py' 进行完整测试")
        else:
            print("\n❌ 快速测试失败，请检查错误信息")
        return 0 if success else 1
    except Exception as e:
        print(f"\n❌ 测试过程中出现异常: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
