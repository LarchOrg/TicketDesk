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
        console.log(
          `📎 Starting upload for file: ${file.name} (${file.size} bytes)`
        );

        // Validate file
        if (!file || file.size === 0) {
          console.error("❌ Invalid file: empty or null");
          return { success: false, error: "Invalid file" };
        }

        // Generate unique filename - preserve original name but make it unique and safe
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 15);

        // Sanitize the filename to remove special characters but preserve dots, underscores and hyphens
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

        const fileName = `${ticketId}/${timestamp}-${randomStr}-${sanitizedFileName}`;

        console.log(`📁 Uploading to path: ${fileName}`);

        // Upload file to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("ticket-attachments")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("❌ Storage upload error:", uploadError);
          return {
            success: false,
            error: `Storage error: ${uploadError.message}`,
          };
        }

        console.log(`✅ File uploaded to storage: ${uploadData.path}`);

        // Create attachment record
        const attachmentData = {
          ticket_id: ticketId,
          file_name: file.name,
          storage_path: uploadData.path,
          file_size: file.size,
          file_type: file.type || "application/octet-stream",
          uploaded_by: uploadedBy,
        };

        console.log(`💾 Creating database record:`, attachmentData);

        const { data, error } = await supabase
          .from("attachments")
          .insert(attachmentData)
          .select("*")
          .single();

        if (error) {
          console.error("❌ Database insert error:", error);
          // Clean up uploaded file if database insert fails
          console.log(`🧹 Cleaning up uploaded file: ${uploadData.path}`);
          await supabase.storage
            .from("ticket-attachments")
            .remove([uploadData.path]);
          return { success: false, error: `Database error: ${error.message}` };
        }

        console.log(`✅ Attachment record created:`, data.id);
        return { success: true, attachment: data };
      } catch (error) {
        console.error("❌ Unexpected error in uploadAttachment:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to upload attachment",
        };
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
        .select("storage_path")
        .eq("id", attachmentId)
        .single();

      if (fetchError) {
        console.error("Error fetching attachment:", fetchError);
        return { success: false, error: fetchError.message };
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("ticket-attachments")
        .remove([attachment.storage_path]);

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
