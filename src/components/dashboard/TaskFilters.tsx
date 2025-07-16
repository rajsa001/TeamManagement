import React from 'react';
import { Filter } from 'lucide-react';
import { TaskFilters } from '../../types';
import Button from '../ui/Button';

interface TaskFiltersProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  showMemberFilter?: boolean;
  members?: { id: string; name: string }[];
  projects?: { id: string; name: string }[];
}

const TaskFiltersComponent: React.FC<TaskFiltersProps> = ({ 
  filters, 
  onFiltersChange, 
  showMemberFilter = false,
  members = [],
  projects = [],
}) => {
  const handleFilterChange = (key: keyof TaskFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value === 'all' ? undefined : value
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-2">
        <Filter className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Filters:</span>
      </div>

      {/* Search input */}
      <div className="flex items-center space-x-2">
        <label className="text-sm text-gray-600">Search:</label>
        <input
          type="text"
          value={filters.search || ''}
          onChange={e => handleFilterChange('search', e.target.value)}
          placeholder="Task name or description"
          className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Assigned To filter */}
      <div className="flex items-center space-x-2">
        <label className="text-sm text-gray-600">Assigned To:</label>
        <select
          value={filters.assignedTo || 'all'}
          onChange={e => handleFilterChange('assignedTo', e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All</option>
          {members.map(member => (
            <option key={member.id} value={member.id}>{member.name}</option>
          ))}
        </select>
      </div>

      {/* Project filter */}
      <div className="flex items-center space-x-2">
        <label className="text-sm text-gray-600">Project:</label>
        <select
          value={filters.project || 'all'}
          onChange={e => handleFilterChange('project', e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All</option>
          {projects.map(project => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center space-x-2">
        <label className="text-sm text-gray-600">Status:</label>
        <select
          value={filters.status || 'all'}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <div className="flex items-center space-x-2">
        <label className="text-sm text-gray-600">Sort by Date:</label>
        <select
          value={filters.dueDateSort || 'asc'}
          onChange={(e) => handleFilterChange('dueDateSort', e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="asc">Due Date (Ascending)</option>
          <option value="desc">Due Date (Descending)</option>
        </select>
      </div>

      {filters.status || filters.dueDateSort !== 'asc' || filters.search || filters.assignedTo || filters.project ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onFiltersChange({})}
        >
          Clear Filters
        </Button>
      ) : null}
    </div>
  );
};

export default TaskFiltersComponent;