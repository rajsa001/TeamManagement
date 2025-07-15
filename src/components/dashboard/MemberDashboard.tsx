import React, { useState } from 'react';
import { Plus, User } from 'lucide-react';
import { useTasks } from '../../hooks/useTasks';
import { useLeaves } from '../../hooks/useLeaves';
import { useAuth } from '../../contexts/AuthContext';
import { TaskFilters } from '../../types';
import Button from '../ui/Button';
import TaskCard from './TaskCard';
import TaskForm from './TaskForm';
import TaskFiltersComponent from './TaskFilters';
import LeaveCalendar from './LeaveCalendar';
import DashboardStats from './DashboardStats';
import Modal from '../ui/Modal';
import LeaveForm from './LeaveForm';
import ProjectCard from './ProjectCard';
import { useProjects } from '../../hooks/useProjects';

interface MemberDashboardProps {
  activeTab: string;
}

const MemberDashboard: React.FC<MemberDashboardProps> = ({ activeTab }) => {
  const { tasks, loading: tasksLoading, addTask, updateTask, deleteTask, filterTasks } = useTasks();
  const { leaves, loading: leavesLoading, error: leavesError, addLeave, updateLeave, deleteLeave } = useLeaves();
  const { user } = useAuth();
  const { projects, loading: projectsLoading, error: projectsError } = useProjects();
  
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [taskFilters, setTaskFilters] = useState<TaskFilters>({});
  const [showProfile, setShowProfile] = useState(false);
  const [editLeave, setEditLeave] = useState(null);
  const [deleteLeaveId, setDeleteLeaveId] = useState<string | null>(null);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const filteredTasks = filterTasks(taskFilters);

  const handleStatusChange = (id: string, status: 'pending' | 'completed' | 'blocked') => {
    updateTask(id, { status });
  };

  const handleEditLeave = (leave) => {
    setEditLeave(leave);
    setEditFormOpen(true);
  };

  const handleUpdateLeave = (updatedLeave) => {
    if (!updatedLeave.id) {
      alert('Leave ID is missing. Cannot update.');
      return;
    }
    updateLeave(updatedLeave.id, {
      leave_date: updatedLeave.leave_date,
      end_date: updatedLeave.end_date,
      leave_type: updatedLeave.leave_type,
      reason: updatedLeave.reason,
    });
    setEditFormOpen(false);
    setEditLeave(null);
  };

  const handleDeleteLeave = (id) => {
    setDeleteLeaveId(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteLeave = () => {
    if (deleteLeaveId) {
      deleteLeave(deleteLeaveId);
      setDeleteLeaveId(null);
      setDeleteConfirmOpen(false);
    }
  };

  if (activeTab === 'dashboard') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
          <button onClick={() => setShowProfile(true)} className="p-2 rounded-full hover:bg-gray-100">
            <User className="w-6 h-6 text-gray-700" />
          </button>
        </div>
        
        <DashboardStats tasks={tasks} leaves={leaves} />
        
        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Tasks</h2>
            <div className="space-y-4">
              {tasks.slice(0, 3).map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onDelete={deleteTask}
                  onStatusChange={handleStatusChange}
                  // Do not pass onUpdate here to hide edit button
                />
              ))}
            </div>
          </div>
          
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Leaves</h2>
            <div className="space-y-2">
              {leaves.slice(0, 3).map(leave => (
                <div key={leave.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">
                        {new Date(leave.leave_date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600">{leave.leave_type} leave</p>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {leave.leave_type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Profile Modal */}
        {showProfile && user && (
          <Modal isOpen={showProfile} onClose={() => setShowProfile(false)} title="My Profile">
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <User className="w-10 h-10 text-blue-600" />
                <div>
                  <div className="text-lg font-bold text-gray-900">{user.name}</div>
                  <div className="text-sm text-gray-600">{user.email}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500">Phone</div>
                  <div className="text-sm text-gray-900">{user.phone || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Department</div>
                  <div className="text-sm text-gray-900">{user.department || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Hire Date</div>
                  <div className="text-sm text-gray-900">{user.hire_date ? new Date(user.hire_date).toLocaleDateString() : '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Active</div>
                  <div className="text-sm text-gray-900">{user.is_active ? 'Yes' : 'No'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Created At</div>
                  <div className="text-sm text-gray-900">{user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Updated At</div>
                  <div className="text-sm text-gray-900">{user.updated_at ? new Date(user.updated_at).toLocaleDateString() : '-'}</div>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  if (activeTab === 'tasks') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
          <Button
            icon={Plus}
            onClick={() => setIsTaskFormOpen(true)}
          >
            Add Task
          </Button>
        </div>

        <TaskFiltersComponent
          filters={taskFilters}
          onFiltersChange={setTaskFilters}
        />

        {tasksLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onDelete={deleteTask}
                onStatusChange={handleStatusChange}
                onUpdate={updateTask}
              />
            ))}
          </div>
        )}

        <TaskForm
          isOpen={isTaskFormOpen}
          onClose={() => setIsTaskFormOpen(false)}
          onSubmit={addTask}
        />
      </div>
    );
  }

  if (activeTab === 'leaves') {
    const today = new Date();
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">My Leaves</h1>
        </div>

        {leavesError && (
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4">
            {leavesError}
          </div>
        )}

        {leavesLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <>
            <LeaveCalendar
              leaves={leaves}
              onAddLeave={addLeave}
            />
            {/* List of all leaves */}
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">All My Leaves</h2>
              <div className="grid gap-4">
                {leaves.length === 0 ? (
                  <div className="text-gray-500">No leaves found.</div>
                ) : (
                  leaves.map(leave => {
                    const leaveDate = new Date(leave.leave_date);
                    const isFuture = leaveDate > today;
                    return (
                      <div key={leave.id} className="p-4 border rounded-lg bg-gray-50 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                          <div className="font-medium text-gray-900">{leave.leave_type.charAt(0).toUpperCase() + leave.leave_type.slice(1)} Leave</div>
                          <div className="text-sm text-gray-600">{new Date(leave.leave_date).toLocaleDateString()} {leave.end_date ? `- ${new Date(leave.end_date).toLocaleDateString()}` : ''}</div>
                          <div className="text-sm text-gray-600">Reason: {leave.reason}</div>
                          <div className="text-sm text-gray-600">Status: {leave.status}</div>
                        </div>
                        <div className="flex gap-2">
                          {isFuture && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleEditLeave(leave)}>
                                Edit
                              </Button>
                              <Button size="sm" variant="danger" onClick={() => handleDeleteLeave(leave.id)}>
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
        {/* Edit and Delete modals will be implemented next */}
        {/* Edit Leave Modal */}
        {editFormOpen && editLeave && (
          <Modal isOpen={editFormOpen} onClose={() => setEditFormOpen(false)} title="Edit Leave">
            <LeaveForm
              isOpen={editFormOpen}
              onClose={() => setEditFormOpen(false)}
              onSubmit={handleUpdateLeave}
              selectedDate={editLeave.leave_date}
              initialData={editLeave}
              noModal={true}
            />
          </Modal>
        )}
        {/* Delete Confirmation Modal */}
        {deleteConfirmOpen && (
          <Modal isOpen={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Delete Leave">
            <div>Are you sure you want to delete this leave?</div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
              <Button variant="danger" onClick={confirmDeleteLeave}>Delete</Button>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  if (activeTab === 'projects') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        </div>
        {projectsError && <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4">{projectsError}</div>}
        {projectsLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map(project => {
              const projectTasks = tasks.filter(task => task.project_id === project.id);
              return (
                <ProjectCard key={project.id} project={project} tasks={projectTasks} />
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default MemberDashboard;