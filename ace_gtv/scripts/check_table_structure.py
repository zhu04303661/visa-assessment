#!/usr/bin/env python3
"""
检查Supabase表结构
"""

import os
import sys

# 加载环境变量
try:
    from dotenv import load_dotenv
    from pathlib import Path
    env_local = Path(__file__).parent.parent / ".env.local"
    if env_local.exists():
        load_dotenv(env_local)
except ImportError:
    pass

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not supabase_url or not supabase_key:
    print("❌ 环境变量未配置")
    sys.exit(1)

try:
    from supabase import create_client
    
    supabase = create_client(supabase_url, supabase_key)
    
    # 尝试查询表结构（通过查询空结果）
    print("检查clients表结构...")
    try:
        result = supabase.table("clients").select("*").limit(0).execute()
        print("✅ clients表存在")
    except Exception as e:
        print(f"❌ clients表查询失败: {e}")
    
    # 尝试插入一条测试数据看看错误信息
    print("\n尝试插入测试数据...")
    try:
        result = supabase.table("clients").insert({
            "name": "测试客户",
            "email": "test@example.com"
        }).execute()
        print("✅ 插入成功")
        # 删除测试数据
        if result.data:
            client_id = result.data[0].get("id")
            supabase.table("clients").delete().eq("id", client_id).execute()
            print("✅ 已删除测试数据")
    except Exception as e:
        print(f"❌ 插入失败: {e}")
        print(f"   错误详情: {e}")
        
except Exception as e:
    print(f"❌ 错误: {e}")
    import traceback
    traceback.print_exc()

