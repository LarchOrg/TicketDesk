import { useEffect, useState } from "react";
import { useNavigate, useSubmit } from "react-router";
import TicketForm from "~/components/TicketForm";
import { createSupabaseServerClient } from "~/lib/supabase-server";
import type { TicketFormData } from "~/lib/types";
import type { Route } from "./+types/newtickets";

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase, response } = createSupabaseServerClient(request);

  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Response("Unauthorized", { status: 401 });
    }

    const { data: assignableUsers, error: usersError } = await supabase
      .from("profiles")
      .select(
        `
        id,
        name,
        email,
        role
      `
      )
      .in("role", ["admin", "agent"])
      .order("name");

    if (usersError) {
      console.error("❌ Failed to fetch assignable users:", usersError);
      return Response.json(
        {
          assignableUsers: [],
          currentUser: session.user,
        },
        { headers: response.headers }
      );
    }

    return {
      assignableUsers: assignableUsers || [],
      currentUser: session.user,
    };
  } catch (error) {
    console.error("❌ Loader error:", error);
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
      console.error("❌ Authentication error:", sessionError);
      return Response.json(
        {
          success: false,
          error: "Authentication required. Please log in again.",
        },
        { status: 401, headers: response.headers }
      );
    }

    // Log session user safely (some session shapes may omit fields)
    console.log("🔐 Session user:", {
      id: session.user?.id ?? null,
      email: session.user?.email ?? null,
      role: (session.user as any)?.role ?? null,
    });

    // Parse form data after confirming session
    const formData = await request.formData();

    // Normalize assigned_to value
    const rawAssigned = formData.get("assigned_to");
    let assignedTo: string | null =
      rawAssigned && String(rawAssigned).trim() !== ""
        ? String(rawAssigned).trim()
        : null;

    const ticketData = {
      title: String(formData.get("title") || "").trim(),
      description: String(formData.get("description") || "").trim(),
      priority: String(formData.get("priority") || "medium") as
        | "low"
        | "medium"
        | "high"
        | "critical",
      status: "open" as const,
      created_by: session.user.id,
      assigned_to: assignedTo,
    };

    console.log("🎫 Creating new ticket:", ticketData);

    // Validate required fields
    if (!ticketData.title || !ticketData.description) {
      return Response.json(
        {
          success: false,
          error: "Title and description are required",
        },
        { headers: response.headers }
      );
    }

    // Ensure the user exists in profiles table
    const { data: userProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, name, email, role")
      .eq("id", session.user.id)
      .single();

    if (profileError || !userProfile) {
      console.error("❌ User profile not found:", profileError);
      return Response.json(
        {
          success: false,
          error:
            "User profile not found. Please ensure your profile exists in the system.",
        },
        { headers: response.headers }
      );
    }

    console.log("👤 User profile found:", userProfile);

    // Insert the ticket into the database
    const { data: newTicket, error } = await supabase
      .from("tickets")
      .insert([
        {
          title: ticketData.title,
          description: ticketData.description,
          priority: ticketData.priority,
          status: ticketData.status,
          created_by: ticketData.created_by,
          assigned_to: ticketData.assigned_to ?? null,
        },
      ])
      .select(
        `
        *,
        created_by_profile:profiles!tickets_created_by_fkey(id, name, email),
        assigned_to_profile:profiles!tickets_assigned_to_fkey(id, name, email)
      `
      )
      .single();

    if (error) {
      console.error("❌ Database error creating ticket:", error);
      return Response.json(
        {
          success: false,
          error: `Failed to create ticket: ${error.message}`,
        },
        { headers: response.headers }
      );
    }

    console.log("✅ Ticket created successfully:", newTicket);

    return Response.json(
      {
        success: true,
        ticketId: newTicket.id,
        ticket: newTicket,
      },
      { headers: response.headers }
    );
  } catch (error) {
    console.error("❌ Unexpected error creating ticket:", error);
    return Response.json(
      {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { headers: response.headers }
    );
  }
}

export default function NewTicketPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const navigate = useNavigate();
  const submit = useSubmit();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle action results
  useEffect(() => {
    if (actionData) {
      setIsSubmitting(false);

      if ((actionData as any).success) {
        console.log(
          "✅ Ticket created successfully:",
          (actionData as any).ticketId
        );
        // Navigate to the tickets page (or specific ticket) after a short delay
        setTimeout(() => {
          navigate("/tickets");
        }, 2000); // Give user time to see success message
      } else if ((actionData as any).error) {
        setError((actionData as any).error);
      }
    }
  }, [actionData, navigate]);

  const handleSubmit = async (ticketData: TicketFormData) => {
    try {
      setError(null);
      setIsSubmitting(true);
      console.log("📝 Submitting ticket form:", ticketData);

      const formData = new FormData();
      formData.append("title", ticketData.title);
      formData.append("description", ticketData.description || "");
      formData.append("priority", ticketData.priority);
      if (ticketData.assigned_to) {
        formData.append("assigned_to", ticketData.assigned_to);
      }
      submit(formData, { method: "POST" });
    } catch (err) {
      console.error("❌ Error submitting form:", err);
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
      setIsSubmitting(false);
    }
  };

  return (
      <div className="max-w-4xl mx-auto space-y-6">
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

        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <TicketForm
            onSubmit={handleSubmit}
            isEditing={false}
            assignableUsers={loaderData?.assignableUsers || []}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>

  );
}
