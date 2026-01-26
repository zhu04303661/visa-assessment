-- 修复 RLS 策略无限递归问题
-- 问题：策略在检查权限时需要查询 user_profiles，但查询本身又被策略拦截，导致无限递归

-- 删除有问题的策略
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update user roles" ON user_profiles;
DROP POLICY IF EXISTS "Super admins can delete users" ON user_profiles;

-- 创建一个函数来检查用户角色（避免递归）
CREATE OR REPLACE FUNCTION check_user_role(check_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- 直接查询，不使用策略（通过函数绕过 RLS）
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = check_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建一个函数来检查是否是管理员
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

-- 创建一个函数来检查是否是超级管理员
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

-- 重新创建策略，使用函数避免递归
-- 管理员和超级管理员可以查看所有用户
CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR SELECT 
    USING (
        auth.uid() = id  -- 用户可以查看自己的资料
        OR is_admin_user()  -- 或者用户是管理员
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

