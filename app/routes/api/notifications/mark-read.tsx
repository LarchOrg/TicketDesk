import { createSupabaseServerClient } from "~/lib/supabase-server";
import { createServices } from "~/services";

export async function action({ request }: { request: Request }) {
  const { supabase } = createSupabaseServerClient(request);
  const services = createServices(supabase);

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Response("Authentication required", { status: 401 });
  }

  try {
    const body = await request.json();
    const { notificationId } = body;

    if (!notificationId) {
      return Response.json(
        { error: "Notification ID is required" },
        { status: 400 }
      );
    }

    await services.notifications.markAsRead(notificationId);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return Response.json(
      { error: "Failed to mark notification as read" },
      { status: 500 }
    );
  }
}
