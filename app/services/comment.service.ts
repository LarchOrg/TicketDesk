import type { SupabaseClient } from "@supabase/supabase-js";
import type { Comment } from "../lib/types";

export function createCommentService(supabase: SupabaseClient) {
  return {
    /**
     * Get comments for a ticket
     */
    async getCommentsByTicketId(ticketId: string): Promise<Comment[]> {
      const { data, error } = await supabase
        .from("comments")
        .select(
          `
          *,
          author:profiles!user_id(id, name, email, avatar_url, role)
        `
        )
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching comments:", error);
        return [];
      }

      return data || [];
    },

    /**
     * Create a new comment
     */
    async createComment(commentData: {
      ticket_id: string;
      user_id: string;
      content: string;
      comment_type?: "comment" | "system" | "internal";
      is_internal?: boolean;
    }): Promise<{ success: boolean; comment?: Comment; error?: string }> {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          ticket_id: commentData.ticket_id,
          user_id: commentData.user_id,
          content: commentData.content,
          comment_type: commentData.comment_type || "comment",
          is_internal: commentData.is_internal || false,
        })
        .select(
          `
          *,
          author:profiles!user_id(id, name, email, avatar_url, role)
        `
        )
        .single();

      if (error) {
        console.error("Error creating comment:", error);
        return { success: false, error: error.message };
      }

      return { success: true, comment: data };
    },

    /**
     * Update a comment
     */
    async updateComment(
      commentId: string,
      updates: {
        content?: string;
        is_internal?: boolean;
      }
    ): Promise<{ success: boolean; comment?: Comment; error?: string }> {
      const { data, error } = await supabase
        .from("comments")
        .update(updates)
        .eq("id", commentId)
        .select(
          `
          *,
          author:profiles!user_id(id, name, email, avatar_url, role)
        `
        )
        .single();

      if (error) {
        console.error("Error updating comment:", error);
        return { success: false, error: error.message };
      }

      return { success: true, comment: data };
    },

    /**
     * Delete a comment
     */
    async deleteComment(
      commentId: string
    ): Promise<{ success: boolean; error?: string }> {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (error) {
        console.error("Error deleting comment:", error);
        return { success: false, error: error.message };
      }

      return { success: true };
    },
  };
}
