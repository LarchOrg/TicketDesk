export type TicketStatus =
  | "open"
  | "in_progress"
  | "resolved"
  | "reopened"
  | "closed";
export type TicketPriority = "low" | "medium" | "high" | "critical";

// Status transition types
export type StatusTransition = {
  from: TicketStatus;
  to: TicketStatus;
  allowedRoles: Array<"user" | "agent" | "admin">;
  label: string;
  description: string;
};

// Define the status transition workflow
export const STATUS_TRANSITIONS: StatusTransition[] = [
  // From open - reviewer/agent can move to in_progress, user can close if trivial
  {
    from: "open",
    to: "in_progress",
    allowedRoles: ["agent", "admin"],
    label: "Start Working",
    description: "Move ticket to in progress (reviewer only)",
  },
  {
    from: "open",
    to: "closed",
    allowedRoles: ["user"],
    label: "Close as Trivial",
    description:
      "Close ticket if resolved without action needed (creator only)",
  },

  // From in_progress - reviewer/agent can move to resolved
  {
    from: "in_progress",
    to: "resolved",
    allowedRoles: ["agent", "admin"],
    label: "Mark Resolved",
    description:
      "Mark work as finished, awaiting user approval (reviewer only)",
  },

  // From resolved - user can approve (close) or reject (reopen)
  {
    from: "resolved",
    to: "closed",
    allowedRoles: ["user"],
    label: "Approve Resolution",
    description: "Accept the resolution and close ticket (creator only)",
  },
  {
    from: "resolved",
    to: "reopened",
    allowedRoles: ["user"],
    label: "Reject Resolution",
    description: "Reject the resolution and reopen ticket (creator only)",
  },

  // From reopened - reviewer/agent can resume work
  {
    from: "reopened",
    to: "in_progress",
    allowedRoles: ["agent", "admin"],
    label: "Resume Work",
    description: "Resume working on the reopened ticket (reviewer only)",
  },

  // Admin override - can transition from closed to any status
  {
    from: "closed",
    to: "open",
    allowedRoles: ["admin"],
    label: "Reopen (Admin)",
    description: "Admin override to reopen closed ticket",
  },
  {
    from: "closed",
    to: "in_progress",
    allowedRoles: ["admin"],
    label: "Resume (Admin)",
    description: "Admin override to resume work on closed ticket",
  },
];

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
  resolved: number;
  reopened: number;
  closed: number;
}

export interface TicketFilters {
  status?: string;
  priority?: string;
  search?: string;
  category?: string;
  assigned_to?: string;
  created_by?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
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

// Utility functions for status transitions
export function getAvailableTransitions(
  currentStatus: TicketStatus,
  userRole: string,
  isCreator: boolean,
  isAssignee: boolean
): StatusTransition[] {
  return STATUS_TRANSITIONS.filter((transition) => {
    if (transition.from !== currentStatus) return false;

    // Creator/user allowed
    if (transition.allowedRoles.includes("user") && isCreator) return true;
    // Assignee/agent allowed
    if (
      transition.allowedRoles.includes("agent") &&
      (isAssignee || userRole === "agent")
    )
      return true;
    // Admin allowed
    if (transition.allowedRoles.includes("admin") && userRole === "admin")
      return true;

    return false;
  });
}

export function canTransitionStatus(
  from: TicketStatus,
  to: TicketStatus,
  userRole: string,
  isCreator: boolean,
  isAssignee: boolean
): boolean {
  const availableTransitions = getAvailableTransitions(
    from,
    userRole,
    isCreator,
    isAssignee
  );
  return availableTransitions.some((transition) => transition.to === to);
}

// Helper function to transform ticket data to match Ticket type
export function transformTicketData(ticketData: any): Ticket {
  return {
    id: ticketData.id,
    title: ticketData.title,
    description: ticketData.description,
    status: ticketData.status as TicketStatus,
    priority: ticketData.priority as TicketPriority,
    created_at: ticketData.created_at,
    updated_at: ticketData.updated_at,
    created_by: ticketData.created_by,
    // assigned_to can be null
    assigned_to: ticketData.assigned_to ?? null,
    // Preserve profiles and legacy fields if present
    created_by_profile: ticketData.created_by_profile,
    assigned_to_profile: ticketData.assigned_to_profile,
    creator_name:
      ticketData.creator_name ?? ticketData.created_by_profile?.name,
    creator_email:
      ticketData.creator_email ?? ticketData.created_by_profile?.email,
    assignee_name:
      ticketData.assignee_name ?? ticketData.assigned_to_profile?.name,
    assignee_email:
      ticketData.assignee_email ?? ticketData.assigned_to_profile?.email,
    category_id: ticketData.category_id,
    category_name: ticketData.category_name,
    tags: ticketData.tags || [],
    attachments: ticketData.attachments || [],
    comments: ticketData.comments || [],
  };
}
