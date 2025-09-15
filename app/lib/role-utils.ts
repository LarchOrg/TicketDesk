import { useAuth } from "~/auth";

export type UserRole = "admin" | "agent" | "user";

export interface RolePermissions {
  // Basic permissions
  isAdmin: boolean;
  isAgent: boolean;
  isUser: boolean;

  // Specific capabilities
  canManageUsers: boolean;
  canManageAllTickets: boolean;
  canAssignTickets: boolean;
  canViewInternalNotes: boolean;
  canCreateInternalNotes: boolean;
  canDeleteTickets: boolean;
  canViewAnalytics: boolean;
  canManageSettings: boolean;
}

export function useRolePermissions(): RolePermissions {
  const { profile } = useAuth();
  const role = profile?.role || "user";

  // Normalize role to a lowercase string to handle different input types safely
  const normalizedRole = String(role ?? "user").toLowerCase() as UserRole;
  const isAdmin = normalizedRole === "admin";
  const isAgent = normalizedRole === "agent";
  const isUser = normalizedRole === "user";

  return {
    // Basic role checks
    isAdmin,
    isAgent,
    isUser,

    // Specific permissions
    canManageUsers: isAdmin,
    canManageAllTickets: isAdmin || isAgent,
    canAssignTickets: isAdmin || isAgent,
    canViewInternalNotes: isAdmin || isAgent,
    canCreateInternalNotes: isAdmin || isAgent,
    canDeleteTickets: isAdmin,
    canViewAnalytics: isAdmin || isAgent,
    canManageSettings: isAdmin,
  };
}

export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case "admin":
      return "Administrator";
    case "agent":
      return "Support Agent";
    case "user":
      return "User";
    default:
      return "User";
  }
}

export function getRoleColor(role: UserRole): string {
  switch (role) {
    case "admin":
      return "bg-red-100 text-red-800 border-red-200";
    case "agent":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "user":
      return "bg-green-100 text-green-800 border-green-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

export function canUserAccessTicket(
  userRole: UserRole,
  userId: string,
  ticket: { created_by: string; assigned_to?: string | null }
): boolean {
  // Admins and agents can access all tickets
  if (userRole === "admin" || userRole === "agent") {
    return true;
  }

  // Users can only access tickets they created or are assigned to
  return ticket.created_by === userId || ticket.assigned_to === userId;
}

export function canUserEditTicket(
  userRole: UserRole,
  userId: string,
  ticket: { created_by: string; assigned_to?: string | null; status: string }
): boolean {
  // Admins can edit any ticket
  if (userRole === "admin") {
    return true;
  }

  // Agents can edit tickets assigned to them or unassigned tickets
  if (userRole === "agent") {
    return ticket.assigned_to === userId || !ticket.assigned_to;
  }

  // Users can only edit their own tickets if they're not closed
  if (userRole === "user") {
    return ticket.created_by === userId && ticket.status !== "closed";
  }

  return false;
}

export function getAvailableStatuses(
  userRole: UserRole
): Array<{ value: string; label: string }> {
  const baseStatuses = [
    { value: "open", label: "Open" },
    { value: "in_progress", label: "In Progress" },
    { value: "waiting", label: "Waiting" },
  ];

  // Only agents and admins can close tickets
  if (userRole === "admin" || userRole === "agent") {
    baseStatuses.push({ value: "closed", label: "Closed" });
  }

  return baseStatuses;
}
