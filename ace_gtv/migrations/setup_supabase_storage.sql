-- 设置 Supabase Storage 用于存储简历文件
-- 注意：需要在 Supabase Dashboard 的 Storage 页面手动创建 bucket

-- 创建 resumes bucket（如果不存在）
-- 注意：bucket 需要在 Supabase Dashboard 的 Storage 页面手动创建
-- 这里只提供创建策略的 SQL

-- 为 resumes bucket 创建存储策略
-- 先删除可能存在的策略，然后重新创建
DROP POLICY IF EXISTS "Users can upload own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own resumes" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own resumes" ON storage.objects;

-- 允许用户上传自己的文件
CREATE POLICY "Users can upload own resumes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resumes' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 允许用户查看自己的文件
CREATE POLICY "Users can view own resumes"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'resumes' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 允许用户删除自己的文件
CREATE POLICY "Users can delete own resumes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'resumes' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 注意：如果 bucket 不存在，请在 Supabase Dashboard 中：
-- 1. 进入 Storage 页面
-- 2. 点击 "New bucket"
-- 3. 名称填写 "resumes"
-- 4. 设置为 Public（如果需要公开访问）或 Private（如果需要认证访问）

