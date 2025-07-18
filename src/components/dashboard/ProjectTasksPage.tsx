import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTasks } from '../../hooks/useTasks';
import { useProjects } from '../../hooks/useProjects';
import { authService } from '../../services/auth';
import TaskCard from './TaskCard';
import TaskFiltersComponent from './TaskFilters';
import Button from '../ui/Button';
import TaskForm from './TaskForm';

const ProjectTasksPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { tasks, addTask, updateTask, deleteTask, filterTasks } = useTasks();
  const { projects } = useProjects();
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [taskFilters, setTaskFilters] = useState({ project: projectId });
  const filteredTasks = filterTasks({ ...taskFilters, project: projectId });
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);

  React.useEffect(() => {
    authService.getMembers().then(data => {
      setMembers(data.map(m => ({ id: m.id, name: m.name })));
    });
  }, []);

  const handleAddTask = (task) => {
    addTask({ ...task, project_id: projectId });
    setIsTaskFormOpen(false);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Project Tasks</h1>
        <Button onClick={() => setIsTaskFormOpen(true)} variant="primary">Add Task</Button>
      </div>
      <TaskFiltersComponent
        filters={taskFilters}
        onFiltersChange={setTaskFilters}
        showMemberFilter={true}
        members={members}      />
      <div className="grid gap-4">
        {filteredTasks.length === 0 ? (
          <div className="text-gray-500">No tasks for this project.</div>
        ) : (
          filteredTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onDelete={deleteTask}
              onStatusChange={updateTask}
              showUser={true}
            />
          ))
        )}
      </div>
      {/* Add TaskForm modal here if needed */}
      {isTaskFormOpen && (
        <TaskForm
          isOpen={isTaskFormOpen}
          onClose={() => setIsTaskFormOpen(false)}
          onSubmit={handleAddTask}
          initialProjectId={projectId}
        />
      )}
    </div>
  );
};

export default ProjectTasksPage; 