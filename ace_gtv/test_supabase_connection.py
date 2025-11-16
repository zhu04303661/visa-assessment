#!/usr/bin/env python3
"""
测试Supabase数据库连接
"""

import os
import sys
from pathlib import Path

# 尝试加载环境变量
try:
    from dotenv import load_dotenv
    env_local = Path(__file__).parent.parent / ".env.local"
    if env_local.exists():
        load_dotenv(env_local)
        print(f"✅ 已加载环境变量文件: {env_local}")
except ImportError:
    print("⚠️  python-dotenv未安装，使用系统环境变量")

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

print(f"\n配置检查:")
print(f"  SUPABASE_URL: {supabase_url}")
print(f"  SUPABASE_KEY: {'已配置' if supabase_key else '未配置'}")

if not supabase_url or not supabase_key:
    print("\n❌ 错误: SUPABASE_URL 或 SUPABASE_KEY 未配置")
    print("请在 .env.local 中添加:")
    print("  SUPABASE_URL=https://your-project.supabase.co")
    print("  SUPABASE_KEY=your-anon-key")
    sys.exit(1)

try:
    from supabase import create_client, Client
    
    print(f"\n正在连接Supabase...")
    supabase: Client = create_client(supabase_url, supabase_key)
    print("✅ Supabase客户端创建成功")
    
    # 测试查询clients表
    print("\n测试查询clients表...")
    try:
        result = supabase.table("clients").select("*").limit(1).execute()
        print(f"✅ 成功查询clients表，当前有 {len(result.data)} 条记录（限制1条）")
    except Exception as e:
        if "relation" in str(e).lower() or "does not exist" in str(e).lower():
            print("⚠️  clients表不存在，需要先创建数据库表")
            print("   请在Supabase SQL Editor中执行 ace_gtv/supabase_schema.sql")
        else:
            print(f"❌ 查询失败: {e}")
            raise
    
    # 测试查询cases表
    print("\n测试查询cases表...")
    try:
        result = supabase.table("cases").select("*").limit(1).execute()
        print(f"✅ 成功查询cases表，当前有 {len(result.data)} 条记录（限制1条）")
    except Exception as e:
        if "relation" in str(e).lower() or "does not exist" in str(e).lower():
            print("⚠️  cases表不存在，需要先创建数据库表")
        else:
            print(f"❌ 查询失败: {e}")
    
    print("\n✅ Supabase连接测试完成！")
    
except ImportError:
    print("\n❌ 错误: supabase模块未安装")
    print("请运行: pip install supabase")
    sys.exit(1)
except Exception as e:
    print(f"\n❌ 连接失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

