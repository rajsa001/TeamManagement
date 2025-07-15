import { useState, useEffect } from 'react';
import { Project } from '../types';
import { projectService } from '../services/projects';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await projectService.getProjects();
      setProjects(data);
    } catch (err) {
      setError('Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const addProject = async (projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newProject = await projectService.createProject(projectData);
      setProjects(prev => [newProject, ...prev]);
    } catch (err) {
      setError('Failed to create project');
    }
  };

  return { projects, loading, error, addProject, fetchProjects };
} 