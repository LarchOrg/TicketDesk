import type { SupabaseClient } from "@supabase/supabase-js";

export interface Notification {
  id: string;
  user_id: string;
  ticket_id: string;
  type: "comment" | "status_update" | "assignment" | "ticket_created";
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  ticket_title?: string;
  actor_name?: string;
}

export function createNotificationService(supabase: SupabaseClient) {
  return {
    /**
     * Create a notification for a user
     */
    async createNotification(
      notification: Omit<Notification, "id" | "created_at" | "read">
    ): Promise<void> {
      const { error } = await supabase.from("notifications").insert({
        ...notification,
        read: false,
      });

      if (error) {
        console.error("Error creating notification:", error);
        throw error;
      }
    },

    /**
     * Get notifications for a user
     */
    async getUserNotifications(
      userId: string,
      limit = 50
    ): Promise<Notification[]> {
      const { data, error } = await supabase
        .from("notifications")
        .select(
          `
          *,
          tickets!inner(title)
        `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching notifications:", error);
        return [];
      }

      return (
        data?.map((notification) => ({
          ...notification,
          ticket_title: notification.tickets?.title,
        })) || []
      );
    },

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId: string): Promise<void> {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);

      if (error) {
        console.error("Error marking notification as read:", error);
        throw error;
      }
    },

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId: string): Promise<void> {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("read", false);

      if (error) {
        console.error("Error marking all notifications as read:", error);
        throw error;
      }
    },

    /**
     * Get unread notification count for a user
     */
    async getUnreadCount(userId: string): Promise<number> {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("read", false);

      if (error) {
        console.error("Error getting unread count:", error);
        return 0;
      }

      return count || 0;
    },

    /**
     * Create notifications for ticket events
     */
    async notifyTicketEvent(params: {
      ticketId: string;
      type: Notification["type"];
      actorId: string;
      actorName: string;
      recipientIds: string[];
      title: string;
      message: string;
    }): Promise<void> {
      const {
        ticketId,
        type,
        actorId,
        actorName,
        recipientIds,
        title,
        message,
      } = params;

      // Don't notify the actor
      const filteredRecipients = recipientIds.filter((id) => id !== actorId);

      if (filteredRecipients.length === 0) return;

      const notifications = filteredRecipients.map((userId) => ({
        user_id: userId,
        ticket_id: ticketId,
        type,
        title,
        message,
        actor_name: actorName,
      }));

      const { error } = await supabase
        .from("notifications")
        .insert(notifications);

      if (error) {
        console.error("Error creating ticket event notifications:", error);
        throw error;
      }
    },
  };
}
