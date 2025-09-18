import type { Ticket, TicketPriority, TicketStatus } from "./types";

// Helper function to transform raw ticket data to match Ticket type
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
    assigned_to: ticketData.assigned_to,
    created_by_profile: ticketData.created_by_profile,
    assigned_to_profile: ticketData.assigned_to_profile,
    attachments: ticketData.attachments || [],
    comments: ticketData.comments || [],
    tags: ticketData.tags || [],
  };
}

// Helper function to validate ticket data before transformation
export function validateTicketData(ticketData: any): boolean {
  const requiredFields = [
    "id",
    "title",
    "description",
    "status",
    "priority",
    "created_at",
    "created_by",
  ];

  for (const field of requiredFields) {
    if (!ticketData[field]) {
      console.error(`Missing required field: ${field}`);
      return false;
    }
  }

  // Validate status
  const validStatuses: TicketStatus[] = [
    "open",
    "in_progress",
    "resolved",
    "reopened",
    "closed",
  ];
  if (!validStatuses.includes(ticketData.status)) {
    console.error(`Invalid status: ${ticketData.status}`);
    return false;
  }

  // Validate priority
  const validPriorities: TicketPriority[] = [
    "low",
    "medium",
    "high",
    "critical",
  ];
  if (!validPriorities.includes(ticketData.priority)) {
    console.error(`Invalid priority: ${ticketData.priority}`);
    return false;
  }

  return true;
}

// Safe transformation function that validates first
export function safeTransformTicketData(ticketData: any): Ticket | null {
  if (!validateTicketData(ticketData)) {
    return null;
  }

  return transformTicketData(ticketData);
}
