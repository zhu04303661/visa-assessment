#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
配置检查工具
检查.env.local文件中的配置是否正确
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

def check_config():
    """检查配置文件"""
    print("🔍 配置检查工具")
    print("=" * 50)
    
    # 检查配置文件路径
    current_dir = Path(__file__).parent
    project_root = current_dir.parent
    env_local_path = project_root / ".env.local"
    
    print(f"📁 项目根目录: {project_root}")
    print(f"📄 配置文件路径: {env_local_path}")
    
    if not env_local_path.exists():
        print("❌ 配置文件不存在")
        print("💡 提示: 请在项目根目录创建 .env.local 文件")
        return False
    
    print("✅ 配置文件存在")
    
    # 加载配置
    load_dotenv(env_local_path)
    print("✅ 配置文件加载成功")
    
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
    
    # 检查LLM提供商配置
    provider = os.getenv("LLM_PROVIDER", "").upper()
    print(f"\n🤖 LLM提供商: {provider or '未配置'}")
    
    if not provider:
        print("❌ 未配置LLM提供商")
        print("💡 提示: 请在.env.local中设置LLM_PROVIDER或AI_PROVIDER")
        return False
    
    # 根据提供商检查相应配置
    if provider == "OPENAI":
        return check_openai_config()
    elif provider == "AZURE":
        return check_azure_config()
    elif provider == "ANTHROPIC":
        return check_anthropic_config()
    else:
        print(f"❌ 不支持的LLM提供商: {provider}")
        print("💡 支持的提供商: OPENAI, AZURE, ANTHROPIC")
        return False

def check_openai_config():
    """检查OpenAI配置"""
    print("\n🔍 检查OpenAI配置...")
    
    api_key = os.getenv("OPENAI_API_KEY")
    api_base = os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1")
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    
    print(f"🔑 API Key: {'已配置' if api_key else '未配置'}")
    print(f"🌐 API Base: {api_base}")
    print(f"🤖 Model: {model}")
    
    if not api_key:
        print("❌ 未配置OPENAI_API_KEY")
        print("💡 提示: 请在.env.local中设置OPENAI_API_KEY")
        return False
    
    if not api_key.startswith("sk-"):
        print("⚠️  API Key格式可能不正确（应该以'sk-'开头）")
    
    print("✅ OpenAI配置检查通过")
    return True

def check_azure_config():
    """检查Azure OpenAI配置"""
    print("\n🔍 检查Azure OpenAI配置...")
    
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    api_key = os.getenv("AZURE_OPENAI_API_KEY")
    api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview")
    deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT")
    
    print(f"🌐 Endpoint: {endpoint or '未配置'}")
    print(f"🔑 API Key: {'已配置' if api_key else '未配置'}")
    print(f"📅 API Version: {api_version}")
    print(f"🚀 Deployment: {deployment or '未配置'}")
    
    missing_configs = []
    if not endpoint:
        missing_configs.append("AZURE_OPENAI_ENDPOINT")
    if not api_key:
        missing_configs.append("AZURE_OPENAI_API_KEY")
    if not deployment:
        missing_configs.append("AZURE_OPENAI_DEPLOYMENT")
    
    if missing_configs:
        print(f"❌ 缺少配置: {', '.join(missing_configs)}")
        print("💡 提示: 请在.env.local中设置所有必需的Azure配置")
        return False
    
    print("✅ Azure OpenAI配置检查通过")
    return True

def check_anthropic_config():
    """检查Anthropic配置"""
    print("\n🔍 检查Anthropic配置...")
    
    api_key = os.getenv("ANTHROPIC_API_KEY")
    
    print(f"🔑 API Key: {'已配置' if api_key else '未配置'}")
    
    if not api_key:
        print("❌ 未配置ANTHROPIC_API_KEY")
        print("💡 提示: 请在.env.local中设置ANTHROPIC_API_KEY")
        return False
    
    if not api_key.startswith("sk-ant-"):
        print("⚠️  API Key格式可能不正确（应该以'sk-ant-'开头）")
    
    print("✅ Anthropic配置检查通过")
    return True

def check_optional_configs():
    """检查可选配置"""
    print("\n🔍 检查可选配置...")
    
    parse_timeout = os.getenv("PARSE_TIMEOUT_SEC", "15")
    llm_timeout = os.getenv("LLM_TIMEOUT_SEC", "45")
    total_timeout = os.getenv("TOTAL_TIMEOUT_SEC", "60")
    log_level = os.getenv("LOG_LEVEL", "INFO")
    
    print(f"⏱️  解析超时: {parse_timeout}秒")
    print(f"⏱️  LLM超时: {llm_timeout}秒")
    print(f"⏱️  总超时: {total_timeout}秒")
    print(f"📝 日志级别: {log_level}")
    
    print("✅ 可选配置检查完成")

def main():
    """主函数"""
    try:
        # 检查基本配置
        config_ok = check_config()
        
        # 检查可选配置
        check_optional_configs()
        
        print("\n" + "=" * 50)
        if config_ok:
            print("🎉 配置检查通过！可以运行测试了。")
            print("💡 运行命令: python test_resume_processor.py")
        else:
            print("❌ 配置检查失败，请修复配置后重试。")
            print("💡 参考TEST_README.md了解配置详情")
        
        return 0 if config_ok else 1
        
    except Exception as e:
        print(f"❌ 配置检查过程中出现错误: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
