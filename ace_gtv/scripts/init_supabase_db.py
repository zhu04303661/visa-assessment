#!/usr/bin/env python3
"""
Supabase 数据库初始化脚本
生成数据库表结构的 SQL 语句
"""

from supabase_client import get_supabase_manager

def main():
    """生成并显示数据库初始化 SQL"""
    supabase = get_supabase_manager()
    
    result = supabase.init_database_schema()
    
    print("=" * 80)
    print("Supabase 数据库初始化 SQL")
    print("=" * 80)
    print()
    print(result['note'])
    print()
    print("请在 Supabase Dashboard (https://app.supabase.com) 的 SQL Editor 中执行以下语句：")
    print()
    print("=" * 80)
    print(result['sql'])
    print("=" * 80)
    print()
    print("✅ SQL 语句已生成！")
    print()
    print("执行步骤：")
    print("1. 登录 Supabase Dashboard: https://app.supabase.com")
    print("2. 选择您的项目")
    print("3. 进入 SQL Editor")
    print("4. 创建新查询")
    print("5. 复制粘贴上述 SQL 语句")
    print("6. 点击 Run 执行")
    print()
    
    # 同时保存到文件
    sql_file = "supabase_init.sql"
    with open(sql_file, 'w', encoding='utf-8') as f:
        f.write(result['sql'])
    
    print(f"📝 SQL 语句已保存到文件: {sql_file}")

if __name__ == "__main__":
    main()

