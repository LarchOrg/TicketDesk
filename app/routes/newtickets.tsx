import { useState } from "react";
import { redirect, useNavigate, useNavigation } from "react-router";
import { FormSkeleton } from "~/components/LoadingComponents";
import TicketForm from "~/components/TicketForm";
import { DEFAULT_PRIORITY } from "~/lib/constants";
import { createSupabaseServerClient } from "~/lib/supabase-server";
import type { Profile, TicketFormData, TicketPriority } from "~/lib/types";
import { validateTicketData } from "~/lib/utils";
import { createServices } from "~/services";
import type { Route } from "./+types/newtickets";

// Types
interface NewTicketLoaderData {
  assignableUsers: Profile[];
  currentUser: any;
  error?: string;
}

interface CreateTicketData {
  title: string;
  description: string;
  priority: TicketPriority;
  created_by: string;
  assigned_to?: string;
}

function parseFormData(formData: FormData): CreateTicketData {
  const rawAssigned = formData.get("assigned_to");
  const assignedTo =
    rawAssigned && String(rawAssigned).trim() !== ""
      ? String(rawAssigned).trim()
      : undefined;

  return {
    title: String(formData.get("title") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    priority: String(
      formData.get("priority") || DEFAULT_PRIORITY
    ) as TicketPriority,
    created_by: "", // Will be set in action
    assigned_to: assignedTo,
  };
}

// Meta function
export const meta = () => {
  return [
    { title: "Create New Ticket - TicketDesk" },
    { name: "description", content: "Submit a new support ticket" },
  ];
};

// Loader function
export async function loader({
  request,
}: Route.LoaderArgs): Promise<NewTicketLoaderData> {
  const { supabase, response } = createSupabaseServerClient(request);

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw redirect("/login", { headers: response.headers });
    }

    const services = createServices(supabase);
    const assignableUsers = await services.users.getAssignableUsers();

    return {
      assignableUsers,
      currentUser: user,
    };
  } catch (error) {
    console.error("New ticket loader error:", error);

    if (error instanceof Response) {
      throw error;
    }

    return {
      assignableUsers: [],
      currentUser: null,
      error:
        error instanceof Error ? error.message : "Failed to load page data",
    };
  }
}

// Action function - Now returns a redirect on success
export async function action({ request }: Route.ActionArgs) {
  const { supabase, response } = createSupabaseServerClient(request);

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw redirect("/login", { headers: response.headers });
    }

    const formData = await request.formData();
    const ticketData = parseFormData(formData);
    console.log(ticketData);
    ticketData.created_by = user.id;

    // Validate the ticket data
    const validationError = validateTicketData(ticketData);
    if (validationError) {
      return Response.json(
        { success: false, error: validationError },
        { status: 400 }
      );
    }

    const services = createServices(supabase);

    // Handle file uploads if present
    const attachments: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("attachment_") && value instanceof File) {
        attachments.push(value);
      }
    }

    // Create the ticket
    const result = await services.tickets.createTicket(ticketData);
    console.log(result);

    if (!result.success || !result.ticket) {
      return Response.json(
        {
          success: false,
          error: result.error || "Failed to create ticket",
        },
        { status: 500 }
      );
    }

    console.log("✅ Ticket created successfully:", result.ticket.id);

    // Upload attachments if any (optional - implement if needed)
    if (attachments.length > 0) {
      console.log(`📎 ${attachments.length} attachments to upload`);
      // TODO: Implement file upload to storage
      // For now, we'll skip file uploads to avoid errors
    }

    // Redirect to the ticket details page
    throw redirect(`/tickets/${result.ticket.id}`, {
      headers: response.headers,
    });
  } catch (error) {
    console.error("New ticket action error:", error);

    // If it's a redirect, re-throw it
    if (error instanceof Response) {
      throw error;
    }

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

// Component: Error Display
function ErrorDisplay({ error }: { error: string }) {
  return (
    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 max-w-5xl mx-auto">
      <h3 className="font-semibold text-destructive mb-2">
        Error Loading Page
      </h3>
      <p className="text-sm text-destructive/80">{error}</p>
    </div>
  );
}

// Main component
export default function NewTicketPage({ loaderData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  // Handle loader data
  if (!loaderData) {
    return <FormSkeleton />;
  }

  const { assignableUsers, error: loaderError } =
    loaderData as NewTicketLoaderData;

  // Show loading skeleton during navigation
  if (navigation.state === "loading") {
    return <FormSkeleton />;
  }

  // Show loader error if present
  if (loaderError) {
    return (
      <div className="max-w-full mx-auto space-y-6 p-6">
        <ErrorDisplay error={loaderError} />
      </div>
    );
  }

  const handleSubmit = async (formData: TicketFormData) => {
    setError(null);

    try {
      const submitFormData = new FormData();
      submitFormData.append("title", formData.title);
      submitFormData.append("description", formData.description);
      submitFormData.append("priority", formData.priority);

      if (formData.assigned_to && formData.assigned_to !== "unassigned") {
        submitFormData.append("assigned_to", formData.assigned_to);
      }

      // Add attachments if any
      if (formData.attachments && formData.attachments.length > 0) {
        formData.attachments.forEach((file, index) => {
          submitFormData.append(`attachment_${index}`, file);
        });
      }

      // Submit the form
      const response = await fetch("/newtickets", {
        method: "POST",
        body: submitFormData,
      });

      // If response is a redirect, follow it
      if (response.redirected) {
        window.location.href = response.url;
        return;
      }

      // If response is JSON, check for errors
      if (response.headers.get("content-type")?.includes("application/json")) {
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to create ticket");
        }
      }

      // If we get here and no redirect happened, navigate manually
      navigate("/tickets");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
      throw err; // Re-throw to let the form handle it
    }
  };

  return (
    <div className="max-w-full mx-auto space-y-6 p-6">
      {error && <ErrorDisplay error={error} />}

      {/* Ticket Form */}
      <TicketForm
        onSubmit={handleSubmit}
        isEditing={false}
        assignableUsers={assignableUsers}
        isSubmitting={navigation.state === "submitting"}
      />
    </div>
  );
}
