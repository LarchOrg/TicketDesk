import { useEffect, useState } from "react";
import { redirect, useNavigate, useNavigation, useSubmit } from "react-router";
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

interface NewTicketActionData {
  success: boolean;
  error?: string;
  message?: string;
  ticketId?: string;
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
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw redirect("/login", { headers: response.headers });
    }

    const services = createServices(supabase);
    const assignableUsers = await services.users.getAssignableUsers();

    return {
      assignableUsers,
      currentUser: session.user,
    };
  } catch (error) {
    console.error("New ticket loader error:", error);

    // If it's a redirect, re-throw it
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

// Action function
export async function action({
  request,
}: Route.ActionArgs): Promise<NewTicketActionData> {
  const { supabase, response } = createSupabaseServerClient(request);

  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      // Use the response from createSupabaseServerClient to attach auth headers
      // when redirecting so the response variable is not unused.
      throw redirect("/login", { headers: response.headers });
    }

    if (sessionError || !session) {
      console.error("Authentication error:", sessionError);
      return {
        success: false,
        error: "Authentication required. Please log in again.",
      };
    }

    const formData = await request.formData();
    const ticketData = parseFormData(formData);
    ticketData.created_by = session.user.id;

    // Validate the ticket data
    const validationError = validateTicketData(ticketData);
    if (validationError) {
      return {
        success: false,
        error: validationError,
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
    console.error("New ticket action error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

// Component: Error Display
function ErrorDisplay({ error }: { error: string }) {
  return (
    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
      <h3 className="font-semibold text-destructive mb-2">
        Error Creating Ticket
      </h3>
      <p className="text-sm text-destructive/80">{error}</p>
    </div>
  );
}

// Component: Success Display
function SuccessDisplay({
  message,
  ticketId,
}: {
  message: string;
  ticketId?: string;
}) {
  return (
    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
      <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
        Ticket Created Successfully!
      </h3>
      <p className="text-sm text-green-700 dark:text-green-300">
        {message}
        {ticketId && ` Ticket ID: ${ticketId}`}
      </p>
    </div>
  );
}

// Component: Page Header
function PageHeader() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Create New Ticket</h1>
      <p className="text-muted-foreground">
        Submit a new support request and we'll get back to you as soon as
        possible.
      </p>
    </div>
  );
}

// Custom hook for form submission logic
function useTicketSubmission() {
  const navigate = useNavigate();
  const submit = useSubmit();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleActionResult = (actionData: NewTicketActionData | undefined) => {
    if (!actionData) return;

    setIsSubmitting(false);

    if (actionData.success) {
      if (actionData.ticketId) {
        navigate(`/tickets/${actionData.ticketId}`);
      } else {
        navigate("/tickets");
      }
    } else {
      setError(actionData.error || "Failed to create ticket");
    }
  };

  return {
    error,
    isSubmitting,
    handleSubmit,
    handleActionResult,
    setError,
  };
}

// Main component
export default function NewTicketPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const navigation = useNavigation();
  const { error, isSubmitting, handleSubmit, handleActionResult } =
    useTicketSubmission();

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

  // Handle action results
  useEffect(() => {
    handleActionResult(actionData as NewTicketActionData);
  }, [actionData, handleActionResult]);

  // Show loader error if present
  if (loaderError) {
    return (
      <div className="max-w-full mx-auto space-y-6">
        <PageHeader />
        <ErrorDisplay error={loaderError} />
      </div>
    );
  }

  const currentError =
    error ||
    (actionData && !(actionData as NewTicketActionData).success
      ? (actionData as NewTicketActionData).error
      : null);

  const showSuccess = actionData && (actionData as NewTicketActionData).success;

  return (
    <div className="max-w-full mx-auto space-y-6">
      <PageHeader />

      {/* Error Display */}
      {currentError && <ErrorDisplay error={currentError} />}

      {/* Success Display */}
      {showSuccess && (
        <SuccessDisplay
          message={
            (actionData as NewTicketActionData).message ||
            "Ticket created successfully!"
          }
          ticketId={(actionData as NewTicketActionData).ticketId}
        />
      )}

      {/* Ticket Form */}
      <TicketForm
        onSubmit={handleSubmit}
        isEditing={false}
        assignableUsers={assignableUsers}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
