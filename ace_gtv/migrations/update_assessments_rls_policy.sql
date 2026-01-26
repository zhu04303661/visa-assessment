-- 更新 assessments 表的 RLS 策略，允许匿名用户插入数据
-- 但只能查看自己的数据（通过 user_id 匹配）

-- 删除旧的策略（如果存在）
DROP POLICY IF EXISTS "Users can view own assessments" ON assessments;
DROP POLICY IF EXISTS "Users can insert own assessments" ON assessments;
DROP POLICY IF EXISTS "Users can update own assessments" ON assessments;
DROP POLICY IF EXISTS "Users can view own assessments by user_id" ON assessments;

-- 允许用户查看自己的评估记录（通过 user_id）
-- 如果 user_id 为 NULL，则任何人都可以查看（匿名用户的记录）
CREATE POLICY "Users can view own assessments by user_id" ON assessments
    FOR SELECT 
    USING (
        user_id IS NULL  -- 匿名用户的记录，任何人都可以查看
        OR (user_id IS NOT NULL AND auth.uid() = user_id)  -- 或者用户只能查看自己的记录
    );

-- 允许任何人插入评估记录（包括匿名用户）
-- 但只能插入自己的 user_id（如果提供了 user_id）
CREATE POLICY "Users can insert own assessments" ON assessments
    FOR INSERT 
    WITH CHECK (
        user_id IS NULL  -- 允许匿名用户（user_id 为 NULL）
        OR (user_id IS NOT NULL AND auth.uid() = user_id)  -- 或者用户只能插入自己的记录
    );

-- 允许用户更新自己的评估记录
CREATE POLICY "Users can update own assessments" ON assessments
    FOR UPDATE
    USING (
        user_id IS NOT NULL AND auth.uid() = user_id
    )
    WITH CHECK (
        user_id IS NOT NULL AND auth.uid() = user_id
    );

