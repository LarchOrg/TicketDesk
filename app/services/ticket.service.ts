import type { SupabaseClient } from "@supabase/supabase-js";
import { safeTransformTicketData } from "../lib/ticket-utils";
import type {
  Ticket,
  TicketFilters,
  TicketPriority,
  TicketStats,
  TicketStatus,
} from "../lib/types";

export function createTicketService(supabase: SupabaseClient) {
  return {
    /**
     * Get a single ticket by ID with related data
     */
    async getTicketById(ticketId: string): Promise<Ticket | null> {
      const { data, error } = await supabase
        .from("tickets")
        .select(
          `
          *,
          created_by_profile:profiles!created_by(id, name, email, avatar_url, role),
          assigned_to_profile:profiles!assigned_to(id, name, email, avatar_url, role)
        `
        )
        .eq("id", ticketId)
        .single();

      if (error || !data) {
        console.error("Error fetching ticket:", error);
        return null;
      }

      return safeTransformTicketData(data);
    },

    /**
     * Get tickets with optional filtering and pagination
     */
    async getTickets(filters?: TicketFilters): Promise<{
      tickets: Ticket[];
      total: number;
    }> {
      let query = supabase.from("tickets").select(
        `
          *,
          created_by_profile:profiles!created_by(id, name, email, avatar_url, role),
          assigned_to_profile:profiles!assigned_to(id, name, email, avatar_url, role)
        `,
        { count: "exact" }
      );

      // Apply filters
      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters?.priority && filters.priority !== "all") {
        query = query.eq("priority", filters.priority);
      }

      if (filters?.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }

      if (filters?.assigned_to) {
        if (filters.assigned_to === "unassigned") {
          query = query.is("assigned_to", null);
        } else {
          query = query.eq("assigned_to", filters.assigned_to);
        }
      }

      if (filters?.created_by) {
        query = query.eq("created_by", filters.created_by);
      }

      // Apply sorting
      const sortBy = filters?.sortBy || "created_at";
      const sortOrder = filters?.sortOrder || "desc";
      query = query.order(sortBy, { ascending: sortOrder === "asc" });

      // Apply pagination
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(
          filters.offset,
          filters.offset + (filters.limit || 10) - 1
        );
      }

      const { data, error, count } = await query;

      if (error) {
        console.error("Error fetching tickets:", error);
        return { tickets: [], total: 0 };
      }

      const tickets = (data || [])
        .map(safeTransformTicketData)
        .filter((ticket): ticket is Ticket => ticket !== null);

      return {
        tickets,
        total: count || 0,
      };
    },

    /**
     * Get recent tickets (for dashboard)
     */
    async getRecentTickets(limit: number = 10): Promise<Ticket[]> {
      const { data, error } = await supabase
        .from("tickets")
        .select(
          `
          *,
          created_by_profile:profiles!created_by(id, name, email, avatar_url, role),
          assigned_to_profile:profiles!assigned_to(id, name, email, avatar_url, role)
        `
        )
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching recent tickets:", error);
        return [];
      }

      return (data || [])
        .map(safeTransformTicketData)
        .filter((ticket): ticket is Ticket => ticket !== null);
    },

    /**
     * Get ticket statistics
     */
    async getTicketStats(): Promise<TicketStats> {
      const { data, error } = await supabase.from("tickets").select("status");

      if (error) {
        console.error("Error fetching ticket stats:", error);
        return {
          total: 0,
          open: 0,
          in_progress: 0,
          resolved: 0,
          reopened: 0,
          closed: 0,
        };
      }

      const tickets = data || [];
      return {
        total: tickets.length,
        open: tickets.filter((t) => t.status === "open").length,
        in_progress: tickets.filter((t) => t.status === "in_progress").length,
        resolved: tickets.filter((t) => t.status === "resolved").length,
        reopened: tickets.filter((t) => t.status === "reopened").length,
        closed: tickets.filter((t) => t.status === "closed").length,
      };
    },

    /**
     * Create a new ticket
     */
    async createTicket(ticketData: {
      title: string;
      description: string;
      priority: TicketPriority;
      created_by: string;
      assigned_to?: string;
    }): Promise<{ success: boolean; ticket?: Ticket; error?: string }> {
      const { data, error } = await supabase
        .from("tickets")
        .insert({
          title: ticketData.title,
          description: ticketData.description,
          priority: ticketData.priority,
          status: "open" as TicketStatus,
          created_by: ticketData.created_by,
          assigned_to: ticketData.assigned_to || null,
        })
        .select(
          `
          *,
          created_by_profile:profiles!created_by(id, name, email, avatar_url, role),
          assigned_to_profile:profiles!assigned_to(id, name, email, avatar_url, role)
        `
        )
        .single();

      if (error) {
        console.error("Error creating ticket:", error);
        return { success: false, error: error.message };
      }

      const ticket = safeTransformTicketData(data);
      if (!ticket) {
        return { success: false, error: "Failed to transform ticket data" };
      }

      return { success: true, ticket };
    },

    /**
     * Update a ticket
     */
    async updateTicket(
      ticketId: string,
      updates: {
        title?: string;
        description?: string;
        priority?: TicketPriority;
        assigned_to?: string | null;
      }
    ): Promise<{ success: boolean; ticket?: Ticket; error?: string }> {
      const { data, error } = await supabase
        .from("tickets")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticketId)
        .select(
          `
          *,
          created_by_profile:profiles!created_by(id, name, email, avatar_url, role),
          assigned_to_profile:profiles!assigned_to(id, name, email, avatar_url, role)
        `
        )
        .single();

      if (error) {
        console.error("Error updating ticket:", error);
        return { success: false, error: error.message };
      }

      const ticket = safeTransformTicketData(data);
      if (!ticket) {
        return { success: false, error: "Failed to transform ticket data" };
      }

      return { success: true, ticket };
    },

    /**
     * Update ticket status
     */
    async updateTicketStatus(
      ticketId: string,
      newStatus: TicketStatus
    ): Promise<{ success: boolean; ticket?: Ticket; error?: string }> {
      const { data, error } = await supabase
        .from("tickets")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticketId)
        .select(
          `
          *,
          created_by_profile:profiles!created_by(id, name, email, avatar_url, role),
          assigned_to_profile:profiles!assigned_to(id, name, email, avatar_url, role)
        `
        )
        .single();

      if (error) {
        console.error("Error updating ticket status:", error);
        return { success: false, error: error.message };
      }

      const ticket = safeTransformTicketData(data);
      if (!ticket) {
        return { success: false, error: "Failed to transform ticket data" };
      }

      return { success: true, ticket };
    },

    /**
     * Delete a ticket
     */
    async deleteTicket(
      ticketId: string
    ): Promise<{ success: boolean; error?: string }> {
      const { error } = await supabase
        .from("tickets")
        .delete()
        .eq("id", ticketId);

      if (error) {
        console.error("Error deleting ticket:", error);
        return { success: false, error: error.message };
      }

      return { success: true };
    },

    /**
     * Get recent activity for dashboard
     */
    async getRecentActivity(limit: number = 10): Promise<any[]> {
      try {
        // Get recent tickets
        const { data: recentTickets } = await supabase
          .from("tickets")
          .select(
            `
            id,
            title,
            status,
            priority,
            created_at,
            updated_at,
            created_by_profile:profiles!created_by(id, name, email)
          `
          )
          .order("created_at", { ascending: false })
          .limit(limit);

        // Get recent comments
        const { data: recentComments } = await supabase
          .from("comments")
          .select(
            `
            id,
            ticket_id,
            content,
            created_at,
            user:profiles!user_id(id, name, email),
            ticket:tickets!ticket_id(id, title)
          `
          )
          .order("created_at", { ascending: false })
          .limit(limit);

        // Get recently updated tickets (status changes)
        const { data: updatedTickets } = await supabase
          .from("tickets")
          .select(
            `
            id,
            title,
            status,
            updated_at,
            created_at,
            created_by_profile:profiles!created_by(id, name, email)
          `
          )
          .not("updated_at", "is", null)
          .order("updated_at", { ascending: false })
          .limit(limit);

        const activities: any[] = [];

        // Add ticket creation activities
        if (recentTickets) {
          recentTickets.forEach((ticket: any) => {
            const creatorProfile = Array.isArray(ticket.created_by_profile)
              ? ticket.created_by_profile[0]
              : ticket.created_by_profile;

            activities.push({
              id: `ticket-created-${ticket.id}`,
              type: "ticket_created",
              description: `New ticket created: "${ticket.title}"`,
              details: `Priority: ${ticket.priority}, Status: ${ticket.status}`,
              user: creatorProfile?.name || "Unknown User",
              timestamp: ticket.created_at,
              ticketId: ticket.id,
              icon: "ticket",
            });
          });
        }

        // Add comment activities
        if (recentComments) {
          recentComments.forEach((comment: any) => {
            const userProfile = Array.isArray(comment.user)
              ? comment.user[0]
              : comment.user;

            const contentPreview =
              comment.content.length > 50
                ? comment.content.substring(0, 50) + "..."
                : comment.content;
            activities.push({
              id: `comment-${comment.id}`,
              type: "comment_added",
              description: `Comment added to "${comment.ticket?.title || "ticket"}"`,
              details: contentPreview,
              user: userProfile?.name || "Unknown User",
              timestamp: comment.created_at,
              ticketId: comment.ticket_id,
              icon: "message",
            });
          });
        }

        // Add ticket update activities
        if (updatedTickets) {
          updatedTickets.forEach((ticket: any) => {
            const creatorProfile = Array.isArray(ticket.created_by_profile)
              ? ticket.created_by_profile[0]
              : ticket.created_by_profile;

            // Only add if updated_at is different from created_at
            if (ticket.updated_at && ticket.updated_at !== ticket.created_at) {
              activities.push({
                id: `ticket-updated-${ticket.id}`,
                type: "ticket_updated",
                description: `Ticket updated: "${ticket.title}"`,
                details: `Status: ${ticket.status}`,
                user: creatorProfile?.name || "Unknown User",
                timestamp: ticket.updated_at,
                ticketId: ticket.id,
                icon: "edit",
              });
            }
          });
        }

        // Sort all activities by timestamp (most recent first)
        activities.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        // Return only the requested limit
        return activities.slice(0, limit);
      } catch (error) {
        console.error("Error fetching recent activity:", error);
        return [];
      }
    },
  };
}
