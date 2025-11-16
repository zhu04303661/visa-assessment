-- 添加用户角色字段到 user_profiles 表
-- 角色类型: guest (游客), client (客户), admin (管理员), super_admin (超级管理员)
-- 默认角色: guest

-- 添加 role 字段
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'guest' CHECK (role IN ('guest', 'client', 'admin', 'super_admin'));

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- 更新现有用户的默认角色（如果还没有设置）
UPDATE user_profiles 
SET role = 'guest' 
WHERE role IS NULL;

-- 为管理员用户添加访问权限策略
-- 先删除可能存在的策略和函数，然后重新创建
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update user roles" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can delete users" ON user_profiles;
DROP FUNCTION IF EXISTS is_admin_user();
DROP FUNCTION IF EXISTS is_super_admin();

-- 创建辅助函数来检查用户角色（使用 SECURITY DEFINER 绕过 RLS，避免递归）
-- 检查是否是管理员或超级管理员
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 检查是否是超级管理员
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 管理员和超级管理员可以查看所有用户
-- 注意：用户总是可以查看自己的资料（通过原有的策略）
CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR SELECT 
    USING (
        auth.uid() = id  -- 用户可以查看自己的资料
        OR is_admin_user()  -- 或者用户是管理员（使用函数避免递归）
    );

-- 管理员和超级管理员可以更新所有用户的角色
CREATE POLICY "Admins can update user roles" ON user_profiles
    FOR UPDATE 
    USING (
        auth.uid() = id  -- 用户可以更新自己的资料
        OR is_admin_user()  -- 或者用户是管理员
    )
    WITH CHECK (
        auth.uid() = id  -- 用户可以更新自己的资料
        OR is_admin_user()  -- 或者用户是管理员
    );

-- 超级管理员可以删除用户（如果需要）
CREATE POLICY "Super admins can delete users" ON user_profiles
    FOR DELETE
    USING (is_super_admin());

