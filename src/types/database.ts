export type Role = 'employee' | 'manager' | 'admin';
export type LeaveType = 'paid_leave' | 'sick' | 'special' | 'unpaid';
export type LeaveStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled';
export type HalfDayType = 'AM' | 'PM' | null;

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  role: Role;
  can_view_all_leaves: boolean;
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
  num_days: number;
  reason: string | null;
  status: LeaveStatus;
  attachment_url: string | null; // Added for file attachments
  manager_comment: string | null;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile; // For joined queries
}

export interface PublicHoliday {
  id: string;
  date: string;
  name: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'leave_submitted' | 'leave_approved' | 'leave_rejected' | 'comment_added' | 'system';
  title: string;
  body: string;
  url: string | null;
  read_at: string | null;
  is_email_sent: boolean;
  sent_at: string | null;
  created_at: string;
}

export interface LeaveBalanceView {
  user_id: string;
  granted_sum: number;
  used_sum: number;
  balance: number;
}
