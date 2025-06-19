import { supabase } from '@/lib/supabase';
import type { Template } from '@/types';

export const templatesApi = {
  // Get all public templates
  async getPublicTemplates() {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Template[];
  },

  // Get user's templates
  async getUserTemplates() {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Template[];
  },

  // Get templates by category
  async getTemplatesByCategory(category: string) {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('category', category)
      .eq('is_public', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Template[];
  },

  // Get a specific template
  async getTemplate(id: string) {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data as Template;
  },

  // Create a new template
  async createTemplate(template: Omit<Template, 'id' | 'created_at' | 'updated_at' | 'created_by'>) {
    const user = await supabase.auth.getUser();
    if (!user.data.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('templates')
      .insert({
        ...template,
        created_by: user.data.user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data as Template;
  },

  // Update template
  async updateTemplate(id: string, updates: Partial<Template>) {
    const { data, error } = await supabase
      .from('templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Template;
  },

  // Delete template
  async deleteTemplate(id: string) {
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Search templates
  async searchTemplates(query: string) {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Template[];
  },

  // Export template as different formats
  exportTemplate(template: Template, format: 'json' | 'txt' | 'docx' = 'txt'): Blob {
    let content: string;
    let mimeType: string;

    switch (format) {
      case 'json':
        content = JSON.stringify(template, null, 2);
        mimeType = 'application/json';
        break;
      case 'docx':
        // For now, export as plain text. In a real implementation,
        // you'd use a library like docx to create proper Word documents
        content = template.content;
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      case 'txt':
      default:
        content = template.content;
        mimeType = 'text/plain';
        break;
    }

    return new Blob([content], { type: mimeType });
  },

  // Download template
  downloadTemplate(template: Template, format: 'json' | 'txt' | 'docx' = 'txt'): void {
    const blob = this.exportTemplate(template, format);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = `${template.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // Create a new version of a template
  async createTemplateVersion(templateId: string, updates: Partial<Template>, versionNote?: string) {
    const originalTemplate = await this.getTemplate(templateId);

    // Create a new template as a version
    const versionData = {
      name: `${originalTemplate.name} v${Date.now()}`,
      description: updates.description || originalTemplate.description,
      category: updates.category || originalTemplate.category,
      content: updates.content || originalTemplate.content,
      variables: updates.variables || originalTemplate.variables,
      is_public: updates.is_public ?? originalTemplate.is_public
    };

    return this.createTemplate(versionData);
  }
};
