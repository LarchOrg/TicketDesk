import type { SupabaseClient } from "@supabase/supabase-js";
import type { Attachment } from "../lib/types";

export function createAttachmentService(supabase: SupabaseClient) {
  return {
    /**
     * Get attachments for a ticket
     */
    async getAttachmentsByTicketId(ticketId: string): Promise<Attachment[]> {
      const { data, error } = await supabase
        .from("attachments")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching attachments:", error);
        return [];
      }

      return data || [];
    },

    /**
     * Upload and create attachment record
     */
    async uploadAttachment(
      ticketId: string,
      file: File,
      uploadedBy: string
    ): Promise<{ success: boolean; attachment?: Attachment; error?: string }> {
      try {
        // Generate unique filename
        const fileExt = file.name.split(".").pop();
        const fileName = `${ticketId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        // Upload file to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("ticket-attachments")
          .upload(fileName, file);

        if (uploadError) {
          console.error("Error uploading file:", uploadError);
          return { success: false, error: uploadError.message };
        }

        // Create attachment record
        const { data, error } = await supabase
          .from("attachments")
          .insert({
            ticket_id: ticketId,
            filename: file.name,
            file_path: uploadData.path,
            file_size: file.size,
            content_type: file.type,
            uploaded_by: uploadedBy,
          })
          .select("*")
          .single();

        if (error) {
          console.error("Error creating attachment record:", error);
          // Clean up uploaded file if database insert fails
          await supabase.storage
            .from("ticket-attachments")
            .remove([uploadData.path]);
          return { success: false, error: error.message };
        }

        return { success: true, attachment: data };
      } catch (error) {
        console.error("Error in uploadAttachment:", error);
        return { success: false, error: "Failed to upload attachment" };
      }
    },

    /**
     * Get download URL for an attachment
     */
    async getAttachmentUrl(
      filePath: string
    ): Promise<{ success: boolean; url?: string; error?: string }> {
      const { data, error } = await supabase.storage
        .from("ticket-attachments")
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) {
        console.error("Error getting attachment URL:", error);
        return { success: false, error: error.message };
      }

      return { success: true, url: data.signedUrl };
    },

    /**
     * Delete an attachment
     */
    async deleteAttachment(
      attachmentId: string
    ): Promise<{ success: boolean; error?: string }> {
      // First get the attachment to know the file path
      const { data: attachment, error: fetchError } = await supabase
        .from("attachments")
        .select("file_path")
        .eq("id", attachmentId)
        .single();

      if (fetchError) {
        console.error("Error fetching attachment:", fetchError);
        return { success: false, error: fetchError.message };
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("ticket-attachments")
        .remove([attachment.file_path]);

      if (storageError) {
        console.error("Error deleting file from storage:", storageError);
        // Continue with database deletion even if storage deletion fails
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from("attachments")
        .delete()
        .eq("id", attachmentId);

      if (dbError) {
        console.error("Error deleting attachment record:", dbError);
        return { success: false, error: dbError.message };
      }

      return { success: true };
    },

    /**
     * Get attachment by ID
     */
    async getAttachmentById(attachmentId: string): Promise<Attachment | null> {
      const { data, error } = await supabase
        .from("attachments")
        .select("*")
        .eq("id", attachmentId)
        .single();

      if (error) {
        console.error("Error fetching attachment:", error);
        return null;
      }

      return data;
    },
  };
}
