import { supabase } from '../lib/supabase';
import { Project } from '../types';

export const projectService = {
  async getProjects(): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error('Failed to fetch projects');
    return data || [];
  },

  async createProject(projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .insert(projectData)
      .select()
      .single();
    if (error) throw new Error('Failed to create project');
    return data;
  },

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error('Failed to update project');
    return data;
  },

  async deleteProject(id: string): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);
    if (error) throw new Error('Failed to delete project');
  },

  async markProjectAsComplete(id: string): Promise<Project> {
    // First, update the project status to completed
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .update({ status: 'completed' })
      .eq('id', id)
      .select()
      .single();
    
    if (projectError) throw new Error('Failed to mark project as complete');
    
    // Then, mark all associated tasks as completed
    const { error: tasksError } = await supabase
      .from('tasks')
      .update({ status: 'completed' })
      .eq('project_id', id);
    
    if (tasksError) {
      console.error('Failed to update associated tasks:', tasksError);
      // Don't throw error here as the project was successfully updated
    }
    
    return projectData;
  }
}; 