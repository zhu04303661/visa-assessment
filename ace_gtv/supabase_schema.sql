-- 英国GTV签证移民律师文案管理系统 - Supabase数据库表结构
-- 请在Supabase Dashboard的SQL Editor中执行此脚本

-- 1. 客户表
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    nationality VARCHAR(100),
    passport_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 案件表
CREATE TABLE IF NOT EXISTS cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    case_type VARCHAR(100) DEFAULT 'GTV',
    visa_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'draft',
    priority VARCHAR(50) DEFAULT 'normal',
    description TEXT,
    target_submission_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 文档表
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    document_type VARCHAR(50) DEFAULT 'raw', -- 'raw' 原始材料, 'processed' 加工后材料
    title VARCHAR(255) NOT NULL,
    content TEXT,
    file_path VARCHAR(500),
    file_type VARCHAR(50),
    file_size BIGINT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 进度表
CREATE TABLE IF NOT EXISTS progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    milestone VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
    description TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 时间规划表
CREATE TABLE IF NOT EXISTS timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    task_name VARCHAR(255) NOT NULL,
    task_type VARCHAR(50) DEFAULT 'document', -- 'document', 'review', 'submission', etc.
    start_date DATE,
    due_date DATE,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'overdue'
    assignee VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_cases_client_id ON cases(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_case_id ON documents(case_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_progress_case_id ON progress(case_id);
CREATE INDEX IF NOT EXISTS idx_timeline_case_id ON timeline(case_id);
CREATE INDEX IF NOT EXISTS idx_timeline_due_date ON timeline(due_date);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为所有表添加更新时间触发器
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_progress_updated_at BEFORE UPDATE ON progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timeline_updated_at BEFORE UPDATE ON timeline
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 启用Row Level Security (RLS) - 根据需要配置
-- ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE timeline ENABLE ROW LEVEL SECURITY;

-- 示例策略（如果需要）
-- CREATE POLICY "Allow all operations for authenticated users" ON clients
--     FOR ALL USING (auth.role() = 'authenticated');

