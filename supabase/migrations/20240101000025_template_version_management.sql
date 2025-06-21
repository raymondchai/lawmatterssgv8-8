-- Template Version Management System
-- This migration adds comprehensive version control for templates with change tracking and rollback capabilities

-- Template Versions Table
CREATE TABLE IF NOT EXISTS template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    version_number TEXT NOT NULL, -- e.g., "1.0.0", "1.1.0", "2.0.0"
    major_version INTEGER NOT NULL DEFAULT 1,
    minor_version INTEGER NOT NULL DEFAULT 0,
    patch_version INTEGER NOT NULL DEFAULT 0,
    is_current BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived', 'deprecated')),
    
    -- Version content (snapshot of template at this version)
    title TEXT NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    fields JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    
    -- Change tracking
    change_summary TEXT,
    change_details JSONB DEFAULT '{}',
    breaking_changes BOOLEAN DEFAULT FALSE,
    migration_notes TEXT,
    
    -- Author and approval
    created_by UUID NOT NULL REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    
    -- Ensure unique version numbers per template
    UNIQUE(template_id, version_number),
    UNIQUE(template_id, major_version, minor_version, patch_version)
);

-- Template Change Log Table
CREATE TABLE IF NOT EXISTS template_change_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    version_id UUID NOT NULL REFERENCES template_versions(id) ON DELETE CASCADE,
    change_type TEXT NOT NULL CHECK (change_type IN ('created', 'updated', 'published', 'archived', 'restored', 'deleted')),
    field_changed TEXT, -- specific field that was changed
    old_value TEXT,
    new_value TEXT,
    change_reason TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template Version Dependencies Table (for templates that reference other templates)
CREATE TABLE IF NOT EXISTS template_version_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_version_id UUID NOT NULL REFERENCES template_versions(id) ON DELETE CASCADE,
    depends_on_template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    depends_on_version_id UUID REFERENCES template_versions(id) ON DELETE SET NULL,
    dependency_type TEXT NOT NULL CHECK (dependency_type IN ('includes', 'extends', 'references')),
    is_required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template Version Comments Table (for review and collaboration)
CREATE TABLE IF NOT EXISTS template_version_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES template_versions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    comment_text TEXT NOT NULL,
    comment_type TEXT DEFAULT 'general' CHECK (comment_type IN ('general', 'suggestion', 'issue', 'approval', 'rejection')),
    line_number INTEGER, -- for line-specific comments
    field_name TEXT, -- for field-specific comments
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add version tracking columns to main templates table
DO $$ 
BEGIN
    -- Add current_version_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'templates' AND column_name = 'current_version_id') THEN
        ALTER TABLE templates ADD COLUMN current_version_id UUID REFERENCES template_versions(id);
    END IF;
    
    -- Add version_count if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'templates' AND column_name = 'version_count') THEN
        ALTER TABLE templates ADD COLUMN version_count INTEGER DEFAULT 1;
    END IF;
    
    -- Add last_published_version_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'templates' AND column_name = 'last_published_version_id') THEN
        ALTER TABLE templates ADD COLUMN last_published_version_id UUID REFERENCES template_versions(id);
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_template_versions_template_id ON template_versions(template_id);
CREATE INDEX IF NOT EXISTS idx_template_versions_version_number ON template_versions(template_id, version_number);
CREATE INDEX IF NOT EXISTS idx_template_versions_status ON template_versions(status);
CREATE INDEX IF NOT EXISTS idx_template_versions_is_current ON template_versions(template_id, is_current);
CREATE INDEX IF NOT EXISTS idx_template_versions_is_published ON template_versions(template_id, is_published);
CREATE INDEX IF NOT EXISTS idx_template_versions_created_by ON template_versions(created_by);

CREATE INDEX IF NOT EXISTS idx_template_change_log_template_id ON template_change_log(template_id);
CREATE INDEX IF NOT EXISTS idx_template_change_log_version_id ON template_change_log(version_id);
CREATE INDEX IF NOT EXISTS idx_template_change_log_user_id ON template_change_log(user_id);
CREATE INDEX IF NOT EXISTS idx_template_change_log_created_at ON template_change_log(created_at);

CREATE INDEX IF NOT EXISTS idx_template_version_dependencies_template_version_id ON template_version_dependencies(template_version_id);
CREATE INDEX IF NOT EXISTS idx_template_version_dependencies_depends_on_template_id ON template_version_dependencies(depends_on_template_id);

CREATE INDEX IF NOT EXISTS idx_template_version_comments_version_id ON template_version_comments(version_id);
CREATE INDEX IF NOT EXISTS idx_template_version_comments_user_id ON template_version_comments(user_id);

-- Function to create a new template version
CREATE OR REPLACE FUNCTION create_template_version(
    p_template_id UUID,
    p_title TEXT,
    p_description TEXT,
    p_content TEXT,
    p_fields JSONB,
    p_change_summary TEXT,
    p_change_details JSONB,
    p_breaking_changes BOOLEAN,
    p_user_id UUID,
    p_version_type TEXT DEFAULT 'minor' -- 'major', 'minor', 'patch'
) RETURNS UUID AS $$
DECLARE
    v_current_version template_versions%ROWTYPE;
    v_new_major INTEGER;
    v_new_minor INTEGER;
    v_new_patch INTEGER;
    v_new_version_number TEXT;
    v_new_version_id UUID;
BEGIN
    -- Get current version
    SELECT * INTO v_current_version
    FROM template_versions
    WHERE template_id = p_template_id AND is_current = TRUE
    ORDER BY major_version DESC, minor_version DESC, patch_version DESC
    LIMIT 1;
    
    -- Calculate new version numbers
    IF v_current_version.id IS NULL THEN
        -- First version
        v_new_major := 1;
        v_new_minor := 0;
        v_new_patch := 0;
    ELSE
        CASE p_version_type
            WHEN 'major' THEN
                v_new_major := v_current_version.major_version + 1;
                v_new_minor := 0;
                v_new_patch := 0;
            WHEN 'minor' THEN
                v_new_major := v_current_version.major_version;
                v_new_minor := v_current_version.minor_version + 1;
                v_new_patch := 0;
            WHEN 'patch' THEN
                v_new_major := v_current_version.major_version;
                v_new_minor := v_current_version.minor_version;
                v_new_patch := v_current_version.patch_version + 1;
        END CASE;
    END IF;
    
    v_new_version_number := v_new_major || '.' || v_new_minor || '.' || v_new_patch;
    
    -- Mark current version as not current
    UPDATE template_versions 
    SET is_current = FALSE 
    WHERE template_id = p_template_id AND is_current = TRUE;
    
    -- Create new version
    INSERT INTO template_versions (
        template_id, version_number, major_version, minor_version, patch_version,
        is_current, title, description, content, fields,
        change_summary, change_details, breaking_changes, created_by
    ) VALUES (
        p_template_id, v_new_version_number, v_new_major, v_new_minor, v_new_patch,
        TRUE, p_title, p_description, p_content, p_fields,
        p_change_summary, p_change_details, p_breaking_changes, p_user_id
    ) RETURNING id INTO v_new_version_id;
    
    -- Update template version count and current version
    UPDATE templates 
    SET 
        version_count = version_count + 1,
        current_version_id = v_new_version_id,
        updated_at = NOW()
    WHERE id = p_template_id;
    
    -- Log the change
    INSERT INTO template_change_log (
        template_id, version_id, change_type, change_reason, user_id
    ) VALUES (
        p_template_id, v_new_version_id, 'created', p_change_summary, p_user_id
    );
    
    RETURN v_new_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to publish a template version
CREATE OR REPLACE FUNCTION publish_template_version(
    p_version_id UUID,
    p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_template_id UUID;
BEGIN
    -- Get template ID and update version status
    UPDATE template_versions 
    SET 
        status = 'published',
        is_published = TRUE,
        approved_by = p_user_id,
        approved_at = NOW(),
        published_at = NOW()
    WHERE id = p_version_id
    RETURNING template_id INTO v_template_id;
    
    IF v_template_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Update template's last published version
    UPDATE templates 
    SET last_published_version_id = p_version_id
    WHERE id = v_template_id;
    
    -- Log the change
    INSERT INTO template_change_log (
        template_id, version_id, change_type, user_id
    ) VALUES (
        v_template_id, p_version_id, 'published', p_user_id
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to rollback to a previous version
CREATE OR REPLACE FUNCTION rollback_template_version(
    p_template_id UUID,
    p_target_version_id UUID,
    p_user_id UUID,
    p_reason TEXT
) RETURNS UUID AS $$
DECLARE
    v_target_version template_versions%ROWTYPE;
    v_new_version_id UUID;
BEGIN
    -- Get target version details
    SELECT * INTO v_target_version
    FROM template_versions
    WHERE id = p_target_version_id AND template_id = p_template_id;
    
    IF v_target_version.id IS NULL THEN
        RAISE EXCEPTION 'Target version not found';
    END IF;
    
    -- Create new version based on target version
    SELECT create_template_version(
        p_template_id,
        v_target_version.title,
        v_target_version.description,
        v_target_version.content,
        v_target_version.fields,
        'Rollback to version ' || v_target_version.version_number || ': ' || COALESCE(p_reason, 'No reason provided'),
        jsonb_build_object('rollback_from_version', v_target_version.version_number),
        FALSE,
        p_user_id,
        'patch'
    ) INTO v_new_version_id;
    
    -- Log the rollback
    INSERT INTO template_change_log (
        template_id, version_id, change_type, change_reason, user_id
    ) VALUES (
        p_template_id, v_new_version_id, 'restored', 
        'Rolled back to version ' || v_target_version.version_number, p_user_id
    );
    
    RETURN v_new_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_version_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_version_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for template_versions
CREATE POLICY "Anyone can view published template versions" ON template_versions
    FOR SELECT USING (status = 'published' OR is_published = TRUE);

CREATE POLICY "Template creators can manage their template versions" ON template_versions
    FOR ALL USING (
        created_by = auth.uid() OR 
        template_id IN (SELECT id FROM templates WHERE created_by = auth.uid())
    );

-- RLS Policies for template_change_log
CREATE POLICY "Anyone can view template change logs for published templates" ON template_change_log
    FOR SELECT USING (
        template_id IN (
            SELECT id FROM templates WHERE access_level = 'public'
        )
    );

CREATE POLICY "Template creators can view all change logs for their templates" ON template_change_log
    FOR SELECT USING (
        template_id IN (SELECT id FROM templates WHERE created_by = auth.uid())
    );

CREATE POLICY "Users can create change log entries" ON template_change_log
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for template_version_comments
CREATE POLICY "Users can view comments on template versions they have access to" ON template_version_comments
    FOR SELECT USING (
        version_id IN (
            SELECT tv.id FROM template_versions tv
            JOIN templates t ON tv.template_id = t.id
            WHERE tv.status = 'published' OR t.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can create comments" ON template_version_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON template_version_comments
    FOR UPDATE USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON template_versions TO authenticated;
GRANT ALL ON template_change_log TO authenticated;
GRANT ALL ON template_version_dependencies TO authenticated;
GRANT ALL ON template_version_comments TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION create_template_version(UUID, TEXT, TEXT, TEXT, JSONB, TEXT, JSONB, BOOLEAN, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION publish_template_version(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION rollback_template_version(UUID, UUID, UUID, TEXT) TO authenticated;

-- Create initial versions for existing templates
INSERT INTO template_versions (
    template_id, version_number, major_version, minor_version, patch_version,
    is_current, is_published, status, title, description, content, fields,
    change_summary, created_by, published_at
)
SELECT 
    t.id,
    '1.0.0',
    1, 0, 0,
    TRUE, TRUE, 'published',
    t.title,
    t.description,
    t.content,
    COALESCE(t.fields, '[]'::jsonb),
    'Initial version',
    t.created_by,
    t.created_at
FROM templates t
WHERE NOT EXISTS (
    SELECT 1 FROM template_versions tv WHERE tv.template_id = t.id
);

-- Update templates table with current version references
UPDATE templates t
SET 
    current_version_id = tv.id,
    last_published_version_id = tv.id,
    version_count = 1
FROM template_versions tv
WHERE t.id = tv.template_id 
    AND tv.version_number = '1.0.0'
    AND t.current_version_id IS NULL;

-- Add triggers for automatic timestamp updates
CREATE TRIGGER update_template_versions_updated_at
    BEFORE UPDATE ON template_versions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_version_comments_updated_at
    BEFORE UPDATE ON template_version_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
