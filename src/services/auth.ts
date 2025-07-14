import { supabase } from '../lib/supabase';
import { Member, Admin } from '../types';

export interface LoginResponse {
  user: (Member & { role: 'member' }) | (Admin & { role: 'admin' });
  token: string;
}

export const authService = {
  async loginMember(email: string, password: string): Promise<LoginResponse> {
    try {
      // For demo purposes, we'll use simple password comparison
      // In production, you'd hash the password and compare with stored hash
      const { data: member, error } = await supabase
        .from('members')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (error || !member) {
        throw new Error('Invalid email or password');
      }

      // In production, use bcrypt to compare password with hash
      // For demo, we'll accept any password
      if (password.length < 6) {
        throw new Error('Invalid email or password');
      }

      // Create a simple token (in production, use JWT)
      const token = btoa(JSON.stringify({ id: member.id, role: 'member', exp: Date.now() + 24 * 60 * 60 * 1000 }));

      return {
        user: { ...member, role: 'member' as const },
        token
      };
    } catch (error) {
      throw new Error('Login failed. Please check your credentials.');
    }
  },

  async loginAdmin(email: string, password: string): Promise<LoginResponse> {
    try {
      const { data: admin, error } = await supabase
        .from('admins')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (error || !admin) {
        throw new Error('Invalid email or password');
      }

      // In production, use bcrypt to compare password with hash
      // For demo, we'll accept any password
      if (password.length < 6) {
        throw new Error('Invalid email or password');
      }

      // Create a simple token (in production, use JWT)
      const token = btoa(JSON.stringify({ id: admin.id, role: 'admin', exp: Date.now() + 24 * 60 * 60 * 1000 }));

      return {
        user: { ...admin, role: 'admin' as const },
        token
      };
    } catch (error) {
      throw new Error('Login failed. Please check your credentials.');
    }
  },

  async createMember(memberData: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    department?: string;
    hire_date?: string;
  }): Promise<Member> {
    try {
      // In production, hash the password with bcrypt
      const password_hash = btoa(memberData.password); // Simple encoding for demo

      const { data: member, error } = await supabase
        .from('members')
        .insert({
          name: memberData.name,
          email: memberData.email,
          password_hash,
          phone: memberData.phone,
          department: memberData.department,
          hire_date: memberData.hire_date,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('Email already exists');
        }
        throw new Error('Failed to create member');
      }

      return member;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to create member');
    }
  },

  async getMembers(): Promise<Member[]> {
    try {
      const { data: members, error } = await supabase
        .from('members')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error('Failed to fetch members');
      }

      return members || [];
    } catch (error) {
      throw new Error('Failed to fetch members');
    }
  },

  validateToken(token: string): boolean {
    try {
      const decoded = JSON.parse(atob(token));
      return decoded.exp > Date.now();
    } catch {
      return false;
    }
  },

  getTokenData(token: string): { id: string; role: 'admin' | 'member' } | null {
    try {
      const decoded = JSON.parse(atob(token));
      if (decoded.exp > Date.now()) {
        return { id: decoded.id, role: decoded.role };
      }
      return null;
    } catch {
      return null;
    }
  }
};