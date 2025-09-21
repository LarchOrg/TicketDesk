import type { SupabaseClient } from "@supabase/supabase-js";
import { createAttachmentService } from "./attachment.service";
import { createCommentService } from "./comment.service";
import { createTicketService } from "./ticket.service";
import { createUserService } from "./user.service";

/**
 * Service factory that provides access to all data services
 * This centralizes database operations and makes them easily testable
 */
export function createServices(supabase: SupabaseClient) {
  return {
    tickets: createTicketService(supabase),
    comments: createCommentService(supabase),
    users: createUserService(supabase),
    attachments: createAttachmentService(supabase),
  };
}

// Export individual service creators for direct use if needed
export {
  createAttachmentService,
  createCommentService,
  createTicketService,
  createUserService,
};
