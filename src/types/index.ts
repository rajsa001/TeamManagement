export interface Member {
  id: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  hire_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type User = Member | Admin;

export interface Project {
  id: string;
  name: string;
  description?: string;
  client_name?: string;
  start_date?: string;
  expected_end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  task_name: string;
  description: string;
  due_date: string;
  status: 'pending' | 'not_started' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
  user?: Member;
  project_id?: string;
  project?: Project;
}

export interface Leave {
  id: string;
  user_id: string;
  leave_date: string;
  end_date?: string | null;
  leave_type: 'sick' | 'casual' | 'paid' | 'maternity' | 'paternity' | 'emergency' | 'vacation';
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reason: string;
  approved_by?: string | null;
  approved_at?: string | null;
  notes?: string | null;
  is_half_day?: boolean;
  created_at: string;
  updated_at: string;
  user?: Member;
}

export interface AuthContextType {
  user: (Member & { role: 'member' }) | (Admin & { role: 'admin' }) | null;
  login: (email: string, password: string, role: 'admin' | 'member') => Promise<void>;
  logout: () => void;
  loading: boolean;
  setUser: (user: (Member & { role: 'member' }) | (Admin & { role: 'admin' }) | null) => void;
}

export interface TaskFilters {
  status?: 'not_started' | 'in_progress' | 'completed' | 'pending';
  member?: string;
  dueDateSort?: 'asc' | 'desc';
  search?: string;
  assignedTo?: string;
  project?: string;
}

export interface LeaveFilters {
  member?: string;
  leave_type?: 'sick' | 'casual' | 'paid';
  month?: number;
  year?: number;
}