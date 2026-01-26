#!/usr/bin/env python3
"""
修复Supabase表结构 - 检查并创建正确的表
"""

import os
import sys

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
    
    # 读取SQL文件
    sql_file = Path(__file__).parent / "supabase_schema.sql"
    if not sql_file.exists():
        print(f"❌ SQL文件不存在: {sql_file}")
        sys.exit(1)
    
    print(f"📄 读取SQL文件: {sql_file}")
    sql_content = sql_file.read_text(encoding='utf-8')
    
    print("\n⚠️  请在Supabase Dashboard中执行以下操作:")
    print("1. 登录 https://app.supabase.com")
    print("2. 选择项目")
    print("3. 进入 SQL Editor")
    print("4. 点击 New query")
    print("5. 复制以下SQL并执行:\n")
    print("=" * 60)
    print(sql_content)
    print("=" * 60)
    
    print("\n或者，如果你想删除现有表并重新创建，可以执行:")
    print("DROP TABLE IF EXISTS timeline CASCADE;")
    print("DROP TABLE IF EXISTS progress CASCADE;")
    print("DROP TABLE IF EXISTS documents CASCADE;")
    print("DROP TABLE IF EXISTS cases CASCADE;")
    print("DROP TABLE IF EXISTS clients CASCADE;")
    print("\n然后执行上面的CREATE TABLE语句。")
    
except Exception as e:
    print(f"❌ 错误: {e}")
    import traceback
    traceback.print_exc()

