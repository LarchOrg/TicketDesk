import { useEffect, useState } from "react";
import { redirect, useNavigate, useNavigation, useSubmit } from "react-router";
import { FormSkeleton } from "~/components/LoadingComponents";
import TicketForm from "~/components/TicketForm";
import { createSupabaseServerClient } from "~/lib/supabase-server";
import type { Profile, TicketFormData } from "~/lib/types";
import { createServices } from "~/services";
import type { Route } from "./+types/newtickets";

export const meta = () => {
  return [
    { title: "Create New Ticket - TicketDesk" },
    { name: "description", content: "Submit a new support ticket" },
  ];
};

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase, response } = createSupabaseServerClient(request);

  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return redirect("/login", { headers: response.headers });
    }

    const services = createServices(supabase);

    const assignableUsers: Profile[] =
      await services.users.getAssignableUsers();

    return {
      assignableUsers,
      currentUser: session.user,
    };
  } catch (error) {
    console.error("Loader error:", error);
    return {
      assignableUsers: [],
      currentUser: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function action({ request }: Route.ActionArgs) {
  const { supabase, response } = createSupabaseServerClient(request);

  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      console.error("Authentication error:", sessionError);
      return Response.json(
        {
          success: false,
          error: "Authentication required. Please log in again.",
        },
        { status: 401, headers: response.headers }
      );
    }

    const formData = await request.formData();

    const rawAssigned = formData.get("assigned_to");
    let assignedTo: string | undefined =
      rawAssigned && String(rawAssigned).trim() !== ""
        ? String(rawAssigned).trim()
        : undefined;

    const ticketData = {
      title: String(formData.get("title") || "").trim(),
      description: String(formData.get("description") || "").trim(),
      priority: String(formData.get("priority") || "medium") as
        | "low"
        | "medium"
        | "high"
        | "critical",
      created_by: session.user.id,
      assigned_to: assignedTo,
    };

    if (!ticketData.title || !ticketData.description) {
      return {
        success: false,
        error: "Title and description are required.",
      };
    }

    const services = createServices(supabase);

    const result = await services.tickets.createTicket(ticketData);

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Failed to create ticket",
      };
    }

    console.log("✅ Ticket created successfully:", result.ticket?.id);

    return {
      success: true,
      message: "Ticket created successfully!",
      ticketId: result.ticket?.id,
    };
  } catch (error) {
    console.error("Action error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export default function NewTicketPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const navigate = useNavigate();
  const submit = useSubmit();
  const navigation = useNavigation();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { assignableUsers } = loaderData;

  if (navigation.state == "loading") {
    return <FormSkeleton />;
  }

  useEffect(() => {
    if (actionData) {
      setIsSubmitting(false);

      if ("success" in actionData && actionData.success) {
        if ("ticketId" in actionData && actionData.ticketId) {
          navigate(`/tickets/${actionData.ticketId}`);
        } else {
          navigate("/tickets");
        }
      } else {
        const errorMessage =
          "error" in actionData ? actionData.error : "Failed to create ticket";
        setError(errorMessage || "Failed to create ticket");
      }
    }
  }, [actionData, navigate]);

  const handleSubmit = async (formData: TicketFormData) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const submitFormData = new FormData();
      submitFormData.append("title", formData.title);
      submitFormData.append("description", formData.description);
      submitFormData.append("priority", formData.priority);

      if (formData.assigned_to) {
        submitFormData.append("assigned_to", formData.assigned_to);
      }

      if (formData.attachments && formData.attachments.length > 0) {
        formData.attachments.forEach((file, index) => {
          submitFormData.append(`attachment_${index}`, file);
        });
      }

      submit(submitFormData, { method: "post" });
    } catch (err) {
      setIsSubmitting(false);
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    }
  };

  return (
    <div className="max-w-full mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Create New Ticket
        </h1>
        <p className="text-muted-foreground">
          Submit a new support request and we'll get back to you as soon as
          possible.
        </p>
      </div>

      {/* Error Display */}
      {(error || (actionData && !(actionData as any).success)) && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <h3 className="font-semibold text-destructive mb-2">
            Error Creating Ticket
          </h3>
          <p className="text-sm text-destructive/80">
            {error || (actionData as any)?.error || "Failed to create ticket"}
          </p>
        </div>
      )}

      {/* Success Display */}
      {actionData && (actionData as any).success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
            Ticket Created Successfully!
          </h3>
          <p className="text-sm text-green-700 dark:text-green-300">
            Your ticket has been created and assigned ID:{" "}
            {(actionData as any).ticketId}
          </p>
        </div>
      )}

      <TicketForm
        onSubmit={handleSubmit}
        isEditing={false}
        assignableUsers={assignableUsers}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
