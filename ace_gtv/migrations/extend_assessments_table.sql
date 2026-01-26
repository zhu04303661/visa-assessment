-- 扩展 assessments 表，添加更多字段来存储评估数据
-- 包括申请人信息、简历内容、评估结果等

-- 修改 user_id 字段，允许 NULL（支持匿名用户）
ALTER TABLE assessments 
ALTER COLUMN user_id DROP NOT NULL;

-- 添加新字段到 assessments 表
ALTER TABLE assessments 
ADD COLUMN IF NOT EXISTS applicant_name TEXT,
ADD COLUMN IF NOT EXISTS applicant_email TEXT,
ADD COLUMN IF NOT EXISTS applicant_phone TEXT,
ADD COLUMN IF NOT EXISTS field TEXT,
ADD COLUMN IF NOT EXISTS resume_text TEXT,
ADD COLUMN IF NOT EXISTS resume_file_name TEXT,
ADD COLUMN IF NOT EXISTS resume_file_url TEXT,
ADD COLUMN IF NOT EXISTS additional_info TEXT,
ADD COLUMN IF NOT EXISTS overall_score INTEGER,
ADD COLUMN IF NOT EXISTS eligibility_level TEXT,
ADD COLUMN IF NOT EXISTS gtv_pathway TEXT;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_assessments_email ON assessments(applicant_email);
CREATE INDEX IF NOT EXISTS idx_assessments_field ON assessments(field);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(status);
CREATE INDEX IF NOT EXISTS idx_assessments_created_at_desc ON assessments(created_at DESC);

