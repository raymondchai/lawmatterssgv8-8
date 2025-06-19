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
  }
};
