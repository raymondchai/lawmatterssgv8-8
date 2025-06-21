import { supabase } from '@/lib/supabase';

export interface TemplateVersion {
  id: string;
  templateId: string;
  versionNumber: string;
  majorVersion: number;
  minorVersion: number;
  patchVersion: number;
  isCurrent: boolean;
  isPublished: boolean;
  status: 'draft' | 'review' | 'published' | 'archived' | 'deprecated';
  
  // Content
  title: string;
  description?: string;
  content: string;
  fields: any[];
  metadata: Record<string, any>;
  
  // Change tracking
  changeSummary?: string;
  changeDetails: Record<string, any>;
  breakingChanges: boolean;
  migrationNotes?: string;
  
  // Author and approval
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface TemplateChangeLog {
  id: string;
  templateId: string;
  versionId: string;
  changeType: 'created' | 'updated' | 'published' | 'archived' | 'restored' | 'deleted';
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
  changeReason?: string;
  userId: string;
  createdAt: Date;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface TemplateVersionComment {
  id: string;
  versionId: string;
  userId: string;
  commentText: string;
  commentType: 'general' | 'suggestion' | 'issue' | 'approval' | 'rejection';
  lineNumber?: number;
  fieldName?: string;
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface CreateVersionParams {
  templateId: string;
  title: string;
  description?: string;
  content: string;
  fields: any[];
  changeSummary: string;
  changeDetails?: Record<string, any>;
  breakingChanges?: boolean;
  versionType?: 'major' | 'minor' | 'patch';
}

class TemplateVersionManagementService {
  /**
   * Get all versions for a template
   */
  async getTemplateVersions(templateId: string): Promise<TemplateVersion[]> {
    const { data, error } = await supabase
      .from('template_versions')
      .select(`
        *,
        created_by_user:profiles!template_versions_created_by_fkey(id, email, first_name, last_name),
        approved_by_user:profiles!template_versions_approved_by_fkey(id, email, first_name, last_name)
      `)
      .eq('template_id', templateId)
      .order('major_version', { ascending: false })
      .order('minor_version', { ascending: false })
      .order('patch_version', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch template versions: ${error.message}`);
    }

    return data.map(this.transformVersionData);
  }

  /**
   * Get a specific template version
   */
  async getTemplateVersion(versionId: string): Promise<TemplateVersion | null> {
    const { data, error } = await supabase
      .from('template_versions')
      .select(`
        *,
        created_by_user:profiles!template_versions_created_by_fkey(id, email, first_name, last_name),
        approved_by_user:profiles!template_versions_approved_by_fkey(id, email, first_name, last_name)
      `)
      .eq('id', versionId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch template version: ${error.message}`);
    }

    return data ? this.transformVersionData(data) : null;
  }

  /**
   * Get current version of a template
   */
  async getCurrentVersion(templateId: string): Promise<TemplateVersion | null> {
    const { data, error } = await supabase
      .from('template_versions')
      .select(`
        *,
        created_by_user:profiles!template_versions_created_by_fkey(id, email, first_name, last_name),
        approved_by_user:profiles!template_versions_approved_by_fkey(id, email, first_name, last_name)
      `)
      .eq('template_id', templateId)
      .eq('is_current', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch current version: ${error.message}`);
    }

    return data ? this.transformVersionData(data) : null;
  }

  /**
   * Create a new template version
   */
  async createVersion(params: CreateVersionParams, userId: string): Promise<string> {
    const { data, error } = await supabase.rpc('create_template_version', {
      p_template_id: params.templateId,
      p_title: params.title,
      p_description: params.description || null,
      p_content: params.content,
      p_fields: JSON.stringify(params.fields),
      p_change_summary: params.changeSummary,
      p_change_details: JSON.stringify(params.changeDetails || {}),
      p_breaking_changes: params.breakingChanges || false,
      p_user_id: userId,
      p_version_type: params.versionType || 'minor'
    });

    if (error) {
      throw new Error(`Failed to create template version: ${error.message}`);
    }

    return data;
  }

  /**
   * Publish a template version
   */
  async publishVersion(versionId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('publish_template_version', {
      p_version_id: versionId,
      p_user_id: userId
    });

    if (error) {
      throw new Error(`Failed to publish template version: ${error.message}`);
    }

    return data;
  }

  /**
   * Rollback to a previous version
   */
  async rollbackToVersion(
    templateId: string, 
    targetVersionId: string, 
    userId: string, 
    reason?: string
  ): Promise<string> {
    const { data, error } = await supabase.rpc('rollback_template_version', {
      p_template_id: templateId,
      p_target_version_id: targetVersionId,
      p_user_id: userId,
      p_reason: reason || 'No reason provided'
    });

    if (error) {
      throw new Error(`Failed to rollback template version: ${error.message}`);
    }

    return data;
  }

  /**
   * Get template change log
   */
  async getChangeLog(templateId: string, limit = 50): Promise<TemplateChangeLog[]> {
    const { data, error } = await supabase
      .from('template_change_log')
      .select(`
        *,
        user:profiles!template_change_log_user_id_fkey(id, email, first_name, last_name),
        version:template_versions!template_change_log_version_id_fkey(version_number)
      `)
      .eq('template_id', templateId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch change log: ${error.message}`);
    }

    return data.map(item => ({
      id: item.id,
      templateId: item.template_id,
      versionId: item.version_id,
      changeType: item.change_type,
      fieldChanged: item.field_changed,
      oldValue: item.old_value,
      newValue: item.new_value,
      changeReason: item.change_reason,
      userId: item.user_id,
      createdAt: new Date(item.created_at),
      user: item.user ? {
        id: item.user.id,
        email: item.user.email,
        firstName: item.user.first_name,
        lastName: item.user.last_name
      } : undefined
    }));
  }

  /**
   * Compare two template versions
   */
  async compareVersions(versionId1: string, versionId2: string): Promise<{
    version1: TemplateVersion;
    version2: TemplateVersion;
    differences: {
      field: string;
      type: 'added' | 'removed' | 'modified';
      oldValue?: any;
      newValue?: any;
    }[];
  }> {
    const [version1, version2] = await Promise.all([
      this.getTemplateVersion(versionId1),
      this.getTemplateVersion(versionId2)
    ]);

    if (!version1 || !version2) {
      throw new Error('One or both versions not found');
    }

    const differences = this.calculateDifferences(version1, version2);

    return {
      version1,
      version2,
      differences
    };
  }

  /**
   * Get version comments
   */
  async getVersionComments(versionId: string): Promise<TemplateVersionComment[]> {
    const { data, error } = await supabase
      .from('template_version_comments')
      .select(`
        *,
        user:profiles!template_version_comments_user_id_fkey(id, email, first_name, last_name),
        resolved_by_user:profiles!template_version_comments_resolved_by_fkey(id, email, first_name, last_name)
      `)
      .eq('version_id', versionId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch version comments: ${error.message}`);
    }

    return data.map(item => ({
      id: item.id,
      versionId: item.version_id,
      userId: item.user_id,
      commentText: item.comment_text,
      commentType: item.comment_type,
      lineNumber: item.line_number,
      fieldName: item.field_name,
      isResolved: item.is_resolved,
      resolvedBy: item.resolved_by,
      resolvedAt: item.resolved_at ? new Date(item.resolved_at) : undefined,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at),
      user: item.user ? {
        id: item.user.id,
        email: item.user.email,
        firstName: item.user.first_name,
        lastName: item.user.last_name
      } : undefined
    }));
  }

  /**
   * Add a comment to a version
   */
  async addVersionComment(
    versionId: string,
    userId: string,
    commentText: string,
    commentType: TemplateVersionComment['commentType'] = 'general',
    lineNumber?: number,
    fieldName?: string
  ): Promise<string> {
    const { data, error } = await supabase
      .from('template_version_comments')
      .insert({
        version_id: versionId,
        user_id: userId,
        comment_text: commentText,
        comment_type: commentType,
        line_number: lineNumber,
        field_name: fieldName
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to add comment: ${error.message}`);
    }

    return data.id;
  }

  /**
   * Resolve a comment
   */
  async resolveComment(commentId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('template_version_comments')
      .update({
        is_resolved: true,
        resolved_by: userId,
        resolved_at: new Date().toISOString()
      })
      .eq('id', commentId);

    if (error) {
      throw new Error(`Failed to resolve comment: ${error.message}`);
    }
  }

  /**
   * Transform database version data to our interface
   */
  private transformVersionData(data: any): TemplateVersion {
    return {
      id: data.id,
      templateId: data.template_id,
      versionNumber: data.version_number,
      majorVersion: data.major_version,
      minorVersion: data.minor_version,
      patchVersion: data.patch_version,
      isCurrent: data.is_current,
      isPublished: data.is_published,
      status: data.status,
      title: data.title,
      description: data.description,
      content: data.content,
      fields: data.fields || [],
      metadata: data.metadata || {},
      changeSummary: data.change_summary,
      changeDetails: data.change_details || {},
      breakingChanges: data.breaking_changes,
      migrationNotes: data.migration_notes,
      createdBy: data.created_by,
      approvedBy: data.approved_by,
      approvedAt: data.approved_at ? new Date(data.approved_at) : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      publishedAt: data.published_at ? new Date(data.published_at) : undefined
    };
  }

  /**
   * Calculate differences between two versions
   */
  private calculateDifferences(version1: TemplateVersion, version2: TemplateVersion) {
    const differences: any[] = [];

    // Compare basic fields
    const fieldsToCompare = ['title', 'description', 'content'];
    
    fieldsToCompare.forEach(field => {
      const val1 = (version1 as any)[field];
      const val2 = (version2 as any)[field];
      
      if (val1 !== val2) {
        differences.push({
          field,
          type: 'modified',
          oldValue: val1,
          newValue: val2
        });
      }
    });

    // Compare fields array
    const fields1 = version1.fields || [];
    const fields2 = version2.fields || [];
    
    if (JSON.stringify(fields1) !== JSON.stringify(fields2)) {
      differences.push({
        field: 'fields',
        type: 'modified',
        oldValue: fields1,
        newValue: fields2
      });
    }

    return differences;
  }
}

export const templateVersionManagementService = new TemplateVersionManagementService();
