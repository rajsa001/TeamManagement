export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  task_name: string;
  description: string;
  due_date: string;
  status: 'pending' | 'completed' | 'blocked';
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface Leave {
  id: string;
  user_id: string;
  leave_date: string;
  leave_type: 'sick' | 'casual' | 'paid';
  reason: string;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: 'admin' | 'member') => Promise<void>;
  logout: () => void;
  loading: boolean;
}

export interface TaskFilters {
  status?: 'pending' | 'completed' | 'blocked';
  member?: string;
  dueDateSort?: 'asc' | 'desc';
}

export interface LeaveFilters {
  member?: string;
  leave_type?: 'sick' | 'casual' | 'paid';
  month?: number;
  year?: number;
}