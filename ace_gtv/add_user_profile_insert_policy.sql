-- 添加用户资料插入策略
-- 允许用户创建自己的 user_profiles 记录

-- 先删除可能存在的策略
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- 创建策略：用户只能插入自己的资料
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

