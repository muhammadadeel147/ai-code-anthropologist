-- AI Code Anthropologist Database Schema
-- PostgreSQL 15+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Repositories table
CREATE TABLE IF NOT EXISTS repositories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    owner TEXT NOT NULL,
    language TEXT,
    total_commits INTEGER,
    total_files INTEGER,
    date_created TIMESTAMP,
    last_analyzed TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT status_check CHECK (status IN ('pending', 'analyzing', 'completed', 'failed'))
);

-- Analysis jobs table
CREATE TABLE IF NOT EXISTS analysis_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'queued',
    current_step INTEGER DEFAULT 0,
    total_steps INTEGER DEFAULT 5,
    progress_percentage INTEGER DEFAULT 0,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT job_status_check CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled'))
);

-- ADRs table
CREATE TABLE IF NOT EXISTS adrs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    adr_number TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    date DATE,
    author TEXT,
    commit_hash TEXT,
    complexity_score INTEGER CHECK (complexity_score >= 1 AND complexity_score <= 10),
    impact_score INTEGER CHECK (impact_score >= 1 AND impact_score <= 10),
    file_path TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT adr_status_check CHECK (status IN ('active', 'deprecated', 'superseded', 'experimental')),
    CONSTRAINT unique_adr_per_repo UNIQUE (repository_id, adr_number)
);

-- Knowledge graph nodes
CREATE TABLE IF NOT EXISTS graph_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    node_id TEXT NOT NULL,
    node_type TEXT NOT NULL,
    category TEXT,
    properties JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT node_type_check CHECK (node_type IN ('decision', 'code', 'service', 'module')),
    CONSTRAINT unique_node_per_repo UNIQUE (repository_id, node_id)
);

-- Knowledge graph edges
CREATE TABLE IF NOT EXISTS graph_edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    from_node_id TEXT NOT NULL,
    to_node_id TEXT NOT NULL,
    edge_type TEXT NOT NULL,
    strength TEXT NOT NULL DEFAULT 'medium',
    properties JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT edge_type_check CHECK (edge_type IN ('implements', 'affects', 'imports', 'depends_on', 'supersedes')),
    CONSTRAINT strength_check CHECK (strength IN ('strong', 'medium', 'weak')),
    CONSTRAINT unique_edge_per_repo UNIQUE (repository_id, from_node_id, to_node_id, edge_type)
);

-- Risks table
CREATE TABLE IF NOT EXISTS risks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    risk_id TEXT NOT NULL,
    severity TEXT NOT NULL,
    risk_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    affected_items JSONB DEFAULT '[]',
    mitigation TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT severity_check CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    CONSTRAINT risk_type_check CHECK (risk_type IN ('breaking_change', 'deprecated', 'no_tests', 'unknown_reason', 'technical_debt')),
    CONSTRAINT unique_risk_per_repo UNIQUE (repository_id, risk_id)
);

-- Q&A history table
CREATE TABLE IF NOT EXISTS qa_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer JSONB NOT NULL,
    confidence_score DECIMAL(3, 2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    asked_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_repositories_status ON repositories(status);
CREATE INDEX IF NOT EXISTS idx_repositories_url ON repositories(url);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_repository_id ON analysis_jobs(repository_id);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_status ON analysis_jobs(status);
CREATE INDEX IF NOT EXISTS idx_adrs_repository_id ON adrs(repository_id);
CREATE INDEX IF NOT EXISTS idx_adrs_status ON adrs(status);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_repository_id ON graph_nodes(repository_id);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_node_type ON graph_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_graph_edges_repository_id ON graph_edges(repository_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_from_node ON graph_edges(from_node_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_to_node ON graph_edges(to_node_id);
CREATE INDEX IF NOT EXISTS idx_risks_repository_id ON risks(repository_id);
CREATE INDEX IF NOT EXISTS idx_risks_severity ON risks(severity);
CREATE INDEX IF NOT EXISTS idx_qa_history_repository_id ON qa_history(repository_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_repositories_updated_at BEFORE UPDATE ON repositories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analysis_jobs_updated_at BEFORE UPDATE ON analysis_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_adrs_updated_at BEFORE UPDATE ON adrs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risks_updated_at BEFORE UPDATE ON risks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for development (optional)
-- Uncomment the following lines if you want sample data

-- INSERT INTO repositories (url, name, owner, language, status) VALUES
-- ('https://github.com/expressjs/express', 'express', 'expressjs', 'JavaScript', 'completed');

-- Made with Bob
