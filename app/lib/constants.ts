import {
  AlertCircle,
  CheckCheck,
  CheckCircle2,
  Clock,
  RotateCcw,
} from "lucide-react";

// Status configuration
export const statusConfig = {
  open: {
    label: "Open",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: AlertCircle,
    description: "New ticket that needs attention",
  },
  in_progress: {
    label: "In Progress",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: Clock,
    description: "Ticket is being worked on",
  },
  resolved: {
    label: "Resolved",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    icon: CheckCheck,
    description: "Issue has been resolved, awaiting user confirmation",
  },
  reopened: {
    label: "Reopened",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    icon: RotateCcw,
    description: "Ticket was reopened and needs attention",
  },
  closed: {
    label: "Closed",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle2,
    description: "Ticket has been resolved and closed",
  },
} as const;

// Priority configuration
export const priorityConfig = {
  low: {
    label: "Low",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    weight: 1,
    description: "Low priority issue",
  },
  medium: {
    label: "Medium",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    weight: 2,
    description: "Medium priority issue",
  },
  high: {
    label: "High",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    weight: 3,
    description: "High priority issue",
  },
  critical: {
    label: "Critical",
    color: "bg-red-100 text-red-800 border-red-200",
    weight: 4,
    description: "Critical issue requiring immediate attention",
  },
} as const;

// Arrays for form selects and iteration
export const TICKET_STATUSES = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "reopened", label: "Reopened" },
  { value: "closed", label: "Closed" },
] as const;

export const TICKET_PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
] as const;

// File upload configuration
export const fileUploadConfig = {
  maxSizeMB: 10,
  acceptedTypes: [
    "image/*",
    "application/pdf",
    ".doc",
    ".docx",
    ".xlsx",
    ".csv",
    ".txt",
    ".zip",
  ],
  maxFiles: 5,
} as const;

// Form validation rules
export const validationRules = {
  ticket: {
    title: {
      minLength: 3,
      maxLength: 200,
      required: true,
    },
    description: {
      minLength: 10,
      maxLength: 5000,
      required: true,
    },
  },
} as const;

// UI configuration
export const uiConfig = {
  pagination: {
    defaultPageSize: 10,
    pageSizeOptions: [10, 25, 50, 100],
  },
  debounceDelay: 300,
  animationDuration: 200,
} as const;

// Route paths
export const routes = {
  tickets: "/",
  newTicket: "/tickets/new",
  ticketDetail: (id: string) => `/tickets/${id}`,
  login: "/login",
  signup: "/signup",
} as const;

// Status and priority arrays for iteration (legacy)
export const statusOptions = Object.keys(statusConfig) as Array<
  keyof typeof statusConfig
>;
export const priorityOptions = Object.keys(priorityConfig) as Array<
  keyof typeof priorityConfig
>;

// Helper functions for configuration
export const getStatusConfig = (status: keyof typeof statusConfig) =>
  statusConfig[status];
export const getPriorityConfig = (priority: keyof typeof priorityConfig) =>
  priorityConfig[priority];

// Default values
export const defaultTicketValues = {
  status: "open" as const,
  priority: "medium" as const,
  title: "",
  description: "",
} as const;
