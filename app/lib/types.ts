export type TicketStatus = "open" | "in_progress" | "waiting" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "critical";

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  created_at: string;
  updated_at?: string;
  created_by: string;
  assigned_to?: string | null;
  creator_name?: string;
  creator_email?: string;
  assignee_name?: string;
  assignee_email?: string;
  category_id?: string;
  category_name?: string;
  tags?: string[];
  attachments?: Attachment[];
  comments?: Comment[];
  // Profile relationships from joins
  created_by_profile?: Profile;
  assigned_to_profile?: Profile;
}

export interface Profile {
  id: string;
  name?: string;
  email: string;
  avatar_url?: string;
  role?: string;
  created_at: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  id: string;
  ticket_id: string;
  filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
}

export interface Comment {
  id: string;
  ticket_id: string;
  content: string;
  user_id: string;
  comment_type?: string;
  is_internal?: boolean;
  created_at: string;
  updated_at?: string;
  // Profile relationship from joins
  author?: Profile;
  // Legacy fields for backward compatibility
  created_by?: string;
  creator_name?: string;
  creator_email?: string;
}

export interface TicketActivity {
  id: string;
  ticket_id: string;
  action: string;
  details?: string;
  created_by: string;
  created_at: string;
  creator_name?: string;
}

export interface TicketStats {
  total: number;
  open: number;
  in_progress: number;
  waiting: number;
  closed: number;
}

export interface TicketFilters {
  status: string;
  priority: string;
  search: string;
  category?: string;
  assigned_to?: string;
  created_by?: string;
  date_from?: string;
  date_to?: string;
  tags?: string[];
}

export interface TicketQuery {
  filters?: TicketFilters;
  sort?: {
    field: keyof Ticket;
    direction: "asc" | "desc";
  };
  page?: number;
  limit?: number;
  per_page?: number;
  include_stats?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  count?: number;
}

export interface CommentFormData {
  content: string;
  ticket_id: string;
  attachments?: File[];
  comment_type?: string;
  is_internal?: boolean;
  parent_id?: string;
}

export interface TicketFormData {
  title: string;
  description: string;
  priority: TicketPriority;
  status?: TicketStatus;
  category_id?: string;
  category?: string;
  assigned_to?: string;
  tags?: string[];
  due_date?: string;
  userId?: string;
  attachments?: File[];
}

export interface StatTrend {
  value: number;
  isPositive: boolean;
}

export interface DashboardTrends {
  total: StatTrend;
  open: StatTrend;
  in_progress: StatTrend;
  closed: StatTrend;
  waiting?: StatTrend;
}

export interface AppError {
  message: string;
  code?: string;
  details?: any;
}

export interface FormState {
  isSubmitting: boolean;
  error?: string;
  success?: boolean;
}
