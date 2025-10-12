import type { User } from "@supabase/supabase-js";
import {
  STATUS_TRANSITIONS,
  type Profile,
  type StatusTransition,
  type Ticket,
  type TicketStatus,
} from "./types";

export type UserRole = "admin" | "agent" | "user";

/**
 * Determine whether a given authenticated user can edit a ticket.
 * - Admins and agents can edit any ticket.
 * - Regular users can only edit tickets they created.
 */
/**
 * Check if a user can edit a ticket based on their role and ownership
 */
export function canEditTicket(
  ticket: Ticket,
  user: User | null,
  profile: Profile | null
): boolean {
  if (!user || !profile) return false;

  const userRole = profile.role as UserRole | undefined;
  const role: UserRole = userRole ?? "user";

  if (role === "admin" || role === "agent") return true;

  return ticket.created_by === user.id;
}

/**
 * Determine whether a user (by role and id) can edit a ticket.
 * This is a pure helper when you already have role and userId separately.
 */
export function canUserEditTicket(
  userRole: UserRole,
  userId: string,
  ticket: Ticket
): boolean {
  if (userRole === "admin" || userRole === "agent") return true;
  return ticket.created_by === userId;
}

export interface RolePermissions {
  canManageUsers: boolean;
  canManageAllTickets: boolean;
  canAssignTickets: boolean;
  canViewAllTickets: boolean;
  canDeleteTickets: boolean;
  canManageSettings: boolean;
  canViewAnalytics: boolean;
  canCloseTickets: boolean;
  canEditAnyTicket: boolean;
}

// Define role-based permissions
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    canManageUsers: true,
    canManageAllTickets: true,
    canAssignTickets: true,
    canViewAllTickets: true,
    canDeleteTickets: true,
    canManageSettings: true,
    canViewAnalytics: true,
    canCloseTickets: true,
    canEditAnyTicket: true,
  },
  agent: {
    canManageUsers: false,
    canManageAllTickets: true,
    canAssignTickets: true,
    canViewAllTickets: true,
    canDeleteTickets: true, // Temporarily allow agents to delete tickets for testing
    canManageSettings: false,
    canViewAnalytics: true,
    canCloseTickets: false,
    canEditAnyTicket: true,
  },
  user: {
    canManageUsers: false,
    canManageAllTickets: false,
    canAssignTickets: false,
    canViewAllTickets: false,
    canDeleteTickets: false,
    canManageSettings: false,
    canViewAnalytics: false,
    canCloseTickets: true,
    canEditAnyTicket: false,
  },
};

export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case "admin":
      return "Administrator";
    case "agent":
      return "Support Agent";
    case "user":
      return "User";
    default:
      return "Unknown";
  }
}

export function getRoleColor(role: UserRole): string {
  switch (role) {
    case "admin":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "agent":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "user":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  }
}

export function canUserAccessTicket(
  userRole: UserRole,
  userId: string,
  ticket: { created_by: string; assigned_to?: string | null }
): boolean {
  // Check permissions based on role permissions map first
  const perms = ROLE_PERMISSIONS[userRole];
  if (perms?.canViewAllTickets) {
    return true;
  }
  return ticket.created_by === userId || ticket.assigned_to === userId;
}

// New functions for status transition logic
export function getValidStatusTransitions(
  currentStatus: TicketStatus,
  userRole: UserRole,
  userId: string,
  ticket: { created_by: string; assigned_to?: string | null }
): StatusTransition[] {
  // Get all possible transitions from current status
  const possibleTransitions = STATUS_TRANSITIONS.filter(
    (transition) => transition.from === currentStatus
  );

  // Filter by role permissions and workflow rules
  return possibleTransitions.filter((transition) => {
    // Check if user's role is allowed for this transition
    if (!transition.allowedRoles.includes(userRole)) {
      return false;
    }

    // Additional checks based on workflow rules
    if (userRole === "user") {
      // Users (creators) can only transition their own tickets
      if (ticket.created_by !== userId) {
        return false;
      }
      // Users can transition from:
      // 1. "open" status (to close as trivial)
      // 2. "resolved" status (to accept/reject resolution)
      if (currentStatus !== "open" && currentStatus !== "resolved") {
        return false;
      }
    }

    if (userRole === "agent") {
      // Agents can only transition tickets they are assigned to
      // OR if the ticket is unassigned (for picking up open tickets)
      if (ticket.assigned_to && ticket.assigned_to !== userId) {
        return false;
      }
    }

    // Admins can transition any ticket (no additional restrictions)

    return true;
  });
}

export function canTransitionStatus(
  from: TicketStatus,
  to: TicketStatus,
  userRole: UserRole,
  userId: string,
  ticket: { created_by: string; assigned_to?: string | null }
): boolean {
  const validTransitions = getValidStatusTransitions(
    from,
    userRole,
    userId,
    ticket
  );
  return validTransitions.some((transition) => transition.to === to);
}

export function getStatusDisplayInfo(status: TicketStatus): {
  label: string;
  color: string;
  description: string;
} {
  switch (status) {
    case "open":
      return {
        label: "Open",
        color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        description: "Ticket is open and waiting to be picked up",
      };
    case "in_progress":
      return {
        label: "In Progress",
        color:
          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
        description: "Ticket is being worked on",
      };
    case "resolved":
      return {
        label: "Resolved",
        color:
          "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
        description: "Issue has been resolved, waiting for user confirmation",
      };
    case "reopened":
      return {
        label: "Reopened",
        color:
          "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
        description: "Ticket was reopened and needs attention",
      };
    case "closed":
      return {
        label: "Closed",
        color:
          "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        description: "Ticket is closed and resolved",
      };
    default:
      return {
        label: "Unknown",
        color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
        description: "Unknown status",
      };
  }
}

// Legacy function - keeping for backward compatibility but updating logic
export function getAvailableStatuses(
  userRole: UserRole
): Array<{ value: string; label: string }> {
  // This function is now deprecated in favor of getValidStatusTransitions
  // but keeping it for backward compatibility
  const baseStatuses = [
    { value: "open", label: "Open" },
    { value: "in_progress", label: "In Progress" },
    { value: "resolved", label: "Resolved" },
    { value: "reopened", label: "Reopened" },
  ];

  // Only admins can directly set closed status (for override cases)
  if (userRole === "admin") {
    baseStatuses.push({ value: "closed", label: "Closed" });
  }

  return baseStatuses;
}
