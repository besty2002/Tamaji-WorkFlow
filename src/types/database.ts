export type Role = 'employee' | 'manager' | 'admin';
export type LeaveType = 'paid_leave' | 'sick' | 'special' | 'unpaid';
export type LeaveStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled';
export type HalfDayType = 'AM' | 'PM' | null;

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  role: Role;
  created_at: string;
}

export interface LeaveGrant {
  id: string;
  user_id: string;
  days: number;
  reason: string | null;
  granted_by: string | null;
  granted_at: string;
  created_at: string;
}

export interface LeaveRequest {
  id: string;
  user_id: string;
  type: LeaveType;
  start_date: string;
  end_date: string;
  is_half_day: boolean;
  half_day_type: HalfDayType;
  reason: string | null;
  status: LeaveStatus;
  manager_comment: string | null;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile; // For joined queries
}

export interface LeaveBalanceView {
  user_id: string;
  granted_sum: number;
  used_sum: number;
  balance: number;
}
